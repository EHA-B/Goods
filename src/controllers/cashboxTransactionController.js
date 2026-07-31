const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class CashboxTransactionController {

    async createCashboxTransaction(input) {
        if (!input || input.cashbox_id === undefined || input.cashbox_id === null) {
            const err = new Error('cashbox_id is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.cashbox_id ?? null,
                input.reference_type ?? null,
                input.reference_id ?? null,
                input.amount ?? null,
                input.direction ?? null,
                input.balance_before ?? null,
                input.balance_after ?? null,
                input.transaction_date ?? null,
                input.notes ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getCashboxTransaction(id);
    }

    async getCashboxTransaction(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM cashbox_transactions WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'CashboxTransaction not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllCashboxTransactions() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM cashbox_transactions`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateCashboxTransaction(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            cashbox_id: 'cashbox_id',
            reference_type: 'reference_type',
            reference_id: 'reference_id',
            amount: 'amount',
            direction: 'direction',
            balance_before: 'balance_before',
            balance_after: 'balance_after',
            transaction_date: 'transaction_date',
            notes: 'notes'
        };
        const sets = [];
        const params = [];

        for (const key of Object.keys(mapping)) {
            if (input && Object.prototype.hasOwnProperty.call(input, key)) {
                sets.push(`${mapping[key]} = ?`);
                params.push(input[key] ?? null);
            }
        }

        if (sets.length === 0) {
            const err = new Error('No fields provided to update');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        sets.push(`updated_at = datetime('now')`);
        const sql = `UPDATE cashbox_transactions SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'CashboxTransaction not found' };

        return this.getCashboxTransaction(id);
    }

    async deleteCashboxTransaction(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM cashbox_transactions WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'CashboxTransaction not found' };
        return { success: true, message: 'CashboxTransaction deleted successfully' };
    }
}

module.exports = new CashboxTransactionController();
