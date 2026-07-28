const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class StockBatchController {

    async createStockBatch(input) {
        if (!input || input.product_id === undefined || input.product_id === null) {
            const err = new Error('product_id is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO stock_batches (product_id, supplier_id, purchase_invoice_id, batch_code, quantity, remaining_quantity, purchase_price, received_date, expiry_date, notes, isActive, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.product_id ?? null,
                input.supplier_id ?? null,
                input.purchase_invoice_id ?? null,
                input.batch_code ?? null,
                input.quantity ?? null,
                input.remaining_quantity ?? null,
                input.purchase_price ?? null,
                input.received_date ?? null,
                input.expiry_date ?? null,
                input.notes ?? null,
                input.isActive ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getStockBatch(id);
    }

    async getStockBatch(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM stock_batches WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'StockBatch not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllStockBatchs() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM stock_batches`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateStockBatch(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            product_id: 'product_id',
            supplier_id: 'supplier_id',
            purchase_invoice_id: 'purchase_invoice_id',
            batch_code: 'batch_code',
            quantity: 'quantity',
            remaining_quantity: 'remaining_quantity',
            purchase_price: 'purchase_price',
            received_date: 'received_date',
            expiry_date: 'expiry_date',
            notes: 'notes',
            isActive: 'isActive'
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
        const sql = `UPDATE stock_batches SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'StockBatch not found' };

        return this.getStockBatch(id);
    }

    async deleteStockBatch(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM stock_batches WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'StockBatch not found' };
        return { success: true, message: 'StockBatch deleted successfully' };
    }
}

module.exports = new StockBatchController();
