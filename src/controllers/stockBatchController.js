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

    async getStockSummary() {
        const db = await dbmanager.init();
        
        // Total units and Total value
        const totals = await new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    SUM(remaining_quantity) as total_units,
                    SUM(remaining_quantity * purchase_price) as total_value
                FROM stock_batches 
                WHERE isActive = 1 AND remaining_quantity > 0
            `, (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    
        // Aggregated product balances for low stock and out of stock
        const productBalances = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    p.id, 
                    SUM(CASE WHEN sb.isActive = 1 AND sb.remaining_quantity > 0 THEN sb.remaining_quantity ELSE 0 END) as total_qty
                FROM products p
                LEFT JOIN stock_batches sb ON p.id = sb.product_id
                WHERE p.isActive = 1
                GROUP BY p.id
            `, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    
        let low_stock_count = 0;
        let out_of_stock_count = 0;
        // Assuming default min_limit = 10 for all products since it's missing from DB
        const DEFAULT_MIN_LIMIT = 10;
    
        productBalances.forEach(p => {
            if (p.total_qty <= 0) {
                out_of_stock_count++;
            } else if (p.total_qty <= DEFAULT_MIN_LIMIT) {
                low_stock_count++;
            }
        });
    
        // Expiring soon (e.g. within 30 days)
        const expiringSoon = await new Promise((resolve, reject) => {
            db.get(`
                SELECT COUNT(id) as count
                FROM stock_batches
                WHERE isActive = 1 
                  AND remaining_quantity > 0 
                  AND expiry_date IS NOT NULL 
                  AND expiry_date <= date('now', '+30 days')
            `, (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    
        return {
            total_units: totals?.total_units || 0,
            total_value: totals?.total_value || 0,
            low_stock_count,
            out_of_stock_count,
            expiring_soon_count: expiringSoon?.count || 0
        };
    }
    
    async getInventoryItems(pagination = { page: 1, limit: 10 }) {
        const db = await dbmanager.init();
        const page = parseInt(pagination.page) || 1;
        const limit = parseInt(pagination.limit) || 10;
        const offset = (page - 1) * limit;
    
        const countResult = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(id) as total FROM products WHERE isActive = 1`, (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    
        const rows = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    p.id as product_id,
                    p.name as product_name,
                    p.code as product_code,
                    p.unit as product_unit,
                    p.category as product_category,
                    SUM(CASE WHEN sb.isActive = 1 THEN sb.remaining_quantity ELSE 0 END) as current_balance,
                    SUM(CASE WHEN sb.isActive = 1 THEN sb.remaining_quantity * sb.purchase_price ELSE 0 END) as total_value,
                    COUNT(CASE WHEN sb.isActive = 1 AND sb.remaining_quantity > 0 THEN sb.id END) as batch_count,
                    GROUP_CONCAT(DISTINCT s.name) as suppliers
                FROM (SELECT * FROM products WHERE isActive = 1 ORDER BY id DESC LIMIT ? OFFSET ?) p
                LEFT JOIN stock_batches sb ON p.id = sb.product_id AND sb.isActive = 1 AND sb.remaining_quantity > 0
                LEFT JOIN suppliers s ON sb.supplier_id = s.id
                GROUP BY p.id
                ORDER BY p.id DESC
            `, [limit, offset], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    
        const items = rows.map(row => {
            const DEFAULT_MIN_LIMIT = 10; // since it doesn't exist in DB yet
            const balance = row.current_balance || 0;
            let status = 'متوفر';
            if (balance <= 0) status = 'نافد';
            else if (balance <= DEFAULT_MIN_LIMIT) status = 'مخزون منخفض';
    
            return {
                product_id: row.product_id,
                product_name: row.product_name,
                product_code: row.product_code,
                product_category: row.product_category,
                product_unit: row.product_unit,
                current_balance: balance,
                total_value: row.total_value || 0,
                average_purchase_price: balance > 0 ? (row.total_value / balance) : 0,
                batch_count: row.batch_count || 0,
                suppliers: row.suppliers ? row.suppliers.split(',') : [],
                status,
                min_limit: DEFAULT_MIN_LIMIT
            };
        });
    
        return {
            data: items,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }
}

module.exports = new StockBatchController();
