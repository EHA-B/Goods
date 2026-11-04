'use strict';
/**
 * purchaseInvoiceController.js — Hardened Purchase Invoice Business Module
 *
 * Business operations are atomic database transactions.
 * No generic CRUD is exposed to the renderer for accounting-sensitive operations.
 *
 * Unified Stock & Manual Consignment Architecture:
 * - Purchase invoices (standard & consignment) add quantities directly to `products.stock_quantity`
 *   and update `products.avg_cost_base` without creating or locking per-invoice `stock_batches`.
 * - Consignment closing (`previewConsignmentClosing`, `closeCommission`, `reverseCommissionSettlement`)
 *   is a manual financial settlement with zero storage impact.
 */

const path = require('path');
const crypto = require('crypto');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));
const {
    validateDate,
    normalizeAmount,
    calculateInvoiceTotals,
    calculatePaymentState,
    generateInvoiceNumber,
    logActivity,
    dbRun,
    dbGet,
    dbAll,
} = require('./utils/invoiceUtils');
const {
    normalizeCurrency,
    normalizeExchangeRate,
    toBaseAmount,
    assertCashboxCurrency,
} = require('./utils/currencyUtils');
const { reversePaymentInTransaction } = require('./paymentReversalService');

function round3(value) {
    return Math.round((Number(value) || 0) * 1000) / 1000;
}

