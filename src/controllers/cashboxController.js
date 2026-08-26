const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));
const crypto = require('crypto');

// ─── Shared Currency Validator ────────────────────────────────────────────────
const ALLOWED_CURRENCIES = new Set(['SYP', 'USD', 'EUR']);

function validateCurrency(currency) {
    if (!currency || !ALLOWED_CURRENCIES.has(String(currency).trim().toUpperCase())) {
        throw { code: 'INVALID_CURRENCY', message: `Unsupported currency: ${currency}. Allowed: ${[...ALLOWED_CURRENCIES].join(', ')}` };
    }
    return String(currency).trim().toUpperCase();
}

// ─── Allowed reference_type sets ─────────────────────────────────────────────
const ALL_REFERENCE_TYPES = new Set(['opening_balance', 'sale', 'purchase', 'expense', 'income', 'transfer', 'adjustment', 'reversal']);
const MANUAL_MOVEMENT_TYPES = new Set(['income', 'expense', 'adjustment']);
const REVERSIBLE_TYPES = new Set(['income', 'expense', 'adjustment']);

// ─── Date Validator ───────────────────────────────────────────────────────────
function validateDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
        throw { code: 'INVALID_TRANSACTION_DATE', message: 'transaction_date must be in YYYY-MM-DD format' };
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        throw { code: 'INVALID_TRANSACTION_DATE', message: `Invalid date: ${dateStr}` };
    }
    return dateStr;
}

// ─── Name Normalizer ──────────────────────────────────────────────────────────
function normalizeName(name) {
    return String(name).trim().replace(/\s+/g, ' ').toLowerCase();
}

class CashboxController {

    // ─── Low-level DB helpers ─────────────────────────────────────────────

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
     */
    async _wouldCreateCycle(db, cashboxId, newParentId) {
        if (!newParentId) return false;
        if (Number(newParentId) === Number(cashboxId)) return true;
        let current = Number(newParentId);
        const visited = new Set();
        while (current) {
            if (visited.has(current)) return true;
            visited.add(current);
            const row = await this._dbGet(db, 'SELECT parent_id FROM cashboxes WHERE id = ?', [current]);
            if (!row) break;
            current = row.parent_id;
            if (current === Number(cashboxId)) return true;
        }
        return false;
    }

    // ─── createCashbox ────────────────────────────────────────────────────

