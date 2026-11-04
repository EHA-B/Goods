const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

function round3(value) {
    return Math.round((Number(value) || 0) * 1000) / 1000;
}

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

        const existingProduct = await new Promise((resolve, reject) => {
            db.get(
                `SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(?)`,
                [String(input.name).trim()],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
        if (existingProduct) {
            const err = new Error('يوجد منتج بنفس الاسم بالفعل');
            err.code = 'DUPLICATE_NAME';
            throw err;
        }

        const initialStock = round3(Math.max(0, Number(input.stock_quantity ?? 0)));
        const initialAvgCost = Math.max(0, Number(input.avg_cost_base ?? 0));

        const sql = `
            INSERT INTO products (name, code, unit, category, description, isActive, stock_quantity, avg_cost_base, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
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
                input.isActive ?? 1,
                initialStock,
                initialAvgCost,
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
            isActive: 'isActive',
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

        if (input && Object.prototype.hasOwnProperty.call(input, 'name')) {
            const trimmedName = String(input.name).trim();
            if (trimmedName) {
                const db2 = await dbmanager.init();
                const duplicate = await new Promise((resolve, reject) => {
                    db2.get(
                        `SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(?) AND id <> ?`,
                        [trimmedName, id],
                        (err, row) => {
                            if (err) return reject(err);
                            resolve(row);
                        }
                    );
                });
                if (duplicate) {
                    const err = new Error('يوجد منتج بنفس الاسم بالفعل');
                    err.code = 'DUPLICATE_NAME';
                    throw err;
                }
            }
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
        try {
            if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
            const db = await dbmanager.init();
            const info = await new Promise((resolve, reject) => {
                db.run(`DELETE FROM products WHERE id = ?`,
                    [id],
                    function (err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve({ changes: this.changes });
                    }
                );
            });

            if (!info || info.changes === 0) {
                const error = new Error('Product not found');
                error.code = 'NOT_FOUND';
                throw error;
            }

            return {
                success: true,
                message: 'Product deleted successfully'
            };
        } catch (error) {
            const message = String(error?.message ?? '');
            if (
                error?.code === 'SQLITE_CONSTRAINT' ||
                error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
                message.includes('FOREIGN KEY constraint failed') ||
                message.includes('foreign key constraint')
            ) {
                const productInUseError = new Error(
                    'Cannot delete product because it is referenced by existing records'
                );
                productInUseError.code = 'PRODUCT_IN_USE';
                throw productInUseError;
            }
            throw error;
        }
    }

    async listStockProducts(pagination = { page: 1, limit: 10 }) {
        const db = await dbmanager.init();
        const page = parseInt(pagination.page) || 1;
        const limit = parseInt(pagination.limit) || 10;
        const offset = (page - 1) * limit;

        const countResult = await new Promise((resolve, reject) => {
            db.get(`SELECT COUNT(id) as total FROM products`, (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        const rows = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM products ORDER BY id DESC LIMIT ? OFFSET ?`,
                [limit, offset],
                (err, list) => {
                    if (err) return reject(err);
                    resolve(list || []);
                }
            );
        });

        return {
            data: rows.map((p) => ({
                product: p,
                stock_batches: [],
            })),
            pagination: {
                page,
                limit,
                total: countResult?.total ?? 0,
                totalPages: Math.ceil((countResult?.total ?? 0) / limit),
            },
        };
    }

    async createStockProduct(input) {
        if (!input || !input.product || !input.product.name) {
            const err = new Error('Product name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const initialQty = round3(Math.max(0, Number(input.stock_batch?.quantity ?? input.product?.stock_quantity ?? 0)));
        const initialCost = Math.max(0, Number(input.stock_batch?.purchase_price ?? input.product?.avg_cost_base ?? 0));

        const product = await this.createProduct({
            name: input.product.name,
            code: input.product.code,
            unit: input.product.unit || null,
            category: input.product.category || null,
            description: input.product.description || null,
            isActive: input.product.isActive !== undefined ? input.product.isActive : 1,
            stock_quantity: initialQty,
            avg_cost_base: initialCost,
        });

        return {
            product,
            stock_batch: null,
        };
    }

    async updateStockProduct(id, input) {
        if (!id) {
            const err = new Error('Product ID is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const product = input?.product ? await this.updateProduct(id, input.product) : await this.getProduct(id);
        return {
            product,
            stock_batch: null,
        };
    }

    async adjustProductStock(id, input) {
        const productId = Number(id);
        const qty = round3(Number(input?.quantity));
        if (!Number.isInteger(productId) || productId <= 0) throw { code: 'VALIDATION_ERROR', message: 'معرف المنتج مطلوب.' };
        if (!['add', 'subtract'].includes(input?.type)) throw { code: 'VALIDATION_ERROR', message: 'نوع التسوية غير صالح.' };
        if (!Number.isFinite(qty) || qty <= 0) throw { code: 'VALIDATION_ERROR', message: 'يجب أن تكون الكمية أكبر من صفر.' };
        if (!input?.reason || !String(input.reason).trim()) throw { code: 'VALIDATION_ERROR', message: 'سبب التسوية مطلوب.' };

        const db = await dbmanager.init();
        await new Promise((resolve, reject) => db.run('BEGIN IMMEDIATE TRANSACTION', (err) => (err ? reject(err) : resolve())));
        try {
            const product = await new Promise((resolve, reject) =>
                db.get('SELECT * FROM products WHERE id = ?', [productId], (err, row) => (err ? reject(err) : resolve(row)))
            );
            if (!product) throw { code: 'NOT_FOUND', message: 'المنتج غير موجود.' };

            const before = round3(Number(product.stock_quantity || 0));
            const signed = input.type === 'add' ? qty : -qty;
            const after = round3(before + signed);
            if (after < -0.0005) {
                throw { code: 'INSUFFICIENT_STOCK', message: `الكمية المطلوب خصمها (${qty}) أكبر من رصيد المنتج المتاح (${before}).` };
            }
            const cleanAfter = Math.max(0, after);
            const cleanReason = String(input.reason).trim();

            const adjustmentId = await new Promise((resolve, reject) =>
                db.run(
                    `INSERT INTO stock_adjustments
                       (product_id, stock_batch_id, quantity, quantity_before, quantity_after, reason, notes, created_at, updated_at)
                     VALUES (?, NULL, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                    [productId, signed, before, cleanAfter, cleanReason, input.notes || null],
                    function (err) {
                        err ? reject(err) : resolve(this.lastID);
                    }
                )
            );

            await new Promise((resolve, reject) =>
                db.run(
                    `INSERT INTO stock_movements
                       (product_id, stock_batch_id, movement_type, quantity, quantity_before, quantity_after,
                        reference_type, reference_id, notes, created_at)
                     VALUES (?, NULL, ?, ?, ?, ?, 'adjustment', ?, ?, datetime('now'))`,
                    [
                        productId,
                        input.type === 'add' ? 'adjustment_in' : 'adjustment_out',
                        qty,
                        before,
                        cleanAfter,
                        adjustmentId,
                        input.notes || cleanReason,
                    ],
                    function (err) {
                        err ? reject(err) : resolve(this.lastID);
                    }
                )
            );

            await new Promise((resolve, reject) =>
                db.run(
                    `UPDATE products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?`,
                    [cleanAfter, productId],
                    function (err) {
                        err ? reject(err) : resolve(this.changes);
                    }
                )
            );

            if (signed < 0) {
                const lostValue = Math.round(Math.abs(signed) * Number(product.avg_cost_base || 0) * 100) / 100;
                if (lostValue > 0) {
                    const adjustCat =
                        (await new Promise((resolve) =>
                            db.get(
                                `SELECT id FROM transaction_categories WHERE type = 'expense' AND isActive = 1 AND name LIKE '%تسوية مخزون%' LIMIT 1`,
                                [],
                                (_err, row) => resolve(row)
                            )
                        )) ??
                        (await new Promise((resolve) =>
                            db.get(
                                `SELECT id FROM transaction_categories WHERE type = 'expense' AND isActive = 1 ORDER BY id ASC LIMIT 1`,
                                [],
                                (_err, row) => resolve(row)
                            )
                        ));

                    if (adjustCat) {
                        await new Promise((resolve, reject) =>
                            db.run(
                                `INSERT INTO transactions
                                   (category_id, cashbox_id, amount, direction, transaction_date,
                                    description, reference_number, notes, status, created_at, updated_at)
                                 VALUES (?, NULL, ?, 'expense', date('now'), ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
                                [
                                    adjustCat.id,
                                    lostValue,
                                    'تسوية نقص مخزون',
                                    String(adjustmentId),
                                    input.notes ?? `تسوية خسارة ${Math.abs(signed)} ${product.unit || 'وحدة'} من ${product.name}`,
                                ],
                                function (err) {
                                    err ? reject(err) : resolve();
                                }
                            )
                        );
                    }
                }
            }

            await new Promise((resolve, reject) => db.run('COMMIT', (err) => (err ? reject(err) : resolve())));
            return this.getProductWithStock(productId);
        } catch (error) {
            await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
            throw error;
        }
    }

    async getProductWithStock(id) {
        if (!id) {
            const err = new Error('Product ID is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const product = await this.getProduct(id);
        const db = await dbmanager.init();

        const suppliersRows = await new Promise((resolve, reject) => {
            db.all(
                `SELECT DISTINCT s.name AS supplier_name
                 FROM purchase_invoice_items pii
                 JOIN purchase_invoices pi ON pi.id = pii.purchase_invoice_id
                 JOIN suppliers s ON s.id = pi.supplier_id
                 WHERE pii.product_id = ? AND pi.status != 'cancelled'`,
                [id],
                (err, rows) => (err ? reject(err) : resolve(rows || []))
            );
        });

        const adjustments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT sa.*, COALESCE(sa.product_id, sb.product_id) AS resolved_product_id
                 FROM stock_adjustments sa
                 LEFT JOIN stock_batches sb ON sb.id = sa.stock_batch_id
                 WHERE COALESCE(sa.product_id, sb.product_id) = ?
                 ORDER BY sa.id DESC`,
                [id],
                (err, rows) => (err ? reject(err) : resolve(rows || []))
            );
        });

        const movements = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT 100`,
                [id],
                (err, rows) => (err ? reject(err) : resolve(rows || []))
            );
        });

        return {
            product,
            stock_batches: [],
            suppliers: suppliersRows.map((r) => r.supplier_name).filter(Boolean),
            adjustments,
            movements,
        };
    }
}

module.exports = new ProductController();
