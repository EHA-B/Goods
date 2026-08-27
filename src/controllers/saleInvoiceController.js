'use strict';
/**
 * saleInvoiceController.js — Hardened Sale Invoice Business Module
 *
 * All mutations are atomic database transactions.
 * Stock is deducted from explicitly selected batches.
 * No generic CRUD exposed for accounting-sensitive operations.
 */

const path = require('path');
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


async function ensureInvoiceEditAuditColumns(db) {
    const tableName = 'sale_invoices';
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

class SaleInvoiceController {

    // ─── createSaleProcess ────────────────────────────────────────────────

    async createSaleProcess(input) {
        const {
            customer_id,
            invoice_number,
            invoice_date,
            discount_amount = 0,
            notes,
            items,
            initial_payment,
            currency,
            exchange_rate,
        } = input ?? {};

        if (!Array.isArray(items) || items.length === 0) throw { code: 'SALE_ITEM_INVALID', message: 'يجب إضافة صنف واحد على الأقل' };

        const validatedDate = validateDate(invoice_date, 'invoice_date');

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            // 1. Validate customer if provided
            let customer = null;
            if (customer_id) {
                customer = await dbGet(db, 'SELECT * FROM customers WHERE id = ?', [customer_id]);
                if (!customer) throw { code: 'CUSTOMER_NOT_FOUND', message: 'العميل غير موجود' };
                if (!customer.isActive) throw { code: 'INACTIVE_CUSTOMER', message: 'العميل غير نشط' };
            }

            // 2. Map items to calculation shape
            const mappedItems = items.map((item, index) => ({
                ...item,
                product_id: item.product_id,
                stock_batch_id: item.stock_batch_id,
                quantity: Number(item.quantity ?? 0),
                price: Number(item.sale_price ?? item.unit_price ?? item.unitPrice ?? 0),
                sale_price: Number(item.sale_price ?? item.unit_price ?? item.unitPrice ?? 0),
                cost_price: 0,
            }));

            // 3. Validate each item's batch
            for (let i = 0; i < mappedItems.length; i++) {
                const item = mappedItems[i];
                if (!item.stock_batch_id) throw { code: 'STOCK_BATCH_NOT_FOUND', message: `الصنف رقم ${i + 1}: stock_batch_id مطلوب` };

                const batch = await dbGet(db, 'SELECT * FROM stock_batches WHERE id = ?', [item.stock_batch_id]);
                if (!batch) throw { code: 'STOCK_BATCH_NOT_FOUND', message: `الصنف رقم ${i + 1}: الدفعة غير موجودة` };
                if (batch.product_id !== item.product_id) throw { code: 'STOCK_BATCH_PRODUCT_MISMATCH', message: `الصنف رقم ${i + 1}: الدفعة لا تتعلق بالمنتج المحدد` };
                if (!batch.isActive) throw { code: 'SALE_ITEM_INVALID', message: `الصنف رقم ${i + 1}: الدفعة غير نشطة` };
                if (batch.remaining_quantity < item.quantity - 0.001) {
                    throw { code: 'INSUFFICIENT_STOCK', message: `الصنف رقم ${i + 1}: الكمية المطلوبة (${item.quantity}) أكبر من المتوفر (${batch.remaining_quantity})` };
                }

                const product = await dbGet(db, 'SELECT id, isActive FROM products WHERE id = ?', [item.product_id]);
                if (!product) throw { code: 'PRODUCT_NOT_FOUND', message: `الصنف رقم ${i + 1}: المنتج غير موجود` };
                if (!product.isActive) throw { code: 'INACTIVE_PRODUCT', message: `الصنف رقم ${i + 1}: المنتج غير نشط` };
                // Cost is always authoritative from the selected stock batch.
                mappedItems[i].cost_price = normalizeAmount(batch.purchase_price_base ?? batch.purchase_price);
                mappedItems[i]._batch = batch;
            }

            // 4. Calculate totals
            const { normalizedItems, subtotal, discountAmount, totalAmount } = calculateInvoiceTotals(
                mappedItems, discount_amount
            );

            // 5. Walk-in policy: if customer is null and there's unpaid amount, reject
            if (!customer_id) {
                const initialAmt = Number(initial_payment?.amount ?? 0);
                if (initialAmt < totalAmount - 0.001) {
                    throw { code: 'VALIDATION_ERROR', message: 'يجب تحديد عميل للبيع الآجل. البيع النقدي الفوري يتطلب دفع المبلغ كاملًا.' };
                }
            }

            // 6. Generate invoice number
            let invNumber = invoice_number?.trim();
            if (!invNumber) {
                invNumber = await generateInvoiceNumber(db, 'SAL', 'sale_invoices');
            } else {
                const dup = await dbGet(db, 'SELECT id FROM sale_invoices WHERE invoice_number = ?', [invNumber]);
                if (dup) throw { code: 'DUPLICATE_INVOICE_NUMBER', message: `رقم الفاتورة ${invNumber} موجود مسبقًا` };
            }

            // 7. Insert sale invoice
            const invoiceCurrency = normalizeCurrency(currency);
            const invoiceRate = normalizeExchangeRate(invoiceCurrency, exchange_rate);
            
            const { lastID: invoiceId } = await dbRun(db,
                `INSERT INTO sale_invoices
                   (invoice_number, customer_id, sale_type_id, invoice_date,
                    subtotal, discount, discount_amount, total, paid_amount, remaining_amount, status, notes,
                    currency, exchange_rate,
                    created_at, updated_at)
                 VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 0, ?, 'confirmed', ?, ?, ?, datetime('now'), datetime('now'))`,
                [invNumber, customer_id ?? null, validatedDate,
                 subtotal, discountAmount, discountAmount, totalAmount, totalAmount, notes ?? null,
                 invoiceCurrency, invoiceRate]
            );

            // 8. Insert items + deduct stock + create stock movements
            for (let i = 0; i < normalizedItems.length; i++) {
                const item = normalizedItems[i];
                const batch = item._batch;
                const costPrice = normalizeAmount(item.cost_price);
                const revenueBase = toBaseAmount(item.price * item.quantity, invoiceRate);
                const profit = Math.round((revenueBase - (costPrice * item.quantity)) * 100) / 100;

                // Insert sale item (product_id is stored via batch)
                await dbRun(db,
                    `INSERT INTO sale_invoice_items
                       (sale_invoice_id, stock_batch_id, quantity, unit_price, line_total, cost_price, profit, notes, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [invoiceId, item.stock_batch_id, item.quantity, item.price, item.lineTotal, costPrice, profit, item.notes ?? null]
                );

                // Deduct batch remaining quantity
                const qtyBefore = normalizeAmount(batch.remaining_quantity);
                const qtyAfter  = Math.round((qtyBefore - item.quantity) * 1000) / 1000;
                await dbRun(db,
                    `UPDATE stock_batches SET remaining_quantity = ?, updated_at = datetime('now') WHERE id = ?`,
                    [qtyAfter, item.stock_batch_id]
                );

                // Create stock movement (sale_out)
                await dbRun(db,
                    `INSERT INTO stock_movements
                       (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                        reference_type, reference_id, reference_number, customer_id, notes, created_at)
                     VALUES (?, ?, 'sale_out', ?, ?, ?, 'sale_invoice', ?, ?, ?, ?, datetime('now'))`,
                    [batch.product_id, item.stock_batch_id, item.quantity, qtyBefore, qtyAfter,
                     invoiceId, invNumber, customer_id ?? null, `فاتورة بيع ${invNumber}`]
                );
            }

            // 9. Increase customer receivable balance (if customer)
            if (customer_id) {
                const customerBaseAmount = toBaseAmount(totalAmount, invoiceRate);
                await dbRun(db,
                    `UPDATE customers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
                    [customerBaseAmount, customer_id]
                );
            }

            // 10. Handle optional initial payment
            let finalPaid = 0;
            if (initial_payment && Number(initial_payment.amount ?? 0) > 0) {
                const payAmount = Number(initial_payment.amount);
                const payDate   = validateDate(initial_payment.payment_date ?? validatedDate, 'initial_payment.payment_date');
                const payBox    = initial_payment.cashbox_id;

                if (!payBox) throw { code: 'VALIDATION_ERROR', message: 'cashbox_id مطلوب للدفعة الأولية' };
                if (payAmount > totalAmount + 0.001) throw { code: 'PAYMENT_EXCEEDS_OUTSTANDING', message: 'الدفعة الأولية تتجاوز إجمالي الفاتورة' };

                const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [payBox]);
                if (!cashbox)          throw { code: 'NOT_FOUND', message: 'الصندوق غير موجود' };
                if (!cashbox.isActive)  throw { code: 'VALIDATION_ERROR', message: 'الصندوق غير نشط' };
                
                let paymentExchangeRate = invoiceRate;
                let cashboxAmount = payAmount;
                
                if (cashbox.currency !== invoiceCurrency) {
                    if (!initial_payment.exchange_rate) {
                        throw { code: 'MISSING_EXCHANGE_RATE', message: 'سعر الصرف مطلوب عند اختلاف عملة الصندوق عن الفاتورة' };
                    }
                    paymentExchangeRate = normalizeExchangeRate(cashbox.currency, initial_payment.exchange_rate);
                    const amountBaseFromInvoice = toBaseAmount(payAmount, invoiceRate);
                    cashboxAmount = normalizeAmount(amountBaseFromInvoice / paymentExchangeRate);
                } else {
                    paymentExchangeRate = invoiceRate;
                }
                const payBaseAmountCashbox = toBaseAmount(cashboxAmount, paymentExchangeRate);

                // Increase cashbox
                const balBefore = normalizeAmount(cashbox.balance);
                const balAfter  = Math.round((balBefore + cashboxAmount) * 100) / 100;
                await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balAfter, payBox]);
                const { lastID: cbtId } = await dbRun(db,
                    `INSERT INTO cashbox_transactions
                       (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                     VALUES (?, 'sale', ?, ?, 'in', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [payBox, invoiceId, cashboxAmount, balBefore, balAfter, payDate, `دفعة أولى فاتورة بيع #${invNumber}`]
                );

                // Create payment record
                await dbRun(db,
                    `INSERT INTO payments
                       (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date,
                        status, cashbox_transaction_id, notes, created_at, updated_at)
                     VALUES ('customer', ?, 'sale', ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))`,
                    [customer_id ?? null, invoiceId, payBox, cashboxAmount, cashbox.currency, paymentExchangeRate,
                     payBaseAmountCashbox, payDate, cbtId, initial_payment.notes ?? null]
                );

                // Reduce customer balance by payment
                if (customer_id) {
                    const payBaseAmount = toBaseAmount(payAmount, invoiceRate);
                    await dbRun(db,
                        `UPDATE customers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
                        [payBaseAmount, customer_id]
                    );
                }

                finalPaid = payAmount;
            }

            // 11. Update invoice paid/remaining/status
            const { remainingAmount, status: finalStatus } = calculatePaymentState(totalAmount, finalPaid);
            await dbRun(db,
                `UPDATE sale_invoices SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
                [finalPaid, remainingAmount, finalStatus, invoiceId]
            );

            // 12. Activity log
            await logActivity(db, 'sale_created', 'sale_invoices', invoiceId, { invoice_number: invNumber, customer_id, total: totalAmount });

            await dbRun(db, 'COMMIT');

            return this.getSaleInvoiceDetails(invoiceId);

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }


    async updateSaleInvoice(id, input, userId) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'رقم الفاتورة مطلوب' };
        const { customer_id, invoice_number, invoice_date, discount_amount = 0, notes, items, currency, exchange_rate } = input ?? {};
        if (!Array.isArray(items) || items.length === 0) throw { code: 'SALE_ITEM_INVALID', message: 'يجب إضافة صنف واحد على الأقل' };

        const db = await dbmanager.init();
        await ensureInvoiceEditAuditColumns(db);
        try {
            await dbRun(db, 'BEGIN TRANSACTION');
            const oldInvoice = await dbGet(db, 'SELECT * FROM sale_invoices WHERE id = ?', [id]);
            if (!oldInvoice) throw { code: 'NOT_FOUND', message: 'فاتورة البيع غير موجودة' };
            if (oldInvoice.status === 'cancelled') throw { code: 'SALE_ALREADY_CANCELLED', message: 'لا يمكن تعديل فاتورة ملغاة' };

            const oldItems = await dbAll(db, 'SELECT * FROM sale_invoice_items WHERE sale_invoice_id = ? ORDER BY id', [id]);
            const activePayments = await dbAll(db, `SELECT * FROM payments WHERE invoice_id = ? AND payment_type = 'sale' AND status = 'active'`, [id]);
            const paidAmount = normalizeAmount(oldInvoice.paid_amount);
            const nextCurrency = normalizeCurrency(currency ?? oldInvoice.currency);
            const nextRate = normalizeExchangeRate(nextCurrency, exchange_rate ?? oldInvoice.exchange_rate);

            if (activePayments.length && (nextCurrency !== normalizeCurrency(oldInvoice.currency) || Math.abs(nextRate - normalizeExchangeRate(oldInvoice.currency, oldInvoice.exchange_rate)) > 0.000001)) {
                throw { code: 'INVOICE_EDIT_PAYMENT_LOCK', message: 'لا يمكن تغيير العملة أو سعر الصرف بعد وجود دفعات. اعكس الدفعات أولًا.' };
            }
            if (activePayments.length && Number(customer_id ?? 0) !== Number(oldInvoice.customer_id ?? 0)) {
                throw { code: 'INVOICE_EDIT_PAYMENT_LOCK', message: 'لا يمكن تغيير العميل بعد وجود دفعات. اعكس الدفعات أولًا.' };
            }

            if (customer_id) {
                const customer = await dbGet(db, 'SELECT * FROM customers WHERE id = ?', [customer_id]);
                if (!customer || !customer.isActive) throw { code: 'CUSTOMER_NOT_FOUND', message: 'العميل غير موجود أو غير نشط' };
            }

            let invNumber = String(invoice_number ?? oldInvoice.invoice_number).trim();
            const duplicate = await dbGet(db, 'SELECT id FROM sale_invoices WHERE invoice_number = ? AND id <> ?', [invNumber, id]);
            if (duplicate) throw { code: 'DUPLICATE_INVOICE_NUMBER', message: `رقم الفاتورة ${invNumber} موجود مسبقًا` };
            const validatedDate = validateDate(invoice_date ?? oldInvoice.invoice_date, 'invoice_date');

            // Restore old stock first; transaction rollback protects consistency if new validation fails.
            for (const oldItem of oldItems) {
                const batch = await dbGet(db, 'SELECT * FROM stock_batches WHERE id = ?', [oldItem.stock_batch_id]);
                if (!batch) throw { code: 'STOCK_BATCH_NOT_FOUND', message: 'إحدى دفعات الفاتورة القديمة لم تعد موجودة' };
                const restored = Math.round((normalizeAmount(batch.remaining_quantity) + normalizeAmount(oldItem.quantity)) * 1000) / 1000;
                await dbRun(db, `UPDATE stock_batches SET remaining_quantity = ?, isActive = 1, updated_at = datetime('now') WHERE id = ?`, [restored, batch.id]);
            }
            await dbRun(db, `DELETE FROM stock_movements WHERE reference_type = 'sale_invoice' AND reference_id = ? AND movement_type = 'sale_out'`, [id]);
            await dbRun(db, 'DELETE FROM sale_invoice_items WHERE sale_invoice_id = ?', [id]);

            const mappedItems = items.map((item) => ({ ...item, product_id: Number(item.product_id), stock_batch_id: Number(item.stock_batch_id), quantity: Number(item.quantity ?? 0), price: Number(item.sale_price ?? item.unit_price ?? 0), sale_price: Number(item.sale_price ?? item.unit_price ?? 0), cost_price: 0 }));
            for (let i = 0; i < mappedItems.length; i++) {
                const item = mappedItems[i];
                const batch = await dbGet(db, 'SELECT * FROM stock_batches WHERE id = ?', [item.stock_batch_id]);
                if (!batch || Number(batch.product_id) !== item.product_id || !batch.isActive) throw { code: 'STOCK_BATCH_NOT_FOUND', message: `الصنف رقم ${i + 1}: الدفعة غير صالحة` };
                if (normalizeAmount(batch.remaining_quantity) < item.quantity - 0.001) throw { code: 'INSUFFICIENT_STOCK', message: `الصنف رقم ${i + 1}: الكمية أكبر من المتوفر` };
                mappedItems[i].cost_price = normalizeAmount(batch.purchase_price_base ?? batch.purchase_price);
                mappedItems[i]._batch = batch;
            }

            const { normalizedItems, subtotal, discountAmount, totalAmount } = calculateInvoiceTotals(mappedItems, discount_amount);
            if (paidAmount > totalAmount + 0.001) throw { code: 'INVOICE_EDIT_BELOW_PAID', message: 'الإجمالي الجديد أقل من المبلغ المدفوع. اعكس جزءًا من الدفعات أولًا.' };
            const { remainingAmount, status } = calculatePaymentState(totalAmount, paidAmount);
            if (!customer_id && remainingAmount > 0.001) throw { code: 'VALIDATION_ERROR', message: 'البيع غير المدفوع بالكامل يحتاج عميلًا' };

            const oldRate = normalizeExchangeRate(oldInvoice.currency, oldInvoice.exchange_rate);
            const oldRemainingBase = toBaseAmount(oldInvoice.remaining_amount, oldRate);
            const newRemainingBase = toBaseAmount(remainingAmount, nextRate);
            if (oldInvoice.customer_id) await dbRun(db, `UPDATE customers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`, [oldRemainingBase, oldInvoice.customer_id]);
            if (customer_id) await dbRun(db, `UPDATE customers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`, [newRemainingBase, customer_id]);

            for (const item of normalizedItems) {
                const batch = item._batch;
                const costPrice = normalizeAmount(item.cost_price);
                const profit = Math.round((toBaseAmount(item.price * item.quantity, nextRate) - costPrice * item.quantity) * 100) / 100;
                await dbRun(db, `INSERT INTO sale_invoice_items (sale_invoice_id, stock_batch_id, quantity, unit_price, line_total, cost_price, profit, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`, [id, item.stock_batch_id, item.quantity, item.price, item.lineTotal, costPrice, profit, item.notes ?? null]);
                const qtyBefore = normalizeAmount(batch.remaining_quantity);
                const qtyAfter = Math.round((qtyBefore - item.quantity) * 1000) / 1000;
                await dbRun(db, `UPDATE stock_batches SET remaining_quantity = ?, updated_at = datetime('now') WHERE id = ?`, [qtyAfter, item.stock_batch_id]);
                await dbRun(db, `INSERT INTO stock_movements (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after, reference_type, reference_id, reference_number, customer_id, notes, created_at) VALUES (?, ?, 'sale_out', ?, ?, ?, 'sale_invoice', ?, ?, ?, ?, datetime('now'))`, [batch.product_id, item.stock_batch_id, item.quantity, qtyBefore, qtyAfter, id, invNumber, customer_id ?? null, `فاتورة بيع معدلة ${invNumber}`]);
            }

            await dbRun(db, `UPDATE sale_invoices SET invoice_number = ?, customer_id = ?, invoice_date = ?, subtotal = ?, discount = ?, discount_amount = ?, total = ?, remaining_amount = ?, status = ?, notes = ?, currency = ?, exchange_rate = ?, is_edited = 1, edit_count = COALESCE(edit_count, 0) + 1, last_edited_at = datetime('now'), last_edited_by = ?, updated_at = datetime('now') WHERE id = ?`, [invNumber, customer_id ?? null, validatedDate, subtotal, discountAmount, discountAmount, totalAmount, remainingAmount, status, notes ?? null, nextCurrency, nextRate, userId ?? null, id]);

            const newData = { invoice_number: invNumber, customer_id: customer_id ?? null, invoice_date: validatedDate, total: totalAmount, remaining_amount: remainingAmount, currency: nextCurrency, exchange_rate: nextRate, items: normalizedItems.map(x => ({ product_id: x.product_id, stock_batch_id: x.stock_batch_id, quantity: x.quantity, sale_price: x.price })) };
            await dbRun(db, `INSERT INTO activity_logs (user_id, action, table_name, record_id, old_data, new_data, created_at, updated_at) VALUES (?, 'sale_edited', 'sale_invoices', ?, ?, ?, datetime('now'), datetime('now'))`, [userId ?? null, id, JSON.stringify({ invoice: oldInvoice, items: oldItems }), JSON.stringify(newData)]);
            await dbRun(db, 'COMMIT');
            return this.getSaleInvoiceDetails(id);
        } catch (err) {
            await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
            throw normalizeInvoiceEditError(err);
        }
    }

    // ─── getSaleInvoiceDetails ────────────────────────────────────────────

    async getSaleInvoiceDetails(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();

        const invoice = await dbGet(db, 'SELECT * FROM sale_invoices WHERE id = ?', [id]);
        if (!invoice) throw { code: 'NOT_FOUND', message: 'فاتورة البيع غير موجودة' };

        const customer = invoice.customer_id
            ? await dbGet(db, 'SELECT * FROM customers WHERE id = ?', [invoice.customer_id])
            : null;

        const items = await dbAll(db,
            `SELECT sii.*,
                    sb.batch_code, sb.product_id, sb.purchase_price as batch_cost,
                    sb.remaining_quantity as batch_remaining, sb.received_date as batch_received_date,
                    sb.expiry_date as batch_expiry_date, sb.isActive as batch_active,
                    p.name as product_name, p.unit as product_unit
             FROM sale_invoice_items sii
             LEFT JOIN stock_batches sb ON sii.stock_batch_id = sb.id
             LEFT JOIN products p ON sb.product_id = p.id
             WHERE sii.sale_invoice_id = ?
             ORDER BY sii.id`,
            [id]
        );

        const payments = await dbAll(db,
            `SELECT p.*, c.name as cashbox_name
             FROM payments p
             LEFT JOIN cashboxes c ON p.cashbox_id = c.id
             WHERE p.invoice_id = ? AND p.payment_type = 'sale'
             ORDER BY p.payment_date DESC, p.id DESC`,
            [id]
        );

        const activity = await dbAll(db,
            `SELECT * FROM activity_logs WHERE table_name = 'sale_invoices' AND record_id = ? ORDER BY created_at DESC LIMIT 20`,
            [id]
        );

        const invoiceRate = normalizeExchangeRate(invoice.currency, invoice.exchange_rate);
        const financial_summary = {
            subtotal: normalizeAmount(invoice.subtotal),
            discount_amount: normalizeAmount(invoice.discount_amount ?? invoice.discount),
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

        return { invoice, customer, items, payments, financial_summary, activity };
    }

    // ─── listSaleInvoices ─────────────────────────────────────────────────

    async listSaleInvoices(filters = {}, pagination = {}) {
        const db = await dbmanager.init();

        const { search, customer_id, status, date_from, date_to } = filters;
        const page  = Math.max(1, Number(pagination.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(pagination.limit ?? 25)));
        const offset = (page - 1) * limit;

        let where = '1=1';
        const params = [];

        if (search?.trim()) {
            where += ' AND (si.invoice_number LIKE ? OR c.name LIKE ?)';
            params.push(`%${search.trim()}%`, `%${search.trim()}%`);
        }
        if (customer_id) { where += ' AND si.customer_id = ?'; params.push(customer_id); }
        if (status)      { where += ' AND si.status = ?'; params.push(status); }
        if (date_from)   { where += ' AND si.invoice_date >= ?'; params.push(date_from); }
        if (date_to)     { where += ' AND si.invoice_date <= ?'; params.push(date_to); }

        const countRow = await dbGet(db,
            `SELECT COUNT(*) as total FROM sale_invoices si LEFT JOIN customers c ON si.customer_id = c.id WHERE ${where}`,
            params
        );
        const total = Number(countRow?.total ?? 0);

        const items = await dbAll(db,
            `SELECT si.*, c.name as customer_name
             FROM sale_invoices si
             LEFT JOIN customers c ON si.customer_id = c.id
             WHERE ${where}
             ORDER BY si.invoice_date DESC, si.id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            items,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        };
    }

    // ─── cancelSaleInvoice ────────────────────────────────────────────────

    async cancelSaleInvoice(id, reason) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        if (!reason?.trim()) throw { code: 'VALIDATION_ERROR', message: 'سبب الإلغاء مطلوب' };

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            const invoice = await dbGet(db, 'SELECT * FROM sale_invoices WHERE id = ?', [id]);
            if (!invoice) throw { code: 'NOT_FOUND', message: 'فاتورة البيع غير موجودة' };
            if (invoice.status === 'cancelled') throw { code: 'SALE_ALREADY_CANCELLED', message: 'الفاتورة ملغاة مسبقًا' };

            // 1. Reverse active sale payments
            const activePayments = await dbAll(db,
                `SELECT * FROM payments WHERE invoice_id = ? AND payment_type = 'sale' AND status = 'active'`,
                [id]
            );
            for (const payment of activePayments) {
                const amount = normalizeAmount(payment.amount);
                await dbRun(db,
                    `UPDATE payments SET status = 'reversed', reversal_reason = ?, updated_at = datetime('now') WHERE id = ?`,
                    [reason, payment.id]
                );
                // Deduct from cashbox (reverse of 'in')
                const cashbox = await dbGet(db, 'SELECT balance, isActive FROM cashboxes WHERE id = ?', [payment.cashbox_id]);
                if (!cashbox) throw { code: 'CASHBOX_NOT_FOUND', message: 'صندوق الدفعة غير موجود' };
                if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'صندوق الدفعة غير نشط' };
                const balBefore = normalizeAmount(cashbox.balance);
                if (balBefore < amount - 0.001) {
                    throw { code: 'SALE_CANNOT_BE_CANCELLED_CASHBOX_BALANCE', message: 'لا يمكن إلغاء الفاتورة لأن رصيد الصندوق لا يكفي لعكس الدفعات' };
                }
                const balAfter  = Math.round((balBefore - amount) * 100) / 100;
                await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balAfter, payment.cashbox_id]);
                await dbRun(db,
                    `INSERT INTO cashbox_transactions
                       (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                     VALUES (?, 'reversal', ?, ?, 'out', ?, ?, date('now'), ?, datetime('now'), datetime('now'))`,
                    [payment.cashbox_id, payment.id, amount, balBefore, balAfter, `إلغاء فاتورة بيع #${invoice.invoice_number}`]
                );
            }

            // 2. Restore customer balance (net effect = remaining receivable)
            if (invoice.customer_id) {
                const totalAmount = normalizeAmount(invoice.total);
                const totalPaid   = normalizeAmount(invoice.paid_amount);
                const remainingBalance = toBaseAmount(Math.max(0, totalAmount - totalPaid), normalizeExchangeRate(invoice.currency, invoice.exchange_rate));
                if (remainingBalance > 0) {
                    await dbRun(db,
                        `UPDATE customers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
                        [remainingBalance, invoice.customer_id]
                    );
                }
            }

            // 3. Restore sold quantities to exact original stock batches + create stock movements
            const saleItems = await dbAll(db,
                `SELECT sii.*, sb.product_id FROM sale_invoice_items sii JOIN stock_batches sb ON sii.stock_batch_id = sb.id WHERE sii.sale_invoice_id = ?`,
                [id]
            );
            for (const item of saleItems) {
                const qty = normalizeAmount(item.quantity);
                // Get current remaining for movement record
                const batch = await dbGet(db, 'SELECT remaining_quantity FROM stock_batches WHERE id = ?', [item.stock_batch_id]);
                const qtyBefore = normalizeAmount(batch.remaining_quantity);
                const qtyAfter  = Math.round((qtyBefore + qty) * 1000) / 1000;

                // Restore batch quantity
                await dbRun(db,
                    `UPDATE stock_batches SET remaining_quantity = ?, isActive = 1, updated_at = datetime('now') WHERE id = ?`,
                    [qtyAfter, item.stock_batch_id]
                );

                // Stock movement: sale_cancel_in
                await dbRun(db,
                    `INSERT INTO stock_movements
                       (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                        reference_type, reference_id, reference_number, customer_id, notes, created_at)
                     VALUES (?, ?, 'sale_cancel_in', ?, ?, ?, 'sale_invoice', ?, ?, ?, ?, datetime('now'))`,
                    [item.product_id, item.stock_batch_id, qty, qtyBefore, qtyAfter,
                     id, invoice.invoice_number, invoice.customer_id, `إلغاء فاتورة بيع #${invoice.invoice_number}`]
                );
            }

            // 4. Mark invoice cancelled
            await dbRun(db,
                `UPDATE sale_invoices SET status = 'cancelled', paid_amount = 0, remaining_amount = 0, updated_at = datetime('now') WHERE id = ?`,
                [id]
            );

            // 5. Activity log
            await logActivity(db, 'sale_cancelled', 'sale_invoices', id, { reason, invoice_number: invoice.invoice_number });

            await dbRun(db, 'COMMIT');

            return this.getSaleInvoiceDetails(id);

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── deleteDraftSaleInvoice ───────────────────────────────────────────

    async deleteDraftSaleInvoice(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();

        const invoice = await dbGet(db, 'SELECT * FROM sale_invoices WHERE id = ?', [id]);
        if (!invoice) throw { code: 'NOT_FOUND', message: 'فاتورة البيع غير موجودة' };
        if (invoice.status !== 'draft') throw { code: 'SALE_INVOICE_LOCKED', message: 'الحذف المباشر متاح للفواتير المسودة فقط' };

        const payCount = await dbGet(db, `SELECT COUNT(*) as cnt FROM payments WHERE invoice_id = ? AND payment_type = 'sale'`, [id]);
        if (Number(payCount?.cnt ?? 0) > 0) throw { code: 'SALE_INVOICE_LOCKED', message: 'لا يمكن حذف فاتورة تحتوي على دفعات' };

        await dbRun(db, 'DELETE FROM sale_invoice_items WHERE sale_invoice_id = ?', [id]);
        await dbRun(db, 'DELETE FROM sale_invoices WHERE id = ?', [id]);

        return { success: true, message: 'تم حذف الفاتورة بنجاح' };
    }

    // ─── getAvailableBatches ──────────────────────────────────────────────

    async getAvailableBatches(productId) {
        if (!productId) throw { code: 'VALIDATION_ERROR', message: 'productId مطلوب' };
        const db = await dbmanager.init();
        return dbAll(db,
            `SELECT sb.*, p.name as product_name, p.unit, s.name as supplier_name
             FROM stock_batches sb
             LEFT JOIN products p ON sb.product_id = p.id
             LEFT JOIN suppliers s ON sb.supplier_id = s.id
             WHERE sb.product_id = ? AND sb.isActive = 1 AND sb.remaining_quantity > 0
             ORDER BY sb.received_date ASC, sb.id ASC`,
            [productId]
        );
    }

    // ─── Legacy read methods ──────────────────────────────────────────────

    async getSaleInvoice(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();
        const row = await dbGet(db, 'SELECT * FROM sale_invoices WHERE id = ?', [id]);
        if (!row) throw { code: 'NOT_FOUND', message: 'فاتورة البيع غير موجودة' };
        return row;
    }

    async getAllSaleInvoices() {
        const db = await dbmanager.init();
        return dbAll(db,
            `SELECT si.*, c.name as customer_name
             FROM sale_invoices si
             LEFT JOIN customers c ON si.customer_id = c.id
             ORDER BY si.invoice_date DESC, si.id DESC`
        );
    }

    async getFullSaleInvoice(id) {
        return this.getSaleInvoiceDetails(id);
    }
}

module.exports = new SaleInvoiceController();
