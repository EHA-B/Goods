'use strict';
/**
 * workerController.js — CRUD and payment operations for workers.
 *
 * Rules:
 *  - All payment mutations are atomic database transactions.
 *  - Cashbox balance is updated inside the same transaction.
 *  - Worker balance is updated atomically (negative = owed to worker).
 *  - Reversal creates an opposite cashbox movement; original record is preserved.
 */

const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));
const {
    validatePositiveAmount,
    normalizeAmount,
    validateDate,
    logActivity,
    dbRun,
    dbGet,
    dbAll,
} = require('./utils/invoiceUtils');

class WorkerController {

    // ─── CRUD ─────────────────────────────────────────────────────────────

    async createWorker(input) {
        if (!input || typeof input.name !== 'string' || input.name.trim() === '') {
            const err = new Error('Name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const validTypes = ['employee', 'worker'];
        const workerType = input.type ?? 'worker';
        if (!validTypes.includes(workerType)) {
            const err = new Error(`type must be one of: ${validTypes.join(', ')}`);
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const db = await dbmanager.init();
        const sql = `
            INSERT INTO workers (name, phone, address, balance, type, notes, state, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;

        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.name.trim(),
                input.phone ?? null,
                input.address ?? null,
                input.balance ?? 0,
                workerType,
                input.notes ?? null,
                input.state ?? 'active',
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });

        return this.getWorker(id);
    }

    async getWorker(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();

        return new Promise((resolve, reject) => {
            db.get(
                `SELECT id, name, phone, address, balance, type, notes, state, created_at, updated_at
                 FROM workers WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'Worker not found' });
                    resolve(row);
                },
            );
        });
    }

    async getAllWorkers() {
        const db = await dbmanager.init();
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT id, name, phone, address, balance, type, notes, state, created_at, updated_at
                 FROM workers ORDER BY id DESC`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                },
            );
        });
    }

    async updateWorker(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        if (input && Object.prototype.hasOwnProperty.call(input, 'name')) {
            if (typeof input.name !== 'string' || input.name.trim() === '') {
                const err = new Error('Name is required');
                err.code = 'VALIDATION_ERROR';
                throw err;
            }
        }

        if (input && Object.prototype.hasOwnProperty.call(input, 'type')) {
            const validTypes = ['employee', 'worker'];
            if (!validTypes.includes(input.type)) {
                const err = new Error(`type must be one of: ${validTypes.join(', ')}`);
                err.code = 'VALIDATION_ERROR';
                throw err;
            }
        }

        const mapping = {
            name: 'name',
            phone: 'phone',
            address: 'address',
            balance: 'balance',
            type: 'type',
            notes: 'notes',
            state: 'state',
        };

        const sets = [];
        const params = [];

        for (const key of Object.keys(mapping)) {
            if (Object.prototype.hasOwnProperty.call(input || {}, key)) {
                sets.push(`${mapping[key]} = ?`);
                params.push(key === 'name' ? input[key].trim() : (input[key] ?? null));
            }
        }

        if (sets.length === 0) {
            const err = new Error('No fields provided to update');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        sets.push(`updated_at = datetime('now')`);
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`UPDATE workers SET ${sets.join(', ')} WHERE id = ?`, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) {
            throw { code: 'NOT_FOUND', message: 'Worker not found' };
        }

        return this.getWorker(id);
    }

    async deleteWorker(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();

        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM workers WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) {
            throw { code: 'NOT_FOUND', message: 'Worker not found' };
        }

        return { success: true, message: 'Worker deleted successfully' };
    }

    // ─── Internal helpers ──────────────────────────────────────────────────

    async _updateCashboxBalance(db, cashboxId, delta, referenceType, referenceId, txDate, notes) {
        const cashbox = await dbGet(db, 'SELECT balance FROM cashboxes WHERE id = ?', [cashboxId]);
        if (!cashbox) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };
        const balanceBefore = normalizeAmount(cashbox.balance);
        const balanceAfter  = Math.round((balanceBefore + delta) * 100) / 100;

        await dbRun(db,
            `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
            [balanceAfter, cashboxId],
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
                notes,
            ],
        );

        return { lastID, balanceBefore, balanceAfter };
    }

    async _updateWorkerBalance(db, workerId, delta) {
        const worker = await dbGet(db, `SELECT balance FROM workers WHERE id = ?`, [workerId]);
        if (!worker) throw { code: 'NOT_FOUND', message: 'Worker not found' };
        const balanceBefore = normalizeAmount(worker.balance);
        const balanceAfter  = Math.round((balanceBefore + delta) * 100) / 100;
        await dbRun(db,
            `UPDATE workers SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
            [balanceAfter, workerId],
        );
        return { balanceBefore, balanceAfter };
    }

    // ─── recordWorkerPayment ───────────────────────────────────────────────

    /**
     * Pays a worker from a cashbox.
     * - Deducts amount from cashbox.
     * - Records cashbox_transaction row.
     * - Deducts amount from worker.balance (decreases what is owed).
     * - Inserts worker_payments row.
     *
     * Input: { worker_id, cashbox_id, amount, payment_date, notes }
     */
    async recordWorkerPayment(input) {
        const {
            worker_id,
            cashbox_id,
            category_id,
            amount,
            payment_date,
            description,
            reference_number,
            notes,
        } = input ?? {};

        if (!worker_id)  throw { code: 'VALIDATION_ERROR', message: 'worker_id is required' };
        if (!cashbox_id) throw { code: 'VALIDATION_ERROR', message: 'cashbox_id is required' };
        if (!category_id) throw { code: 'VALIDATION_ERROR', message: 'category_id is required for worker payments' };

        const validatedAmount = validatePositiveAmount(amount, 'amount');
        const validatedDate   = validateDate(payment_date, 'payment_date');
        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            // 1. Load worker.
            const worker = await dbGet(db, 'SELECT * FROM workers WHERE id = ?', [worker_id]);
            if (!worker) throw { code: 'NOT_FOUND', message: 'Worker not found' };
            if (worker.state === 'inactive') {
                throw { code: 'VALIDATION_ERROR', message: 'Cannot pay an inactive worker' };
            }

            // 2. Validate the financial transaction category.
            const category = await dbGet(
                db,
                `SELECT id, name, type, isActive
                 FROM transaction_categories
                 WHERE id = ?`,
                [category_id],
            );
            if (!category) throw { code: 'NOT_FOUND', message: 'Transaction category not found' };
            if (!category.isActive) throw { code: 'INACTIVE_CATEGORY', message: 'Transaction category is inactive' };
            if (category.type !== 'expense') {
                throw { code: 'CATEGORY_TYPE_MISMATCH', message: 'Worker payments must use an expense category' };
            }

            // 3. Load and validate cashbox.
            const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
            if (!cashbox) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };
            if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'Cashbox is not active' };

            const cashboxBalance = normalizeAmount(cashbox.balance);
            if (cashboxBalance < validatedAmount - 0.001) {
                throw {
                    code: 'INSUFFICIENT_BALANCE',
                    message: `Cashbox balance (${cashboxBalance}) is less than the requested amount (${validatedAmount})`,
                };
            }

            // 4. Insert the worker payment first so the cashbox movement can reference it.
            const { lastID: paymentId } = await dbRun(
                db,
                `INSERT INTO worker_payments
                   (worker_id, cashbox_id, amount, currency, exchange_rate, amount_base,
                    payment_date, notes, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
                [
                    worker_id,
                    cashbox_id,
                    validatedAmount,
                    cashbox.currency ?? 'SYP',
                    validatedAmount,
                    validatedDate,
                    notes ?? null,
                ],
            );

            // 5. Deduct the cashbox exactly once and create the authoritative cashbox movement.
            const cbResult = await this._updateCashboxBalance(
                db,
                cashbox_id,
                -validatedAmount,
                'worker_payment',
                paymentId,
                validatedDate,
                `Worker payment – ${worker.name} #${paymentId}`,
            );

            // 6. Create the financial transaction ledger row WITHOUT touching the cashbox again.
            const transactionDescription =
                typeof description === 'string' && description.trim()
                    ? description.trim()
                    : `رواتب وأجور - ${worker.name}`;

            const { lastID: transactionId } = await dbRun(
                db,
                `INSERT INTO transactions
                   (category_id, cashbox_id, amount, direction, transaction_date,
                    description, reference_number, notes, status,
                    cashbox_transaction_id, created_at, updated_at)
                 VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))`,
                [
                    category_id,
                    cashbox_id,
                    validatedAmount,
                    validatedDate,
                    transactionDescription,
                    reference_number ?? null,
                    notes ?? null,
                    cbResult.lastID,
                ],
            );

            // 7. Link the worker payment to both the cashbox movement and financial transaction.
            await dbRun(
                db,
                `UPDATE worker_payments
                 SET cashbox_transaction_id = ?, transaction_id = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [cbResult.lastID, transactionId, paymentId],
            );

            // 8. Update worker balance (decrease what is owed to the worker).
            const workerBalance = await this._updateWorkerBalance(
                db,
                worker_id,
                -validatedAmount,
            );

            await dbRun(
                db,
                `UPDATE worker_payments
                 SET balance_before = ?, balance_after = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [workerBalance.balanceBefore, workerBalance.balanceAfter, paymentId],
            );

            // 9. Activity logs for both linked records.
            await logActivity(db, 'worker_payment_recorded', 'worker_payments', paymentId, {
                worker_id,
                amount: validatedAmount,
                cashbox_id,
                transaction_id: transactionId,
                category_id,
            });

            await logActivity(db, 'financial_transaction_created', 'transactions', transactionId, {
                source: 'worker_payment',
                worker_id,
                worker_payment_id: paymentId,
                amount: validatedAmount,
                cashbox_id,
                category_id,
            });

            await dbRun(db, 'COMMIT');

            const payment = await dbGet(db, 'SELECT * FROM worker_payments WHERE id = ?', [paymentId]);
            const transaction = await dbGet(db, 'SELECT * FROM transactions WHERE id = ?', [transactionId]);
            const updatedWorker = await dbGet(db, 'SELECT * FROM workers WHERE id = ?', [worker_id]);
            const updatedCashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);

            return {
                payment,
                transaction,
                worker: updatedWorker,
                cashbox: updatedCashbox,
            };
        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── reverseWorkerPayment ──────────────────────────────────────────────

    async reverseWorkerPayment(paymentId, reason) {
        if (!paymentId)      throw { code: 'VALIDATION_ERROR', message: 'paymentId is required' };
        if (!reason?.trim()) throw { code: 'VALIDATION_ERROR', message: 'Reversal reason is required' };

        const db = await dbmanager.init();

        try {
            await dbRun(db, 'BEGIN TRANSACTION');

            const payment = await dbGet(db, 'SELECT * FROM worker_payments WHERE id = ?', [paymentId]);
            if (!payment) throw { code: 'NOT_FOUND', message: 'Payment not found' };
            if (payment.status === 'reversed') {
                throw { code: 'PAYMENT_ALREADY_REVERSED', message: 'This payment has already been reversed' };
            }

            const amount = normalizeAmount(payment.amount);

            // 1. Mark original worker payment as reversed.
            await dbRun(
                db,
                `UPDATE worker_payments
                 SET status = 'reversed', reversal_reason = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [reason.trim(), paymentId],
            );

            // 2. Create an audit reversal row in worker_payments.
            const { lastID: reversalId } = await dbRun(
                db,
                `INSERT INTO worker_payments
                   (worker_id, cashbox_id, amount, currency, exchange_rate, amount_base,
                    payment_date, notes, status, reversed_payment_id, reversal_reason,
                    created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reversed', ?, ?, datetime('now'), datetime('now'))`,
                [
                    payment.worker_id,
                    payment.cashbox_id,
                    amount,
                    payment.currency ?? 'SYP',
                    normalizeAmount(payment.exchange_rate || 1) || 1,
                    normalizeAmount(payment.amount_base || amount),
                    payment.payment_date,
                    `Reversal of worker payment #${paymentId}`,
                    paymentId,
                    reason.trim(),
                ],
            );

            await dbRun(
                db,
                `UPDATE worker_payments
                 SET reversed_payment_id = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [reversalId, paymentId],
            );

            // 3. Restore the cashbox exactly once and create a reversal movement.
            const cashbox = await dbGet(
                db,
                'SELECT balance FROM cashboxes WHERE id = ?',
                [payment.cashbox_id],
            );
            if (!cashbox) throw { code: 'NOT_FOUND', message: 'Linked cashbox not found' };

            const cbBalanceBefore = normalizeAmount(cashbox.balance);
            const cbBalanceAfter = Math.round((cbBalanceBefore + amount) * 100) / 100;

            await dbRun(
                db,
                `UPDATE cashboxes
                 SET balance = ?, updated_at = datetime('now')
                 WHERE id = ?`,
                [cbBalanceAfter, payment.cashbox_id],
            );

            const { lastID: reversalMovementId } = await dbRun(
                db,
                `INSERT INTO cashbox_transactions
                   (cashbox_id, reference_type, reference_id, amount, direction,
                    balance_before, balance_after, transaction_date, notes,
                    created_at, updated_at)
                 VALUES (?, 'reversal', ?, ?, 'in', ?, ?, date('now'), ?, datetime('now'), datetime('now'))`,
                [
                    payment.cashbox_id,
                    paymentId,
                    amount,
                    cbBalanceBefore,
                    cbBalanceAfter,
                    `Reversal of worker payment #${paymentId}`,
                ],
            );

            // 4. Restore the worker balance.
            await this._updateWorkerBalance(db, payment.worker_id, amount);

            // 5. Cancel the linked financial transaction without another cashbox mutation.
            if (payment.transaction_id) {
                const linkedTransaction = await dbGet(
                    db,
                    'SELECT id, status FROM transactions WHERE id = ?',
                    [payment.transaction_id],
                );

                if (linkedTransaction && linkedTransaction.status !== 'cancelled') {
                    await dbRun(
                        db,
                        `UPDATE transactions
                         SET status = 'cancelled',
                             cancelled_at = datetime('now'),
                             cancellation_reason = ?,
                             updated_at = datetime('now')
                         WHERE id = ?`,
                        [reason.trim(), payment.transaction_id],
                    );

                    await logActivity(
                        db,
                        'financial_transaction_cancelled',
                        'transactions',
                        payment.transaction_id,
                        {
                            source: 'worker_payment_reversal',
                            worker_payment_id: paymentId,
                            reversal_movement_id: reversalMovementId,
                            reason: reason.trim(),
                        },
                    );
                }
            }

            await logActivity(db, 'worker_payment_reversed', 'worker_payments', paymentId, {
                reason: reason.trim(),
                amount,
                transaction_id: payment.transaction_id ?? null,
            });

            await dbRun(db, 'COMMIT');

            const updatedWorker = await dbGet(db, 'SELECT * FROM workers WHERE id = ?', [payment.worker_id]);
            const updatedCashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [payment.cashbox_id]);
            const reversedPayment = await dbGet(db, 'SELECT * FROM worker_payments WHERE id = ?', [paymentId]);
            const transaction = payment.transaction_id
                ? await dbGet(db, 'SELECT * FROM transactions WHERE id = ?', [payment.transaction_id])
                : null;

            return {
                reversedPayment,
                transaction,
                worker: updatedWorker,
                cashbox: updatedCashbox,
            };
        } catch (err) {
            await new Promise((res) => db.run('ROLLBACK', () => res()));
            throw err;
        }
    }

    // ─── Read queries ──────────────────────────────────────────────────────

    async getWorkerPayments(workerId) {
        if (!workerId) throw { code: 'VALIDATION_ERROR', message: 'workerId is required' };
        const db = await dbmanager.init();
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT wp.*, cb.name AS cashbox_name
                 FROM worker_payments wp
                 LEFT JOIN cashboxes cb ON cb.id = wp.cashbox_id
                 WHERE wp.worker_id = ?
                 ORDER BY wp.payment_date DESC, wp.id DESC`,
                [workerId],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows || []);
                },
            );
        });
    }
}

module.exports = new WorkerController();