    async createCashbox(input) {
        if (!input || !input.name || !String(input.name).trim()) {
            throw { code: 'VALIDATION_ERROR', message: 'name is required' };
        }

        const name = String(input.name).trim();

        // Reject forbidden direct balance fields
        if (Object.prototype.hasOwnProperty.call(input, 'balance')) {
            throw { code: 'FORBIDDEN_FIELD', message: 'Cannot set balance directly. Use initial_balance instead.' };
        }

        const initialBalance = Number(input.initial_balance ?? 0);
        if (isNaN(initialBalance) || initialBalance < 0) {
            throw { code: 'VALIDATION_ERROR', message: 'Opening balance cannot be negative' };
        }

        const currency = validateCurrency(input.currency ?? 'SYP');
        const db = await dbmanager.init();

        try {
            await this._beginTransaction(db);

            // Duplicate name check (same parent, active cashboxes)
            const parentId = input.parent_id ?? null;
            const dupCheck = await this._dbGet(db,
                `SELECT id FROM cashboxes WHERE isActive = 1 AND parent_id IS ? AND lower(trim(name)) = ?`,
                [parentId, normalizeName(name)]
            );
            if (dupCheck) {
                throw { code: 'DUPLICATE_CASHBOX_NAME', message: 'An active cashbox with this name already exists under the same parent' };
            }

            // Validate parent if provided
            if (parentId) {
                const parent = await this._dbGet(db, 'SELECT id, isActive FROM cashboxes WHERE id = ?', [parentId]);
                if (!parent) throw { code: 'NOT_FOUND', message: 'Parent cashbox not found' };
                if (!parent.isActive) throw { code: 'INACTIVE_PARENT_CASHBOX', message: 'Cannot assign an inactive cashbox as parent' };
            }

            // Insert cashbox with balance = initial_balance
            const { lastID } = await this._dbRun(db,
                `INSERT INTO cashboxes (name, parent_id, balance, initial_balance, currency, isActive, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [
                    name,
                    parentId,
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
                    `INSERT INTO cashbox_transactions
                       (cashbox_id, reference_type, reference_id, amount, direction,
                        balance_before, balance_after, transfer_group_id,
                        reversed_transaction_id, reversal_reason,
                        transaction_date, notes, created_at, updated_at)
                     VALUES (?, 'opening_balance', ?, ?, 'in', 0, ?, NULL, NULL, NULL, ?, 'Opening balance', datetime('now'), datetime('now'))`,
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

    // ─── getCashboxesSummary (per-currency, excludes opening_balance) ─────

    async getCashboxesSummary() {
        const db = await dbmanager.init();

        // Count totals
        const countStats = await this._dbGet(db,
            `SELECT
               SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active_count,
               SUM(CASE WHEN isActive = 0 THEN 1 ELSE 0 END) as inactive_count
             FROM cashboxes`
        );

        // Per-currency aggregates from cashboxes
        const currencyBalances = await this._dbAll(db,
            `SELECT currency,
                    SUM(balance) as balance
             FROM cashboxes
             GROUP BY currency`
        );

        // Per-currency operational in/out (excluding opening_balance)
        const currencyMovements = await this._dbAll(db,
            `SELECT c.currency,
                    SUM(CASE WHEN ct.direction = 'in' AND ct.reference_type != 'opening_balance' THEN ct.amount ELSE 0 END) as total_in,
                    SUM(CASE WHEN ct.direction = 'out' THEN ct.amount ELSE 0 END) as total_out,
                    SUM(CASE WHEN ct.reference_type = 'opening_balance' THEN ct.amount ELSE 0 END) as opening_balance
             FROM cashbox_transactions ct
             JOIN cashboxes c ON ct.cashbox_id = c.id
             GROUP BY c.currency`
        );

        // Merge by currency
        const byCurrency = {};
        for (const row of currencyBalances) {
            byCurrency[row.currency] = {
                currency: row.currency,
                balance: Number(row.balance ?? 0),
                totalIn: 0,
                totalOut: 0,
                openingBalance: 0,
            };
        }
        for (const row of currencyMovements) {
            if (!byCurrency[row.currency]) {
                byCurrency[row.currency] = { currency: row.currency, balance: 0, totalIn: 0, totalOut: 0, openingBalance: 0 };
            }
            byCurrency[row.currency].totalIn = Number(row.total_in ?? 0);
            byCurrency[row.currency].totalOut = Number(row.total_out ?? 0);
            byCurrency[row.currency].openingBalance = Number(row.opening_balance ?? 0);
        }

        return {
            balancesByCurrency: Object.values(byCurrency),
            activeCashboxesCount: Number(countStats?.active_count ?? 0),
            inactiveCashboxesCount: Number(countStats?.inactive_count ?? 0),
        };
    }

    // ─── updateCashbox ────────────────────────────────────────────────────

    async updateCashbox(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        // Reject forbidden fields
        if (Object.prototype.hasOwnProperty.call(input || {}, 'balance') ||
            Object.prototype.hasOwnProperty.call(input || {}, 'initial_balance')) {
            throw { code: 'FORBIDDEN_FIELD', message: 'balance and initial_balance cannot be updated directly. Use business operations.' };
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
            throw { code: 'VALIDATION_ERROR', message: 'No fields provided to update' };
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
            if (input.parent_id !== undefined && input.parent_id !== existing.parent_id) {
                const hasCycle = await this._wouldCreateCycle(db, Number(id), Number(input.parent_id));
                if (hasCycle) {
                    throw { code: 'PARENT_CYCLE', message: 'This parent assignment would create a circular relationship' };
                }
                // Inactive parent check
                if (input.parent_id) {
                    const parent = await this._dbGet(db, 'SELECT isActive FROM cashboxes WHERE id = ?', [input.parent_id]);
                    if (!parent) throw { code: 'NOT_FOUND', message: 'Parent cashbox not found' };
                    if (!parent.isActive) throw { code: 'INACTIVE_PARENT_CASHBOX', message: 'Cannot assign an inactive cashbox as parent' };
                }
            }

            // Currency change guard: reject if movements exist
            if (input.currency && input.currency !== existing.currency) {
                validateCurrency(input.currency);
                const movCount = await this._dbGet(db,
                    'SELECT COUNT(*) as cnt FROM cashbox_transactions WHERE cashbox_id = ?', [id]
                );
                if (movCount && movCount.cnt > 0) {
                    throw { code: 'CURRENCY_CHANGE_NOT_ALLOWED', message: 'Currency cannot be changed after movements have been recorded' };
                }
            }

            // Duplicate name check on rename
            if (input.name && input.name !== existing.name) {
                const parentId = input.parent_id !== undefined ? input.parent_id : existing.parent_id;
                const dupCheck = await this._dbGet(db,
                    `SELECT id FROM cashboxes WHERE isActive = 1 AND parent_id IS ? AND lower(trim(name)) = ? AND id != ?`,
                    [parentId, normalizeName(input.name), id]
                );
                if (dupCheck) {
                    throw { code: 'DUPLICATE_CASHBOX_NAME', message: 'An active cashbox with this name already exists under the same parent' };
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

    // ─── createCashboxMovement ────────────────────────────────────────────

    async createCashboxMovement(input) {
        const { cashbox_id, direction, amount, reference_type, reference_id, transaction_date, notes } = input || {};

        if (!cashbox_id) throw { code: 'VALIDATION_ERROR', message: 'cashbox_id is required' };
        if (!direction || !['in', 'out'].includes(direction)) throw { code: 'VALIDATION_ERROR', message: 'direction must be "in" or "out"' };
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw { code: 'VALIDATION_ERROR', message: 'amount must be a positive number' };

        if (!reference_type || !MANUAL_MOVEMENT_TYPES.has(reference_type)) {
            throw { code: 'VALIDATION_ERROR', message: `reference_type must be one of: ${[...MANUAL_MOVEMENT_TYPES].join(', ')}` };
        }

        const numAmount = Number(amount);
        const txDate = validateDate(transaction_date);
        const db = await dbmanager.init();

        try {
            await this._beginTransaction(db);

            const cashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [cashbox_id]);
            if (!cashbox) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };
            if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'The cashbox is inactive' };

            const balanceBefore = Number(cashbox.balance);
            const balanceAfter = direction === 'in' ? balanceBefore + numAmount : balanceBefore - numAmount;

            if (balanceAfter < 0) {
                throw { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance for this operation' };
            }

            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [balanceAfter, cashbox_id]
            );

            const { lastID } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions
                   (cashbox_id, reference_type, reference_id, amount, direction,
                    balance_before, balance_after, transfer_group_id,
                    reversed_transaction_id, reversal_reason,
                    transaction_date, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, datetime('now'), datetime('now'))`,
                [cashbox_id, reference_type, reference_id ?? null, numAmount, direction,
                 balanceBefore, balanceAfter, txDate, notes ?? null]
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

    // ─── transferBetweenCashboxes ─────────────────────────────────────────

    async transferBetweenCashboxes(input) {
        const { from_cashbox_id, to_cashbox_id, amount, transaction_date, notes } = input || {};

        if (!from_cashbox_id || !to_cashbox_id) {
            throw { code: 'VALIDATION_ERROR', message: 'from_cashbox_id and to_cashbox_id are required' };
        }
        if (Number(from_cashbox_id) === Number(to_cashbox_id)) {
            throw { code: 'SAME_CASHBOX_TRANSFER', message: 'Source and destination cashboxes must be different' };
        }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw { code: 'VALIDATION_ERROR', message: 'amount must be a positive number' };
        }

        const numAmount = Number(amount);
        const txDate = validateDate(transaction_date);
        const db = await dbmanager.init();

        try {
            await this._beginTransaction(db);

            const fromCashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [from_cashbox_id]);
            if (!fromCashbox) throw { code: 'NOT_FOUND', message: 'Source cashbox not found' };
            if (!fromCashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'Source cashbox is inactive' };

            const toCashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [to_cashbox_id]);
            if (!toCashbox) throw { code: 'NOT_FOUND', message: 'Destination cashbox not found' };
            if (!toCashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'Destination cashbox is inactive' };

            let finalToAmount = numAmount;
            
            if (fromCashbox.currency !== toCashbox.currency) {
                if (!input.exchange_rate || isNaN(Number(input.exchange_rate)) || Number(input.exchange_rate) <= 0) {
                    throw { code: 'EXCHANGE_RATE_REQUIRED', message: 'سعر الصرف مطلوب للتحويل بين عملات مختلفة' };
                }
                const exchangeRate = Number(input.exchange_rate);
                
                if (fromCashbox.currency === 'USD' && toCashbox.currency === 'SYP') {
                    finalToAmount = numAmount * exchangeRate;
                } else if (fromCashbox.currency === 'SYP' && toCashbox.currency === 'USD') {
                    finalToAmount = numAmount / exchangeRate;
                } else {
                    // Default to multiplication for other pairs
                    finalToAmount = numAmount * exchangeRate;
                }
            }

            const fromBalanceBefore = Number(fromCashbox.balance);
            if (fromBalanceBefore < numAmount) {
                throw { code: 'INSUFFICIENT_BALANCE', message: 'Source cashbox has insufficient balance' };
            }

            const toBalanceBefore = Number(toCashbox.balance);
            const fromBalanceAfter = fromBalanceBefore - numAmount;
            const toBalanceAfter = toBalanceBefore + finalToAmount;

            // Generate unique transfer_group_id
            let transferGroupId;
            try {
                transferGroupId = crypto.randomUUID();
            } catch {
                transferGroupId = `TRF-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            }

            // Update source balance
            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [fromBalanceAfter, from_cashbox_id]
            );

            // Insert outgoing movement — NOW includes transfer_group_id
            const { lastID: outId } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions
                   (cashbox_id, reference_type, reference_id, amount, direction,
                    balance_before, balance_after, transfer_group_id,
                    reversed_transaction_id, reversal_reason,
                    transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'transfer', ?, ?, 'out', ?, ?, ?, NULL, NULL, ?, ?, datetime('now'), datetime('now'))`,
                [from_cashbox_id, to_cashbox_id, numAmount, fromBalanceBefore, fromBalanceAfter,
                 transferGroupId, txDate, notes ?? null]
            );

            // Update destination balance
            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [toBalanceAfter, to_cashbox_id]
            );

            // Insert incoming movement — NOW includes transfer_group_id
            const { lastID: inId } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions
                   (cashbox_id, reference_type, reference_id, amount, direction,
                    balance_before, balance_after, transfer_group_id,
                    reversed_transaction_id, reversal_reason,
                    transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'transfer', ?, ?, 'in', ?, ?, ?, NULL, NULL, ?, ?, datetime('now'), datetime('now'))`,
                [to_cashbox_id, from_cashbox_id, finalToAmount, toBalanceBefore, toBalanceAfter,
                 transferGroupId, txDate, notes ?? null]
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

    // Legacy transfer wrapper
    async transfer(from_id, to_id, amount, date, notes) {
        return this.transferBetweenCashboxes({
            from_cashbox_id: from_id,
            to_cashbox_id: to_id,
            amount,
            transaction_date: date,
            notes,
        });
    }

    // ─── getCashboxMovements ──────────────────────────────────────────────

    async getCashboxMovements(cashboxId, filters = {}) {
        if (!cashboxId) throw { code: 'VALIDATION_ERROR', message: 'cashboxId is required' };

        const db = await dbmanager.init();
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
        const offset = (page - 1) * limit;

        const conditions = ['ct.cashbox_id = ?'];
        const values = [cashboxId];

        if (filters.direction) {
            conditions.push('ct.direction = ?');
            values.push(filters.direction);
        }
        if (filters.reference_type) {
            conditions.push('ct.reference_type = ?');
            values.push(filters.reference_type);
        }
        if (filters.date_from) {
            conditions.push('ct.transaction_date >= ?');
            values.push(filters.date_from);
        }
        if (filters.date_to) {
            conditions.push('ct.transaction_date <= ?');
            values.push(filters.date_to);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        const totalRow = await this._dbGet(db,
            `SELECT COUNT(*) as total FROM cashbox_transactions ct ${where}`,
            values
        );
        const total = totalRow?.total || 0;
        const totalPages = Math.ceil(total / limit);

        const items = await this._dbAll(db,
            `SELECT ct.*,
                    CASE 
                        WHEN ct.reference_type = 'sale' THEN si.invoice_number
                        WHEN ct.reference_type = 'purchase' THEN pi.invoice_number
                        ELSE NULL
                    END as reference_display_id
             FROM cashbox_transactions ct
             LEFT JOIN sale_invoices si ON ct.reference_type = 'sale' AND ct.reference_id = si.id
             LEFT JOIN purchase_invoices pi ON ct.reference_type = 'purchase' AND ct.reference_id = pi.id
             ${where} 
             ORDER BY ct.transaction_date DESC, ct.id DESC LIMIT ? OFFSET ?`,
            [...values, limit, offset]
        );

        return {
            items,
            pagination: { page, limit, total, totalPages },
        };
    }

    // ─── getCashboxDetails ────────────────────────────────────────────────

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
               SUM(CASE WHEN direction = 'in' AND reference_type != 'opening_balance' THEN amount ELSE 0 END) as operational_in,
               SUM(CASE WHEN direction = 'out'                                         THEN amount ELSE 0 END) as operational_out,
               SUM(CASE WHEN reference_type = 'opening_balance'                        THEN amount ELSE 0 END) as opening_balance_total,
               SUM(CASE WHEN reference_type = 'reversal'                               THEN 1     ELSE 0 END) as reversals_count,
               COUNT(*) as movements_count
             FROM cashbox_transactions WHERE cashbox_id = ?`,
            [id]
        );

