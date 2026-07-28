const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class PurchaseInvoiceController {

    async createPurchaseInvoice(input) {
        if (!input || input.invoice_number === undefined || input.invoice_number === null) {
            const err = new Error('invoice_number is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO purchase_invoices (invoice_number, supplier_id, invoice_type, invoice_date, subtotal, discount, tax, total, paid_amount, status, notes, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.invoice_number ?? null,
                input.supplier_id ?? null,
                input.invoice_type ?? null,
                input.invoice_date ?? null,
                input.subtotal ?? null,
                input.discount ?? null,
                input.tax ?? null,
                input.total ?? null,
                input.paid_amount ?? null,
                input.status ?? null,
                input.notes ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getPurchaseInvoice(id);
    }

    async getPurchaseInvoice(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM purchase_invoices WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'PurchaseInvoice not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllPurchaseInvoices() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM purchase_invoices`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updatePurchaseInvoice(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            invoice_number: 'invoice_number',
            supplier_id: 'supplier_id',
            invoice_type: 'invoice_type',
            invoice_date: 'invoice_date',
            subtotal: 'subtotal',
            discount: 'discount',
            tax: 'tax',
            total: 'total',
            paid_amount: 'paid_amount',
            status: 'status',
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
        const sql = `UPDATE purchase_invoices SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'PurchaseInvoice not found' };

        return this.getPurchaseInvoice(id);
    }

    async deletePurchaseInvoice(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM purchase_invoices WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'PurchaseInvoice not found' };
        return { success: true, message: 'PurchaseInvoice deleted successfully' };
    }
}

module.exports = new PurchaseInvoiceController();
