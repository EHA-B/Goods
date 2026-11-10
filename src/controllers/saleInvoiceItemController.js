const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));
const { normalizeWeight, ensureStockWeightColumn } = require('./utils/invoiceUtils');

class SaleInvoiceItemController {

    async createSaleInvoiceItem(input) {
        if (!input || input.sale_invoice_id === undefined || input.sale_invoice_id === null) {
            const err = new Error('sale_invoice_id is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const stockWeight = normalizeWeight(input.stock_weight ?? input.stock_waight ?? 0);
        const db = await dbmanager.init();
        await ensureStockWeightColumn(db, 'sale_invoice_items');
        const sql = `
            INSERT INTO sale_invoice_items (sale_invoice_id, product_id, stock_batch_id, quantity, stock_weight, unit_price, line_total, cost_price, profit, notes, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.sale_invoice_id ?? null,
                input.product_id ?? null,
                input.stock_batch_id ?? null,
                input.quantity ?? null,
                stockWeight,
                input.unit_price ?? null,
                input.line_total ?? null,
                input.cost_price ?? null,
                input.profit ?? null,
                input.notes ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getSaleInvoiceItem(id);
    }

    async getSaleInvoiceItem(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        await ensureStockWeightColumn(db, 'sale_invoice_items');
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM sale_invoice_items WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'SaleInvoiceItem not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllSaleInvoiceItems() {
        const db = await dbmanager.init();
        await ensureStockWeightColumn(db, 'sale_invoice_items');
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM sale_invoice_items`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateSaleInvoiceItem(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            sale_invoice_id: 'sale_invoice_id',
            product_id: 'product_id',
            stock_batch_id: 'stock_batch_id',
            quantity: 'quantity',
            unit_price: 'unit_price',
            line_total: 'line_total',
            cost_price: 'cost_price',
            profit: 'profit',
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

        if (input && (Object.prototype.hasOwnProperty.call(input, 'stock_weight') || Object.prototype.hasOwnProperty.call(input, 'stock_waight'))) {
            sets.push('stock_weight = ?');
            params.push(normalizeWeight(input.stock_weight ?? input.stock_waight ?? 0));
        }

        if (sets.length === 0) {
            const err = new Error('No fields provided to update');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        sets.push(`updated_at = datetime('now')`);
        const sql = `UPDATE sale_invoice_items SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        await ensureStockWeightColumn(db, 'sale_invoice_items');
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'SaleInvoiceItem not found' };

        return this.getSaleInvoiceItem(id);
    }

    async deleteSaleInvoiceItem(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM sale_invoice_items WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'SaleInvoiceItem not found' };
        return { success: true, message: 'SaleInvoiceItem deleted successfully' };
    }
}

module.exports = new SaleInvoiceItemController();
