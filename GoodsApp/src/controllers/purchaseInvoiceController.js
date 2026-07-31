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

    async createFullPurchaseInvoice(input, items) {
        if (!input || !input.invoice_number) {
            throw { code: 'VALIDATION_ERROR', message: 'invoice_number is required' };
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw { code: 'VALIDATION_ERROR', message: 'items array is required and cannot be empty' };
        }

        const db = await dbmanager.init();
        
        // Helper function for running queries wrapped in Promises
        const run = (sql, params = []) => new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        try {
            await run('BEGIN TRANSACTION');

            // 1. Insert the Purchase Invoice
            const invoiceSql = `
                INSERT INTO purchase_invoices (
                    invoice_number, supplier_id, invoice_type, invoice_date, 
                    subtotal, discount, tax, total, paid_amount, status, notes, 
                    created_at, updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
            `;
            
            const invoiceDate = input.invoice_date || new Date().toISOString().split('T')[0];
            const formattedDate = invoiceDate.replace(/-/g, '');
            const autoInvoiceNumber = input.invoice_number || `${input.supplier_name || 'SUP'}-${formattedDate}`;
            
            let initialStatus = input.status ?? 'confirmed';
            if (input.invoice_type === 'consignment' && (!input.status || input.status === 'confirmed')) {
                initialStatus = 'commission-pending';
            }

            const invoiceResult = await run(invoiceSql, [
                autoInvoiceNumber,
                input.supplier_id ?? null,
                input.invoice_type ?? 'standard',
                invoiceDate,
                input.subtotal ?? 0,
                input.discount ?? 0,
                input.tax ?? 0,
                input.total ?? 0,
                input.paid_amount ?? 0,
                initialStatus,
                input.notes ?? null
            ]);
            
            const invoiceId = invoiceResult.lastID;

            // 2. Loop through items to insert purchase_invoice_items AND stock_batches
            let index = 1;
            for (const item of items) {
                if (!item.product_id || item.quantity == null || item.unit_price == null) {
                    throw new Error('Each item must have product_id, quantity, and unit_price');
                }

                const lineTotal = item.line_total ?? (item.quantity * item.unit_price);

                // Insert into purchase_invoice_items
                const itemSql = `
                    INSERT INTO purchase_invoice_items (
                        purchase_invoice_id, product_id, quantity, unit_price, line_total, notes, created_at, updated_at
                    ) VALUES (?,?,?,?,?,?, datetime('now'), datetime('now'))
                `;
                await run(itemSql, [
                    invoiceId,
                    item.product_id,
                    item.quantity,
                    item.unit_price,
                    lineTotal,
                    item.notes ?? null
                ]);

                // Insert into stock_batches
                const batchSql = `
                    INSERT INTO stock_batches (
                        product_id, supplier_id, purchase_invoice_id, batch_code, 
                        quantity, remaining_quantity, purchase_price, received_date, 
                        expiry_date, notes, isActive, created_at, updated_at
                    ) VALUES (?,?,?,?,?,?,?,?,?,?,1, datetime('now'), datetime('now'))
                `;
                
                // Generate a unique batch code for this item
                const batchCode = item.batch_code || `${input.invoice_number}-B${index}`;
                
                await run(batchSql, [
                    item.product_id,
                    input.supplier_id ?? null,
                    invoiceId,
                    batchCode,
                    item.quantity,
                    item.quantity, // remaining_quantity starts exactly equal to purchased quantity
                    item.unit_price, // purchase_price is the cost we acquired it for
                    invoiceDate, // received_date
                    item.expiry_date ?? null,
                    item.batch_notes ?? null
                ]);
                
                index++;
            }

            // If everything succeeded, commit the transaction
            await run('COMMIT');
            
            // Return the newly created invoice header
            return this.getPurchaseInvoice(invoiceId);
            
        } catch (error) {
            // If anything failed (e.g. duplicate batch code, missing fields), rollback completely
            await run('ROLLBACK');
            throw error;
        }
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

    async getPurchaseInvoiceSalesDetails(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        
        const sales = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sii.id as sale_item_id,
                    sii.quantity as quantity_sold,
                    sii.unit_price as sale_price,
                    sii.line_total as sale_line_total,
                    sii.sale_invoice_id,
                    si.invoice_number as sale_invoice_number,
                    si.invoice_date as sale_date,
                    sb.id as stock_batch_id,
                    sb.batch_code,
                    sb.product_id,
                    sb.remaining_quantity,
                    p.name as product_name
                FROM sale_invoice_items sii
                JOIN sale_invoices si ON sii.sale_invoice_id = si.id
                JOIN stock_batches sb ON sii.stock_batch_id = sb.id
                JOIN products p ON sb.product_id = p.id
                WHERE sb.purchase_invoice_id = ?
            `, [id], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        const remainingStock = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sb.id as stock_batch_id,
                    sb.batch_code,
                    sb.product_id,
                    sb.quantity as total_quantity,
                    sb.remaining_quantity,
                    sb.purchase_price,
                    p.name as product_name
                FROM stock_batches sb
                JOIN products p ON sb.product_id = p.id
                WHERE sb.purchase_invoice_id = ? AND sb.remaining_quantity > 0
            `, [id], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        return { sales, remainingStock };
    }

    async closeCommissionInvoice(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        if (!input || input.commission_percentage === undefined || !input.cashbox_id) {
            throw { code: 'VALIDATION_ERROR', message: 'commission_percentage and cashbox_id are required' };
        }

        const commissionPercentage = Number(input.commission_percentage) || 0;
        const targetCashboxId = input.cashbox_id;

        const db = await dbmanager.init();
        
        const run = (sql, params = []) => new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        try {
            await run('BEGIN TRANSACTION');

            // 1. Verify invoice exists and is consignment
            const invoice = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM purchase_invoices WHERE id = ?', [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!invoice) throw { code: 'NOT_FOUND', message: 'Invoice not found' };
            if (invoice.invoice_type !== 'consignment') throw { code: 'VALIDATION_ERROR', message: 'Only consignment invoices can be closed this way' };

            // 2. Calculate Total Sales Revenue
            const salesTotalRow = await new Promise((resolve, reject) => {
                db.get(`
                    SELECT SUM(sii.line_total) as total_sales 
                    FROM sale_invoice_items sii 
                    JOIN stock_batches sb ON sii.stock_batch_id = sb.id 
                    WHERE sb.purchase_invoice_id = ?
                `, [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            const totalSalesRevenue = salesTotalRow?.total_sales || 0;

            // 3. Mark Spoilage for remaining stock
            const remainingStock = await new Promise((resolve, reject) => {
                db.all(`SELECT id, remaining_quantity FROM stock_batches WHERE purchase_invoice_id = ? AND remaining_quantity > 0`, [id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            for (const batch of remainingStock) {
                // Insert stock adjustment
                await run(`
                    INSERT INTO stock_adjustments (stock_batch_id, quantity, reason, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                `, [batch.id, batch.remaining_quantity, 'Spoilage upon closing', 'Auto-generated during commission invoice closing']);
                
                // Update batch remaining quantity to 0
                await run(`UPDATE stock_batches SET remaining_quantity = 0, updated_at = datetime('now') WHERE id = ?`, [batch.id]);
            }

            // 4. Calculate Commission and Supplier Share
            const commissionAmount = (totalSalesRevenue * commissionPercentage) / 100;
            const supplierShare = totalSalesRevenue - commissionAmount;

            // 5. Update Supplier Balance
            if (invoice.supplier_id && supplierShare > 0) {
                await run(`UPDATE suppliers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`, [supplierShare, invoice.supplier_id]);
            }

            // 6. Deduct Supplier Share from Cashbox
            if (supplierShare > 0) {
                const cashboxRow = await new Promise((resolve, reject) => {
                    db.get(`SELECT balance FROM cashboxes WHERE id = ?`, [targetCashboxId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                
                if (!cashboxRow) throw { code: 'NOT_FOUND', message: 'Target cashbox not found' };
                const balanceBefore = cashboxRow.balance;
                const balanceAfter = balanceBefore - supplierShare;
                
                await run(`UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [balanceAfter, targetCashboxId]);
                
                await run(`
                    INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))
                `, [
                    targetCashboxId,
                    'purchase',
                    invoice.id,
                    supplierShare,
                    'out',
                    balanceBefore,
                    balanceAfter,
                    'Transferring supplier share to balance upon closing consignment invoice ' + invoice.invoice_number
                ]);
            }

            // 7. Update Invoice Status
            await run(`UPDATE purchase_invoices SET status = 'closed-complete', updated_at = datetime('now') WHERE id = ?`, [id]);

            await run('COMMIT');
            
            return {
                success: true,
                message: 'Invoice closed successfully',
                details: {
                    total_sales: totalSalesRevenue,
                    commission_percentage: commissionPercentage,
                    commission_amount: commissionAmount,
                    supplier_share: supplierShare,
                    spoilage_items_count: remainingStock.length
                }
            };
            
        } catch (error) {
            await run('ROLLBACK');
            throw error;
        }
    }
}

module.exports = new PurchaseInvoiceController();
