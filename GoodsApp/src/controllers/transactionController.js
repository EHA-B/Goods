const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class TransactionController {

    async createTransaction(input) {
        if (!input || input.category_id === undefined || input.category_id === null) {
            const err = new Error('category_id is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO transactions (category_id, cashbox_id, amount, direction, transaction_date, description, reference_number, notes, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.category_id ?? null,
                input.cashbox_id ?? null,
                input.amount ?? null,
                input.direction ?? null,
                input.transaction_date ?? null,
                input.description ?? null,
                input.reference_number ?? null,
                input.notes ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getTransaction(id);
    }

    async getTransaction(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM transactions WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'Transaction not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllTransactions() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM transactions`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateTransaction(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            category_id: 'category_id',
            cashbox_id: 'cashbox_id',
            amount: 'amount',
            direction: 'direction',
            transaction_date: 'transaction_date',
            description: 'description',
            reference_number: 'reference_number',
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
        const sql = `UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Transaction not found' };

        return this.getTransaction(id);
    }

    async deleteTransaction(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM transactions WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Transaction not found' };
        return { success: true, message: 'Transaction deleted successfully' };
    }
}

module.exports = new TransactionController();
