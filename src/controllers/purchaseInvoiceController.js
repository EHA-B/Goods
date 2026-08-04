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

            // 2. Map items to common shape
            const mappedItems = items.map((item, index) => ({
                ...item,
                product_id: item.product_id,
                quantity: Number(item.quantity ?? 0),
                price: Number(item.purchase_price ?? item.unit_price ?? item.price ?? 0),
                purchase_price: Number(item.purchase_price ?? item.unit_price ?? item.price ?? 0),
            }));

            // 3. Calculate totals (validates items)
            const { normalizedItems, subtotal, discountAmount, totalAmount } = calculateInvoiceTotals(
                mappedItems, discount_amount
            );

            // 4. Validate/generate invoice number
            let invNumber = invoice_number?.trim();
            if (!invNumber) {
                invNumber = await generateInvoiceNumber(db, 'PUR', 'purchase_invoices');
            } else {
                const dup = await dbGet(db, 'SELECT id FROM purchase_invoices WHERE invoice_number = ?', [invNumber]);
                if (dup) throw { code: 'DUPLICATE_INVOICE_NUMBER', message: `رقم الفاتورة ${invNumber} موجود مسبقًا` };
            }

            // 5. Determine initial status
            let status = 'confirmed';
            if (invoice_type === 'consignment') status = 'confirmed'; // consignment stays confirmed until closed

            // 6. Insert purchase invoice
            const { lastID: invoiceId } = await dbRun(db,
                `INSERT INTO purchase_invoices
                   (invoice_number, supplier_id, invoice_type, invoice_date,
                    subtotal, discount, discount_amount, tax, total, paid_amount, remaining_amount, status, notes,
                    created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?, datetime('now'), datetime('now'))`,
                [invNumber, supplier_id, invoice_type, validatedDate,
                 subtotal, discountAmount, discountAmount, totalAmount, totalAmount, status, notes ?? null]
            );

            // 7. Insert items + create stock batches + stock movements
            for (let i = 0; i < normalizedItems.length; i++) {
                const item = normalizedItems[i];

                // Validate item received_date
                const receivedDate = validateDate(item.received_date ?? validatedDate, `item[${i}].received_date`);
                const expiryDate = item.expiry_date ?? null;
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
                const batchCode = item.batch_code?.trim() || null;
                // Check batch code uniqueness if provided
                if (batchCode) {
                    const dupBatch = await dbGet(db, 'SELECT id FROM stock_batches WHERE batch_code = ?', [batchCode]);
                    if (dupBatch) throw { code: 'VALIDATION_ERROR', message: `كود الدفعة ${batchCode} مستخدم مسبقًا` };
                }

                // Insert stock batch
                const { lastID: batchId } = await dbRun(db,
                    `INSERT INTO stock_batches
                       (product_id, supplier_id, purchase_invoice_id, batch_code,
                        quantity, remaining_quantity, purchase_price, received_date,
                        expiry_date, notes, isActive, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
                    [item.product_id, supplier_id, invoiceId, batchCode,
                     item.quantity, item.quantity, item.purchase_price, receivedDate,
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

            // 8. Increase supplier payable balance by invoice total
            await dbRun(db,
                `UPDATE suppliers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
                [totalAmount, supplier_id]
            );

            // 9. Handle optional initial payment
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
                if (cashbox.balance < payAmount - 0.001) throw { code: 'INSUFFICIENT_BALANCE', message: `رصيد الصندوق (${cashbox.balance}) غير كافٍ` };

                // Deduct cashbox
                const balBefore = normalizeAmount(cashbox.balance);
                const balAfter  = Math.round((balBefore - payAmount) * 100) / 100;
                await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balAfter, payBox]);
                const { lastID: cbtId } = await dbRun(db,
                    `INSERT INTO cashbox_transactions
                       (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                     VALUES (?, 'purchase', ?, ?, 'out', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [payBox, invoiceId, payAmount, balBefore, balAfter, payDate, `دفعة أولى فاتورة شراء #${invNumber}`]
                );

                // Create payment record
                await dbRun(db,
                    `INSERT INTO payments
                       (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, payment_date,
                        status, cashbox_transaction_id, notes, created_at, updated_at)
                     VALUES ('supplier', ?, 'purchase', ?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))`,
                    [supplier_id, invoiceId, payBox, payAmount, payDate, cbtId, initial_payment.notes ?? null]
                );

                // Reduce supplier balance by payment amount
                await dbRun(db,
                    `UPDATE suppliers SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
                    [payAmount, supplier_id]
                );

                finalPaid = payAmount;
            }

            // 10. Update invoice paid/remaining/status
            const { remainingAmount, status: finalStatus } = calculatePaymentState(totalAmount, finalPaid);
            await dbRun(db,
                `UPDATE purchase_invoices SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
                [finalPaid, remainingAmount, finalStatus, invoiceId]
            );

            // 11. Activity log
            await logActivity(db, 'purchase_created', 'purchase_invoices', invoiceId, { invoice_number: invNumber, supplier_id, total: totalAmount });

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

        const items = await dbAll(db,
            `SELECT pii.*,
                    p.name as product_name, p.unit as product_unit,
                    sb.batch_code, sb.remaining_quantity, sb.received_date as batch_received_date,
                    sb.expiry_date as batch_expiry_date, sb.isActive as batch_active, sb.id as stock_batch_id
             FROM purchase_invoice_items pii
             LEFT JOIN products p ON pii.product_id = p.id
             LEFT JOIN stock_batches sb ON sb.purchase_invoice_id = pii.purchase_invoice_id AND sb.product_id = pii.product_id
             WHERE pii.purchase_invoice_id = ?
             ORDER BY pii.id`,
            [id]
        );

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

        const financial_summary = {
            subtotal: normalizeAmount(invoice.subtotal),
            discount_amount: normalizeAmount(invoice.discount_amount ?? invoice.discount),
            total_amount: normalizeAmount(invoice.total),
            paid_amount: normalizeAmount(invoice.paid_amount),
            remaining_amount: normalizeAmount(invoice.remaining_amount),
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
            const remainingBalance = Math.max(0, totalAmount - totalPaid);
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

        const supplier = invoice.supplier_id ? await dbGet(db, 'SELECT * FROM suppliers WHERE id = ?', [invoice.supplier_id]) : null;

        const salesTotalRow = await dbGet(db, `
            SELECT SUM(sii.quantity) as sold_quantity, SUM(sii.line_total) as total_sales
            FROM sale_invoice_items sii
            JOIN sale_invoices si ON sii.sale_invoice_id = si.id
            JOIN stock_batches sb ON sii.stock_batch_id = sb.id
            WHERE sb.purchase_invoice_id = ? AND si.status != 'cancelled'
        `, [invoiceId]);

        const totalSalesAmount = normalizeAmount(salesTotalRow?.total_sales ?? 0);
        const totalSoldQuantity = Number(salesTotalRow?.sold_quantity ?? 0);

        const stockSummary = await dbGet(db, `
            SELECT SUM(quantity) as received_quantity, SUM(remaining_quantity) as remaining_quantity
            FROM stock_batches
            WHERE purchase_invoice_id = ?
        `, [invoiceId]);

        const receivedQuantity = Number(stockSummary?.received_quantity ?? 0);
        const remainingQuantity = Number(stockSummary?.remaining_quantity ?? 0);

        let settlement = null;
        if (invoice.consignment_settlement_id) {
            settlement = await dbGet(db, 'SELECT * FROM consignment_settlements WHERE id = ?', [invoice.consignment_settlement_id]);
        }

        return {
            success: true,
            data: {
                invoice,
                supplier,
                received_quantity: receivedQuantity,
                sold_quantity: totalSoldQuantity,
                remaining_quantity: remainingQuantity,
                total_sales_amount: totalSalesAmount,
                settlement
            }
        };
    }

    async previewConsignmentClosing(invoiceId, input) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const { commission_percentage, cashbox_id, remaining_stock_policy } = input || {};

        if (commission_percentage === undefined) throw { code: 'INVALID_COMMISSION_PERCENTAGE', message: 'نسبة العمولة مطلوبة' };
        const commPct = Number(commission_percentage);
        if (isNaN(commPct) || commPct < 0 || commPct > 100) {
            throw { code: 'INVALID_COMMISSION_PERCENTAGE', message: 'نسبة العمولة غير صالحة' };
        }

        if (!cashbox_id) throw { code: 'VALIDATION_ERROR', message: 'الصندوق مطلوب' };
        if (!remaining_stock_policy || !['return_to_supplier', 'spoilage'].includes(remaining_stock_policy)) {
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

        const salesTotalRow = await dbGet(db, `
            SELECT SUM(sii.line_total) as total_sales
            FROM sale_invoice_items sii
            JOIN sale_invoices si ON sii.sale_invoice_id = si.id
            JOIN stock_batches sb ON sii.stock_batch_id = sb.id
            WHERE sb.purchase_invoice_id = ? AND si.status != 'cancelled'
        `, [invoiceId]);
        const totalSalesAmount = normalizeAmount(salesTotalRow?.total_sales ?? 0);

        const commissionAmount = normalizeAmount((totalSalesAmount * commPct) / 100);
        const supplierShare = normalizeAmount(totalSalesAmount - commissionAmount);

        if (supplierShare > 0 && cashbox.balance < supplierShare) {
            throw { code: 'INSUFFICIENT_BALANCE', message: 'الرصيد في الصندوق لا يكفي للدفع للمورد' };
        }

        const remainingStockQuery = await dbGet(db, 'SELECT SUM(remaining_quantity) as rem FROM stock_batches WHERE purchase_invoice_id = ?', [invoiceId]);
        const remainingQuantity = Number(remainingStockQuery?.rem ?? 0);

        const calculationHash = require('crypto').createHash('sha256').update(
            `${invoiceId}_${totalSalesAmount}_${remainingQuantity}_${remaining_stock_policy}`
        ).digest('hex');

        return {
            success: true,
            data: {
                total_sales_amount: totalSalesAmount,
                commission_percentage: commPct,
                commission_amount: commissionAmount,
                supplier_share: supplierShare,
                remaining_quantity: remainingQuantity,
                stock_resolution_preview: remaining_stock_policy,
                cashbox_balance: cashbox.balance,
                cashbox_balance_after: normalizeAmount(cashbox.balance - supplierShare),
                currency: cashbox.currency,
                calculation_hash: calculationHash
            }
        };
    }

    async closeCommission(invoiceId, input) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const { commission_percentage, cashbox_id, remaining_stock_policy, calculation_hash, notes, settlement_date } = input || {};

        if (!calculation_hash) throw { code: 'VALIDATION_ERROR', message: 'Calculation hash مطلوب' };
        
        const commPct = Number(commission_percentage);
        if (isNaN(commPct) || commPct < 0 || commPct > 100) throw { code: 'INVALID_COMMISSION_PERCENTAGE', message: 'نسبة العمولة غير صالحة' };
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

            const existingSettlement = await dbGet(db, 'SELECT id FROM consignment_settlements WHERE purchase_invoice_id = ? AND status = "completed"', [invoiceId]);
            if (existingSettlement) throw { code: 'CONSIGNMENT_ALREADY_CLOSED', message: 'يوجد تسوية مكتملة لهذه الفاتورة' };

            const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
            if (!cashbox) throw { code: 'CASHBOX_NOT_FOUND', message: 'الصندوق غير موجود' };
            if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'الصندوق غير نشط' };

            const salesTotalRow = await dbGet(db, `
                SELECT SUM(sii.line_total) as total_sales
                FROM sale_invoice_items sii
                JOIN sale_invoices si ON sii.sale_invoice_id = si.id
                JOIN stock_batches sb ON sii.stock_batch_id = sb.id
                WHERE sb.purchase_invoice_id = ? AND si.status != 'cancelled'
            `, [invoiceId]);
            const totalSalesAmount = normalizeAmount(salesTotalRow?.total_sales ?? 0);

            const remainingStockQuery = await dbGet(db, 'SELECT SUM(remaining_quantity) as rem FROM stock_batches WHERE purchase_invoice_id = ?', [invoiceId]);
            const remainingQuantity = Number(remainingStockQuery?.rem ?? 0);

            const expectedHash = require('crypto').createHash('sha256').update(
                `${invoiceId}_${totalSalesAmount}_${remainingQuantity}_${remaining_stock_policy}`
            ).digest('hex');

            if (calculation_hash !== expectedHash) {
                throw { code: 'CONSIGNMENT_SALES_CHANGED', message: 'المبيعات أو المخزون تغير منذ آخر معاينة. يرجى التحديث والمحاولة مرة أخرى.' };
            }

            const commissionAmount = normalizeAmount((totalSalesAmount * commPct) / 100);
            const supplierShare = normalizeAmount(totalSalesAmount - commissionAmount);

            if (supplierShare > 0 && cashbox.balance < supplierShare) {
                throw { code: 'INSUFFICIENT_BALANCE', message: 'الرصيد في الصندوق لا يكفي للدفع للمورد' };
            }

            const countRow = await dbGet(db, "SELECT count(*) as c FROM consignment_settlements");
            const settlement_number = 'SET-' + String((countRow?.c || 0) + 1).padStart(6, '0');

            // Insert settlement header
            const { lastID: settlementId } = await dbRun(db, `
                INSERT INTO consignment_settlements 
                (purchase_invoice_id, settlement_number, settlement_date, total_sales_amount, commission_percentage, commission_amount, supplier_share, cashbox_id, currency, remaining_stock_policy, returned_quantity, spoilage_quantity, status, notes, created_at, updated_at)
                VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now'), datetime('now'))
            `, [invoiceId, settlement_number, totalSalesAmount, commPct, commissionAmount, supplierShare, cashbox_id, cashbox.currency, remaining_stock_policy, remaining_stock_policy === 'return_to_supplier' ? remainingQuantity : 0, remaining_stock_policy === 'spoilage' ? remainingQuantity : 0, notes]);

            const batches = await dbAll(db, 'SELECT * FROM stock_batches WHERE purchase_invoice_id = ?', [invoiceId]);
            for (const batch of batches) {
                const soldQuery = await dbGet(db, `
                    SELECT SUM(sii.quantity) as sold, SUM(sii.line_total) as sales
                    FROM sale_invoice_items sii
                    JOIN sale_invoices si ON sii.sale_invoice_id = si.id
                    WHERE sii.stock_batch_id = ? AND si.status != 'cancelled'
                `, [batch.id]);
                const soldQty = Number(soldQuery?.sold ?? 0);
                const salesAmt = normalizeAmount(soldQuery?.sales ?? 0);

                let movementId = null;
                if (batch.remaining_quantity > 0) {
                    const adjustReason = remaining_stock_policy === 'return_to_supplier' ? 'consignment_return_out' : 'consignment_spoilage_out';
                    const { lastID: moveId } = await dbRun(db, `
                        INSERT INTO stock_adjustments (stock_batch_id, quantity, reason, notes, quantity_before, quantity_after, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
                    `, [batch.id, -batch.remaining_quantity, adjustReason, 'إغلاق فاتورة أمانة', batch.remaining_quantity]);
                    movementId = moveId;
                    await dbRun(db, 'UPDATE stock_batches SET remaining_quantity = 0, updated_at = datetime("now") WHERE id = ?', [batch.id]);
                }

                await dbRun(db, `
                    INSERT INTO consignment_settlement_items 
                    (settlement_id, product_id, stock_batch_id, received_quantity, sold_quantity, remaining_quantity, sales_amount, resolution_policy, resolved_quantity, stock_movement_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `, [settlementId, batch.product_id, batch.id, batch.quantity, soldQty, batch.remaining_quantity, salesAmt, remaining_stock_policy, batch.remaining_quantity, movementId]);
            }

            let paymentId = null;
            let cashboxTransactionId = null;
            if (supplierShare > 0) {
                const { lastID: payId } = await dbRun(db, `
                    INSERT INTO payments (payment_number, payment_type, reference_type, reference_id, supplier_id, cashbox_id, amount, payment_date, notes, created_at, updated_at)
                    VALUES (?, 'purchase', 'consignment_settlement', ?, ?, ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))
                `, [`PAY-${Date.now()}`, settlementId, invoice.supplier_id, cashbox_id, supplierShare, `دفع مستحقات فاتورة أمانة ${invoice.invoice_number}`]);
                paymentId = payId;

                const balBefore = normalizeAmount(cashbox.balance);
                const balAfter = normalizeAmount(balBefore - supplierShare);
                await dbRun(db, 'UPDATE cashboxes SET balance = ?, updated_at = datetime("now") WHERE id = ?', [balAfter, cashbox_id]);
                
                const { lastID: ctxId } = await dbRun(db, `
                    INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                    VALUES (?, 'purchase', ?, ?, 'out', ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))
                `, [cashbox_id, invoiceId, supplierShare, balBefore, balAfter, `تسوية فاتورة أمانة ${invoice.invoice_number}`]);
                cashboxTransactionId = ctxId;
            }

            await dbRun(db, 'UPDATE consignment_settlements SET payment_id = ?, cashbox_transaction_id = ? WHERE id = ?', [paymentId, cashboxTransactionId, settlementId]);
            await dbRun(db, 'UPDATE purchase_invoices SET settlement_status = "settled", settled_at = datetime("now"), consignment_settlement_id = ?, updated_at = datetime("now") WHERE id = ?', [settlementId, invoiceId]);
            
            await logActivity(db, 'purchase_commission_closed', 'purchase_invoices', invoiceId, { settlement_id: settlementId });
            await dbRun(db, 'COMMIT');

            return {
                success: true,
                data: { settlement_id: settlementId }
            };

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    async getConsignmentSettlement(settlementId) {
        if (!settlementId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();

        const settlement = await dbGet(db, 'SELECT * FROM consignment_settlements WHERE id = ?', [settlementId]);
        if (!settlement) throw { code: 'CONSIGNMENT_SETTLEMENT_NOT_FOUND', message: 'التسوية غير موجودة' };

        const items = await dbAll(db, 'SELECT * FROM consignment_settlement_items WHERE settlement_id = ?', [settlementId]);

        return {
            success: true,
            data: { settlement, items }
        };
    }

    async reverseCommissionSettlement(settlementId, reason) {
        if (!settlementId) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            const settlement = await dbGet(db, 'SELECT * FROM consignment_settlements WHERE id = ?', [settlementId]);
            if (!settlement) throw { code: 'CONSIGNMENT_SETTLEMENT_NOT_FOUND', message: 'التسوية غير موجودة' };
            if (settlement.status === 'reversed') throw { code: 'CONSIGNMENT_SETTLEMENT_ALREADY_REVERSED', message: 'التسوية ملغاة مسبقاً' };

            const items = await dbAll(db, 'SELECT * FROM consignment_settlement_items WHERE settlement_id = ?', [settlementId]);
            for (const item of items) {
                if (item.resolved_quantity > 0) {
                    const batch = await dbGet(db, 'SELECT * FROM stock_batches WHERE id = ?', [item.stock_batch_id]);
                    if (batch) {
                        const newQty = normalizeAmount(batch.remaining_quantity + item.resolved_quantity);
                        await dbRun(db, 'UPDATE stock_batches SET remaining_quantity = ?, updated_at = datetime("now") WHERE id = ?', [newQty, batch.id]);
                        
                        await dbRun(db, `
                            INSERT INTO stock_adjustments (stock_batch_id, quantity, reason, notes, quantity_before, quantity_after, created_at, updated_at)
                            VALUES (?, ?, 'consignment_settlement_reverse_in', ?, ?, ?, datetime('now'), datetime('now'))
                        `, [batch.id, item.resolved_quantity, reason || 'إلغاء تسوية أمانة', batch.remaining_quantity, newQty]);
                    }
                }
            }

            if (settlement.supplier_share > 0) {
                const cashbox = await dbGet(db, 'SELECT balance FROM cashboxes WHERE id = ?', [settlement.cashbox_id]);
                if (cashbox) {
                    const balBefore = normalizeAmount(cashbox.balance);
                    const balAfter = normalizeAmount(balBefore + settlement.supplier_share);
                    await dbRun(db, 'UPDATE cashboxes SET balance = ?, updated_at = datetime("now") WHERE id = ?', [balAfter, settlement.cashbox_id]);

                    await dbRun(db, `
                        INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                        VALUES (?, 'purchase', ?, ?, 'in', ?, ?, datetime('now'), ?, datetime('now'), datetime('now'))
                    `, [settlement.cashbox_id, settlement.purchase_invoice_id, settlement.supplier_share, balBefore, balAfter, `إلغاء تسوية أمانة ${settlement.settlement_number}`]);
                }
            }

            if (settlement.payment_id) {
                await dbRun(db, 'DELETE FROM payments WHERE id = ?', [settlement.payment_id]);
            }
            if (settlement.cashbox_transaction_id) {
                await dbRun(db, 'UPDATE cashbox_transactions SET reversed_transaction_id = 1 WHERE id = ?', [settlement.cashbox_transaction_id]);
            }

            await dbRun(db, 'UPDATE consignment_settlements SET status = "reversed", reversal_reason = ?, updated_at = datetime("now") WHERE id = ?', [reason, settlementId]);
            await dbRun(db, 'UPDATE purchase_invoices SET settlement_status = "reversed", updated_at = datetime("now") WHERE id = ?', [settlement.purchase_invoice_id]);

            await logActivity(db, 'purchase_commission_reversed', 'purchase_invoices', settlement.purchase_invoice_id, { settlement_id: settlementId });
            await dbRun(db, 'COMMIT');

            return { success: true };

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

}

module.exports = new PurchaseInvoiceController();