        const recentMovements = await this._dbAll(db,
            `SELECT ct.*,
                    CASE 
                        WHEN ct.reference_type = 'sale' THEN si.invoice_number
                        WHEN ct.reference_type = 'purchase' THEN pi.invoice_number
                        ELSE NULL
                    END as reference_display_id
             FROM cashbox_transactions ct
             LEFT JOIN sale_invoices si ON ct.reference_type = 'sale' AND ct.reference_id = si.id
             LEFT JOIN purchase_invoices pi ON ct.reference_type = 'purchase' AND ct.reference_id = pi.id
             WHERE ct.cashbox_id = ? 
             ORDER BY ct.transaction_date DESC, ct.id DESC LIMIT 10`,
            [id]
        );

        return {
            ...cashbox,
            summary: {
                operational_in:      Number(stats?.operational_in       ?? 0),
                operational_out:     Number(stats?.operational_out      ?? 0),
                opening_balance:     Number(stats?.opening_balance_total ?? 0),
                movements_count:     Number(stats?.movements_count       ?? 0),
                reversals_count:     Number(stats?.reversals_count       ?? 0),
            },
            // Legacy flat fields for backward compatibility
            total_in:        Number(stats?.operational_in ?? 0),
            total_out:       Number(stats?.operational_out ?? 0),
            movement_count:  Number(stats?.movements_count ?? 0),
            recent_movements: recentMovements,
        };
    }

    // ─── reverseCashboxMovement (single income/expense/adjustment) ────────

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

            // Reject non-reversible types
            if (original.reference_type === 'opening_balance') {
                throw { code: 'CANNOT_REVERSE_OPENING_BALANCE', message: 'Opening balance movements cannot be reversed directly. Use adjustOpeningBalance instead.' };
            }
            if (original.reference_type === 'transfer') {
                throw { code: 'TRANSFER_REQUIRES_GROUP_REVERSAL', message: 'Transfer movements must be reversed as a complete group using reverseTransfer' };
            }
            if (original.reference_type === 'reversal') {
                throw { code: 'CANNOT_REVERSE_REVERSAL', message: 'A reversal movement cannot itself be reversed' };
            }
            if (!REVERSIBLE_TYPES.has(original.reference_type)) {
                throw { code: 'NOT_REVERSIBLE', message: `Movement type "${original.reference_type}" cannot be reversed directly` };
            }

            // Check if already reversed
            const existingReversal = await this._dbGet(db,
                `SELECT id FROM cashbox_transactions WHERE reversed_transaction_id = ?`,
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

            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [balanceAfter, original.cashbox_id]
            );

            const today = new Date().toISOString().split('T')[0];

            const { lastID } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions
                   (cashbox_id, reference_type, reference_id, amount, direction,
                    balance_before, balance_after, transfer_group_id,
                    reversed_transaction_id, reversal_reason,
                    transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'reversal', ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [original.cashbox_id, original.cashbox_id, reverseAmount, reverseDirection,
                 balanceBefore, balanceAfter, transactionId, String(reason).trim(), today, String(reason).trim()]
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

    // ─── reverseCashboxTransfer (grouped, atomic) ─────────────────────────

    async reverseCashboxTransfer(transferGroupId, reason) {
        if (!transferGroupId) throw { code: 'VALIDATION_ERROR', message: 'transferGroupId is required' };
        if (!reason || !String(reason).trim()) throw { code: 'VALIDATION_ERROR', message: 'reason is required for reversal' };

        const db = await dbmanager.init();

        try {
            await this._beginTransaction(db);

            // Load both movements
            const movements = await this._dbAll(db,
                `SELECT * FROM cashbox_transactions WHERE transfer_group_id = ?`,
                [transferGroupId]
            );

            if (!movements || movements.length === 0) {
                throw { code: 'TRANSFER_NOT_FOUND', message: 'No transfer found with this group ID' };
            }
            if (movements.length !== 2) {
                throw { code: 'INVALID_TRANSFER_GROUP', message: `Expected exactly 2 transfer movements, found ${movements.length}` };
            }

            const outMovement = movements.find(m => m.direction === 'out');
            const inMovement  = movements.find(m => m.direction === 'in');

            if (!outMovement || !inMovement) {
                throw { code: 'INVALID_TRANSFER_GROUP', message: 'Transfer group must have one incoming and one outgoing movement' };
            }

            // Check if already reversed
            const existingReversal = await this._dbGet(db,
                `SELECT id FROM cashbox_transactions WHERE reversed_transaction_id IN (?, ?)`,
                [outMovement.id, inMovement.id]
            );
            if (existingReversal) {
                throw { code: 'TRANSFER_ALREADY_REVERSED', message: 'This transfer has already been reversed' };
            }

            // Load both cashboxes
            const sourceCashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [outMovement.cashbox_id]);
            const destCashbox   = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [inMovement.cashbox_id]);

            if (!sourceCashbox || !destCashbox) {
                throw { code: 'NOT_FOUND', message: 'One or both cashboxes not found' };
            }

            const transferAmount = Number(outMovement.amount);

            // Verify reversal won't produce negative balance
            const sourceBalanceBefore = Number(sourceCashbox.balance);
            const destBalanceBefore   = Number(destCashbox.balance);

            // Reversing: source gets money back (+), dest loses money (-)
            const sourceBalanceAfter = sourceBalanceBefore + transferAmount;
            const destBalanceAfter   = destBalanceBefore  - transferAmount;

            if (destBalanceAfter < 0) {
                throw { code: 'INSUFFICIENT_BALANCE_FOR_REVERSAL', message: 'Destination cashbox has insufficient balance to reverse the transfer' };
            }

            const today = new Date().toISOString().split('T')[0];
            const reversalGroupId = `REV-${transferGroupId}`;

            // Reverse the outgoing movement (source gets money back = 'in')
            const { lastID: revOutId } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions
                   (cashbox_id, reference_type, reference_id, amount, direction,
                    balance_before, balance_after, transfer_group_id,
                    reversed_transaction_id, reversal_reason,
                    transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'reversal', ?, ?, 'in', ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [outMovement.cashbox_id, outMovement.cashbox_id, transferAmount,
                 sourceBalanceBefore, sourceBalanceAfter, reversalGroupId,
                 outMovement.id, String(reason).trim(), today, String(reason).trim()]
            );

            // Update source cashbox balance
            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [sourceBalanceAfter, outMovement.cashbox_id]
            );

            // Reverse the incoming movement (dest loses money = 'out')
            const { lastID: revInId } = await this._dbRun(db,
                `INSERT INTO cashbox_transactions
                   (cashbox_id, reference_type, reference_id, amount, direction,
                    balance_before, balance_after, transfer_group_id,
                    reversed_transaction_id, reversal_reason,
                    transaction_date, notes, created_at, updated_at)
                 VALUES (?, 'reversal', ?, ?, 'out', ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [inMovement.cashbox_id, inMovement.cashbox_id, transferAmount,
                 destBalanceBefore, destBalanceAfter, reversalGroupId,
                 inMovement.id, String(reason).trim(), today, String(reason).trim()]
            );

            // Update destination cashbox balance
            await this._dbRun(db,
                `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
                [destBalanceAfter, inMovement.cashbox_id]
            );

            await this._commit(db);

            const revOutMovement = await this._dbGet(db, 'SELECT * FROM cashbox_transactions WHERE id = ?', [revOutId]);
            const revInMovement  = await this._dbGet(db, 'SELECT * FROM cashbox_transactions WHERE id = ?', [revInId]);
            const updatedSource  = await this.getCashbox(outMovement.cashbox_id);
            const updatedDest    = await this.getCashbox(inMovement.cashbox_id);

            return {
                reversal_group_id: reversalGroupId,
                source: { cashbox: updatedSource, reversal: revOutMovement },
                destination: { cashbox: updatedDest, reversal: revInMovement },
                original: { out: outMovement, in: inMovement },
            };

        } catch (error) {
            await this._rollback(db);
            throw error;
        }
    }

    // ─── deleteCashbox ────────────────────────────────────────────────────

    async deleteCashbox(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();

        const cashbox = await this._dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [id]);
        if (!cashbox) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };

        if (Number(cashbox.balance) !== 0) {
            throw { code: 'CASHBOX_IN_USE', message: 'Cannot delete a cashbox with a non-zero balance' };
        }

        const txCount = await this._dbGet(db,
            'SELECT COUNT(*) as cnt FROM cashbox_transactions WHERE cashbox_id = ?', [id]
        );
        if (txCount?.cnt > 0) {
            throw { code: 'CASHBOX_IN_USE', message: 'Cannot delete a cashbox that has movement records' };
        }

        const childCount = await this._dbGet(db,
            'SELECT COUNT(*) as cnt FROM cashboxes WHERE parent_id = ?', [id]
        );
        if (childCount?.cnt > 0) {
            throw { code: 'CASHBOX_IN_USE', message: 'Cannot delete a cashbox that has child cashboxes' };
        }

        const paymentCount = await this._dbGet(db,
            'SELECT COUNT(*) as cnt FROM payments WHERE cashbox_id = ?', [id]
        );
        if (paymentCount?.cnt > 0) {
            throw { code: 'CASHBOX_IN_USE', message: 'Cannot delete a cashbox linked to payments' };
        }

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
