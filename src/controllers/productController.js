const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class ProductController {

    async createProduct(input) {
        if (!input || input.name === undefined || input.name === null || !String(input.name).trim()) {
            const err = new Error('name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        if (input.unit === undefined || input.unit === null || !String(input.unit).trim()) {
            const err = new Error('unit is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO products (name, code, unit, category, description, isActive, created_at, updated_at)
            VALUES (?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                String(input.name).trim(),
                input.code === undefined || input.code === null || !String(input.code).trim()
                    ? null
                    : String(input.code).trim(),
                String(input.unit).trim(),
                input.category ?? null,
                input.description ?? null,
                input.isActive ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getProduct(id);
    }

    async getProduct(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM products WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'Product not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllProducts() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM products ORDER BY id DESC`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateProduct(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            name: 'name',
            code: 'code',
            unit: 'unit',
            category: 'category',
            description: 'description',
            isActive: 'isActive'
        };
        const sets = [];
        const params = [];

        for (const key of Object.keys(mapping)) {
            if (input && Object.prototype.hasOwnProperty.call(input, key)) {
                sets.push(`${mapping[key]} = ?`);
                if (key === 'code') {
                    params.push(input[key] === undefined || input[key] === null || !String(input[key]).trim()
                        ? null
                        : String(input[key]).trim());
                } else {
                    params.push(input[key] ?? null);
                }
            }
        }

        if (sets.length === 0) {
            const err = new Error('No fields provided to update');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        sets.push(`updated_at = datetime('now')`);
        const sql = `UPDATE products SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Product not found' };

        return this.getProduct(id);
    }

    async deleteProduct(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Product not found' };
        return { success: true, message: 'Product deleted successfully' };
    }
// Add these methods to your ProductController class

async listStockProducts(pagination = { page: 1, limit: 10 }) {
    const db = await dbmanager.init();
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Get total count for pagination
        const countResult = await new Promise((resolve, reject) => {
            db.get(
                `SELECT COUNT(id) as total FROM products`,
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });

        // Get paginated products with their stock batch details
        const rows = await new Promise((resolve, reject) => {
            db.all(
                `SELECT 
                    p.id as product_id,
                    p.name,
                    p.code,
                    p.unit,
                    p.category,
                    p.description,
                    p.isActive as product_active,
                    p.created_at as product_created_at,
                    p.updated_at as product_updated_at,
                    sb.id as batch_id,
                    sb.supplier_id,
                    sb.purchase_invoice_id,
                    sb.batch_code,
                    sb.quantity,
                    sb.remaining_quantity,
                    sb.purchase_price,
                    sb.received_date,
                    sb.expiry_date,
                    sb.notes as batch_notes,
                    sb.isActive as batch_active
                FROM (SELECT * FROM products ORDER BY id DESC LIMIT ? OFFSET ?) p
                LEFT JOIN stock_batches sb ON p.id = sb.product_id
                ORDER BY p.id DESC`,
                [limit, offset],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });

        // Group stock batches by product
        const products = {};
        rows.forEach(row => {
            if (!products[row.product_id]) {
                products[row.product_id] = {
                    product: {
                        id: row.product_id,
                        name: row.name,
                        code: row.code,
                        unit: row.unit,
                        category: row.category,
                        description: row.description,
                        isActive: row.product_active,
                        created_at: row.product_created_at,
                        updated_at: row.product_updated_at
                    },
                    stock_batches: []
                };
            }
            if (row.batch_id) {
                products[row.product_id].stock_batches.push({
                    id: row.batch_id,
                    supplier_id: row.supplier_id,
                    purchase_invoice_id: row.purchase_invoice_id,
                    batch_code: row.batch_code,
                    quantity: row.quantity,
                    remaining_quantity: row.remaining_quantity,
                    purchase_price: row.purchase_price,
                    received_date: row.received_date,
                    expiry_date: row.expiry_date,
                    notes: row.batch_notes,
                    isActive: row.batch_active
                });
            }
        });

        return {
            data: Object.values(products),
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    } catch (error) {
        throw error;
    }
}

async createStockProduct(input) {
    // Validate required fields
    if (!input || !input.product || !input.product.name) {
        const err = new Error('Product name is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    // Check if stock batch data is provided
    if (!input.stock_batch || input.stock_batch.quantity === undefined) {
        const err = new Error('Stock batch quantity is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    const db = await dbmanager.init();

    try {
        // Start transaction
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Create the product using existing method
        const productInput = {
            name: input.product.name,
            code: input.product.code,
            unit: input.product.unit || null,
            category: input.product.category || null,
            description: input.product.description || null,
            isActive: input.product.isActive !== undefined ? input.product.isActive : 1
        };

        const product = await this.createProduct(productInput);

        // Now create the stock batch using StockBatchController
        const stockBatchController = require('./stockBatchController'); // Adjust path as needed
        
        const stockBatchInput = {
            product_id: product.id,
            supplier_id: input.stock_batch.supplier_id || null,
            purchase_invoice_id: input.stock_batch.purchase_invoice_id || null,
            batch_code: input.stock_batch.batch_code || null,
            quantity: input.stock_batch.quantity,
            remaining_quantity: input.stock_batch.remaining_quantity || input.stock_batch.quantity,
            purchase_price: input.stock_batch.purchase_price || null,
            received_date: input.stock_batch.received_date || null,
            expiry_date: input.stock_batch.expiry_date || null,
            notes: input.stock_batch.notes || null,
            isActive: input.stock_batch.isActive !== undefined ? input.stock_batch.isActive : 1
        };

        const stockBatch = await stockBatchController.createStockBatch(stockBatchInput);

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Return combined result
        return {
            product,
            stock_batch: stockBatch
        };
    } catch (error) {
        // Rollback on error
        await new Promise((resolve) => {
            db.run('ROLLBACK', () => resolve());
        });
        throw error;
    }
}

async updateStockProduct(id, input) {
    if (!id) {
        const err = new Error('Product ID is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    const db = await dbmanager.init();

    try {
        // Start transaction
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Update product if data is provided
        let product = null;
        if (input.product) {
            product = await this.updateProduct(id, input.product);
        } else {
            // Get current product if not updating product fields
            product = await this.getProduct(id);
        }

        // Update stock batch if data is provided
        let stockBatch = null;
        if (input.stock_batch) {
            const stockBatchController = require('./stockBatchController');
            
            if (input.stock_batch.id) {
                // Update specific batch if ID is provided
                stockBatch = await stockBatchController.updateStockBatch(input.stock_batch.id, input.stock_batch);
            } else {
                // Find the first stock batch for this product
                const existingBatch = await new Promise((resolve, reject) => {
                    db.get(
                        `SELECT id FROM stock_batches WHERE product_id = ? LIMIT 1`,
                        [id],
                        (err, row) => {
                            if (err) return reject(err);
                            resolve(row);
                        }
                    );
                });

                if (existingBatch) {
                    // Update existing batch
                    stockBatch = await stockBatchController.updateStockBatch(existingBatch.id, input.stock_batch);
                } else {
                    // Create new batch if none exists
                    const stockBatchInput = {
                        product_id: id,
                        supplier_id: input.stock_batch.supplier_id || null,
                        purchase_invoice_id: input.stock_batch.purchase_invoice_id || null,
                        batch_code: input.stock_batch.batch_code || null,
                        quantity: input.stock_batch.quantity || null,
                        remaining_quantity: input.stock_batch.remaining_quantity || input.stock_batch.quantity || null,
                        purchase_price: input.stock_batch.purchase_price || null,
                        received_date: input.stock_batch.received_date || null,
                        expiry_date: input.stock_batch.expiry_date || null,
                        notes: input.stock_batch.notes || null,
                        isActive: input.stock_batch.isActive !== undefined ? input.stock_batch.isActive : 1
                    };
                    stockBatch = await stockBatchController.createStockBatch(stockBatchInput);
                }
            }
        } else {
            // Get existing stock batch if not updating stock fields
            const db = await dbmanager.init();
            const existingBatch = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT * FROM stock_batches WHERE product_id = ? LIMIT 1`,
                    [id],
                    (err, row) => {
                        if (err) return reject(err);
                        resolve(row);
                    }
                );
            });
            if (existingBatch) {
                stockBatch = existingBatch;
            }
        }

        // Commit transaction
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        return {
            product,
            stock_batch: stockBatch
        };
    } catch (error) {
        // Rollback on error
        await new Promise((resolve) => {
            db.run('ROLLBACK', () => resolve());
        });
        throw error;
    }
}

async getProductWithStock(id) {
    if (!id) {
        const err = new Error('Product ID is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
    }

    // Get the product using existing method
    const product = await this.getProduct(id);

    // Get all stock batches for this product
    const db = await dbmanager.init();
    const stockBatches = await new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM stock_batches WHERE product_id = ?`,
            [id],
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            }
        );
    });

    return {
        product,
        stock_batches: stockBatches
    };
}
}

module.exports = new ProductController();
