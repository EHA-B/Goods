'use strict';
/**
 * paymentController.js — Business-safe payment operations.
 *
 * Non-negotiable rules (per execution plan):
 *  - No generic createPayment / updatePayment / deletePayment exposed to the renderer.
 *  - All mutations are atomic database transactions.
 *  - Cashbox balance is updated through direct SQL (same transaction — no IPC round-trip).
 *  - Party (customer/supplier) balance is updated atomically.
 *  - Reversal creates an opposite record; original is preserved in history.
 */

const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));
const {
    validatePositiveAmount,
    normalizeAmount,
    validateDate,
    calculatePaymentState,
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

class PaymentController {

    // ─── Internal helpers ─────────────────────────────────────────────────

    async _loadSaleInvoice(db, id) {
        const invoice = await dbGet(db, 'SELECT * FROM sale_invoices WHERE id = ?', [id]);
        if (!invoice) throw { code: 'INVOICE_NOT_PAYABLE', message: 'فاتورة البيع غير موجودة' };
        if (invoice.status === 'draft')     throw { code: 'INVOICE_NOT_PAYABLE', message: 'لا يمكن تسجيل دفعة على فاتورة مسودة' };
        if (invoice.status === 'cancelled') throw { code: 'INVOICE_NOT_PAYABLE', message: 'لا يمكن تسجيل دفعة على فاتورة ملغاة' };
        return invoice;
    }

    async _loadPurchaseInvoice(db, id) {
        const invoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [id]);
        if (!invoice) throw { code: 'INVOICE_NOT_PAYABLE', message: 'فاتورة الشراء غير موجودة' };
        if (invoice.status === 'draft')     throw { code: 'INVOICE_NOT_PAYABLE', message: 'لا يمكن تسجيل دفعة على فاتورة مسودة' };
        if (invoice.status === 'cancelled') throw { code: 'INVOICE_NOT_PAYABLE', message: 'لا يمكن تسجيل دفعة على فاتورة ملغاة' };
        return invoice;
    }

    async _loadActiveCashbox(db, cashboxId) {
        const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashboxId]);
        if (!cashbox)         throw { code: 'NOT_FOUND', message: 'الصندوق غير موجود' };
        if (!cashbox.isActive) throw { code: 'INVOICE_NOT_PAYABLE', message: 'الصندوق غير نشط' };
        return cashbox;
    }

    async _updateCashboxBalance(db, cashboxId, delta, referenceType, referenceId, txDate, notes) {
        const cashbox = await dbGet(db, 'SELECT balance FROM cashboxes WHERE id = ?', [cashboxId]);
        const balanceBefore = normalizeAmount(cashbox.balance);
        const balanceAfter  = Math.round((balanceBefore + delta) * 100) / 100;

        await dbRun(db,
            `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
            [balanceAfter, cashboxId]
        );

        const { lastID } = await dbRun(db,
            `INSERT INTO cashbox_transactions
               (cashbox_id, reference_type, reference_id, amount, direction,
                balance_before, balance_after, transaction_date, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
                cashboxId,
                referenceType,
                referenceId,
                Math.abs(delta),
                delta >= 0 ? 'in' : 'out',
                balanceBefore,
                balanceAfter,
                txDate,
                notes
            ]
        );
        return { lastID, balanceBefore, balanceAfter };
    }

    async _updatePartyBalance(db, partyType, partyId, delta) {
        const table = partyType === 'customer' ? 'customers' : 'suppliers';
        const party = await dbGet(db, `SELECT balance FROM ${table} WHERE id = ?`, [partyId]);
        if (!party) throw { code: 'NOT_FOUND', message: `${partyType === 'customer' ? 'العميل' : 'المورد'} غير موجود` };
        const balanceBefore = normalizeAmount(party.balance);
        const balanceAfter  = Math.round((balanceBefore + delta) * 100) / 100;
        await dbRun(db,
            `UPDATE ${table} SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
            [balanceAfter, partyId]
        );
        return { balanceBefore, balanceAfter };
    }

    async _updateInvoicePaymentState(db, invoiceTable, invoiceId, extraPaid) {
        const invoice = await dbGet(db, `SELECT total, paid_amount FROM ${invoiceTable} WHERE id = ?`, [invoiceId]);
        const newPaid   = Math.round((normalizeAmount(invoice.paid_amount) + extraPaid) * 100) / 100;
        const { remainingAmount, status } = calculatePaymentState(invoice.total, newPaid);
        await dbRun(db,
            `UPDATE ${invoiceTable} SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
            [newPaid, remainingAmount, status, invoiceId]
        );
        return { newPaid, remainingAmount, status };
    }

    // ─── recordSalePayment ────────────────────────────────────────────────

    async recordSalePayment(input) {
        const { sale_invoice_id, cashbox_id, amount, payment_date, notes } = input ?? {};

        if (!sale_invoice_id) throw { code: 'VALIDATION_ERROR', message: 'sale_invoice_id مطلوب' };
        if (!cashbox_id)      throw { code: 'VALIDATION_ERROR', message: 'cashbox_id مطلوب' };
        const validatedAmount = validatePositiveAmount(amount, 'amount');
        const validatedDate   = validateDate(payment_date, 'payment_date');

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            // 1. Load and validate invoice
            const invoice = await this._loadSaleInvoice(db, sale_invoice_id);

            // 2. Load customer (may be null for cash sales)
            const customerId = invoice.customer_id;

            // 3. Load and validate cashbox
            const cashbox = await this._loadActiveCashbox(db, cashbox_id);
            const invoiceCurrency = normalizeCurrency(invoice.currency);
            const invoiceRate = normalizeExchangeRate(invoiceCurrency, invoice.exchange_rate);
            assertCashboxCurrency(cashbox, invoiceCurrency);
            const amountBase = toBaseAmount(validatedAmount, invoiceRate);

            // 4. Calculate outstanding
            const outstanding = Math.round((normalizeAmount(invoice.total) - normalizeAmount(invoice.paid_amount)) * 100) / 100;
            if (validatedAmount > outstanding + 0.001) {
                throw { code: 'PAYMENT_EXCEEDS_OUTSTANDING', message: `المبلغ (${validatedAmount}) أكبر من المتبقي (${outstanding})` };
            }

            // 5. Create payment record
            const { lastID: paymentId } = await dbRun(db,
                `INSERT INTO payments
                   (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date,
                    status, notes, created_at, updated_at)
                 VALUES ('customer', ?, 'sale', ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`,
                [customerId ?? null, sale_invoice_id, cashbox_id, validatedAmount, invoiceCurrency,
                 invoiceRate, amountBase, validatedDate, notes ?? null]
            );

            // 6. Increase cashbox balance
            const cbResult = await this._updateCashboxBalance(
                db, cashbox_id, validatedAmount, 'sale', sale_invoice_id,
                validatedDate, `دفعة فاتورة بيع #${invoice.invoice_number}`
            );

            // 7. Update payment record with cashbox_transaction_id
            await dbRun(db,
                `UPDATE payments SET cashbox_transaction_id = ? WHERE id = ?`,
                [cbResult.lastID, paymentId]
            );

            // 8. Reduce customer receivable balance (if customer exists)
            let partyBalance = null;
            if (customerId) {
                partyBalance = await this._updatePartyBalance(db, 'customer', customerId, -amountBase);
                await dbRun(db,
                    `UPDATE payments SET balance_before = ?, balance_after = ? WHERE id = ?`,
                    [partyBalance.balanceBefore, partyBalance.balanceAfter, paymentId]
                );
            }

            // 9. Update invoice paid/remaining/status
            await this._updateInvoicePaymentState(db, 'sale_invoices', sale_invoice_id, validatedAmount);

            // 10. Activity log
            await logActivity(db, 'sale_payment_recorded', 'payments', paymentId, {
                sale_invoice_id, amount: validatedAmount, cashbox_id
            });

            await dbRun(db, 'COMMIT');

            // Return enriched data
            const payment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [paymentId]);
            const updatedInvoice = await dbGet(db, 'SELECT * FROM sale_invoices WHERE id = ?', [sale_invoice_id]);
            const updatedCashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
            const customer = customerId ? await dbGet(db, 'SELECT * FROM customers WHERE id = ?', [customerId]) : null;

            return { payment, invoice: updatedInvoice, customer, cashbox: updatedCashbox };

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── recordPurchasePayment ────────────────────────────────────────────

    async recordPurchasePayment(input) {
        const { purchase_invoice_id, cashbox_id, amount, payment_date, notes } = input ?? {};

        if (!purchase_invoice_id) throw { code: 'VALIDATION_ERROR', message: 'purchase_invoice_id مطلوب' };
        if (!cashbox_id)          throw { code: 'VALIDATION_ERROR', message: 'cashbox_id مطلوب' };
        const validatedAmount = validatePositiveAmount(amount, 'amount');
        const validatedDate   = validateDate(payment_date, 'payment_date');

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            // 1. Load and validate invoice
            const invoice = await this._loadPurchaseInvoice(db, purchase_invoice_id);
            const supplierId = invoice.supplier_id;

            // 2. Load and validate cashbox
            const cashbox = await this._loadActiveCashbox(db, cashbox_id);
            const invoiceCurrency = normalizeCurrency(invoice.currency);
            const invoiceRate = normalizeExchangeRate(invoiceCurrency, invoice.exchange_rate);
            assertCashboxCurrency(cashbox, invoiceCurrency);
            const amountBase = toBaseAmount(validatedAmount, invoiceRate);

            // 3. Check cashbox balance sufficient
            const cashboxBalance = normalizeAmount(cashbox.balance);
            if (cashboxBalance < validatedAmount - 0.001) {
                throw { code: 'INSUFFICIENT_BALANCE', message: `رصيد الصندوق (${cashboxBalance}) أقل من المبلغ المطلوب (${validatedAmount})` };
            }

            // 4. Calculate outstanding
            const outstanding = Math.round((normalizeAmount(invoice.total) - normalizeAmount(invoice.paid_amount)) * 100) / 100;
            if (validatedAmount > outstanding + 0.001) {
                throw { code: 'PAYMENT_EXCEEDS_OUTSTANDING', message: `المبلغ (${validatedAmount}) أكبر من المتبقي (${outstanding})` };
            }

            // 5. Create payment record
            const { lastID: paymentId } = await dbRun(db,
                `INSERT INTO payments
                   (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date,
                    status, notes, created_at, updated_at)
                 VALUES ('supplier', ?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`,
                [supplierId, purchase_invoice_id, cashbox_id, validatedAmount, invoiceCurrency,
                 invoiceRate, amountBase, validatedDate, notes ?? null]
            );

            // 6. Deduct cashbox balance (negative delta)
            const cbResult = await this._updateCashboxBalance(
                db, cashbox_id, -validatedAmount, 'purchase', purchase_invoice_id,
                validatedDate, `دفعة فاتورة شراء #${invoice.invoice_number}`
            );

            // 7. Update payment with cashbox_transaction_id
            await dbRun(db,
                `UPDATE payments SET cashbox_transaction_id = ? WHERE id = ?`,
                [cbResult.lastID, paymentId]
            );

            // 8. Reduce supplier payable balance
            const partyBalance = await this._updatePartyBalance(db, 'supplier', supplierId, -amountBase);
            await dbRun(db,
                `UPDATE payments SET balance_before = ?, balance_after = ? WHERE id = ?`,
                [partyBalance.balanceBefore, partyBalance.balanceAfter, paymentId]
            );

            // 9. Update invoice paid/remaining/status
            await this._updateInvoicePaymentState(db, 'purchase_invoices', purchase_invoice_id, validatedAmount);

            // 10. Activity log
            await logActivity(db, 'purchase_payment_recorded', 'payments', paymentId, {
                purchase_invoice_id, amount: validatedAmount, cashbox_id
            });

            await dbRun(db, 'COMMIT');

            const payment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [paymentId]);
            const updatedInvoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [purchase_invoice_id]);
            const updatedCashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
            const supplier = await dbGet(db, 'SELECT * FROM suppliers WHERE id = ?', [supplierId]);

            return { payment, invoice: updatedInvoice, supplier, cashbox: updatedCashbox };

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── reverseSalePayment ───────────────────────────────────────────────

    async reverseSalePayment(paymentId, reason) {
        if (!paymentId) throw { code: 'VALIDATION_ERROR', message: 'paymentId مطلوب' };
        if (!reason?.trim()) throw { code: 'VALIDATION_ERROR', message: 'سبب الإلغاء مطلوب' };

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            const payment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [paymentId]);
            if (!payment)                    throw { code: 'NOT_FOUND', message: 'الدفعة غير موجودة' };
            if (payment.status === 'reversed') throw { code: 'PAYMENT_ALREADY_REVERSED', message: 'هذه الدفعة محوّلة مسبقًا' };
            if (payment.payment_type !== 'sale') throw { code: 'VALIDATION_ERROR', message: 'هذه الدفعة ليست دفعة بيع' };

            const amount = normalizeAmount(payment.amount);

            // Mark original as reversed
            await dbRun(db,
                `UPDATE payments SET status = 'reversed', reversal_reason = ?, updated_at = datetime('now') WHERE id = ?`,
                [reason, paymentId]
            );

            // Create reversal payment record
            const { lastID: reversalId } = await dbRun(db,
                `INSERT INTO payments
                   (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date,
                    status, reversed_payment_id, reversal_reason, notes, created_at, updated_at)
                 VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, ?, ?, 'reversed', ?, ?, ?, datetime('now'), datetime('now'))`,
                [payment.party_type, payment.party_id, payment.invoice_id, payment.cashbox_id,
                 amount, payment.currency || 'SYP', payment.exchange_rate || 1,
                 payment.amount_base || amount, payment.payment_date, paymentId, reason, `إلغاء دفعة #${paymentId}`]
            );

            // Link original to reversal
            await dbRun(db,
                `UPDATE payments SET reversed_payment_id = ? WHERE id = ?`,
                [reversalId, paymentId]
            );

            // Deduct from cashbox (reversal of 'in' movement)
            const cashbox = await dbGet(db, 'SELECT balance FROM cashboxes WHERE id = ?', [payment.cashbox_id]);
            const balanceBefore = normalizeAmount(cashbox.balance);
            const balanceAfter  = Math.round((balanceBefore - amount) * 100) / 100;
            await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balanceAfter, payment.cashbox_id]);
            await dbRun(db,
                `INSERT INTO cashbox_transactions
                   (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'reversal', ?, ?, 'out', ?, ?, date('now'), ?, datetime('now'), datetime('now'))`,
                [payment.cashbox_id, paymentId, amount, balanceBefore, balanceAfter, `إلغاء دفعة بيع #${paymentId}`]
            );

            // Restore customer receivable balance (increase balance back)
            if (payment.party_id) {
                await this._updatePartyBalance(db, 'customer', payment.party_id, normalizeAmount(payment.amount_base ?? amount));
            }

            // Recalculate invoice
            await this._updateInvoicePaymentState(db, 'sale_invoices', payment.invoice_id, -amount);

            await logActivity(db, 'sale_payment_reversed', 'payments', paymentId, { reason, amount });

            await dbRun(db, 'COMMIT');

            const updatedInvoice = await dbGet(db, 'SELECT * FROM sale_invoices WHERE id = ?', [payment.invoice_id]);
            const updatedCashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [payment.cashbox_id]);
            const reversedPayment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [paymentId]);

            return { reversedPayment, invoice: updatedInvoice, cashbox: updatedCashbox };

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── reversePurchasePayment ───────────────────────────────────────────

    async reversePurchasePayment(paymentId, reason) {
        if (!paymentId) throw { code: 'VALIDATION_ERROR', message: 'paymentId مطلوب' };
        if (!reason?.trim()) throw { code: 'VALIDATION_ERROR', message: 'سبب الإلغاء مطلوب' };

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            const payment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [paymentId]);
            if (!payment)                    throw { code: 'NOT_FOUND', message: 'الدفعة غير موجودة' };
            if (payment.status === 'reversed') throw { code: 'PAYMENT_ALREADY_REVERSED', message: 'هذه الدفعة محوّلة مسبقًا' };
            if (payment.payment_type !== 'purchase') throw { code: 'VALIDATION_ERROR', message: 'هذه الدفعة ليست دفعة شراء' };

            const amount = normalizeAmount(payment.amount);

            // Mark original reversed
            await dbRun(db,
                `UPDATE payments SET status = 'reversed', reversal_reason = ?, updated_at = datetime('now') WHERE id = ?`,
                [reason, paymentId]
            );

            // Create reversal record
            const { lastID: reversalId } = await dbRun(db,
                `INSERT INTO payments
                   (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency, exchange_rate, amount_base, payment_date,
                    status, reversed_payment_id, reversal_reason, notes, created_at, updated_at)
                 VALUES (?, ?, 'purchase', ?, ?, ?, ?, ?, ?, ?, 'reversed', ?, ?, ?, datetime('now'), datetime('now'))`,
                [payment.party_type, payment.party_id, payment.invoice_id, payment.cashbox_id,
                 amount, payment.currency || 'SYP', payment.exchange_rate || 1,
                 payment.amount_base || amount, payment.payment_date, paymentId, reason, `إلغاء دفعة #${paymentId}`]
            );

            await dbRun(db, `UPDATE payments SET reversed_payment_id = ? WHERE id = ?`, [reversalId, paymentId]);

            // Restore cashbox balance (add money back)
            const cashbox = await dbGet(db, 'SELECT balance FROM cashboxes WHERE id = ?', [payment.cashbox_id]);
            const balanceBefore = normalizeAmount(cashbox.balance);
            const balanceAfter  = Math.round((balanceBefore + amount) * 100) / 100;
            await dbRun(db, `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balanceAfter, payment.cashbox_id]);
            await dbRun(db,
                `INSERT INTO cashbox_transactions
                   (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'reversal', ?, ?, 'in', ?, ?, date('now'), ?, datetime('now'), datetime('now'))`,
                [payment.cashbox_id, paymentId, amount, balanceBefore, balanceAfter, `إلغاء دفعة شراء #${paymentId}`]
            );

            // Restore supplier payable balance (increase balance back)
            if (payment.party_id) {
                await this._updatePartyBalance(db, 'supplier', payment.party_id, normalizeAmount(payment.amount_base ?? amount));
            }

            // Recalculate invoice
            await this._updateInvoicePaymentState(db, 'purchase_invoices', payment.invoice_id, -amount);

            await logActivity(db, 'purchase_payment_reversed', 'payments', paymentId, { reason, amount });

            await dbRun(db, 'COMMIT');

            const updatedInvoice = await dbGet(db, 'SELECT * FROM purchase_invoices WHERE id = ?', [payment.invoice_id]);
            const updatedCashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [payment.cashbox_id]);
            const reversedPayment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [paymentId]);

            return { reversedPayment, invoice: updatedInvoice, cashbox: updatedCashbox };

        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── Read-only queries ────────────────────────────────────────────────

    async getSalePayments(invoiceId) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'invoiceId مطلوب' };
        const db = await dbmanager.init();
        return dbAll(db,
            `SELECT p.*, c.name as cashbox_name
             FROM payments p
             LEFT JOIN cashboxes c ON p.cashbox_id = c.id
             WHERE p.invoice_id = ? AND p.payment_type = 'sale'
             ORDER BY p.payment_date DESC, p.id DESC`,
            [invoiceId]
        );
    }

    async getPurchasePayments(invoiceId) {
        if (!invoiceId) throw { code: 'VALIDATION_ERROR', message: 'invoiceId مطلوب' };
        const db = await dbmanager.init();
        return dbAll(db,
            `SELECT p.*, c.name as cashbox_name
             FROM payments p
             LEFT JOIN cashboxes c ON p.cashbox_id = c.id
             WHERE p.invoice_id = ? AND p.payment_type = 'purchase'
             ORDER BY p.payment_date DESC, p.id DESC`,
            [invoiceId]
        );
    }

    async getPayment(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID مطلوب' };
        const db = await dbmanager.init();
        const row = await dbGet(db,
            `SELECT p.*, c.name as cashbox_name FROM payments p LEFT JOIN cashboxes c ON p.cashbox_id = c.id WHERE p.id = ?`,
            [id]
        );
        if (!row) throw { code: 'NOT_FOUND', message: 'الدفعة غير موجودة' };
        return row;
    }

    async getAllPayments() {
        const db = await dbmanager.init();
        return dbAll(db, 'SELECT * FROM payments ORDER BY created_at DESC');
    }
}

module.exports = new PaymentController();