async function ensureInvoiceEditAuditColumns(db) {
    const tableName = 'purchase_invoices';
    const columns = await dbAll(db, `PRAGMA table_info(${tableName})`);
    const names = new Set(columns.map((column) => String(column.name)));

    const additions = [
        ['is_edited', 'INTEGER NOT NULL DEFAULT 0'],
        ['edit_count', 'INTEGER NOT NULL DEFAULT 0'],
        ['last_edited_at', 'TEXT NULL'],
        ['last_edited_by', 'INTEGER NULL'],
    ];

    for (const [columnName, definition] of additions) {
        if (!names.has(columnName)) {
            await dbRun(
                db,
                `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
            );
        }
    }
}

async function addProductUnifiedStock(db, productId, addedQuantity, unitPriceBase) {
    const product = await dbGet(db, 'SELECT id, name, stock_quantity, avg_cost_base FROM products WHERE id = ?', [productId]);
    if (!product) {
        throw { code: 'PRODUCT_NOT_FOUND', message: 'المنتج غير موجود' };
    }
    const qtyBefore = round3(Number(product.stock_quantity ?? 0));
    const added = round3(Number(addedQuantity ?? 0));
    const qtyAfter = round3(qtyBefore + added);

    let nextAvgCost = normalizeAmount(Number(product.avg_cost_base ?? 0));
    const cleanCostBase = normalizeAmount(Number(unitPriceBase ?? 0));
    if (added > 0 && cleanCostBase > 0) {
        if (qtyBefore > 0 && nextAvgCost > 0) {
            nextAvgCost = normalizeAmount(((qtyBefore * nextAvgCost) + (added * cleanCostBase)) / qtyAfter);
        } else {
            nextAvgCost = cleanCostBase;
        }
    }

    await dbRun(
        db,
        `UPDATE products SET stock_quantity = ?, avg_cost_base = ?, updated_at = datetime('now') WHERE id = ?`,
        [qtyAfter, nextAvgCost, productId]
    );

    return { qtyBefore, qtyAfter, avgCostBase: nextAvgCost };
}

async function removeProductUnifiedStock(db, productId, removeQuantity) {
    const product = await dbGet(db, 'SELECT id, name, stock_quantity FROM products WHERE id = ?', [productId]);
    if (!product) {
        throw { code: 'PRODUCT_NOT_FOUND', message: 'المنتج غير موجود' };
    }
    const qtyBefore = round3(Number(product.stock_quantity ?? 0));
    const removed = round3(Number(removeQuantity ?? 0));
    if (removed > qtyBefore + 0.0005) {
        throw {
            code: 'PURCHASE_CANNOT_BE_CANCELLED_STOCK_USED',
            message: `لا يمكن إتمام العملية — الكمية المتاحة في المخزون للمنتج "${product.name}" (${qtyBefore}) أقل من الكمية المطلوب خصمها (${removed}).`,
        };
    }
    const qtyAfter = round3(Math.max(0, qtyBefore - removed));
    await dbRun(
        db,
        `UPDATE products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?`,
        [qtyAfter, productId]
    );
    return { qtyBefore, qtyAfter };
}

function normalizeManualConsignmentSales(input, purchaseItems = []) {
    const rawItems = Array.isArray(input?.items) ? input.items : null;
    const byPurchaseItemId = new Map();
    const byProductId = new Map();

    if (rawItems && rawItems.length > 0) {
        for (const row of rawItems) {
            const soldQty = round3(Math.max(0, Number(row?.sold_quantity ?? 0)));
            const salesAmt = normalizeAmount(Math.max(0, Number(row?.sales_amount ?? row?.total_sales_amount ?? 0)));
            if (row?.purchase_invoice_item_id) {
                byPurchaseItemId.set(Number(row.purchase_invoice_item_id), { sold_quantity: soldQty, sales_amount: salesAmt });
            }
            if (row?.product_id) {
                byProductId.set(Number(row.product_id), { sold_quantity: soldQty, sales_amount: salesAmt });
            }
        }
    }

    const resolvedItems = purchaseItems.map((piItem) => {
        const match =
            byPurchaseItemId.get(Number(piItem.id)) ??
            byProductId.get(Number(piItem.product_id)) ??
            null;
        const receivedQty = round3(Number(piItem.quantity ?? 0));
        const soldQty = match ? match.sold_quantity : 0;
        const salesAmt = match ? match.sales_amount : 0;
        return {
            purchase_invoice_item_id: Number(piItem.id),
            product_id: Number(piItem.product_id),
            received_quantity: receivedQty,
            sold_quantity: soldQty,
            remaining_quantity: round3(Math.max(0, receivedQty - soldQty)),
            sales_amount: salesAmt,
        };
    });

    const hasExplicitTotals =
        input?.total_sales_amount !== undefined && input?.total_sales_amount !== null && input?.total_sales_amount !== '';

    const itemsSoldSum = round3(resolvedItems.reduce((sum, item) => sum + item.sold_quantity, 0));
    const itemsSalesSum = normalizeAmount(resolvedItems.reduce((sum, item) => sum + item.sales_amount, 0));

    const totalSalesAmount = hasExplicitTotals && (!rawItems || rawItems.length === 0)
        ? normalizeAmount(Math.max(0, Number(input.total_sales_amount ?? 0)))
        : rawItems && rawItems.length > 0
            ? itemsSalesSum
            : normalizeAmount(Math.max(0, Number(input?.total_sales_amount ?? 0)));

    const soldQuantity = rawItems && rawItems.length > 0
        ? itemsSoldSum
        : round3(Math.max(0, Number(input?.sold_quantity ?? 0)));

    // When closed via overall manual totals (no per-item breakdown), distribute
    // soldQuantity & totalSalesAmount proportionally across resolvedItems so item-level
    // settlement views, printouts, and commission reports stay 100% consistent.
    if ((!rawItems || rawItems.length === 0) && resolvedItems.length > 0 && (soldQuantity > 0 || totalSalesAmount > 0)) {
        const totalReceived = round3(resolvedItems.reduce((sum, item) => sum + item.received_quantity, 0));
        let allocatedQty = 0;
        let allocatedSales = 0;

        for (let i = 0; i < resolvedItems.length; i++) {
            const item = resolvedItems[i];
            const isLast = i === resolvedItems.length - 1;
            const weight = totalReceived > 0 ? item.received_quantity / totalReceived : 1 / resolvedItems.length;

            const itemSold = isLast ? round3(Math.max(0, soldQuantity - allocatedQty)) : round3(soldQuantity * weight);
            const itemSales = isLast ? normalizeAmount(Math.max(0, totalSalesAmount - allocatedSales)) : normalizeAmount(totalSalesAmount * weight);

            allocatedQty = round3(allocatedQty + itemSold);
            allocatedSales = normalizeAmount(allocatedSales + itemSales);

            item.sold_quantity = itemSold;
            item.sales_amount = itemSales;
            item.remaining_quantity = round3(Math.max(0, item.received_quantity - itemSold));
        }
    }

    return {
        resolvedItems,
        soldQuantity,
        totalSalesAmount,
    };
}

function normalizeInvoiceEditError(error) {
    if (error?.code && error?.message) {
        return error;
    }

    const message = String(error?.message ?? error ?? '');

    if (/no such column/i.test(message)) {
        return {
            code: 'INVOICE_EDIT_SCHEMA_ERROR',
            message: 'تعذر تحديث بنية قاعدة البيانات اللازمة لتعديل الفاتورة. أعد تشغيل التطبيق ثم حاول مرة أخرى.',
            details: { technicalMessage: message },
        };
    }

    if (/FOREIGN KEY constraint failed/i.test(message)) {
        return {
            code: 'INVOICE_EDIT_RELATION_LOCK',
            message: 'لا يمكن تعديل الفاتورة لأن هناك سجلات لاحقة مرتبطة بها. عالج الحركات المرتبطة أولًا.',
            details: { technicalMessage: message },
        };
    }

    if (/UNIQUE constraint failed/i.test(message)) {
        return {
            code: 'DUPLICATE_INVOICE_NUMBER',
            message: 'رقم الفاتورة مستخدم مسبقًا.',
            details: { technicalMessage: message },
        };
    }

    return {
        code: 'INVOICE_EDIT_FAILED',
        message: 'تعذر حفظ تعديل الفاتورة بسبب خطأ في قاعدة البيانات.',
        details: { technicalMessage: message },
    };
}

class PurchaseInvoiceController {

    // ─── createFullPurchaseInvoice ─────────────────────────────────────────

    async createFullPurchaseInvoice(input) {
        const {
            supplier_id,
            invoice_number,
            invoice_date,
            invoice_type = 'standard',
            discount_amount = 0,
            transport_cost = 0,
            emptying_cost = 0,
            transport_cost_bearer = 'company',
            emptying_cost_bearer = 'company',
            notes,
            items,
            initial_payment,
            currency,
            exchange_rate,
        } = input ?? {};

        if (!supplier_id) throw { code: 'SUPPLIER_NOT_FOUND', message: 'supplier_id مطلوب' };
        if (!Array.isArray(items) || items.length === 0) throw { code: 'PURCHASE_ITEM_INVALID', message: 'يجب إضافة صنف واحد على الأقل' };
        if (!['standard', 'consignment'].includes(invoice_type)) throw { code: 'VALIDATION_ERROR', message: 'invoice_type يجب أن يكون standard أو consignment' };

        const validatedDate = validateDate(invoice_date, 'invoice_date');

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            // 1. Validate supplier
            const supplier = await dbGet(db, 'SELECT * FROM suppliers WHERE id = ?', [supplier_id]);
            if (!supplier) throw { code: 'SUPPLIER_NOT_FOUND', message: 'المورد غير موجود' };
            if (!supplier.isActive) throw { code: 'INACTIVE_SUPPLIER', message: 'المورد غير نشط' };

            // 2. Map items to common shape
            const mappedItems = items.map((item) => {
                const rawPrice = Number(item.purchase_price ?? item.unit_price ?? item.price ?? 0);
                return {
                    ...item,
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity ?? 0),
                    price: rawPrice,
                    purchase_price: rawPrice,
                    estimated_purchase_price:
                        item.estimated_purchase_price !== undefined && item.estimated_purchase_price !== null
                            ? Number(item.estimated_purchase_price)
                            : invoice_type === 'consignment'
                                ? rawPrice
                                : null,
                };
            });

            // 3. Validate products and prevent ambiguous duplicate product rows.
            const seenProductIds = new Set();
            for (let i = 0; i < mappedItems.length; i++) {
                const productId = Number(mappedItems[i].product_id);
                if (seenProductIds.has(productId)) {
                    throw { code: 'DUPLICATE_PURCHASE_PRODUCT', message: `المنتج في السطر ${i + 1} مكرر. اجمع الكمية في سطر واحد.` };
                }
                seenProductIds.add(productId);
                const product = await dbGet(db, 'SELECT id, name, isActive FROM products WHERE id = ?', [productId]);
                if (!product) throw { code: 'PRODUCT_NOT_FOUND', message: `المنتج في السطر ${i + 1} غير موجود` };
                if (!product.isActive) throw { code: 'INACTIVE_PRODUCT', message: `المنتج ${product.name} غير نشط` };
            }

            // 4. Calculate totals (validates items)
            const { normalizedItems, subtotal, discountAmount, totalAmount: itemsTotal } = calculateInvoiceTotals(
                mappedItems, discount_amount
            );
            if (discountAmount > subtotal) {
                throw { code: 'VALIDATION_ERROR', message: 'الخصم لا يمكن أن يتجاوز المجموع الفرعي' };
            }

            const normalizedTransportCost = normalizeAmount(Number(transport_cost) || 0);
            const normalizedEmptyingCost  = normalizeAmount(Number(emptying_cost)  || 0);
            if (normalizedTransportCost < 0) throw { code: 'VALIDATION_ERROR', message: 'تكلفة النقل لا يمكن أن تكون سالبة' };
            if (normalizedEmptyingCost  < 0) throw { code: 'VALIDATION_ERROR', message: 'تكلفة العتالة لا يمكن أن تكون سالبة' };
            const normalizedTransportBearer = transport_cost_bearer === 'supplier' ? 'supplier' : 'company';
            const normalizedEmptyingBearer = emptying_cost_bearer === 'supplier' ? 'supplier' : 'company';
            const transportEffect = normalizedTransportCost * (normalizedTransportBearer === 'company' ? 1 : -1);
            const emptyingEffect = normalizedEmptyingCost * (normalizedEmptyingBearer === 'company' ? 1 : -1);
            const totalAmount = normalizeAmount(itemsTotal + transportEffect + emptyingEffect);
            if (totalAmount < 0) throw { code: 'VALIDATION_ERROR', message: 'تكاليف المورد لا يمكن أن تتجاوز قيمة الفاتورة' };

            // 5. Validate/generate invoice number
            let invNumber = invoice_number?.trim();
            if (!invNumber) {
                invNumber = await generateInvoiceNumber(db, 'PUR', 'purchase_invoices');
            } else {
                const dup = await dbGet(db, 'SELECT id FROM purchase_invoices WHERE invoice_number = ?', [invNumber]);
                if (dup) throw { code: 'DUPLICATE_INVOICE_NUMBER', message: `رقم الفاتورة ${invNumber} موجود مسبقًا` };
            }

            // 6. Insert purchase invoice
            const status = 'confirmed';
            const invoiceCurrency = normalizeCurrency(currency);
            const invoiceRate = normalizeExchangeRate(invoiceCurrency, exchange_rate);
            const { lastID: invoiceId } = await dbRun(db,
                `INSERT INTO purchase_invoices
                   (invoice_number, supplier_id, invoice_type, invoice_date,
                    subtotal, discount, discount_amount, tax, total, paid_amount, remaining_amount, status, notes,
                    currency, exchange_rate, transport_cost, emptying_cost, transport_cost_bearer, emptying_cost_bearer,
                    settlement_status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
                [invNumber, supplier_id, invoice_type, validatedDate,
                 subtotal, discountAmount, discountAmount, totalAmount, totalAmount, status, notes ?? null,
                 invoiceCurrency, invoiceRate, normalizedTransportCost, normalizedEmptyingCost, normalizedTransportBearer, normalizedEmptyingBearer]
            );

            // 7. Insert items + add directly to unified product stock pool + record stock movements
            for (let i = 0; i < normalizedItems.length; i++) {
                const item = normalizedItems[i];
                const estPrice = mappedItems[i]?.estimated_purchase_price ?? null;

                await dbRun(db,
                    `INSERT INTO purchase_invoice_items
                       (purchase_invoice_id, product_id, quantity, unit_price, estimated_purchase_price, line_total, notes, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [invoiceId, item.product_id, item.quantity, item.purchase_price, estPrice, item.lineTotal, item.notes ?? null]
                );

                const unitPriceBase = toBaseAmount(item.purchase_price, invoiceRate);
                const { qtyBefore, qtyAfter } = await addProductUnifiedStock(db, item.product_id, item.quantity, unitPriceBase);

                await dbRun(db,
                    `INSERT INTO stock_movements
                       (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                        reference_type, reference_id, reference_number, supplier_id, notes, created_at)
                     VALUES (?, NULL, 'purchase_in', ?, ?, ?, 'purchase_invoice', ?, ?, ?, ?, datetime('now'))`,
                    [item.product_id, item.quantity, qtyBefore, qtyAfter, invoiceId, invNumber, supplier_id, `فاتورة شراء ${invNumber}`]
                );
            }

            // 8. Supplier balance follows the net invoice total after assigning responsibility.
            const supplierBaseAmount = toBaseAmount(totalAmount, invoiceRate);
            await dbRun(db,
                `UPDATE suppliers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
                [supplierBaseAmount, supplier_id]
            );

            // 9. Handle optional initial payment
            let finalPaid = 0;
            if (initial_payment && Number(initial_payment.amount ?? 0) < 0) {
                throw { code: 'PAYMENT_AMOUNT_INVALID', message: 'قيمة الدفعة الأولية لا يمكن أن تكون سالبة' };
            }
            if (initial_payment && Number(initial_payment.amount ?? 0) > 0) {
                const payAmount = Number(initial_payment.amount);
                const payDate   = validateDate(initial_payment.payment_date ?? validatedDate, 'initial_payment.payment_date');
                const payBox    = initial_payment.cashbox_id;

                if (!payBox) throw { code: 'VALIDATION_ERROR', message: 'cashbox_id مطلوب للدفعة الأولية' };
                if (payAmount > totalAmount + 0.001) throw { code: 'PAYMENT_EXCEEDS_OUTSTANDING', message: 'الدفعة الأولية تتجاوز إجمالي الفاتورة' };

                const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [payBox]);
                if (!cashbox)          throw { code: 'CASHBOX_NOT_FOUND', message: 'الصندوق غير موجود' };
                if (!cashbox.isActive)  throw { code: 'INACTIVE_CASHBOX', message: 'الصندوق غير نشط' };

                let paymentExchangeRate = invoiceRate;
                let cashboxAmount = payAmount;

                if (cashbox.currency !== invoiceCurrency) {
                    if (!initial_payment.exchange_rate) {
                        throw { code: 'MISSING_EXCHANGE_RATE', message: 'سعر الصرف مطلوب عند اختلاف عملة الصندوق عن الفاتورة' };
                    }
                    paymentExchangeRate = normalizeExchangeRate(cashbox.currency, initial_payment.exchange_rate);
                    const amountBaseFromInvoice = toBaseAmount(payAmount, invoiceRate);
                    cashboxAmount = normalizeAmount(amountBaseFromInvoice / paymentExchangeRate);
                }
                const payBaseAmountCashbox = toBaseAmount(cashboxAmount, paymentExchangeRate);

                if (cashbox.balance < cashboxAmount - 0.001) throw { code: 'INSUFFICIENT_BALANCE', message: `رصيد الصندوق (${cashbox.balance}) غير كافٍ` };

                const balBefore = normalizeAmount(cashbox.balance);
                const balAfter  = Math.round((balBefore - cashboxAmount) * 100) / 100;
                await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balAfter, payBox]);
                const { lastID: cbtId } = await dbRun(db,
                    `INSERT INTO cashbox_transactions
                       (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                     VALUES (?, 'purchase', ?, ?, 'out', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [payBox, invoiceId, cashboxAmount, balBefore, balAfter, payDate, `دفعة أولى فاتورة شراء #${invNumber}`]
                );

                await dbRun(db,
                    `INSERT INTO payments
                       (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date,
                        status, cashbox_transaction_id, notes, created_at, updated_at)
                     VALUES ('supplier', ?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))`,
                    [supplier_id, invoiceId, payBox, cashboxAmount, cashbox.currency, paymentExchangeRate,
                     payBaseAmountCashbox, payDate, cbtId, initial_payment.notes ?? null]
                );

                const payBaseAmount = toBaseAmount(payAmount, invoiceRate);
                await dbRun(db,
                    `UPDATE suppliers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
                    [payBaseAmount, supplier_id]
                );

                finalPaid = payAmount;
            }

            // 10. Update invoice paid/remaining/status
            const { remainingAmount, status: finalStatus } = calculatePaymentState(totalAmount, finalPaid);
            await dbRun(db,
                `UPDATE purchase_invoices SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
                [finalPaid, remainingAmount, finalStatus, invoiceId]
            );

            // 11. Record transport & emptying costs as expense transactions (if company bears them)
            if (normalizedTransportCost > 0 && normalizedTransportBearer === 'company') {
                try {
                    const transportCat = await dbGet(db,
                        `SELECT id FROM transaction_categories WHERE type = 'expense' AND isActive = 1 AND (name LIKE '%نقل%' OR name LIKE '%شحن%') LIMIT 1`
                    ) ?? await dbGet(db,
                        `SELECT id FROM transaction_categories WHERE type = 'expense' AND isActive = 1 ORDER BY id ASC LIMIT 1`
                    );
                    if (transportCat) {
                        await dbRun(db,
                            `INSERT INTO transactions
                               (category_id, cashbox_id, amount, direction, transaction_date,
                                description, reference_number, notes, status, created_at, updated_at)
                             VALUES (?, NULL, ?, 'expense', ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
                            [transportCat.id, normalizedTransportCost, validatedDate,
                             `تكلفة نقل — فاتورة شراء #${invNumber}`, invNumber,
                             `تكلفة نقل بضاعة مرتبطة بفاتورة الشراء ${invNumber}`]
                        );
                    }
                } catch (txErr) {
                    console.error('[PurchaseInvoice] Failed to record transport_cost transaction:', txErr);
                }
            }

            if (normalizedEmptyingCost > 0 && normalizedEmptyingBearer === 'company') {
                try {
                    const emptyingCat = await dbGet(db,
                        `SELECT id FROM transaction_categories WHERE type = 'expense' AND isActive = 1 AND (name LIKE '%عتال%' OR name LIKE '%تفريغ%') LIMIT 1`
                    ) ?? await dbGet(db,
                        `SELECT id FROM transaction_categories WHERE type = 'expense' AND isActive = 1 ORDER BY id ASC LIMIT 1`
                    );
                    if (emptyingCat) {
                        await dbRun(db,
                            `INSERT INTO transactions
                               (category_id, cashbox_id, amount, direction, transaction_date,
                                description, reference_number, notes, status, created_at, updated_at)
                             VALUES (?, NULL, ?, 'expense', ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
                            [emptyingCat.id, normalizedEmptyingCost, validatedDate,
                             `تكلفة عتالة — فاتورة شراء #${invNumber}`, invNumber,
                             `تكلفة تفريغ بضاعة (عتالة) مرتبطة بفاتورة الشراء ${invNumber}`]
                        );
                    }
                } catch (txErr) {
                    console.error('[PurchaseInvoice] Failed to record emptying_cost transaction:', txErr);
                }
            }

            await logActivity(db, 'purchase_created', 'purchase_invoices', invoiceId, {
                invoice_number: invNumber,
                supplier_id,
                total: totalAmount,
                transport_cost: normalizedTransportCost,
                transport_cost_bearer: normalizedTransportBearer,
                emptying_cost: normalizedEmptyingCost,
                emptying_cost_bearer: normalizedEmptyingBearer,
            });

            await dbRun(db, 'COMMIT');

            return this.getPurchaseInvoiceDetails(invoiceId);

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── addItemsToPurchaseInvoice ─────────────────────────────────────────

    async addItemsToPurchaseInvoice(invoiceId, items) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID الفاتورة مطلوب' };
        if (!Array.isArray(items) || items.length === 0) throw { code: 'PURCHASE_ITEM_INVALID', message: 'يجب إضافة صنف واحد على الأقل' };

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [invoiceId]);
            if (!invoice) throw { code: 'NOT_FOUND', message: 'فاتورة الشراء غير موجودة' };
            if (invoice.status === 'cancelled') throw { code: 'PURCHASE_ALREADY_CANCELLED', message: 'لا يمكن التعديل على فاتورة ملغاة' };
            if (invoice.invoice_type === 'consignment' && invoice.settlement_status === 'settled') {
                throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'لا يمكن إضافة أصناف لفاتورة أمانة تم إغلاقها' };
            }

            const supplier = await dbGet(db, 'SELECT * FROM suppliers WHERE id = ?', [invoice.supplier_id]);
            if (!supplier) throw { code: 'SUPPLIER_NOT_FOUND', message: 'المورد غير موجود' };
            if (!supplier.isActive) throw { code: 'INACTIVE_SUPPLIER', message: 'المورد غير نشط' };

            const mappedItems = items.map((item) => {
                const rawPrice = Number(item.purchase_price ?? item.unit_price ?? item.price ?? 0);
                return {
                    ...item,
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity ?? 0),
                    price: rawPrice,
                    purchase_price: rawPrice,
                    estimated_purchase_price:
                        item.estimated_purchase_price !== undefined && item.estimated_purchase_price !== null
                            ? Number(item.estimated_purchase_price)
                            : invoice.invoice_type === 'consignment'
                                ? rawPrice
                                : null,
                };
            });

            const seenProductIds = new Set();
            for (let i = 0; i < mappedItems.length; i++) {
                const productId = Number(mappedItems[i].product_id);
                if (seenProductIds.has(productId)) {
                    throw { code: 'DUPLICATE_PURCHASE_PRODUCT', message: `المنتج في السطر ${i + 1} مكرر. اجمع الكمية في سطر واحد.` };
                }
                seenProductIds.add(productId);
                const product = await dbGet(db, 'SELECT id, name, isActive FROM products WHERE id = ?', [productId]);
                if (!product) throw { code: 'PRODUCT_NOT_FOUND', message: `المنتج في السطر ${i + 1} غير موجود` };
                if (!product.isActive) throw { code: 'INACTIVE_PRODUCT', message: `المنتج ${product.name} غير نشط` };
            }

            const { normalizedItems, subtotal: newItemsSubtotal, totalAmount: newItemsTotal } = calculateInvoiceTotals(mappedItems, 0);

            const invoiceCurrency = normalizeCurrency(invoice.currency);
            const invoiceRate = normalizeExchangeRate(invoiceCurrency, invoice.exchange_rate);

            for (let i = 0; i < normalizedItems.length; i++) {
                const item = normalizedItems[i];
                const estPrice = mappedItems[i]?.estimated_purchase_price ?? null;

                await dbRun(db,
                    `INSERT INTO purchase_invoice_items
                       (purchase_invoice_id, product_id, quantity, unit_price, estimated_purchase_price, line_total, notes, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [invoiceId, item.product_id, item.quantity, item.purchase_price, estPrice, item.lineTotal, item.notes ?? null]
                );

                const unitPriceBase = toBaseAmount(item.purchase_price, invoiceRate);
                const { qtyBefore, qtyAfter } = await addProductUnifiedStock(db, item.product_id, item.quantity, unitPriceBase);

                await dbRun(db,
                    `INSERT INTO stock_movements
                       (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                        reference_type, reference_id, reference_number, supplier_id, notes, created_at)
                     VALUES (?, NULL, 'purchase_in', ?, ?, ?, 'purchase_invoice', ?, ?, ?, ?, datetime('now'))`,
                    [item.product_id, item.quantity, qtyBefore, qtyAfter, invoiceId, invoice.invoice_number, invoice.supplier_id, `إضافة لفاتورة شراء ${invoice.invoice_number}`]
                );
            }

            const supplierBaseAmount = toBaseAmount(newItemsTotal, invoiceRate);
            await dbRun(db,
                `UPDATE suppliers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
                [supplierBaseAmount, invoice.supplier_id]
            );

            const newSubtotal = normalizeAmount(invoice.subtotal + newItemsSubtotal);
            const newTotal = normalizeAmount(invoice.total + newItemsTotal);
            const { remainingAmount, status: finalStatus } = calculatePaymentState(newTotal, invoice.paid_amount);

            await dbRun(db,
                `UPDATE purchase_invoices SET subtotal = ?, total = ?, remaining_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
                [newSubtotal, newTotal, remainingAmount, finalStatus, invoiceId]
            );

            await logActivity(db, 'purchase_items_added', 'purchase_invoices', invoiceId, {
                invoice_number: invoice.invoice_number,
                added_items: normalizedItems.length,
                added_total: newItemsTotal,
            });

            await dbRun(db, 'COMMIT');

            return this.getPurchaseInvoiceDetails(invoiceId);

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── updatePurchaseInvoice ─────────────────────────────────────────────

    async updatePurchaseInvoice(id, input, userId) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'رقم الفاتورة مطلوب' };
        const {
            supplier_id,
            invoice_number,
            invoice_date,
            invoice_type = 'standard',
            discount_amount = 0,
            transport_cost = 0,
            emptying_cost = 0,
            transport_cost_bearer = 'company',
            emptying_cost_bearer = 'company',
            notes,
            items,
            currency,
            exchange_rate,
        } = input ?? {};
        if (!supplier_id) throw { code: 'SUPPLIER_NOT_FOUND', message: 'المورد مطلوب' };
        if (!Array.isArray(items) || items.length === 0) throw { code: 'PURCHASE_ITEM_INVALID', message: 'يجب إضافة صنف واحد على الأقل' };

        const db = await dbmanager.init();
        await ensureInvoiceEditAuditColumns(db);
        try {
            await dbRun(db, 'BEGIN TRANSACTION');
            const oldInvoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [id]);
            if (!oldInvoice) throw { code: 'NOT_FOUND', message: 'فاتورة الشراء غير موجودة' };
            if (oldInvoice.status === 'cancelled') throw { code: 'PURCHASE_ALREADY_CANCELLED', message: 'لا يمكن تعديل فاتورة ملغاة' };

            const activeSettlement = await dbGet(
                db,
                `SELECT id, status FROM consignment_settlements WHERE purchase_invoice_id = ? AND status = 'completed' LIMIT 1`,
                [id]
            );
            if (activeSettlement) {
                throw { code: 'PURCHASE_EDIT_SETTLEMENT_LOCK', message: 'لا يمكن تعديل فاتورة أمانة بعد إنشاء تسوية مكتملة لها.' };
            }

            const oldItems = await dbAll(db, 'SELECT * FROM purchase_invoice_items WHERE purchase_invoice_id = ? ORDER BY id', [id]);

            const supplier = await dbGet(db, 'SELECT * FROM suppliers WHERE id = ?', [supplier_id]);
            if (!supplier || !supplier.isActive) throw { code: 'SUPPLIER_NOT_FOUND', message: 'المورد غير موجود أو غير نشط' };

            const paidAmount = normalizeAmount(oldInvoice.paid_amount);
            const activePayments = await dbAll(db, `SELECT * FROM payments WHERE invoice_id = ? AND payment_type = 'purchase' AND status = 'active'`, [id]);
            const nextCurrency = normalizeCurrency(currency ?? oldInvoice.currency);
            const nextRate = normalizeExchangeRate(nextCurrency, exchange_rate ?? oldInvoice.exchange_rate);
            if (
                activePayments.length &&
                (
                    Number(supplier_id) !== Number(oldInvoice.supplier_id) ||
                    nextCurrency !== normalizeCurrency(oldInvoice.currency) ||
                    Math.abs(nextRate - normalizeExchangeRate(oldInvoice.currency, oldInvoice.exchange_rate)) > 0.000001
                )
            ) {
                throw { code: 'INVOICE_EDIT_PAYMENT_LOCK', message: 'لا يمكن تغيير المورد أو العملة أو سعر الصرف بعد وجود دفعات. اعكس الدفعات أولًا.' };
            }

            const invNumber = String(invoice_number ?? oldInvoice.invoice_number).trim();
            const duplicate = await dbGet(db, 'SELECT id FROM purchase_invoices WHERE invoice_number = ? AND id <> ?', [invNumber, id]);
            if (duplicate) throw { code: 'DUPLICATE_INVOICE_NUMBER', message: `رقم الفاتورة ${invNumber} موجود مسبقًا` };
            const validatedDate = validateDate(invoice_date ?? oldInvoice.invoice_date, 'invoice_date');

            const mappedItems = items.map((item) => {
                const rawPrice = Number(item.purchase_price ?? item.unit_price ?? 0);
                return {
                    ...item,
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity ?? 0),
                    price: rawPrice,
                    purchase_price: rawPrice,
                    estimated_purchase_price:
                        item.estimated_purchase_price !== undefined && item.estimated_purchase_price !== null
                            ? Number(item.estimated_purchase_price)
                            : invoice_type === 'consignment'
                                ? rawPrice
                                : null,
                };
            });

            const seen = new Set();
            for (let i = 0; i < mappedItems.length; i++) {
                const item = mappedItems[i];
                if (seen.has(item.product_id)) throw { code: 'DUPLICATE_PURCHASE_PRODUCT', message: `المنتج في السطر ${i + 1} مكرر` };
                seen.add(item.product_id);
                const product = await dbGet(db, 'SELECT * FROM products WHERE id = ?', [item.product_id]);
                if (!product || !product.isActive) throw { code: 'PRODUCT_NOT_FOUND', message: `الصنف رقم ${i + 1} غير موجود أو غير نشط` };
            }

            const { normalizedItems, subtotal, discountAmount, totalAmount: itemsTotal } = calculateInvoiceTotals(mappedItems, discount_amount);
            const normalizedTransportCost = normalizeAmount(Number(transport_cost) || 0);
            const normalizedEmptyingCost = normalizeAmount(Number(emptying_cost) || 0);
            if (normalizedTransportCost < 0) throw { code: 'VALIDATION_ERROR', message: 'تكلفة النقل لا يمكن أن تكون سالبة' };
            if (normalizedEmptyingCost < 0) throw { code: 'VALIDATION_ERROR', message: 'تكلفة العتالة لا يمكن أن تكون سالبة' };
            const normalizedTransportBearer = transport_cost_bearer === 'supplier' ? 'supplier' : 'company';
            const normalizedEmptyingBearer = emptying_cost_bearer === 'supplier' ? 'supplier' : 'company';
            const transportEffect = normalizedTransportCost * (normalizedTransportBearer === 'company' ? 1 : -1);
            const emptyingEffect = normalizedEmptyingCost * (normalizedEmptyingBearer === 'company' ? 1 : -1);
            const totalAmount = normalizeAmount(itemsTotal + transportEffect + emptyingEffect);
            if (totalAmount < 0) throw { code: 'VALIDATION_ERROR', message: 'تكاليف المورد لا يمكن أن تتجاوز قيمة الفاتورة' };
            if (paidAmount > totalAmount + 0.001) throw { code: 'INVOICE_EDIT_BELOW_PAID', message: 'الإجمالي الجديد أقل من المبلغ المدفوع. اعكس جزءًا من الدفعات أولًا.' };
            const { remainingAmount, status } = calculatePaymentState(totalAmount, paidAmount);

            // Validate net unified stock delta per product so unified stock never goes negative
            const deltaByProduct = new Map();
            for (const oldItem of oldItems) {
                const pid = Number(oldItem.product_id);
                deltaByProduct.set(pid, round3((deltaByProduct.get(pid) ?? 0) - Number(oldItem.quantity ?? 0)));
            }
            for (const newItem of normalizedItems) {
                const pid = Number(newItem.product_id);
                deltaByProduct.set(pid, round3((deltaByProduct.get(pid) ?? 0) + Number(newItem.quantity ?? 0)));
            }
            for (const [pid, delta] of deltaByProduct.entries()) {
                if (delta < -0.0005) {
                    const product = await dbGet(db, 'SELECT id, name, stock_quantity FROM products WHERE id = ?', [pid]);
                    const available = round3(Number(product?.stock_quantity ?? 0));
                    if (available + delta < -0.0005) {
                        throw {
                            code: 'PURCHASE_EDIT_STOCK_LOCK',
                            message: `لا يمكن تقليل أو حذف المنتج "${product?.name ?? pid}" لأن الرصيد المتاح في المخزون (${available}) أقل من فرق الكمية (${Math.abs(delta)}).`,
                        };
                    }
                }
            }

            // Apply stock adjustments per product
            for (const [pid, delta] of deltaByProduct.entries()) {
                if (delta < -0.0005) {
                    await removeProductUnifiedStock(db, pid, Math.abs(delta));
                }
            }
            for (let i = 0; i < normalizedItems.length; i++) {
                const newItem = normalizedItems[i];
                const pid = Number(newItem.product_id);
                const delta = deltaByProduct.get(pid) ?? 0;
                const unitPriceBase = toBaseAmount(newItem.purchase_price, nextRate);
                if (delta > 0.0005) {
                    await addProductUnifiedStock(db, pid, delta, unitPriceBase);
                } else if (unitPriceBase > 0) {
                    await dbRun(
                        db,
                        `UPDATE products SET avg_cost_base = ?, updated_at = datetime('now') WHERE id = ?`,
                        [unitPriceBase, pid]
                    );
                }
            }

            const oldRate = normalizeExchangeRate(oldInvoice.currency, oldInvoice.exchange_rate);
            const oldRemainingBase = toBaseAmount(oldInvoice.remaining_amount, oldRate);
            const newRemainingBase = toBaseAmount(remainingAmount, nextRate);
            if (oldInvoice.supplier_id) {
                await dbRun(db, `UPDATE suppliers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`, [oldRemainingBase, oldInvoice.supplier_id]);
            }
            await dbRun(db, `UPDATE suppliers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`, [newRemainingBase, supplier_id]);

            await dbRun(db, `DELETE FROM stock_movements WHERE reference_type = 'purchase_invoice' AND reference_id = ? AND movement_type = 'purchase_in'`, [id]);
            await dbRun(db, 'DELETE FROM purchase_invoice_items WHERE purchase_invoice_id = ?', [id]);

            for (let i = 0; i < normalizedItems.length; i++) {
                const item = normalizedItems[i];
                const estPrice = mappedItems[i]?.estimated_purchase_price ?? null;
                const currentProd = await dbGet(db, 'SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
                const qtyAfter = round3(Number(currentProd?.stock_quantity ?? item.quantity));
                const qtyBefore = round3(Math.max(0, qtyAfter - item.quantity));

                await dbRun(
                    db,
                    `INSERT INTO purchase_invoice_items
                       (purchase_invoice_id, product_id, quantity, unit_price, estimated_purchase_price, line_total, notes, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [id, item.product_id, item.quantity, item.purchase_price, estPrice, item.lineTotal, item.notes ?? null]
                );

                await dbRun(
                    db,
                    `INSERT INTO stock_movements
                       (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                        reference_type, reference_id, reference_number, supplier_id, notes, created_at)
                     VALUES (?, NULL, 'purchase_in', ?, ?, ?, 'purchase_invoice', ?, ?, ?, ?, datetime('now'))`,
                    [item.product_id, item.quantity, qtyBefore, qtyAfter, id, invNumber, supplier_id, `فاتورة شراء معدلة ${invNumber}`]
                );
            }

            await dbRun(
                db,
                `UPDATE purchase_invoices
                 SET invoice_number = ?, supplier_id = ?, invoice_type = ?, invoice_date = ?,
                     subtotal = ?, discount = ?, discount_amount = ?,
                     transport_cost = ?, emptying_cost = ?, transport_cost_bearer = ?, emptying_cost_bearer = ?,
                     total = ?, remaining_amount = ?, status = ?, notes = ?, currency = ?, exchange_rate = ?,
                     is_edited = 1, edit_count = COALESCE(edit_count, 0) + 1,
                     last_edited_at = datetime('now'), last_edited_by = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [
                    invNumber, supplier_id, invoice_type, validatedDate,
                    subtotal, discountAmount, discountAmount,
                    normalizedTransportCost, normalizedEmptyingCost, normalizedTransportBearer, normalizedEmptyingBearer,
                    totalAmount, remainingAmount, status, notes ?? null, nextCurrency, nextRate,
                    userId ?? null, id,
                ]
            );

            await dbRun(db, `DELETE FROM transactions
                WHERE cashbox_id IS NULL
                  AND reference_number = ?
                  AND (description LIKE 'تكلفة نقل — فاتورة شراء #%'
                    OR description LIKE 'تكلفة عتالة — فاتورة شراء #%')`, [oldInvoice.invoice_number]);

            const insertExtraCostTransaction = async (kind, amount) => {
                if (!(amount > 0)) return;
                const categoryPattern = kind === 'transport' ? '%نقل%' : '%عتال%';
                const fallbackPattern = kind === 'transport' ? '%شحن%' : '%تفريغ%';
                const category = await dbGet(db,
                    `SELECT id FROM transaction_categories
                     WHERE type = 'expense' AND isActive = 1
                       AND (name LIKE ? OR name LIKE ?)
                     ORDER BY id ASC LIMIT 1`, [categoryPattern, fallbackPattern]
                ) ?? await dbGet(db,
                    `SELECT id FROM transaction_categories WHERE type = 'expense' AND isActive = 1 ORDER BY id ASC LIMIT 1`
                );
                if (!category) return;
                const label = kind === 'transport' ? 'تكلفة نقل' : 'تكلفة عتالة';
                const detail = kind === 'transport' ? 'تكلفة نقل بضاعة' : 'تكلفة تفريغ بضاعة (عتالة)';
                await dbRun(db,
                    `INSERT INTO transactions
                       (category_id, cashbox_id, amount, direction, transaction_date,
                        description, reference_number, notes, status, created_at, updated_at)
                     VALUES (?, NULL, ?, 'expense', ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
                    [category.id, amount, validatedDate, `${label} — فاتورة شراء #${invNumber}`, invNumber,
                     `${detail} مرتبطة بفاتورة الشراء ${invNumber}`]
                );
            };
            if (normalizedTransportBearer === 'company') await insertExtraCostTransaction('transport', normalizedTransportCost);
            if (normalizedEmptyingBearer === 'company') await insertExtraCostTransaction('emptying', normalizedEmptyingCost);

            await dbRun(
                db,
                `INSERT INTO activity_logs (user_id, action, table_name, record_id, old_data, new_data, created_at, updated_at)
                 VALUES (?, 'purchase_edited', 'purchase_invoices', ?, ?, ?, datetime('now'), datetime('now'))`,
                [
                    userId ?? null,
                    id,
                    JSON.stringify({ invoice: oldInvoice, items: oldItems }),
                    JSON.stringify({
                        invoice_number: invNumber,
                        supplier_id,
                        invoice_type,
                        invoice_date: validatedDate,
                        transport_cost: normalizedTransportCost,
                        transport_cost_bearer: normalizedTransportBearer,
                        emptying_cost: normalizedEmptyingCost,
                        emptying_cost_bearer: normalizedEmptyingBearer,
                        total: totalAmount,
                        remaining_amount: remainingAmount,
                        currency: nextCurrency,
                        exchange_rate: nextRate,
                        items: normalizedItems.map((x) => ({ product_id: x.product_id, quantity: x.quantity, purchase_price: x.purchase_price })),
                    }),
                ]
            );
            await dbRun(db, 'COMMIT');
            return this.getPurchaseInvoiceDetails(id);
        } catch (err) {
            await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
            throw normalizeInvoiceEditError(err);
        }
    }

    // ─── getPurchaseInvoiceDetails ─────────────────────────────────────────

    async getPurchaseInvoiceDetails(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();

        const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [id]);
        if (!invoice) throw { code: 'NOT_FOUND', message: 'فاتورة الشراء غير موجودة' };

        const supplier = await dbGet(db, 'SELECT * FROM suppliers WHERE id = ?', [invoice.supplier_id]);

        const invoiceItems = await dbAll(db,
            `SELECT pii.*,
                    p.name as product_name,
                    p.unit as product_unit,
                    p.stock_quantity as product_stock_quantity
             FROM purchase_invoice_items pii
             LEFT JOIN products p ON pii.product_id = p.id
             WHERE pii.purchase_invoice_id = ?
             ORDER BY pii.id`,
            [id]
        );

        const items = invoiceItems.map((item) => ({
            ...item,
            batch_code: null,
            remaining_quantity: null,
            batch_received_date: null,
            batch_expiry_date: null,
            batch_active: null,
            stock_batch_id: null,
        }));

        const payments = await dbAll(db,
            `SELECT p.*, c.name as cashbox_name
             FROM payments p
             LEFT JOIN cashboxes c ON p.cashbox_id = c.id
             WHERE p.invoice_id = ? AND p.payment_type = 'purchase'
             ORDER BY p.payment_date DESC, p.id DESC`,
            [id]
        );

        const activity = await dbAll(db,
            `SELECT * FROM activity_logs WHERE table_name = 'purchase_invoices' AND record_id = ? ORDER BY created_at DESC LIMIT 20`,
            [id]
        );

        const invoiceRate = normalizeExchangeRate(invoice.currency, invoice.exchange_rate);
        const financial_summary = {
            subtotal: normalizeAmount(invoice.subtotal),
            discount_amount: normalizeAmount(invoice.discount_amount ?? invoice.discount),
            transport_cost: normalizeAmount(invoice.transport_cost ?? 0),
            transport_cost_bearer: invoice.transport_cost_bearer === 'supplier' ? 'supplier' : 'company',
            emptying_cost: normalizeAmount(invoice.emptying_cost ?? 0),
            emptying_cost_bearer: invoice.emptying_cost_bearer === 'supplier' ? 'supplier' : 'company',
            total_amount: normalizeAmount(invoice.total),
            paid_amount: normalizeAmount(invoice.paid_amount),
            remaining_amount: normalizeAmount(invoice.remaining_amount),
            total_base: toBaseAmount(invoice.total, invoiceRate),
            paid_base: toBaseAmount(invoice.paid_amount, invoiceRate),
            remaining_base: toBaseAmount(invoice.remaining_amount, invoiceRate),
            currency: normalizeCurrency(invoice.currency),
            exchange_rate: invoiceRate,
            status: invoice.status,
        };

        return { invoice, supplier, items, payments, financial_summary, activity };
    }

    // ─── listPurchaseInvoices ──────────────────────────────────────────────

    async listPurchaseInvoices(filters = {}, pagination = {}) {
        const db = await dbmanager.init();

        const { search, supplier_id, status, invoice_type, date_from, date_to } = filters;
        const page  = Math.max(1, Number(pagination.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(pagination.limit ?? 25)));
        const offset = (page - 1) * limit;

        let where = '1=1';
        const params = [];

        if (search?.trim()) {
            where += ' AND (pi.invoice_number LIKE ? OR s.name LIKE ?)';
            params.push(`%${search.trim()}%`, `%${search.trim()}%`);
        }
        if (supplier_id)   { where += ' AND pi.supplier_id = ?'; params.push(supplier_id); }
        if (status)        { where += ' AND pi.status = ?'; params.push(status); }
        if (invoice_type)  { where += ' AND pi.invoice_type = ?'; params.push(invoice_type); }
        if (date_from)     { where += ' AND pi.invoice_date >= ?'; params.push(date_from); }
        if (date_to)       { where += ' AND pi.invoice_date <= ?'; params.push(date_to); }

        const countRow = await dbGet(db,
            `SELECT COUNT(*) as total FROM purchase_invoices pi LEFT JOIN suppliers s ON pi.supplier_id = s.id WHERE ${where}`,
            params
        );
        const total = Number(countRow?.total ?? 0);

        const items = await dbAll(db,
            `SELECT pi.*, s.name as supplier_name
             FROM purchase_invoices pi
             LEFT JOIN suppliers s ON pi.supplier_id = s.id
             WHERE ${where}
             ORDER BY pi.invoice_date DESC, pi.id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            items,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    // ─── cancelPurchaseInvoice ─────────────────────────────────────────────

    async cancelPurchaseInvoice(id, reason) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        if (!reason?.trim()) throw { code: 'VALIDATION_ERROR', message: 'سبب الإلغاء مطلوب' };

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [id]);
            if (!invoice) throw { code: 'NOT_FOUND', message: 'فاتورة الشراء غير موجودة' };
            if (invoice.status === 'cancelled') throw { code: 'PURCHASE_ALREADY_CANCELLED', message: 'الفاتورة ملغاة مسبقًا' };

            const activeSettlement = await dbGet(
                db,
                `SELECT id FROM consignment_settlements WHERE purchase_invoice_id = ? AND status = 'completed' LIMIT 1`,
                [id]
            );
            if (activeSettlement) {
                throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'اعكس تسوية الأمانة أولًا قبل إلغاء الفاتورة.' };
            }

            // 1. Deduct purchased quantities from unified product stock pool (verifies sufficient stock)
            const purchaseItems = await dbAll(db, 'SELECT * FROM purchase_invoice_items WHERE purchase_invoice_id = ? ORDER BY id', [id]);
            for (const item of purchaseItems) {
                const qty = round3(Number(item.quantity ?? 0));
                if (qty <= 0) continue;
                const { qtyBefore, qtyAfter } = await removeProductUnifiedStock(db, item.product_id, qty);
                await dbRun(
                    db,
                    `INSERT INTO stock_movements
                       (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                        reference_type, reference_id, reference_number, supplier_id, notes, created_at)
                     VALUES (?, NULL, 'purchase_cancel_out', ?, ?, ?, 'purchase_invoice', ?, ?, ?, ?, datetime('now'))`,
                    [item.product_id, qty, qtyBefore, qtyAfter, id, invoice.invoice_number, invoice.supplier_id, `إلغاء فاتورة شراء #${invoice.invoice_number}`]
                );
            }

            // 2. Also deactivate any legacy stock_batches attached to this invoice (if created before unified migration)
            await dbRun(
                db,
                `UPDATE stock_batches SET remaining_quantity = 0, isActive = 0, updated_at = datetime('now') WHERE purchase_invoice_id = ?`,
                [id]
            );

            // 3. Reverse active purchase payments
            const activePayments = await dbAll(db,
                `SELECT * FROM payments WHERE invoice_id = ? AND payment_type = 'purchase' AND status = 'active'`,
                [id]
            );
            for (const payment of activePayments) {
                await reversePaymentInTransaction(db, {
                    paymentId: payment.id,
                    expectedType: 'purchase',
                    reason: `إلغاء الفاتورة: ${reason}`,
                });
            }

            // 4. Remove the full original supplier payable after payments have been reversed
            const totalBase = toBaseAmount(
                normalizeAmount(invoice.total),
                normalizeExchangeRate(invoice.currency, invoice.exchange_rate)
            );
            if (totalBase > 0) {
                await dbRun(db,
                    `UPDATE suppliers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
                    [totalBase, invoice.supplier_id]
                );
            }

            // 5. Mark invoice cancelled
            await dbRun(db,
                `UPDATE purchase_invoices SET status = 'cancelled', paid_amount = 0, remaining_amount = 0, updated_at = datetime('now') WHERE id = ?`,
                [id]
            );

            await logActivity(db, 'purchase_cancelled', 'purchase_invoices', id, { reason, invoice_number: invoice.invoice_number });

            await dbRun(db, 'COMMIT');

            return this.getPurchaseInvoiceDetails(id);

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── deleteDraftPurchaseInvoice ────────────────────────────────────────

    async deleteDraftPurchaseInvoice(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();

        const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [id]);
        if (!invoice) throw { code: 'NOT_FOUND', message: 'فاتورة الشراء غير موجودة' };
        if (invoice.status !== 'draft') throw { code: 'PURCHASE_INVOICE_LOCKED', message: 'الحذف المباشر متاح للفواتير المسودة فقط' };

        const payCount = await dbGet(db, `SELECT COUNT(*) as cnt FROM payments WHERE invoice_id = ? AND payment_type = 'purchase'`, [id]);
        if (Number(payCount?.cnt ?? 0) > 0) throw { code: 'PURCHASE_INVOICE_LOCKED', message: 'لا يمكن حذف فاتورة تحتوي على دفعات' };

        await dbRun(db, 'DELETE FROM purchase_invoice_items WHERE purchase_invoice_id = ?', [id]);
        await dbRun(db, 'DELETE FROM purchase_invoices WHERE id = ?', [id]);

        return { success: true, message: 'تم حذف الفاتورة بنجاح' };
    }

    // ─── Legacy read methods (kept for backward compat) ───────────────────

    async getPurchaseInvoice(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();
        const row = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [id]);
        if (!row) throw { code: 'NOT_FOUND', message: 'فاتورة الشراء غير موجودة' };
        return row;
    }

    async getAllPurchaseInvoices() {
        const db = await dbmanager.init();
        return dbAll(db,
            `SELECT pi.*, s.name as supplier_name
             FROM purchase_invoices pi
             LEFT JOIN suppliers s ON pi.supplier_id = s.id
             ORDER BY pi.invoice_date DESC, pi.id DESC`
        );
    }

    async getPurchaseInvoiceSalesDetails(_id) {
        // Sales are unified across all stock and no longer tied to individual purchase invoices.
        return { sales: [], remainingStock: [] };
    }

    // ─── Manual Consignment Settlement (Zero Storage Impact) ───────────────

    async getConsignmentSummary(invoiceId) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();

        const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [invoiceId]);
        if (!invoice) throw { code: 'PURCHASE_NOT_FOUND', message: 'الفاتورة غير موجودة' };
        if (invoice.invoice_type !== 'consignment') throw { code: 'NOT_CONSIGNMENT_INVOICE', message: 'ليست فاتورة أمانة' };

        const supplier = invoice.supplier_id
            ? await dbGet(db, 'SELECT id, name FROM suppliers WHERE id = ?', [invoice.supplier_id])
            : null;

        const purchaseItems = await dbAll(db, `
            SELECT
                pii.id AS purchase_invoice_item_id,
                pii.product_id,
                p.name AS product_name,
                p.unit AS product_unit,
                pii.quantity AS received_quantity,
                pii.unit_price,
                pii.estimated_purchase_price,
                pii.line_total
            FROM purchase_invoice_items pii
            JOIN products p ON p.id = pii.product_id
            WHERE pii.purchase_invoice_id = ?
            ORDER BY pii.id ASC
        `, [invoiceId]);

        const settlement = await dbGet(db, `
            SELECT cs.*, c.name AS cashbox_name
            FROM consignment_settlements cs
            LEFT JOIN cashboxes c ON c.id = cs.cashbox_id
            WHERE cs.purchase_invoice_id = ?
            ORDER BY cs.id DESC
            LIMIT 1
        `, [invoiceId]);

        const settlementItemsByPiItem = new Map();
        const settlementItemsByProduct = new Map();
        if (settlement) {
            const settlementItems = await dbAll(
                db,
                `SELECT * FROM consignment_settlement_items WHERE settlement_id = ? ORDER BY id ASC`,
                [settlement.id]
            );
            for (const row of settlementItems) {
                if (row.purchase_invoice_item_id) {
                    settlementItemsByPiItem.set(Number(row.purchase_invoice_item_id), row);
                }
                if (row.product_id) {
                    settlementItemsByProduct.set(Number(row.product_id), row);
                }
            }
        }

        const isCompletedSettlement = settlement && settlement.status === 'completed';

        const items = purchaseItems.map((row) => {
            const receivedQty = round3(Number(row.received_quantity ?? 0));
            const savedItem = isCompletedSettlement
                ? (settlementItemsByPiItem.get(Number(row.purchase_invoice_item_id)) ?? settlementItemsByProduct.get(Number(row.product_id)) ?? null)
                : null;
            const soldQty = savedItem ? round3(Number(savedItem.sold_quantity ?? 0)) : 0;
            const salesAmt = savedItem ? normalizeAmount(Number(savedItem.sales_amount ?? 0)) : 0;
            const estUnitPrice = normalizeAmount(Number(row.estimated_purchase_price ?? row.unit_price ?? 0));

            return {
                purchase_invoice_item_id: Number(row.purchase_invoice_item_id),
                product_id: Number(row.product_id),
                product_name: row.product_name,
                product_unit: row.product_unit ?? '',
                stock_batch_id: null,
                batch_code: null,
                received_quantity: receivedQty,
                sold_quantity: soldQty,
                remaining_quantity: round3(Math.max(0, receivedQty - soldQty)),
                total_sales_amount: salesAmt,
                estimated_unit_price: estUnitPrice,
                expiry_date: null,
            };
        });

        const receivedQuantity = round3(items.reduce((sum, item) => sum + item.received_quantity, 0));
        const soldQuantity = isCompletedSettlement
            ? round3(Number(settlement.sold_quantity ?? items.reduce((sum, item) => sum + item.sold_quantity, 0)))
            : 0;
        const totalSalesAmount = isCompletedSettlement
            ? normalizeAmount(Number(settlement.total_sales_amount ?? 0))
            : 0;
        const remainingQuantity = round3(Math.max(0, receivedQuantity - soldQuantity));
        const currency = settlement?.currency || normalizeCurrency(invoice.currency);

        return {
            invoice: {
                ...invoice,
                supplier_name: supplier?.name || '—',
                settlement_status: invoice.settlement_status || 'pending',
                currency,
                paid_amount: normalizeAmount(invoice.paid_amount ?? 0),
                remaining_amount: normalizeAmount(invoice.remaining_amount ?? invoice.total ?? 0),
            },
            sales: {
                total_sales_amount: totalSalesAmount,
                sold_quantity: soldQuantity,
                sales_count: isCompletedSettlement ? 1 : 0,
            },
            stock: {
                received_quantity: receivedQuantity,
                sold_quantity: soldQuantity,
                remaining_quantity: remainingQuantity,
                damaged_quantity: 0,
                returned_quantity: 0,
            },
            items,
            existing_settlement: settlement ? {
                ...settlement,
                id: Number(settlement.id),
                purchase_invoice_id: Number(settlement.purchase_invoice_id),
                sold_quantity: round3(Number(settlement.sold_quantity ?? 0)),
                total_sales_amount: normalizeAmount(settlement.total_sales_amount),
                commission_percentage: Number(settlement.commission_percentage ?? 0),
                commission_amount: normalizeAmount(settlement.commission_amount),
                supplier_share: normalizeAmount(settlement.supplier_share),
                prepaid_amount: normalizeAmount(settlement.prepaid_amount ?? 0),
                cashbox_id: Number(settlement.cashbox_id),
                returned_quantity: 0,
                spoilage_quantity: 0,
                carried_quantity: 0,
                spoilage_value: 0,
                return_value: 0,
                cashbox_name: settlement.cashbox_name || '—',
            } : null,
        };
    }

    async previewConsignmentClosing(invoiceId, input) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const { commission_percentage, cashbox_id } = input || {};

        const commPct = Number(commission_percentage);
        if (!Number.isFinite(commPct) || commPct < 0 || commPct > 100) {
            throw { code: 'INVALID_COMMISSION_PERCENTAGE', message: 'نسبة العمولة يجب أن تكون بين 0 و100' };
        }
        if (!cashbox_id) throw { code: 'VALIDATION_ERROR', message: 'الصندوق مطلوب' };

        const db = await dbmanager.init();
        const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [invoiceId]);
        if (!invoice) throw { code: 'PURCHASE_NOT_FOUND', message: 'الفاتورة غير موجودة' };
        if (invoice.invoice_type !== 'consignment') throw { code: 'NOT_CONSIGNMENT_INVOICE', message: 'ليست فاتورة أمانة' };
        if (invoice.settlement_status === 'settled') throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'تم إغلاق هذه الفاتورة مسبقاً' };
        if (invoice.status === 'cancelled') throw { code: 'PURCHASE_ALREADY_CANCELLED', message: 'الفاتورة ملغاة' };

        const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
        if (!cashbox) throw { code: 'CASHBOX_NOT_FOUND', message: 'الصندوق غير موجود' };
        if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'الصندوق غير نشط' };

        const invoiceCurrency = normalizeCurrency(invoice.currency);
        const invoiceRate = normalizeExchangeRate(invoiceCurrency, invoice.exchange_rate);
        assertCashboxCurrency(cashbox, invoiceCurrency);

        const purchaseItems = await dbAll(
            db,
            'SELECT id, product_id, quantity FROM purchase_invoice_items WHERE purchase_invoice_id = ? ORDER BY id ASC',
            [invoiceId]
        );
        const { soldQuantity, totalSalesAmount } = normalizeManualConsignmentSales(input, purchaseItems);

        const commissionAmount = normalizeAmount((totalSalesAmount * commPct) / 100);
        const supplierShareBase = normalizeAmount(totalSalesAmount - commissionAmount);
        const prepaidAmount = normalizeAmount(invoice.paid_amount ?? 0);
        const netSupplierPayout = normalizeAmount(Math.max(0, supplierShareBase - prepaidAmount));

        const cashboxBalance = normalizeAmount(cashbox.balance);
        if (netSupplierPayout > cashboxBalance + 0.001) {
            throw { code: 'INSUFFICIENT_BALANCE', message: 'الرصيد في الصندوق لا يكفي للدفع للمورد' };
        }

        const calculationHash = crypto.createHash('sha256').update(
            `${invoiceId}_${totalSalesAmount}_${soldQuantity}_${prepaidAmount}_${commPct}_${invoiceCurrency}_${invoiceRate}_${cashbox_id}`
        ).digest('hex');

        return {
            sold_quantity:            soldQuantity,
            total_sales_amount:       totalSalesAmount,
            commission_percentage:    commPct,
            commission_amount:        commissionAmount,
            supplier_share_base:      supplierShareBase,
            spoilage_value:           0,
            return_value:             0,
            adjusted_supplier_share:  supplierShareBase,
            prepaid_amount:           prepaidAmount,
            net_supplier_payout:      netSupplierPayout,
            remaining_quantity:       0,
            currency:                 invoiceCurrency,
            cashbox_balance:          cashboxBalance,
            balance_after_settlement: normalizeAmount(cashboxBalance - netSupplierPayout),
            can_submit:               true,
            warnings:                 [],
            calculation_hash:         calculationHash,
        };
    }

    async closeCommission(invoiceId, input) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const { commission_percentage, cashbox_id, calculation_hash, notes, settlement_date } = input || {};
        if (!calculation_hash) throw { code: 'VALIDATION_ERROR', message: 'يجب تنفيذ المعاينة قبل التسوية' };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(settlement_date || ''))) {
            throw { code: 'INVALID_SETTLEMENT_DATE', message: 'تاريخ التسوية غير صالح' };
        }
        const commPct = Number(commission_percentage);
        if (!Number.isFinite(commPct) || commPct < 0 || commPct > 100) {
            throw { code: 'INVALID_COMMISSION_PERCENTAGE', message: 'نسبة العمولة غير صالحة' };
        }
        if (!cashbox_id) throw { code: 'VALIDATION_ERROR', message: 'الصندوق مطلوب' };

        const db = await dbmanager.init();
        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [invoiceId]);
            if (!invoice) throw { code: 'PURCHASE_NOT_FOUND', message: 'الفاتورة غير موجودة' };
            if (invoice.invoice_type !== 'consignment') throw { code: 'NOT_CONSIGNMENT_INVOICE', message: 'ليست فاتورة أمانة' };
            if (invoice.settlement_status === 'settled') throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'تم إغلاق هذه الفاتورة مسبقاً' };
            if (invoice.status === 'cancelled') throw { code: 'PURCHASE_ALREADY_CANCELLED', message: 'الفاتورة ملغاة' };

            const existingSettlement = await dbGet(
                db,
                `SELECT id FROM consignment_settlements WHERE purchase_invoice_id = ? AND status = 'completed'`,
                [invoiceId]
            );
            if (existingSettlement) throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'يوجد تسوية مكتملة لهذه الفاتورة' };

            const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
            if (!cashbox) throw { code: 'CASHBOX_NOT_FOUND', message: 'الصندوق غير موجود' };
            if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'الصندوق غير نشط' };

            const invoiceCurrency = normalizeCurrency(invoice.currency);
            const invoiceRate = normalizeExchangeRate(invoiceCurrency, invoice.exchange_rate);
            assertCashboxCurrency(cashbox, invoiceCurrency);

            const purchaseItems = await dbAll(
                db,
                'SELECT id, product_id, quantity FROM purchase_invoice_items WHERE purchase_invoice_id = ? ORDER BY id ASC',
                [invoiceId]
            );
            const { resolvedItems, soldQuantity, totalSalesAmount } = normalizeManualConsignmentSales(input, purchaseItems);

            const prepaidAmount = normalizeAmount(invoice.paid_amount ?? 0);
            const expectedHash = crypto.createHash('sha256').update(
                `${invoiceId}_${totalSalesAmount}_${soldQuantity}_${prepaidAmount}_${commPct}_${invoiceCurrency}_${invoiceRate}_${cashbox_id}`
            ).digest('hex');

            if (calculation_hash !== expectedHash) {
                throw {
                    code: 'CONSIGNMENT_SALES_CHANGED',
                    message: 'تغيّرت بيانات التسوية أو المدفوعات المسبقة منذ آخر معاينة. يرجى مراجعة الأرقام والمحاولة مرة أخرى.',
                };
            }

            const commissionAmount = normalizeAmount((totalSalesAmount * commPct) / 100);
            const supplierShareBase = normalizeAmount(totalSalesAmount - commissionAmount);
            const netSupplierPayout = normalizeAmount(Math.max(0, supplierShareBase - prepaidAmount));

            const currentBalance = normalizeAmount(cashbox.balance);
            if (netSupplierPayout > currentBalance + 0.001) {
                throw { code: 'INSUFFICIENT_BALANCE', message: 'الرصيد في الصندوق لا يكفي لإتمام هذه العملية' };
            }

            const countRow = await dbGet(db, 'SELECT COUNT(*) AS count FROM consignment_settlements');
            const settlementNumber = `SET-${String(Number(countRow?.count ?? 0) + 1).padStart(6, '0')}`;

            const { lastID: settlementId } = await dbRun(db, `
                INSERT INTO consignment_settlements
                (purchase_invoice_id, settlement_number, settlement_date, sold_quantity, total_sales_amount,
                 commission_percentage, commission_amount, supplier_share, prepaid_amount, cashbox_id, currency,
                 remaining_stock_policy, returned_quantity, spoilage_quantity, carried_quantity,
                 spoilage_value, return_value, status, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 0, 0, 0, 0, 0, 'completed', ?, datetime('now'), datetime('now'))
            `, [
                invoiceId,
                settlementNumber,
                settlement_date,
                soldQuantity,
                totalSalesAmount,
                commPct,
                commissionAmount,
                supplierShareBase,
                prepaidAmount,
                cashbox_id,
                invoiceCurrency,
                notes ?? null,
            ]);

            // Record informational manual settlement item rows (zero touch on storage!)
            for (const item of resolvedItems) {
                await dbRun(db, `
                    INSERT INTO consignment_settlement_items
                    (settlement_id, purchase_invoice_item_id, product_id, stock_batch_id,
                     received_quantity, sold_quantity, remaining_quantity, sales_amount,
                     resolution_policy, resolved_quantity, stock_movement_id, notes, created_at)
                    VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'manual', 0, NULL, ?, datetime('now'))
                `, [
                    settlementId,
                    item.purchase_invoice_item_id,
                    item.product_id,
                    item.received_quantity,
                    item.sold_quantity,
                    item.remaining_quantity,
                    item.sales_amount,
                    notes ?? null,
                ]);
            }

            // Withdraw supplier share (net of prepaid) from the selected cashbox
            let paymentId = null;
            let cashboxTransactionId = null;
            if (netSupplierPayout > 0) {
                const balanceAfterPayout = normalizeAmount(currentBalance - netSupplierPayout);
                await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balanceAfterPayout, cashbox_id]);
                const { lastID: payoutMovementId } = await dbRun(db, `
                    INSERT INTO cashbox_transactions
                    (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                    VALUES (?, 'purchase', ?, ?, 'out', ?, ?, ?, ?, datetime('now'), datetime('now'))
                `, [cashbox_id, invoiceId, netSupplierPayout, currentBalance, balanceAfterPayout, settlement_date, `تسوية أمانة ${settlementNumber}`]);
                cashboxTransactionId = payoutMovementId;

                const { lastID: payId } = await dbRun(db, `
                    INSERT INTO payments
                    (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date, payment_method, status, cashbox_transaction_id, notes, created_at, updated_at)
                    VALUES ('supplier', ?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'cash', 'active', ?, ?, datetime('now'), datetime('now'))
                `, [
                    invoice.supplier_id,
                    invoiceId,
                    cashbox_id,
                    netSupplierPayout,
                    invoiceCurrency,
                    invoiceRate,
                    toBaseAmount(netSupplierPayout, invoiceRate),
                    settlement_date,
                    payoutMovementId,
                    `تسوية أمانة ${settlementNumber}`,
                ]);
                paymentId = payId;
            }

            // Clear the consignment invoice's remaining estimated balance from the supplier's ledger
            const openRemainingBase = toBaseAmount(normalizeAmount(invoice.remaining_amount ?? 0), invoiceRate);
            if (openRemainingBase > 0 && invoice.supplier_id) {
                await dbRun(
                    db,
                    `UPDATE suppliers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
                    [openRemainingBase, invoice.supplier_id]
                );
            }

            await dbRun(
                db,
                'UPDATE consignment_settlements SET payment_id = ?, cashbox_transaction_id = ?, return_income_transaction_id = NULL WHERE id = ?',
                [paymentId, cashboxTransactionId, settlementId]
            );
            await dbRun(
                db,
                `UPDATE purchase_invoices
                 SET settlement_status = 'settled', paid_amount = total, remaining_amount = 0, status = 'paid',
                     settled_at = ?, consignment_settlement_id = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [settlement_date, settlementId, invoiceId]
            );
            await logActivity(db, 'purchase_commission_closed', 'purchase_invoices', invoiceId, { settlement_id: settlementId });
            await dbRun(db, 'COMMIT');

            return await this.getConsignmentSettlement(invoiceId);
        } catch (err) {
            await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
            throw err;
        }
    }

    async getConsignmentSettlement(invoiceId) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();
        const settlement = await dbGet(db, `
            SELECT cs.*, c.name AS cashbox_name
            FROM consignment_settlements cs
            LEFT JOIN cashboxes c ON c.id = cs.cashbox_id
            WHERE cs.purchase_invoice_id = ?
            ORDER BY cs.id DESC
            LIMIT 1
        `, [invoiceId]);
        if (!settlement) return null;
        const items = await dbAll(
            db,
            `SELECT csi.*, p.name AS product_name, p.unit AS product_unit
             FROM consignment_settlement_items csi
             LEFT JOIN products p ON p.id = csi.product_id
             WHERE csi.settlement_id = ?
             ORDER BY csi.id ASC`,
            [settlement.id]
        );
        return {
            ...settlement,
            id: Number(settlement.id),
            purchase_invoice_id: Number(settlement.purchase_invoice_id),
            sold_quantity: round3(Number(settlement.sold_quantity ?? 0)),
            total_sales_amount: normalizeAmount(settlement.total_sales_amount),
            commission_percentage: Number(settlement.commission_percentage ?? 0),
            commission_amount: normalizeAmount(settlement.commission_amount),
            supplier_share: normalizeAmount(settlement.supplier_share),
            prepaid_amount: normalizeAmount(settlement.prepaid_amount ?? 0),
            cashbox_id: Number(settlement.cashbox_id),
            returned_quantity: Number(settlement.returned_quantity ?? 0),
            spoilage_quantity: Number(settlement.spoilage_quantity ?? 0),
            carried_quantity: Number(settlement.carried_quantity ?? 0),
            spoilage_value: normalizeAmount(settlement.spoilage_value ?? 0),
            return_value: normalizeAmount(settlement.return_value ?? 0),
            cashbox_name: settlement.cashbox_name || '—',
            items,
        };
    }

    async reverseCommissionSettlement(settlementId, reason) {
        if (!settlementId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        if (!reason || !String(reason).trim()) throw { code: 'VALIDATION_ERROR', message: 'سبب العكس مطلوب' };
        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');
            const settlement = await dbGet(db, 'SELECT * FROM consignment_settlements WHERE id = ?', [settlementId]);
            if (!settlement) throw { code: 'CONSIGNMENT_SETTLEMENT_NOT_FOUND', message: 'التسوية غير موجودة' };
            if (settlement.status === 'reversed') throw { code: 'CONSIGNMENT_SETTLEMENT_ALREADY_REVERSED', message: 'التسوية معكوسة مسبقاً' };

            const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [settlement.purchase_invoice_id]);
            if (!invoice) throw { code: 'PURCHASE_NOT_FOUND', message: 'الفاتورة غير موجودة' };

            // Zero storage modifications on reversal! Only financial reversal:
            let reverseCashboxTransactionId = null;
            const settlementPayment = settlement.payment_id
                ? await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [settlement.payment_id])
                : null;

            if (settlementPayment && settlementPayment.status !== 'reversed') {
                const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [settlementPayment.cashbox_id]);
                if (!cashbox) throw { code: 'CASHBOX_NOT_FOUND', message: 'الصندوق غير موجود' };

                const reverseAmount = normalizeAmount(settlementPayment.amount);
                const reverseAmountBase = normalizeAmount(
                    settlementPayment.amount_base ??
                    toBaseAmount(reverseAmount, settlementPayment.exchange_rate || 1)
                );
                const before = normalizeAmount(cashbox.balance);
                const after = normalizeAmount(before + reverseAmount);

                await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [after, cashbox.id]);
                const { lastID } = await dbRun(db, `
                    INSERT INTO cashbox_transactions
                    (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, reversed_transaction_id, reversal_reason, transaction_date, notes, created_at, updated_at)
                    VALUES (?, 'reversal', ?, ?, 'in', ?, ?, ?, ?, date('now'), ?, datetime('now'), datetime('now'))
                `, [cashbox.id, settlement.purchase_invoice_id, reverseAmount, before, after, settlement.cashbox_transaction_id ?? null, String(reason).trim(), `عكس تسوية أمانة ${settlement.settlement_number}`]);
                reverseCashboxTransactionId = lastID;

                await dbRun(db, `UPDATE payments SET status = 'reversed', reversal_reason = ?, updated_at = datetime('now') WHERE id = ?`, [String(reason).trim(), settlementPayment.id]);
                const { lastID: reversalPaymentId } = await dbRun(db, `
                    INSERT INTO payments
                    (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date, payment_method, status, reversed_payment_id, cashbox_transaction_id, reversal_reason, notes, created_at, updated_at)
                    VALUES (?, ?, 'purchase', ?, ?, ?, ?, ?, ?, date('now'), ?, 'reversed', ?, ?, ?, ?, datetime('now'), datetime('now'))
                `, [settlementPayment.party_type, settlementPayment.party_id, settlementPayment.invoice_id, settlementPayment.cashbox_id, reverseAmount, settlementPayment.currency, settlementPayment.exchange_rate, reverseAmountBase, settlementPayment.payment_method || 'cash', settlementPayment.id, reverseCashboxTransactionId, String(reason).trim(), `عكس دفعة تسوية أمانة #${settlementPayment.id}`]);
                await dbRun(db, 'UPDATE payments SET reversed_payment_id = ? WHERE id = ?', [reversalPaymentId, settlementPayment.id]);
            }

            if (settlement.cashbox_transaction_id && reverseCashboxTransactionId) {
                await dbRun(
                    db,
                    'UPDATE cashbox_transactions SET reversed_transaction_id = ?, reversal_reason = ? WHERE id = ?',
                    [reverseCashboxTransactionId, String(reason).trim(), settlement.cashbox_transaction_id]
                );
            }

            // Restore invoice's pre-settlement paid/remaining state & supplier balance
            const prepaidAmount = normalizeAmount(settlement.prepaid_amount ?? 0);
            const totalAmount = normalizeAmount(invoice.total ?? 0);
            const { remainingAmount: restoredRemaining, status: restoredStatus } = calculatePaymentState(totalAmount, prepaidAmount);
            const invoiceRate = normalizeExchangeRate(invoice.currency, invoice.exchange_rate);
            const restoredRemainingBase = toBaseAmount(restoredRemaining, invoiceRate);

            if (restoredRemainingBase > 0 && invoice.supplier_id) {
                await dbRun(
                    db,
                    `UPDATE suppliers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
                    [restoredRemainingBase, invoice.supplier_id]
                );
            }

            await dbRun(
                db,
                `UPDATE consignment_settlements SET status = 'reversed', reversal_reason = ?, updated_at = datetime('now') WHERE id = ?`,
                [String(reason).trim(), settlementId]
            );
            await dbRun(
                db,
                `UPDATE purchase_invoices
                 SET settlement_status = 'reversed', paid_amount = ?, remaining_amount = ?, status = ?, settled_at = NULL, updated_at = datetime('now')
                 WHERE id = ?`,
                [prepaidAmount, restoredRemaining, restoredStatus, settlement.purchase_invoice_id]
            );
            await logActivity(db, 'purchase_commission_reversed', 'purchase_invoices', settlement.purchase_invoice_id, { settlement_id: settlementId });
            await dbRun(db, 'COMMIT');
            return await this.getConsignmentSettlement(settlement.purchase_invoice_id);
        } catch (err) {
            await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
            throw err;
        }
    }
}

module.exports = new PurchaseInvoiceController();
