const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));
const crypto = require('crypto');

class CashboxController {

    // ─── Helpers ───────────────────────────────────────────────────────────

    _dbRun(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    _dbGet(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    }

    _dbAll(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
    }

    async _beginTransaction(db) {
        return this._dbRun(db, 'BEGIN TRANSACTION');
    }

    async _commit(db) {
        return this._dbRun(db, 'COMMIT');
    }

    async _rollback(db) {
        return new Promise((resolve) => {
            db.run('ROLLBACK', () => resolve());
        });
    }

    async _getCashboxById(db, id) {
        const row = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [id]);
        if (!row) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };
        return row;
    }

    /**
     * Detect if setting `newParentId` as parent of `cashboxId` would create a cycle.
     * Walks up the parent chain from newParentId; if it reaches cashboxId → cycle.
     */
    async _wouldCreateCycle(db, cashboxId, newParentId) {
        if (!newParentId) return false;
        if (newParentId === cashboxId) return true;
        let current = newParentId;
        const visited = new Set();
        while (current) {
            if (visited.has(current)) return true; // safety
            visited.add(current);
            const row = await this._dbGet(db, 'SELECT parent_id FROM cashboxes WHERE id = ?', [current]);
            if (!row) break;
            current = row.parent_id;
            if (current === cashboxId) return true;
        }
        return false;
    }

    // ─── 6.1 createCashbox ────────────────────────────────────────────────

    async createCashbox(input) {
        if (!input || !input.name || !String(input.name).trim()) {
            const err = new Error('name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const initialBalance = Number(input.initial_balance ?? 0);
        if (initialBalance < 0) {
            const err = new Error('Opening balance cannot be negative');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const currency = input.currency || 'SAR';
        const db = await dbmanager.init();

        try {
            await this._beginTransaction(db);

            // Validate parent if provided
            if (input.parent_id) {
                const parent = await this._dbGet(db, 'SELECT id, isActive FROM cashboxes WHERE id = ?', [input.parent_id]);
                if (!parent) throw { code: 'NOT_FOUND', message: 'Parent cashbox not found' };
            }

            // Insert cashbox with balance = initial_balance
            const { lastID } = await this._dbRun(db,
                `INSERT INTO cashboxes (name, parent_id, balance, initial_balance, currency, isActive, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [
                    String(input.name).trim(),
                    input.parent_id ?? null,
                    initialBalance,
                    initialBalance,
                    currency,
                    input.isActive !== false ? 1 : 0,
                    input.notes ?? null
                ]
            );

            // Create opening-balance movement when initial_balance > 0
            if (initialBalance > 0) {
                const today = new Date().toISOString().split('T')[0];
                await this._dbRun(db,
                    `INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                     VALUES (?, 'opening_balance', ?, ?, 'in', 0, ?, ?, 'Opening balance', datetime('now'), datetime('now'))`,
                    [lastID, lastID, initialBalance, initialBalance, today]
                );
            }

            await this._commit(db);
            return this.getCashbox(lastID);

        } catch (error) {
            await this._rollback(db);
            throw error;
        }
    }

    // ─── getCashbox ───────────────────────────────────────────────────────

    async getCashbox(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const row = await this._dbGet(db,
            `SELECT c.*, p.name as parent_name FROM cashboxes c LEFT JOIN cashboxes p ON c.parent_id = p.id WHERE c.id = ?`,
            [id]
        );
        if (!row) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };
        return row;
    }

    // ─── getAllCashboxs ────────────────────────────────────────────────────

    async getAllCashboxs() {
        const db = await dbmanager.init();
        return this._dbAll(db,
            `SELECT c.*, p.name as parent_name FROM cashboxes c LEFT JOIN cashboxes p ON c.parent_id = p.id ORDER BY c.id ASC`
        );
    }

    // ─── getCashboxesSummary ──────────────────────────────────────────────

    async getCashboxesSummary() {
        const db = await dbmanager.init();
        const cashboxStats = await this._dbGet(db,
            `SELECT SUM(balance) as total_balance,
                    SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active_count
             FROM cashboxes`
        );
        const transactionStats = await this._dbGet(db,
            `SELECT SUM(CASE WHEN direction = 'in'  THEN amount ELSE 0 END) as total_in,
                    SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as total_out
             FROM cashbox_transactions`
        );
        return {
            total_balance: cashboxStats?.total_balance || 0,
            active_count:  cashboxStats?.active_count  || 0,
            total_in:      transactionStats?.total_in  || 0,
            total_out:     transactionStats?.total_out || 0,
        };
    }

    // ─── 6.2 updateCashbox ────────────────────────────────────────────────

    async updateCashbox(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        // Reject forbidden fields
        if (Object.prototype.hasOwnProperty.call(input || {}, 'balance') ||
            Object.prototype.hasOwnProperty.call(input || {}, 'initial_balance')) {
            const err = new Error('balance and initial_balance cannot be updated directly. Use business operations.');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const allowed = ['name', 'parent_id', 'currency', 'isActive', 'notes'];
        const sets = [];
        const params = [];

        for (const key of allowed) {
            if (input && Object.prototype.hasOwnProperty.call(input, key)) {
                sets.push(`${key} = ?`);
                params.push(input[key] ?? null);
            }
        }

        if (sets.length === 0) {
            const err = new Error('No fields provided to update');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const db = await dbmanager.init();

        try {
            await this._beginTransaction(db);

            const existing = await this._getCashboxById(db, id);

            // Self-parent check
            if (input.parent_id && Number(input.parent_id) === Number(id)) {
                throw { code: 'PARENT_CYCLE', message: 'A cashbox cannot be its own parent' };
            }

            // Cycle detection
            if (input.parent_id && input.parent_id !== existing.parent_id) {
                const hasCycle = await this._wouldCreateCycle(db, Number(id), Number(input.parent_id));
                if (hasCycle) {
                    throw { code: 'PARENT_CYCLE', message: 'This parent assignment would create a circular relationship' };
                }
            }

            // Currency change guard: reject if movements exist
            if (input.currency && input.currency !== existing.currency) {
                const movCount = await this._dbGet(db,
                    'SELECT COUNT(*) as cnt FROM cashbox_transactions WHERE cashbox_id = ?', [id]
                );
                if (movCount && movCount.cnt > 0) {
                    throw {
                        code: 'VALIDATION_ERROR',
                        message: 'Currency cannot be changed after movements have been recorded'
                    };
                }
            }

            sets.push(`updated_at = datetime('now')`);
            const sql = `UPDATE cashboxes SET ${sets.join(', ')} WHERE id = ?`;
            params.push(id);

            const { changes } = await this._dbRun(db, sql, params);
            if (changes === 0) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };

            await this._commit(db);
            return this.getCashbox(id);

        } catch (error) {
            await this._rollback(db);
            throw error;
        }
    }

    // ─── 6.3 createCashboxMovement ────────────────────────────────────────

    async createCashboxMovement(input) {
        const { cashbox_id, direction, amount, reference_type, reference_id, transaction_date, notes } = input || {};

        if (!cashbox_id) throw { code: 'VALIDATION_ERROR', message: 'cashbox_id is required' };
        if (!direction || !['in', 'out'].includes(direction)) throw { code: 'VALIDATION_ERROR', message: 'direction must be "in" or "out"' };
        if (!amount || Number(amount) <= 0) throw { code: 'VALIDATION_ERROR', message: 'amount must be greater than 0' };

        const allowedRefTypes = ['income', 'expense', 'adjustment'];
        if (!reference_type || !allowedRefTypes.includes(reference_type)) {
            throw { code: 'VALIDATION_ERROR', message: `reference_type must be one of: ${allowedRefTypes.join(', ')}` };
        }

        const numAmount = Number(amount);
        const db = await dbmanager.init();

        try {
            await this._beginTransaction(db);

            const cashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
            if (!cashbox) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };
            if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'The cashbox is inactive' };

            const balanceBefore = Number(cashbox.balance);
            const balanceAfter = direction === 'in' ? balanceBefore + numAmount : balanceBefore - numAmount;

            if (balanceAfter < 0) {
                const err = new Error('Insufficient balance for this operation');
                err.code = 'INSUFFICIENT_BALANCE';
                throw err;
            }

            // Update cashbox balance
            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [balanceAfter, cashbox_id]
            );

            const txDate = transaction_date || new Date().toISOString().split('T')[0];

            // Insert movement
            const { lastID } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [cashbox_id, reference_type, reference_id ?? null, numAmount, direction, balanceBefore, balanceAfter, txDate, notes ?? null]
            );

            await this._commit(db);

            const movement = await this._dbGet(db, 'SELECT * FROM cashbox_transactions WHERE id = ?', [lastID]);
            const updatedCashbox = await this.getCashbox(cashbox_id);
            return { movement, cashbox: updatedCashbox };

        } catch (error) {
            await this._rollback(db);
            throw error;
        }
    }

    // ─── 6.4 transferBetweenCashboxes ─────────────────────────────────────

    async transferBetweenCashboxes(input) {
        const { from_cashbox_id, to_cashbox_id, amount, transaction_date, notes } = input || {};

        if (!from_cashbox_id || !to_cashbox_id) {
            throw { code: 'VALIDATION_ERROR', message: 'from_cashbox_id and to_cashbox_id are required' };
        }
        if (Number(from_cashbox_id) === Number(to_cashbox_id)) {
            throw { code: 'VALIDATION_ERROR', message: 'Source and destination cashboxes must be different' };
        }
        if (!amount || Number(amount) <= 0) {
            throw { code: 'VALIDATION_ERROR', message: 'amount must be greater than 0' };
        }

        const numAmount = Number(amount);
        const db = await dbmanager.init();

        try {
            await this._beginTransaction(db);

            const fromCashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [from_cashbox_id]);
            if (!fromCashbox) throw { code: 'NOT_FOUND', message: 'Source cashbox not found' };
            if (!fromCashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'Source cashbox is inactive' };

            const toCashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [to_cashbox_id]);
            if (!toCashbox) throw { code: 'NOT_FOUND', message: 'Destination cashbox not found' };
            if (!toCashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'Destination cashbox is inactive' };

            if (fromCashbox.currency !== toCashbox.currency) {
                throw { code: 'CURRENCY_MISMATCH', message: 'Transfers between cashboxes with different currencies are not allowed' };
            }

            const fromBalanceBefore = Number(fromCashbox.balance);
            if (fromBalanceBefore < numAmount) {
                throw { code: 'INSUFFICIENT_BALANCE', message: 'Source cashbox has insufficient balance' };
            }

            const toBalanceBefore = Number(toCashbox.balance);
            const fromBalanceAfter = fromBalanceBefore - numAmount;
            const toBalanceAfter = toBalanceBefore + numAmount;
            const txDate = transaction_date || new Date().toISOString().split('T')[0];

            // Generate a transfer group ID to link both movements
            let transferGroupId;
            try {
                transferGroupId = crypto.randomUUID();
            } catch {
                transferGroupId = `TRF-${Date.now()}`;
            }

            // Update source balance
            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [fromBalanceAfter, from_cashbox_id]
            );

            // Insert outgoing movement
            const { lastID: outId } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'transfer', ?, ?, 'out', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [from_cashbox_id, to_cashbox_id, numAmount, fromBalanceBefore, fromBalanceAfter, txDate, notes ?? null]
            );

            // Update destination balance
            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [toBalanceAfter, to_cashbox_id]
            );

            // Insert incoming movement
            const { lastID: inId } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'transfer', ?, ?, 'in', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [to_cashbox_id, from_cashbox_id, numAmount, toBalanceBefore, toBalanceAfter, txDate, notes ?? null]
            );

            await this._commit(db);

            const outMovement = await this._dbGet(db, 'SELECT * FROM cashbox_transactions WHERE id = ?', [outId]);
            const inMovement  = await this._dbGet(db, 'SELECT * FROM cashbox_transactions WHERE id = ?', [inId]);
            const updatedFrom = await this.getCashbox(from_cashbox_id);
            const updatedTo   = await this.getCashbox(to_cashbox_id);

            return {
                transfer_group_id: transferGroupId,
                from: { cashbox: updatedFrom, movement: outMovement },
                to:   { cashbox: updatedTo,   movement: inMovement },
            };

        } catch (error) {
            await this._rollback(db);
            throw error;
        }
    }

    // Legacy transfer wrapper for backward compatibility
    async transfer(from_id, to_id, amount, date, notes) {
        return this.transferBetweenCashboxes({
            from_cashbox_id: from_id,
            to_cashbox_id: to_id,
            amount,
            transaction_date: date,
            notes,
        });
    }

    // ─── 6.5 getCashboxMovements ──────────────────────────────────────────

    async getCashboxMovements(cashboxId, filters = {}) {
        if (!cashboxId) throw { code: 'VALIDATION_ERROR', message: 'cashboxId is required' };

        const db = await dbmanager.init();
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
        const offset = (page - 1) * limit;

        const conditions = ['cashbox_id = ?'];
        const values = [cashboxId];

        if (filters.direction) {
            conditions.push('direction = ?');
            values.push(filters.direction);
        }
        if (filters.reference_type) {
            conditions.push('reference_type = ?');
            values.push(filters.reference_type);
        }
        if (filters.date_from) {
            conditions.push('transaction_date >= ?');
            values.push(filters.date_from);
        }
        if (filters.date_to) {
            conditions.push('transaction_date <= ?');
            values.push(filters.date_to);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        const totalRow = await this._dbGet(db,
            `SELECT COUNT(*) as total FROM cashbox_transactions ${where}`,
            values
        );
        const total = totalRow?.total || 0;
        const totalPages = Math.ceil(total / limit);

        const items = await this._dbAll(db,
            `SELECT * FROM cashbox_transactions ${where} ORDER BY transaction_date DESC, id DESC LIMIT ? OFFSET ?`,
            [...values, limit, offset]
        );

        return {
            items,
            pagination: { page, limit, total, totalPages },
        };
    }

    // ─── 6.6 getCashboxDetails ────────────────────────────────────────────

    async getCashboxDetails(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();

        const cashbox = await this._dbGet(db,
            `SELECT c.*, p.name as parent_name FROM cashboxes c LEFT JOIN cashboxes p ON c.parent_id = p.id WHERE c.id = ?`,
            [id]
        );
        if (!cashbox) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };

        const stats = await this._dbGet(db,
            `SELECT
               SUM(CASE WHEN direction = 'in'  THEN amount ELSE 0 END) as total_in,
               SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as total_out,
               COUNT(*) as movement_count
             FROM cashbox_transactions WHERE cashbox_id = ?`,
            [id]
        );

        const recentMovements = await this._dbAll(db,
            `SELECT * FROM cashbox_transactions WHERE cashbox_id = ? ORDER BY transaction_date DESC, id DESC LIMIT 10`,
            [id]
        );

        return {
            ...cashbox,
            total_in:        stats?.total_in        || 0,
            total_out:       stats?.total_out       || 0,
            movement_count:  stats?.movement_count  || 0,
            recent_movements: recentMovements,
        };
    }

    // ─── 6.7 reverseCashboxMovement ───────────────────────────────────────

    async reverseCashboxMovement(transactionId, reason) {
        if (!transactionId) throw { code: 'VALIDATION_ERROR', message: 'transactionId is required' };
        if (!reason || !String(reason).trim()) throw { code: 'VALIDATION_ERROR', message: 'reason is required for reversal' };

        const db = await dbmanager.init();

        try {
            await this._beginTransaction(db);

            const original = await this._dbGet(db,
                'SELECT * FROM cashbox_transactions WHERE id = ?', [transactionId]
            );
            if (!original) throw { code: 'NOT_FOUND', message: 'Transaction not found' };

            // Check if already reversed
            const existingReversal = await this._dbGet(db,
                `SELECT id FROM cashbox_transactions WHERE reference_type = 'reversal' AND reference_id = ?`,
                [transactionId]
            );
            if (existingReversal) {
                throw { code: 'MOVEMENT_ALREADY_REVERSED', message: 'This movement has already been reversed' };
            }

            const cashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [original.cashbox_id]);
            if (!cashbox) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };

            const reverseDirection = original.direction === 'in' ? 'out' : 'in';
            const reverseAmount = Number(original.amount);
            const balanceBefore = Number(cashbox.balance);
            const balanceAfter = reverseDirection === 'in'
                ? balanceBefore + reverseAmount
                : balanceBefore - reverseAmount;

            if (balanceAfter < 0) {
                throw { code: 'INSUFFICIENT_BALANCE', message: 'Reversal would produce a negative balance' };
            }

            // Update balance
            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [balanceAfter, original.cashbox_id]
            );

            const today = new Date().toISOString().split('T')[0];

            // Insert reversal movement
            const { lastID } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'reversal', ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [original.cashbox_id, transactionId, reverseAmount, reverseDirection, balanceBefore, balanceAfter, today, String(reason).trim()]
            );

            await this._commit(db);

            const reversalMovement = await this._dbGet(db, 'SELECT * FROM cashbox_transactions WHERE id = ?', [lastID]);
            const updatedCashbox = await this.getCashbox(original.cashbox_id);
            return { reversal: reversalMovement, original, cashbox: updatedCashbox };

        } catch (error) {
            await this._rollback(db);
            throw error;
        }
    }

    // ─── 6.8 deleteCashbox ────────────────────────────────────────────────

    async deleteCashbox(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();

        const cashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [id]);
        if (!cashbox) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };

        // Reject if has non-zero balance
        if (Number(cashbox.balance) !== 0) {
            throw { code: 'CASHBOX_IN_USE', message: 'Cannot delete a cashbox with a non-zero balance' };
        }

        // Reject if has any transactions
        const txCount = await this._dbGet(db,
            'SELECT COUNT(*) as cnt FROM cashbox_transactions WHERE cashbox_id = ?', [id]
        );
        if (txCount?.cnt > 0) {
            throw { code: 'CASHBOX_IN_USE', message: 'Cannot delete a cashbox that has movement records' };
        }

        // Reject if has child cashboxes
        const childCount = await this._dbGet(db,
            'SELECT COUNT(*) as cnt FROM cashboxes WHERE parent_id = ?', [id]
        );
        if (childCount?.cnt > 0) {
            throw { code: 'CASHBOX_IN_USE', message: 'Cannot delete a cashbox that has child cashboxes' };
        }

        // Reject if linked to payments
        const paymentCount = await this._dbGet(db,
            'SELECT COUNT(*) as cnt FROM payments WHERE cashbox_id = ?', [id]
        );
        if (paymentCount?.cnt > 0) {
            throw { code: 'CASHBOX_IN_USE', message: 'Cannot delete a cashbox linked to payments' };
        }

        // Reject if linked to sale invoices
        const saleCount = await this._dbGet(db,
            'SELECT COUNT(*) as cnt FROM sale_invoices WHERE cashbox_id = ?', [id]
        );
        if (saleCount?.cnt > 0) {
            throw { code: 'CASHBOX_IN_USE', message: 'Cannot delete a cashbox linked to sale invoices' };
        }

        const { changes } = await this._dbRun(db, 'DELETE FROM cashboxes WHERE id = ?', [id]);
        if (changes === 0) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };

        return { success: true, message: 'Cashbox deleted successfully' };
    }
}

module.exports = new CashboxController();
