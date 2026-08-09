'use strict';
/**
 * purchaseInvoiceController.js — Hardened Purchase Invoice Business Module
 *
 * Business operations are atomic database transactions.
 * No generic CRUD is exposed to the renderer for accounting-sensitive operations.
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

class PurchaseInvoiceController {

    // ─── createFullPurchaseInvoice ─────────────────────────────────────────

    async createFullPurchaseInvoice(input) {
        const {
            supplier_id,
            invoice_number,
            invoice_date,
            invoice_type = 'standard',
            discount_amount = 0,
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
            const mappedItems = items.map((item, index) => ({
                ...item,
                product_id: item.product_id,
                quantity: Number(item.quantity ?? 0),
                price: Number(item.purchase_price ?? item.unit_price ?? item.price ?? 0),
                purchase_price: Number(item.purchase_price ?? item.unit_price ?? item.price ?? 0),
            }));

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
            const { normalizedItems, subtotal, discountAmount, totalAmount } = calculateInvoiceTotals(
                mappedItems, discount_amount
            );
            if (discountAmount > subtotal) {
                throw { code: 'VALIDATION_ERROR', message: 'الخصم لا يمكن أن يتجاوز المجموع الفرعي' };
            }

            // 5. Validate/generate invoice number
            let invNumber = invoice_number?.trim();
            if (!invNumber) {
                invNumber = await generateInvoiceNumber(db, 'PUR', 'purchase_invoices');
            } else {
                const dup = await dbGet(db, 'SELECT id FROM purchase_invoices WHERE invoice_number = ?', [invNumber]);
                if (dup) throw { code: 'DUPLICATE_INVOICE_NUMBER', message: `رقم الفاتورة ${invNumber} موجود مسبقًا` };
            }

            // 6. Determine initial status
            let status = 'confirmed';
            if (invoice_type === 'consignment') status = 'confirmed'; // consignment stays confirmed until closed

            // 7. Insert purchase invoice
            const invoiceCurrency = normalizeCurrency(currency);
            const invoiceRate = normalizeExchangeRate(invoiceCurrency, exchange_rate);
            if (invoice_type === 'consignment' && invoiceCurrency !== 'SYP') {
                throw {
                    code: 'CONSIGNMENT_CURRENCY_NOT_SUPPORTED',
                    message: 'فواتير الأمانة متعددة العملات غير مدعومة حاليًا. استخدم SYP لفاتورة الأمانة.',
                };
            }
            
            const { lastID: invoiceId } = await dbRun(db,
                `INSERT INTO purchase_invoices
                   (invoice_number, supplier_id, invoice_type, invoice_date,
                    subtotal, discount, discount_amount, tax, total, paid_amount, remaining_amount, status, notes,
                    currency, exchange_rate,
                    created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [invNumber, supplier_id, invoice_type, validatedDate,
                 subtotal, discountAmount, discountAmount, totalAmount, totalAmount, status, notes ?? null,
                 invoiceCurrency, invoiceRate]
            );

            // 8. Insert items + create stock batches + stock movements
            for (let i = 0; i < normalizedItems.length; i++) {
                const item = normalizedItems[i];

                // Validate item received_date
                const receivedDate = validateDate(item.received_date ?? validatedDate, `item[${i}].received_date`);
                const expiryDate = item.expiry_date ? validateDate(item.expiry_date, `item[${i}].expiry_date`) : null;
                if (expiryDate && expiryDate < receivedDate) {
                    throw { code: 'VALIDATION_ERROR', message: `الصنف رقم ${i + 1}: تاريخ الانتهاء لا يمكن أن يسبق تاريخ الاستلام` };
                }

                // Insert purchase invoice item
                await dbRun(db,
                    `INSERT INTO purchase_invoice_items
                       (purchase_invoice_id, product_id, quantity, unit_price, line_total, notes, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [invoiceId, item.product_id, item.quantity, item.purchase_price, item.lineTotal, item.notes ?? null]
                );

                // Generate batch code
                const batchCode = item.batch_code?.trim() || `${invNumber}-B${String(i + 1).padStart(2, '0')}`;
                // Check batch code uniqueness if provided
                if (batchCode) {
                    const dupBatch = await dbGet(db, 'SELECT id FROM stock_batches WHERE batch_code = ?', [batchCode]);
                    if (dupBatch) throw { code: 'DUPLICATE_BATCH_CODE', message: `كود الدفعة ${batchCode} مستخدم مسبقًا` };
                }

                // Insert stock batch
                const { lastID: batchId } = await dbRun(db,
                    `INSERT INTO stock_batches
                       (product_id, supplier_id, purchase_invoice_id, batch_code,
                        quantity, remaining_quantity, purchase_price, purchase_currency,
                        purchase_exchange_rate, purchase_price_base, received_date,
                        expiry_date, notes, isActive, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
                    [item.product_id, supplier_id, invoiceId, batchCode,
                     item.quantity, item.quantity, item.purchase_price, invoiceCurrency,
                     invoiceRate, toBaseAmount(item.purchase_price, invoiceRate), receivedDate,
                     expiryDate, item.batch_notes ?? null]
                );

                // Create stock movement (purchase_in)
                await dbRun(db,
                    `INSERT INTO stock_movements
                       (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                        reference_type, reference_id, reference_number, supplier_id, notes, created_at)
                     VALUES (?, ?, 'purchase_in', ?, 0, ?, 'purchase_invoice', ?, ?, ?, ?, datetime('now'))`,
                    [item.product_id, batchId, item.quantity, item.quantity, invoiceId, invNumber, supplier_id, `فاتورة شراء ${invNumber}`]
                );
            }

            // 9. Increase supplier payable balance by invoice total
            const supplierBaseAmount = toBaseAmount(totalAmount, invoiceRate);
            await dbRun(db,
                `UPDATE suppliers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
                [supplierBaseAmount, supplier_id]
            );

            // 10. Handle optional initial payment
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
                } else {
                    paymentExchangeRate = invoiceRate;
                }
                const payBaseAmountCashbox = toBaseAmount(cashboxAmount, paymentExchangeRate);
                
                if (cashbox.balance < cashboxAmount - 0.001) throw { code: 'INSUFFICIENT_BALANCE', message: `رصيد الصندوق (${cashbox.balance}) غير كافٍ` };

                // Deduct cashbox
                const balBefore = normalizeAmount(cashbox.balance);
                const balAfter  = Math.round((balBefore - cashboxAmount) * 100) / 100;
                await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balAfter, payBox]);
                const { lastID: cbtId } = await dbRun(db,
                    `INSERT INTO cashbox_transactions
                       (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                     VALUES (?, 'purchase', ?, ?, 'out', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [payBox, invoiceId, cashboxAmount, balBefore, balAfter, payDate, `دفعة أولى فاتورة شراء #${invNumber}`]
                );

                // Create payment record
                await dbRun(db,
                    `INSERT INTO payments
                       (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date,
                        status, cashbox_transaction_id, notes, created_at, updated_at)
                     VALUES ('supplier', ?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))`,
                    [supplier_id, invoiceId, payBox, cashboxAmount, cashbox.currency, paymentExchangeRate,
                     payBaseAmountCashbox, payDate, cbtId, initial_payment.notes ?? null]
                );

                // Reduce supplier balance by payment amount
                const payBaseAmount = toBaseAmount(payAmount, invoiceRate);
                await dbRun(db,
                    `UPDATE suppliers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
                    [payBaseAmount, supplier_id]
                );

                finalPaid = payAmount;
            }

            // 11. Update invoice paid/remaining/status
            const { remainingAmount, status: finalStatus } = calculatePaymentState(totalAmount, finalPaid);
            await dbRun(db,
                `UPDATE purchase_invoices SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
                [finalPaid, remainingAmount, finalStatus, invoiceId]
            );

            // 12. Activity log
            await logActivity(db, 'purchase_created', 'purchase_invoices', invoiceId, { invoice_number: invNumber, supplier_id, total: totalAmount });

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

            // 1. Validate invoice
            const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [invoiceId]);
            if (!invoice) throw { code: 'NOT_FOUND', message: 'فاتورة الشراء غير موجودة' };
            if (invoice.status === 'cancelled') throw { code: 'PURCHASE_ALREADY_CANCELLED', message: 'لا يمكن التعديل على فاتورة ملغاة' };
            if (invoice.invoice_type === 'consignment' && invoice.settlement_status === 'settled') {
                throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'لا يمكن إضافة أصناف لفاتورة أمانة تم إغلاقها' };
            }

            // 2. Validate supplier
            const supplier = await dbGet(db, 'SELECT * FROM suppliers WHERE id = ?', [invoice.supplier_id]);
            if (!supplier) throw { code: 'SUPPLIER_NOT_FOUND', message: 'المورد غير موجود' };
            if (!supplier.isActive) throw { code: 'INACTIVE_SUPPLIER', message: 'المورد غير نشط' };

            // 3. Map new items to common shape
            const mappedItems = items.map((item, index) => ({
                ...item,
                product_id: item.product_id,
                quantity: Number(item.quantity ?? 0),
                price: Number(item.purchase_price ?? item.unit_price ?? item.price ?? 0),
                purchase_price: Number(item.purchase_price ?? item.unit_price ?? item.price ?? 0),
            }));

            // 4. Validate products and prevent ambiguous duplicate product rows in this batch.
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

            // 5. Calculate totals for new items
            const { normalizedItems, subtotal: newItemsSubtotal, totalAmount: newItemsTotal } = calculateInvoiceTotals(mappedItems, 0);

            const invoiceCurrency = normalizeCurrency(invoice.currency);
            const invoiceRate = normalizeExchangeRate(invoiceCurrency, invoice.exchange_rate);

            // 6. Insert items + create stock batches + stock movements
            for (let i = 0; i < normalizedItems.length; i++) {
                const item = normalizedItems[i];

                // Validate item received_date
                const receivedDate = validateDate(item.received_date ?? invoice.invoice_date, `item[${i}].received_date`);
                const expiryDate = item.expiry_date ? validateDate(item.expiry_date, `item[${i}].expiry_date`) : null;
                if (expiryDate && expiryDate < receivedDate) {
                    throw { code: 'VALIDATION_ERROR', message: `الصنف رقم ${i + 1}: تاريخ الانتهاء لا يمكن أن يسبق تاريخ الاستلام` };
                }

                // Insert purchase invoice item
                await dbRun(db,
                    `INSERT INTO purchase_invoice_items
                       (purchase_invoice_id, product_id, quantity, unit_price, line_total, notes, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [invoiceId, item.product_id, item.quantity, item.purchase_price, item.lineTotal, item.notes ?? null]
                );

                // Generate batch code if not provided
                // Try to format it based on invoice_number and some suffix
                // To avoid collisions we will use current timestamp or query max stock batches
                let batchCode = item.batch_code?.trim();
                if (!batchCode) {
                    const cntRes = await dbGet(db, 'SELECT COUNT(*) as c FROM stock_batches WHERE purchase_invoice_id = ?', [invoiceId]);
                    batchCode = `${invoice.invoice_number}-B${String(Number(cntRes.c) + 1).padStart(2, '0')}`;
                }
                // Check batch code uniqueness if provided
                if (batchCode) {
                    const dupBatch = await dbGet(db, 'SELECT id FROM stock_batches WHERE batch_code = ?', [batchCode]);
                    if (dupBatch) throw { code: 'DUPLICATE_BATCH_CODE', message: `كود الدفعة ${batchCode} مستخدم مسبقًا` };
                }

                // Insert stock batch
                const { lastID: batchId } = await dbRun(db,
                    `INSERT INTO stock_batches
                       (product_id, supplier_id, purchase_invoice_id, batch_code,
                        quantity, remaining_quantity, purchase_price, purchase_currency,
                        purchase_exchange_rate, purchase_price_base, received_date,
                        expiry_date, notes, isActive, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
                    [item.product_id, invoice.supplier_id, invoiceId, batchCode,
                     item.quantity, item.quantity, item.purchase_price, invoiceCurrency,
                     invoiceRate, toBaseAmount(item.purchase_price, invoiceRate), receivedDate,
                     expiryDate, item.batch_notes ?? null]
                );

                // Create stock movement (purchase_in)
                await dbRun(db,
                    `INSERT INTO stock_movements
                       (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                        reference_type, reference_id, reference_number, supplier_id, notes, created_at)
                     VALUES (?, ?, 'purchase_in', ?, 0, ?, 'purchase_invoice', ?, ?, ?, ?, datetime('now'))`,
                    [item.product_id, batchId, item.quantity, item.quantity, invoiceId, invoice.invoice_number, invoice.supplier_id, `إضافة لفاتورة شراء ${invoice.invoice_number}`]
                );
            }

            // 7. Increase supplier payable balance by new items total
            const supplierBaseAmount = toBaseAmount(newItemsTotal, invoiceRate);
            await dbRun(db,
                `UPDATE suppliers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
                [supplierBaseAmount, invoice.supplier_id]
            );

            // 8. Update invoice paid/remaining/status
            const newSubtotal = normalizeAmount(invoice.subtotal + newItemsSubtotal);
            const newTotal = normalizeAmount(invoice.total + newItemsTotal);
            // Re-evaluate payment status
            const { remainingAmount, status: finalStatus } = calculatePaymentState(newTotal, invoice.paid_amount);

            await dbRun(db,
                `UPDATE purchase_invoices SET subtotal = ?, total = ?, remaining_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
                [newSubtotal, newTotal, remainingAmount, finalStatus, invoiceId]
            );

            // 9. Activity log
            await logActivity(db, 'purchase_items_added', 'purchase_invoices', invoiceId, { invoice_number: invoice.invoice_number, added_items: normalizedItems.length, added_total: newItemsTotal });

            await dbRun(db, 'COMMIT');

            return this.getPurchaseInvoiceDetails(invoiceId);

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
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
                    p.name as product_name, p.unit as product_unit
             FROM purchase_invoice_items pii
             LEFT JOIN products p ON pii.product_id = p.id
             WHERE pii.purchase_invoice_id = ?
             ORDER BY pii.id`,
            [id]
        );

        const stockBatches = await dbAll(db,
            `SELECT * FROM stock_batches WHERE purchase_invoice_id = ? ORDER BY id`,
            [id]
        );

        const batchTracker = {};
        for (const batch of stockBatches) {
            if (!batchTracker[batch.product_id]) {
                batchTracker[batch.product_id] = [];
            }
            batchTracker[batch.product_id].push(batch);
        }

        const items = invoiceItems.map(item => {
            const batchList = batchTracker[item.product_id];
            const batch = batchList && batchList.length > 0 ? batchList.shift() : null;
            return {
                ...item,
                batch_code: batch?.batch_code ?? null,
                remaining_quantity: batch?.remaining_quantity ?? null,
                batch_received_date: batch?.received_date ?? null,
                batch_expiry_date: batch?.expiry_date ?? null,
                batch_active: batch?.isActive ?? null,
                stock_batch_id: batch?.id ?? null,
            };
        });

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

            // Check if generated batches have been consumed by sales
            const consumedBatches = await dbAll(db,
                `SELECT sb.id, sb.batch_code, sb.quantity, sb.remaining_quantity
                 FROM stock_batches sb
                 WHERE sb.purchase_invoice_id = ? AND sb.quantity > sb.remaining_quantity`,
                [id]
            );
            if (consumedBatches.length > 0) {
                throw {
                    code: 'PURCHASE_CANNOT_BE_CANCELLED_STOCK_USED',
                    message: 'لا يمكن إلغاء الفاتورة — بعض الدفعات تم بيعها بالفعل',
                    details: consumedBatches.map(b => ({ batch_code: b.batch_code, sold: b.quantity - b.remaining_quantity }))
                };
            }

            // 1. Reverse active purchase payments
            const activePayments = await dbAll(db,
                `SELECT * FROM payments WHERE invoice_id = ? AND payment_type = 'purchase' AND status = 'active'`,
                [id]
            );
            for (const payment of activePayments) {
                const amount = normalizeAmount(payment.amount);
                // Mark reversed
                await dbRun(db,
                    `UPDATE payments SET status = 'reversed', reversal_reason = ?, updated_at = datetime('now') WHERE id = ?`,
                    [reason, payment.id]
                );
                // Restore cashbox balance
                const cashbox = await dbGet(db, 'SELECT balance FROM cashboxes WHERE id = ?', [payment.cashbox_id]);
                const balBefore = normalizeAmount(cashbox.balance);
                const balAfter  = Math.round((balBefore + amount) * 100) / 100;
                await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balAfter, payment.cashbox_id]);
                await dbRun(db,
                    `INSERT INTO cashbox_transactions
                       (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                     VALUES (?, 'reversal', ?, ?, 'in', ?, ?, date('now'), ?, datetime('now'), datetime('now'))`,
                    [payment.cashbox_id, payment.id, amount, balBefore, balAfter, `إلغاء فاتورة شراء #${invoice.invoice_number}`]
                );
            }

            // 2. Restore supplier balance (reverse the entire payable effect)
            const totalPaid  = normalizeAmount(invoice.paid_amount);
            const totalAmount = normalizeAmount(invoice.total);
            // Supplier balance was increased by total, decreased by each payment.
            // Net supplier effect = total - paid = remaining_amount
            const remainingBalance = toBaseAmount(
                Math.max(0, totalAmount - totalPaid),
                normalizeExchangeRate(invoice.currency, invoice.exchange_rate)
            );
            if (remainingBalance > 0) {
                await dbRun(db,
                    `UPDATE suppliers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
                    [remainingBalance, invoice.supplier_id]
                );
            }

            // 3. Create purchase_cancel_out stock movements and deactivate batches
            const batches = await dbAll(db, 'SELECT * FROM stock_batches WHERE purchase_invoice_id = ?', [id]);
            for (const batch of batches) {
                const qty = normalizeAmount(batch.remaining_quantity);
                if (qty > 0) {
                    await dbRun(db,
                        `INSERT INTO stock_movements
                           (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                            reference_type, reference_id, reference_number, supplier_id, notes, created_at)
                         VALUES (?, ?, 'purchase_cancel_out', ?, ?, 0, 'purchase_invoice', ?, ?, ?, ?, datetime('now'))`,
                        [batch.product_id, batch.id, qty, qty, id, invoice.invoice_number, invoice.supplier_id, `إلغاء فاتورة شراء #${invoice.invoice_number}`]
                    );
                }
                // Deactivate batch
                await dbRun(db,
                    `UPDATE stock_batches SET remaining_quantity = 0, isActive = 0, updated_at = datetime('now') WHERE id = ?`,
                    [batch.id]
                );
            }

            // 4. Mark invoice cancelled
            await dbRun(db,
                `UPDATE purchase_invoices SET status = 'cancelled', paid_amount = 0, remaining_amount = 0, updated_at = datetime('now') WHERE id = ?`,
                [id]
            );

            // 5. Activity log
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

        // Ensure no payments exist
        const payCount = await dbGet(db, `SELECT COUNT(*) as cnt FROM payments WHERE invoice_id = ? AND payment_type = 'purchase'`, [id]);
        if (Number(payCount?.cnt ?? 0) > 0) throw { code: 'PURCHASE_INVOICE_LOCKED', message: 'لا يمكن حذف فاتورة تحتوي على دفعات' };

        // Ensure no stock batches exist
        const batchCount = await dbGet(db, 'SELECT COUNT(*) as cnt FROM stock_batches WHERE purchase_invoice_id = ?', [id]);
        if (Number(batchCount?.cnt ?? 0) > 0) throw { code: 'PURCHASE_INVOICE_LOCKED', message: 'لا يمكن حذف فاتورة تحتوي على دفعات مخزون' };

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

    async getPurchaseInvoiceSalesDetails(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();

        const sales = await dbAll(db, `
            SELECT
                sii.id as sale_item_id,
                sii.quantity as quantity_sold,
                sii.unit_price as sale_price,
                sii.line_total as sale_line_total,
                sii.sale_invoice_id,
                si.invoice_number as sale_invoice_number,
                si.invoice_date as sale_date,
                sb.id as stock_batch_id,
                sb.batch_code,
                sb.product_id,
                sb.remaining_quantity,
                p.name as product_name
            FROM sale_invoice_items sii
            JOIN sale_invoices si ON sii.sale_invoice_id = si.id
            JOIN stock_batches sb ON sii.stock_batch_id = sb.id
            JOIN products p ON sb.product_id = p.id
            WHERE sb.purchase_invoice_id = ?
        `, [id]);

        const remainingStock = await dbAll(db, `
            SELECT
                sb.id as stock_batch_id,
                sb.batch_code,
                sb.product_id,
                sb.quantity as total_quantity,
                sb.remaining_quantity,
                sb.purchase_price,
                p.name as product_name
            FROM stock_batches sb
            JOIN products p ON sb.product_id = p.id
            WHERE sb.purchase_invoice_id = ? AND sb.remaining_quantity > 0
        `, [id]);

        return { sales, remainingStock };
    }


    // ─── Consignment Settlement ────────────────────────────────────────────────

    async getConsignmentSummary(invoiceId) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();

        const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [invoiceId]);
        if (!invoice) throw { code: 'PURCHASE_NOT_FOUND', message: 'الفاتورة غير موجودة' };
        if (invoice.invoice_type !== 'consignment') throw { code: 'NOT_CONSIGNMENT_INVOICE', message: 'ليست فاتورة أمانة' };

        const supplier = invoice.supplier_id
            ? await dbGet(db, 'SELECT id, name FROM suppliers WHERE id = ?', [invoice.supplier_id])
            : null;
        const currencySetting = await dbGet(db, `
            SELECT setting_value FROM settings
            WHERE setting_key IN ('default_currency', 'currency')
            ORDER BY CASE setting_key WHEN 'default_currency' THEN 0 ELSE 1 END
            LIMIT 1
        `);

        const itemRows = await dbAll(db, `
            SELECT
                sb.id AS stock_batch_id,
                sb.product_id,
                p.name AS product_name,
                sb.batch_code,
                sb.quantity AS received_quantity,
                COALESCE(SUM(CASE WHEN si.status != 'cancelled' THEN sii.quantity ELSE 0 END), 0) AS sold_quantity,
                sb.remaining_quantity,
                COALESCE(SUM(CASE WHEN si.status != 'cancelled' THEN sii.line_total * COALESCE(si.exchange_rate, 1) ELSE 0 END), 0) / ? AS total_sales_amount,
                sb.expiry_date
            FROM stock_batches sb
            JOIN products p ON p.id = sb.product_id
            LEFT JOIN sale_invoice_items sii ON sii.stock_batch_id = sb.id
            LEFT JOIN sale_invoices si ON si.id = sii.sale_invoice_id
            WHERE sb.purchase_invoice_id = ?
            GROUP BY sb.id, sb.product_id, p.name, sb.batch_code, sb.quantity, sb.remaining_quantity, sb.expiry_date
            ORDER BY sb.id ASC
        `, [invoice.exchange_rate || 1, invoiceId]);

        const salesCountRow = await dbGet(db, `
            SELECT COUNT(DISTINCT si.id) AS sales_count
            FROM sale_invoices si
            JOIN sale_invoice_items sii ON sii.sale_invoice_id = si.id
            JOIN stock_batches sb ON sb.id = sii.stock_batch_id
            WHERE sb.purchase_invoice_id = ? AND si.status != 'cancelled'
        `, [invoiceId]);

        const settlement = await dbGet(db, `
            SELECT cs.*, c.name AS cashbox_name
            FROM consignment_settlements cs
            LEFT JOIN cashboxes c ON c.id = cs.cashbox_id
            WHERE cs.purchase_invoice_id = ?
            ORDER BY cs.id DESC
            LIMIT 1
        `, [invoiceId]);

        const items = itemRows.map((row) => ({
            purchase_invoice_item_id: null,
            product_id: Number(row.product_id),
            product_name: row.product_name,
            stock_batch_id: Number(row.stock_batch_id),
            batch_code: row.batch_code ?? null,
            received_quantity: Number(row.received_quantity ?? 0),
            sold_quantity: Number(row.sold_quantity ?? 0),
            remaining_quantity: Number(row.remaining_quantity ?? 0),
            total_sales_amount: normalizeAmount(row.total_sales_amount ?? 0),
            expiry_date: row.expiry_date ?? null
        }));

        const receivedQuantity = items.reduce((sum, item) => sum + item.received_quantity, 0);
        const soldQuantity = items.reduce((sum, item) => sum + item.sold_quantity, 0);
        const remainingQuantity = items.reduce((sum, item) => sum + item.remaining_quantity, 0);
        const totalSalesAmount = normalizeAmount(items.reduce((sum, item) => sum + item.total_sales_amount, 0));
        const currency = settlement?.currency || currencySetting?.setting_value || 'SYP';

        return {
            invoice: {
                ...invoice,
                supplier_name: supplier?.name || '—',
                settlement_status: invoice.settlement_status || 'pending',
                currency
            },
            sales: {
                total_sales_amount: totalSalesAmount,
                sold_quantity: soldQuantity,
                sales_count: Number(salesCountRow?.sales_count ?? 0)
            },
            stock: {
                received_quantity: receivedQuantity,
                sold_quantity: soldQuantity,
                remaining_quantity: remainingQuantity,
                damaged_quantity: settlement ? Number(settlement.spoilage_quantity ?? 0) : 0,
                returned_quantity: settlement ? Number(settlement.returned_quantity ?? 0) : 0
            },
            items,
            existing_settlement: settlement ? {
                ...settlement,
                id: Number(settlement.id),
                purchase_invoice_id: Number(settlement.purchase_invoice_id),
                total_sales_amount: normalizeAmount(settlement.total_sales_amount),
                commission_percentage: Number(settlement.commission_percentage ?? 0),
                commission_amount: normalizeAmount(settlement.commission_amount),
                supplier_share: normalizeAmount(settlement.supplier_share),
                cashbox_id: Number(settlement.cashbox_id),
                returned_quantity: Number(settlement.returned_quantity ?? 0),
                spoilage_quantity: Number(settlement.spoilage_quantity ?? 0),
                carried_quantity: Number(settlement.carried_quantity ?? 0),
                cashbox_name: settlement.cashbox_name || '—'
            } : null
        };
    }

    async previewConsignmentClosing(invoiceId, input) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const { commission_percentage, cashbox_id, remaining_stock_policy } = input || {};

        const commPct = Number(commission_percentage);
        if (!Number.isFinite(commPct) || commPct < 0 || commPct > 100) {
            throw { code: 'INVALID_COMMISSION_PERCENTAGE', message: 'نسبة العمولة يجب أن تكون بين 0 و100' };
        }
        if (!cashbox_id) throw { code: 'VALIDATION_ERROR', message: 'الصندوق مطلوب' };
        if (!['return_to_supplier', 'spoilage'].includes(remaining_stock_policy)) {
            throw { code: 'INVALID_REMAINING_STOCK_POLICY', message: 'سياسة المخزون المتبقي غير صالحة' };
        }

        const db = await dbmanager.init();
        const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [invoiceId]);
        if (!invoice) throw { code: 'PURCHASE_NOT_FOUND', message: 'الفاتورة غير موجودة' };
        if (invoice.invoice_type !== 'consignment') throw { code: 'NOT_CONSIGNMENT_INVOICE', message: 'ليست فاتورة أمانة' };
        if (invoice.settlement_status === 'settled') throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'تم إغلاق هذه الفاتورة مسبقاً' };
        if (invoice.status === 'cancelled') throw { code: 'PURCHASE_ALREADY_CANCELLED', message: 'الفاتورة ملغاة' };

        const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
        if (!cashbox) throw { code: 'CASHBOX_NOT_FOUND', message: 'الصندوق غير موجود' };
        if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'الصندوق غير نشط' };

        const currencySetting = await dbGet(db, `
            SELECT setting_value FROM settings
            WHERE setting_key IN ('default_currency', 'currency')
            ORDER BY CASE setting_key WHEN 'default_currency' THEN 0 ELSE 1 END
            LIMIT 1
        `);
        const invoiceCurrency = currencySetting?.setting_value || 'SYP';
        
        let paymentExchangeRate = 1;
        if (cashbox.currency !== invoiceCurrency) {
            if (!input.exchange_rate) {
                throw { code: 'MISSING_EXCHANGE_RATE', message: 'سعر الصرف مطلوب عند اختلاف عملة الصندوق' };
            }
            paymentExchangeRate = normalizeExchangeRate(cashbox.currency, input.exchange_rate);
        }

        const salesTotalRow = await dbGet(db, `
            SELECT SUM(sii.line_total * si.exchange_rate) AS total_sales_base
            FROM sale_invoice_items sii
            JOIN sale_invoices si ON sii.sale_invoice_id = si.id
            JOIN stock_batches sb ON sii.stock_batch_id = sb.id
            WHERE sb.purchase_invoice_id = ? AND si.status != 'cancelled'
        `, [invoiceId]);
        const totalSalesAmount = normalizeAmount(salesTotalRow?.total_sales_base ?? 0);
        const commissionAmount = normalizeAmount((totalSalesAmount * commPct) / 100);
        const supplierShareBase = normalizeAmount(totalSalesAmount - commissionAmount);
        
        let supplierShareCashbox = supplierShareBase;
        if (cashbox.currency !== invoiceCurrency) {
             supplierShareCashbox = normalizeAmount(supplierShareBase / paymentExchangeRate);
        }
        
        const cashboxBalance = normalizeAmount(cashbox.balance);

        if (supplierShareCashbox > cashboxBalance) {
            throw { code: 'INSUFFICIENT_BALANCE', message: 'الرصيد في الصندوق لا يكفي للدفع للمورد' };
        }

        const remainingRow = await dbGet(db, 'SELECT SUM(remaining_quantity) AS remaining FROM stock_batches WHERE purchase_invoice_id = ?', [invoiceId]);
        const remainingQuantity = Number(remainingRow?.remaining ?? 0);
        const calculationHash = require('crypto').createHash('sha256').update(
            `${invoiceId}_${totalSalesAmount}_${remainingQuantity}_${remaining_stock_policy}`
        ).digest('hex');

        return {
            total_sales_amount: totalSalesAmount,
            commission_percentage: commPct,
            commission_amount: commissionAmount,
            supplier_share: supplierShareBase,
            remaining_quantity: remainingQuantity,
            currency: invoiceCurrency,
            cashbox_balance: cashboxBalance,
            balance_after_settlement: normalizeAmount(cashboxBalance - supplierShareCashbox),
            can_submit: true,
            warnings: [],
            calculation_hash: calculationHash
        };
    }

    async closeCommission(invoiceId, input) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const { commission_percentage, cashbox_id, remaining_stock_policy, calculation_hash, notes, settlement_date } = input || {};
        if (!calculation_hash) throw { code: 'VALIDATION_ERROR', message: 'يجب تنفيذ المعاينة قبل التسوية' };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(settlement_date || ''))) {
            throw { code: 'INVALID_SETTLEMENT_DATE', message: 'تاريخ التسوية غير صالح' };
        }
        const commPct = Number(commission_percentage);
        if (!Number.isFinite(commPct) || commPct < 0 || commPct > 100) throw { code: 'INVALID_COMMISSION_PERCENTAGE', message: 'نسبة العمولة غير صالحة' };
        if (!cashbox_id) throw { code: 'VALIDATION_ERROR', message: 'الصندوق مطلوب' };
        if (!['return_to_supplier', 'spoilage'].includes(remaining_stock_policy)) throw { code: 'INVALID_REMAINING_STOCK_POLICY', message: 'سياسة المخزون المتبقي غير صالحة' };

        const db = await dbmanager.init();
        try {
            await dbRun(db, 'BEGIN TRANSACTION');
            const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [invoiceId]);
            if (!invoice) throw { code: 'PURCHASE_NOT_FOUND', message: 'الفاتورة غير موجودة' };
            if (invoice.invoice_type !== 'consignment') throw { code: 'NOT_CONSIGNMENT_INVOICE', message: 'ليست فاتورة أمانة' };
            if (invoice.settlement_status === 'settled') throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'تم إغلاق هذه الفاتورة مسبقاً' };
            if (invoice.status === 'cancelled') throw { code: 'PURCHASE_ALREADY_CANCELLED', message: 'الفاتورة ملغاة' };

            const existingSettlement = await dbGet(db, `SELECT id FROM consignment_settlements WHERE purchase_invoice_id = ? AND status = 'completed'`, [invoiceId]);
            if (existingSettlement) throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'يوجد تسوية مكتملة لهذه الفاتورة' };

            const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
            if (!cashbox) throw { code: 'CASHBOX_NOT_FOUND', message: 'الصندوق غير موجود' };
            if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'الصندوق غير نشط' };

            const currencySetting = await dbGet(db, `SELECT setting_value FROM settings WHERE setting_key IN ('default_currency', 'currency') ORDER BY CASE setting_key WHEN 'default_currency' THEN 0 ELSE 1 END LIMIT 1`);
            const invoiceCurrency = currencySetting?.setting_value || 'SYP';
            
            let paymentExchangeRate = 1;
            if (cashbox.currency !== invoiceCurrency) {
                if (!input.exchange_rate) {
                    throw { code: 'MISSING_EXCHANGE_RATE', message: 'سعر الصرف مطلوب عند اختلاف عملة الصندوق' };
                }
                paymentExchangeRate = normalizeExchangeRate(cashbox.currency, input.exchange_rate);
            }

            const salesTotalRow = await dbGet(db, `
                SELECT SUM(sii.line_total * si.exchange_rate) AS total_sales_base
                FROM sale_invoice_items sii
                JOIN sale_invoices si ON sii.sale_invoice_id = si.id
                JOIN stock_batches sb ON sii.stock_batch_id = sb.id
                WHERE sb.purchase_invoice_id = ? AND si.status != 'cancelled'
            `, [invoiceId]);
            const totalSalesAmount = normalizeAmount(salesTotalRow?.total_sales_base ?? 0);
            const remainingRow = await dbGet(db, 'SELECT SUM(remaining_quantity) AS remaining FROM stock_batches WHERE purchase_invoice_id = ?', [invoiceId]);
            const remainingQuantity = Number(remainingRow?.remaining ?? 0);
            const expectedHash = require('crypto').createHash('sha256').update(`${invoiceId}_${totalSalesAmount}_${remainingQuantity}_${remaining_stock_policy}`).digest('hex');
            if (calculation_hash !== expectedHash) throw { code: 'CONSIGNMENT_SALES_CHANGED', message: 'المبيعات أو المخزون تغير منذ آخر معاينة. يرجى التحديث والمحاولة مرة أخرى.' };

            const commissionAmount = normalizeAmount((totalSalesAmount * commPct) / 100);
            const supplierShareBase = normalizeAmount(totalSalesAmount - commissionAmount);
            let supplierShareCashbox = supplierShareBase;
            if (cashbox.currency !== invoiceCurrency) {
                 supplierShareCashbox = normalizeAmount(supplierShareBase / paymentExchangeRate);
            }
            const balanceBefore = normalizeAmount(cashbox.balance);
            if (supplierShareCashbox > balanceBefore) throw { code: 'INSUFFICIENT_BALANCE', message: 'الرصيد في الصندوق لا يكفي للدفع للمورد' };

            const countRow = await dbGet(db, 'SELECT COUNT(*) AS count FROM consignment_settlements');
            const settlementNumber = `SET-${String(Number(countRow?.count ?? 0) + 1).padStart(6, '0')}`;
            const { lastID: settlementId } = await dbRun(db, `
                INSERT INTO consignment_settlements
                (purchase_invoice_id, settlement_number, settlement_date, total_sales_amount, commission_percentage, commission_amount, supplier_share, cashbox_id, currency, remaining_stock_policy, returned_quantity, spoilage_quantity, carried_quantity, status, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'completed', ?, datetime('now'), datetime('now'))
            `, [invoiceId, settlementNumber, settlement_date, totalSalesAmount, commPct, commissionAmount, supplierShare, cashbox_id, invoiceCurrency, remaining_stock_policy, remaining_stock_policy === 'return_to_supplier' ? remainingQuantity : 0, remaining_stock_policy === 'spoilage' ? remainingQuantity : 0, notes ?? null]);

            const batches = await dbAll(db, 'SELECT * FROM stock_batches WHERE purchase_invoice_id = ? ORDER BY id ASC', [invoiceId]);
            for (const batch of batches) {
                const soldRow = await dbGet(db, `
                    SELECT SUM(CASE WHEN si.status != 'cancelled' THEN sii.quantity ELSE 0 END) AS sold,
                           SUM(CASE WHEN si.status != 'cancelled' THEN sii.line_total ELSE 0 END) AS sales
                    FROM sale_invoice_items sii
                    JOIN sale_invoices si ON si.id = sii.sale_invoice_id
                    WHERE sii.stock_batch_id = ?
                `, [batch.id]);
                const soldQty = Number(soldRow?.sold ?? 0);
                const salesAmount = normalizeAmount(soldRow?.sales ?? 0);
                const resolvedQuantity = Number(batch.remaining_quantity ?? 0);
                let adjustmentId = null;

                if (resolvedQuantity > 0) {
                    const reason = remaining_stock_policy === 'return_to_supplier' ? 'consignment_return_out' : 'consignment_spoilage_out';
                    const { lastID } = await dbRun(db, `
                        INSERT INTO stock_adjustments (stock_batch_id, quantity, reason, notes, quantity_before, quantity_after, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
                    `, [batch.id, -resolvedQuantity, reason, notes || 'إغلاق فاتورة أمانة', resolvedQuantity]);
                    adjustmentId = lastID;
                    await dbRun(db, 'UPDATE stock_batches SET remaining_quantity = 0, updated_at = datetime("now") WHERE id = ?', [batch.id]);
                }

                await dbRun(db, `
                    INSERT INTO consignment_settlement_items
                    (settlement_id, purchase_invoice_item_id, product_id, stock_batch_id, received_quantity, sold_quantity, remaining_quantity, sales_amount, resolution_policy, resolved_quantity, stock_movement_id, notes, created_at)
                    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `, [settlementId, batch.product_id, batch.id, Number(batch.quantity ?? 0), soldQty, resolvedQuantity, salesAmount, remaining_stock_policy, resolvedQuantity, adjustmentId, notes ?? null]);
            }

            let paymentId = null;
            let cashboxTransactionId = null;
            if (supplierShareBase > 0) {
                const balanceAfter = normalizeAmount(balanceBefore - supplierShareCashbox);
                await dbRun(db, 'UPDATE cashboxes SET balance = ?, updated_at = datetime("now") WHERE id = ?', [balanceAfter, cashbox_id]);
                const { lastID: movementId } = await dbRun(db, `
                    INSERT INTO cashbox_transactions
                    (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                    VALUES (?, 'purchase', ?, ?, 'out', ?, ?, ?, ?, datetime('now'), datetime('now'))
                `, [cashbox_id, invoiceId, supplierShareCashbox, balanceBefore, balanceAfter, settlement_date, `تسوية أمانة ${settlementNumber}`]);
                cashboxTransactionId = movementId;

                const { lastID: payId } = await dbRun(db, `
                    INSERT INTO payments
                    (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date, payment_method, status, cashbox_transaction_id, notes, created_at, updated_at)
                    VALUES ('supplier', ?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'cash', 'active', ?, ?, datetime('now'), datetime('now'))
                `, [invoice.supplier_id, invoiceId, cashbox_id, supplierShareCashbox, cashbox.currency, paymentExchangeRate, supplierShareBase, settlement_date, movementId, `تسوية أمانة ${settlementNumber}`]);
                paymentId = payId;

                // We don't deduct supplier balance here because we didn't add the invoice total to the supplier balance
                // for consignment invoices initially. Or did we? In closeCommission, it doesn't update supplier balance.
            }

            await dbRun(db, 'UPDATE consignment_settlements SET payment_id = ?, cashbox_transaction_id = ? WHERE id = ?', [paymentId, cashboxTransactionId, settlementId]);
            await dbRun(db, 'UPDATE purchase_invoices SET settlement_status = "settled", settled_at = ?, consignment_settlement_id = ?, updated_at = datetime("now") WHERE id = ?', [settlement_date, settlementId, invoiceId]);
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
        const items = await dbAll(db, 'SELECT * FROM consignment_settlement_items WHERE settlement_id = ? ORDER BY id ASC', [settlement.id]);
        return {
            ...settlement,
            id: Number(settlement.id),
            purchase_invoice_id: Number(settlement.purchase_invoice_id),
            total_sales_amount: normalizeAmount(settlement.total_sales_amount),
            commission_percentage: Number(settlement.commission_percentage ?? 0),
            commission_amount: normalizeAmount(settlement.commission_amount),
            supplier_share: normalizeAmount(settlement.supplier_share),
            cashbox_id: Number(settlement.cashbox_id),
            returned_quantity: Number(settlement.returned_quantity ?? 0),
            spoilage_quantity: Number(settlement.spoilage_quantity ?? 0),
            carried_quantity: Number(settlement.carried_quantity ?? 0),
            cashbox_name: settlement.cashbox_name || '—',
            items
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

            const items = await dbAll(db, 'SELECT * FROM consignment_settlement_items WHERE settlement_id = ?', [settlementId]);
            for (const item of items) {
                const quantity = Number(item.resolved_quantity ?? 0);
                if (quantity <= 0) continue;
                const batch = await dbGet(db, 'SELECT * FROM stock_batches WHERE id = ?', [item.stock_batch_id]);
                if (!batch) throw { code: 'STOCK_BATCH_NOT_FOUND', message: 'إحدى دفعات المخزون غير موجودة' };
                const before = Number(batch.remaining_quantity ?? 0);
                const after = normalizeAmount(before + quantity);
                await dbRun(db, 'UPDATE stock_batches SET remaining_quantity = ?, updated_at = datetime("now") WHERE id = ?', [after, batch.id]);
                await dbRun(db, `
                    INSERT INTO stock_adjustments (stock_batch_id, quantity, reason, notes, quantity_before, quantity_after, created_at, updated_at)
                    VALUES (?, ?, 'consignment_settlement_reverse_in', ?, ?, ?, datetime('now'), datetime('now'))
                `, [batch.id, quantity, String(reason).trim(), before, after]);
            }

            let reverseCashboxTransactionId = null;
            if (normalizeAmount(settlement.supplier_share) > 0) {
                const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [settlement.cashbox_id]);
                if (!cashbox) throw { code: 'CASHBOX_NOT_FOUND', message: 'الصندوق غير موجود' };
                const before = normalizeAmount(cashbox.balance);
                const after = normalizeAmount(before + settlement.supplier_share);
                await dbRun(db, 'UPDATE cashboxes SET balance = ?, updated_at = datetime("now") WHERE id = ?', [after, settlement.cashbox_id]);
                const { lastID } = await dbRun(db, `
                    INSERT INTO cashbox_transactions
                    (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, reversed_transaction_id, reversal_reason, transaction_date, notes, created_at, updated_at)
                    VALUES (?, 'reversal', ?, ?, 'in', ?, ?, ?, ?, date('now'), ?, datetime('now'), datetime('now'))
                `, [settlement.cashbox_id, settlement.purchase_invoice_id, settlement.supplier_share, before, after, settlement.cashbox_transaction_id ?? null, String(reason).trim(), `عكس تسوية أمانة ${settlement.settlement_number}`]);
                reverseCashboxTransactionId = lastID;
            }

            if (settlement.payment_id) {
                const payment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [settlement.payment_id]);
                if (payment && payment.status !== 'reversed') {
                    await dbRun(db, 'UPDATE payments SET status = "reversed", reversal_reason = ?, updated_at = datetime("now") WHERE id = ?', [String(reason).trim(), payment.id]);
                    const { lastID: reversalPaymentId } = await dbRun(db, `
                        INSERT INTO payments
                        (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, payment_date, payment_method, status, reversed_payment_id, cashbox_transaction_id, reversal_reason, notes, created_at, updated_at)
                        VALUES (?, ?, 'purchase', ?, ?, ?, date('now'), ?, 'reversed', ?, ?, ?, ?, datetime('now'), datetime('now'))
                    `, [payment.party_type, payment.party_id, payment.invoice_id, payment.cashbox_id, payment.amount, payment.payment_method || 'cash', payment.id, reverseCashboxTransactionId, String(reason).trim(), `عكس دفعة تسوية أمانة #${payment.id}`]);
                    await dbRun(db, 'UPDATE payments SET reversed_payment_id = ? WHERE id = ?', [reversalPaymentId, payment.id]);
                }
            }

            if (settlement.cashbox_transaction_id && reverseCashboxTransactionId) {
                await dbRun(db, 'UPDATE cashbox_transactions SET reversed_transaction_id = ?, reversal_reason = ? WHERE id = ?', [reverseCashboxTransactionId, String(reason).trim(), settlement.cashbox_transaction_id]);
            }

            await dbRun(db, 'UPDATE consignment_settlements SET status = "reversed", reversal_reason = ?, updated_at = datetime("now") WHERE id = ?', [String(reason).trim(), settlementId]);
            await dbRun(db, 'UPDATE purchase_invoices SET settlement_status = "reversed", settled_at = NULL, updated_at = datetime("now") WHERE id = ?', [settlement.purchase_invoice_id]);
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
