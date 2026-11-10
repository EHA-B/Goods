const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));
const { ensureStockWeightColumn } = require('./utils/invoiceUtils');

class StockBatchController {

    async createStockBatch(_input) {
        throw { code: 'BATCHES_DISABLED', message: 'نظام الدفعات ملغى — يتم تحديث المخزون مباشرة على مستوى المنتج.' };
    }

    async getStockBatch(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT sb.*, s.name AS supplier_name, p.name AS product_name, p.code AS product_code
                 FROM stock_batches sb
                 LEFT JOIN suppliers s ON s.id = sb.supplier_id
                 LEFT JOIN products p ON p.id = sb.product_id
                 WHERE sb.id = ?`,
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
        return [];
    }

    async updateStockBatch(_id, _input) {
        throw { code: 'BATCHES_DISABLED', message: 'نظام الدفعات ملغى — يتم تحديث المخزون مباشرة على مستوى المنتج.' };
    }

    async deleteStockBatch(_id) {
        throw { code: 'BATCHES_DISABLED', message: 'نظام الدفعات ملغى — يتم تحديث المخزون مباشرة على مستوى المنتج.' };
    }

    async getStockSummary() {
        const db = await dbmanager.init();
        await ensureStockWeightColumn(db, 'purchase_invoice_items');
        await ensureStockWeightColumn(db, 'sale_invoice_items');

        const [products, purchasedWeightRow, soldWeightRow] = await Promise.all([
            new Promise((resolve, reject) => {
                db.all(
                    `SELECT id, COALESCE(stock_quantity, 0) AS stock_quantity, COALESCE(avg_cost_base, 0) AS avg_cost_base
                     FROM products
                     WHERE COALESCE(isActive, 1) = 1`,
                    [],
                    (err, rows) => (err ? reject(err) : resolve(rows || []))
                );
            }),
            new Promise((resolve, reject) => {
                db.get(
                    `SELECT COALESCE(SUM(COALESCE(pii.stock_weight, 0)), 0) AS total_purchased_weight
                     FROM purchase_invoice_items pii
                     JOIN purchase_invoices pi ON pi.id = pii.purchase_invoice_id
                     JOIN products p ON p.id = pii.product_id
                     WHERE pi.status != 'cancelled' AND COALESCE(p.isActive, 1) = 1`,
                    [],
                    (err, row) => (err ? reject(err) : resolve(row || { total_purchased_weight: 0 }))
                );
            }),
            new Promise((resolve, reject) => {
                db.get(
                    `SELECT COALESCE(SUM(COALESCE(sii.stock_weight, 0)), 0) AS total_sold_weight
                     FROM sale_invoice_items sii
                     JOIN sale_invoices si ON si.id = sii.sale_invoice_id
                     LEFT JOIN stock_batches sb ON sb.id = sii.stock_batch_id
                     JOIN products p ON p.id = COALESCE(sii.product_id, sb.product_id)
                     WHERE si.status != 'cancelled' AND COALESCE(p.isActive, 1) = 1`,
                    [],
                    (err, row) => (err ? reject(err) : resolve(row || { total_sold_weight: 0 }))
                );
            }),
        ]);

        const DEFAULT_MIN_LIMIT = 10;
        let total_units = 0;
        let total_value = 0;
        let low_stock_count = 0;
        let out_of_stock_count = 0;

        for (const p of products) {
            const qty = Number(p.stock_quantity || 0);
            const avgCost = Number(p.avg_cost_base || 0);
            if (qty > 0) {
                total_units += qty;
                total_value += qty * avgCost;
            }
            if (qty <= 0) {
                out_of_stock_count++;
            } else if (qty <= DEFAULT_MIN_LIMIT) {
                low_stock_count++;
            }
        }

        return {
            total_units: Math.round(total_units * 1000) / 1000,
            total_value: Math.round(total_value * 100) / 100,
            total_purchased_weight: Math.round(Number(purchasedWeightRow?.total_purchased_weight || 0) * 1000) / 1000,
            total_sold_weight: Math.round(Number(soldWeightRow?.total_sold_weight || 0) * 1000) / 1000,
            low_stock_count,
            out_of_stock_count,
            expiring_soon_count: 0,
        };
    }

    async getInventoryItems(pagination = { page: 1, limit: 10 }) {
        const db = await dbmanager.init();
        await ensureStockWeightColumn(db, 'purchase_invoice_items');
        await ensureStockWeightColumn(db, 'sale_invoice_items');
        const page = parseInt(pagination.page) || 1;
        const limit = parseInt(pagination.limit) || 10;
        const offset = (page - 1) * limit;

        const countResult = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(id) as total FROM products WHERE COALESCE(isActive, 1) = 1`, (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        const rows = await new Promise((resolve, reject) => {
            db.all(
                `SELECT
                    p.id as product_id,
                    p.name as product_name,
                    p.code as product_code,
                    p.unit as product_unit,
                    p.category as product_category,
                    COALESCE(p.stock_quantity, 0) as current_balance,
                    COALESCE(p.avg_cost_base, 0) as avg_cost_base,
                    GROUP_CONCAT(DISTINCT s.name) as suppliers,
                    COALESCE((
                        SELECT SUM(COALESCE(pii2.stock_weight, 0))
                        FROM purchase_invoice_items pii2
                        JOIN purchase_invoices pi2 ON pi2.id = pii2.purchase_invoice_id
                        WHERE pii2.product_id = p.id AND pi2.status != 'cancelled'
                    ), 0) as purchased_weight,
                    COALESCE((
                        SELECT SUM(COALESCE(sii2.stock_weight, 0))
                        FROM sale_invoice_items sii2
                        JOIN sale_invoices si2 ON si2.id = sii2.sale_invoice_id
                        LEFT JOIN stock_batches sb2 ON sb2.id = sii2.stock_batch_id
                        WHERE COALESCE(sii2.product_id, sb2.product_id) = p.id AND si2.status != 'cancelled'
                    ), 0) as sold_weight
                 FROM (SELECT * FROM products WHERE COALESCE(isActive, 1) = 1 ORDER BY id DESC LIMIT ? OFFSET ?) p
                 LEFT JOIN purchase_invoice_items pii ON pii.product_id = p.id
                 LEFT JOIN purchase_invoices pi ON pi.id = pii.purchase_invoice_id AND pi.status != 'cancelled'
                 LEFT JOIN suppliers s ON s.id = pi.supplier_id
                 GROUP BY p.id
                 ORDER BY p.id DESC`,
                [limit, offset],
                (err, list) => {
                    if (err) return reject(err);
                    resolve(list || []);
                }
            );
        });

        const DEFAULT_MIN_LIMIT = 10;
        const items = rows.map((row) => {
            const balance = Math.round((Number(row.current_balance || 0)) * 1000) / 1000;
            const avgCost = Math.round((Number(row.avg_cost_base || 0)) * 100) / 100;
            const totalValue = balance > 0 ? Math.round(balance * avgCost * 100) / 100 : 0;
            const purchasedWeight = Math.round((Number(row.purchased_weight || 0)) * 1000) / 1000;
            const soldWeight = Math.round((Number(row.sold_weight || 0)) * 1000) / 1000;

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
                purchased_weight: purchasedWeight,
                sold_weight: soldWeight,
                total_value: totalValue,
                average_purchase_price: avgCost,
                batch_count: 0,
                suppliers: row.suppliers ? row.suppliers.split(',').filter(Boolean) : [],
                status,
                min_limit: DEFAULT_MIN_LIMIT,
            };
        });

        return {
            data: items,
            pagination: {
                page,
                limit,
                total: countResult?.total ?? 0,
                totalPages: Math.ceil((countResult?.total ?? 0) / limit),
            },
        };
    }
}

module.exports = new StockBatchController();
