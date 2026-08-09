const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class PurchaseInvoiceItemController {

    async createPurchaseInvoiceItem(input) {
        if (!input || input.purchase_invoice_id === undefined || input.purchase_invoice_id === null) {
            const err = new Error('purchase_invoice_id is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO purchase_invoice_items (purchase_invoice_id, product_id, quantity, unit_price, line_total, notes, created_at, updated_at)
            VALUES (?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.purchase_invoice_id ?? null,
                input.product_id ?? null,
                input.quantity ?? null,
                input.unit_price ?? null,
                input.line_total ?? null,
                input.notes ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getPurchaseInvoiceItem(id);
    }

    async getPurchaseInvoiceItem(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM purchase_invoice_items WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'PurchaseInvoiceItem not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllPurchaseInvoiceItems() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM purchase_invoice_items`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updatePurchaseInvoiceItem(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            purchase_invoice_id: 'purchase_invoice_id',
            product_id: 'product_id',
            quantity: 'quantity',
            unit_price: 'unit_price',
            line_total: 'line_total',
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
        const sql = `UPDATE purchase_invoice_items SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'PurchaseInvoiceItem not found' };

        return this.getPurchaseInvoiceItem(id);
    }

    async deletePurchaseInvoiceItem(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM purchase_invoice_items WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'PurchaseInvoiceItem not found' };
        return { success: true, message: 'PurchaseInvoiceItem deleted successfully' };
    }
}

module.exports = new PurchaseInvoiceItemController();
