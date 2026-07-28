const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class SaleInvoiceController {

    async createSaleInvoice(input) {
        if (!input || input.invoice_number === undefined || input.invoice_number === null) {
            const err = new Error('invoice_number is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO sale_invoices (invoice_number, customer_id, sale_type_id, cashbox_id, invoice_date, subtotal, discount, commission_percentage, commission_amount, tax, total, paid_amount, status, notes, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.invoice_number ?? null,
                input.customer_id ?? null,
                input.sale_type_id ?? null,
                input.cashbox_id ?? null,
                input.invoice_date ?? null,
                input.subtotal ?? null,
                input.discount ?? null,
                input.commission_percentage ?? null,
                input.commission_amount ?? null,
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
        return this.getSaleInvoice(id);
    }

    async getSaleInvoice(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM sale_invoices WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'SaleInvoice not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllSaleInvoices() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM sale_invoices`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateSaleInvoice(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            invoice_number: 'invoice_number',
            customer_id: 'customer_id',
            sale_type_id: 'sale_type_id',
            cashbox_id: 'cashbox_id',
            invoice_date: 'invoice_date',
            subtotal: 'subtotal',
            discount: 'discount',
            commission_percentage: 'commission_percentage',
            commission_amount: 'commission_amount',
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
        const sql = `UPDATE sale_invoices SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'SaleInvoice not found' };

        return this.getSaleInvoice(id);
    }

    async deleteSaleInvoice(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM sale_invoices WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'SaleInvoice not found' };
        return { success: true, message: 'SaleInvoice deleted successfully' };
    }
}

module.exports = new SaleInvoiceController();
