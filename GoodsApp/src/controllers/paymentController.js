const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class PaymentController {

    async createPayment(input) {
        if (!input || input.party_type === undefined || input.party_type === null) {
            const err = new Error('party_type is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO payments (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, payment_date, payment_method, reference_number, notes, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.party_type ?? null,
                input.party_id ?? null,
                input.payment_type ?? null,
                input.invoice_id ?? null,
                input.cashbox_id ?? null,
                input.amount ?? null,
                input.payment_date ?? null,
                input.payment_method ?? null,
                input.reference_number ?? null,
                input.notes ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getPayment(id);
    }

    async getPayment(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM payments WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'Payment not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllPayments() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM payments`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updatePayment(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            party_type: 'party_type',
            party_id: 'party_id',
            payment_type: 'payment_type',
            invoice_id: 'invoice_id',
            cashbox_id: 'cashbox_id',
            amount: 'amount',
            payment_date: 'payment_date',
            payment_method: 'payment_method',
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
        const sql = `UPDATE payments SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Payment not found' };

        return this.getPayment(id);
    }

    async deletePayment(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM payments WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Payment not found' };
        return { success: true, message: 'Payment deleted successfully' };
    }
}

module.exports = new PaymentController();
