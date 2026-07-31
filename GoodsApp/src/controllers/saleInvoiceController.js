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

    async getFullSaleInvoice(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        
        const invoice = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM sale_invoices WHERE id = ?`, [id], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        if (!invoice) throw { code: 'NOT_FOUND', message: 'SaleInvoice not found' };

        const items = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sii.*,
                    sb.product_id,
                    sb.purchase_invoice_id,
                    sb.batch_code,
                    p.name as product_name
                FROM sale_invoice_items sii
                LEFT JOIN stock_batches sb ON sii.stock_batch_id = sb.id
                LEFT JOIN products p ON sb.product_id = p.id
                WHERE sii.sale_invoice_id = ?
            `, [id], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        const payments = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM payments WHERE invoice_id = ? AND payment_type = 'sale'`, [id], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        return {
            ...invoice,
            items,
            payments
        };
    }

    async createSaleProcess(input) {
        if (!input || !input.items || !input.items.length) {
            const err = new Error('Items are required for a sale process');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const db = await dbmanager.init();

        try {
            await new Promise((resolve, reject) => {
                db.run('BEGIN TRANSACTION', (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            // 1. Calculate totals
            let subtotal = 0;
            for (const item of input.items) {
                const qty = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice || item.unit_price) || 0;
                subtotal += (qty * unitPrice);
            }

            const discount = Number(input.discount) || 0;
            const tax = Number(input.tax) || 0;
            const commissionPercentage = Number(input.commissionPercentage || input.commission_percentage) || 0;
            const commissionAmount = (subtotal * commissionPercentage) / 100;
            const total = Math.max(0, subtotal - discount + commissionAmount + tax);
            
            const paidAmount = Number(input.initialPayment || input.paid_amount) || 0;
            
            let status = 'confirmed';
            if (paidAmount >= total && total > 0) status = 'paid';

            // Generate invoice number if not provided
            let invoiceNumber = input.invoiceNumber || input.invoice_number;
            if (!invoiceNumber) {
                const count = await new Promise((resolve, reject) => {
                    db.get(`SELECT COUNT(id) as count FROM sale_invoices`, (err, row) => {
                        if (err) return reject(err);
                        resolve(row ? row.count : 0);
                    });
                });
                invoiceNumber = `SAL-${String(count + 1).padStart(5, '0')}`;
            }

            // 2. Insert Sale Invoice
            const saleInvoiceId = await new Promise((resolve, reject) => {
                const sql = `
                    INSERT INTO sale_invoices (invoice_number, customer_id, sale_type_id, cashbox_id, invoice_date, subtotal, discount, commission_percentage, commission_amount, tax, total, paid_amount, status, notes, created_at, updated_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
                `;
                db.run(sql, [
                    invoiceNumber,
                    input.customerId || input.customer_id || null,
                    input.saleTypeId || input.sale_type_id || null,
                    input.cashboxId || input.cashbox_id || null,
                    input.invoiceDate || input.invoice_date || new Date().toISOString().split('T')[0],
                    subtotal,
                    discount,
                    commissionPercentage,
                    commissionAmount,
                    tax,
                    total,
                    paidAmount,
                    status,
                    input.notes || null
                ], function (err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                });
            });

            // 3. Insert Items and update stock batches
            for (const item of input.items) {
                const qty = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice || item.unit_price) || 0;
                const costPrice = Number(item.costPrice || item.cost_price) || 0;
                const lineTotal = qty * unitPrice;
                const profit = qty * (unitPrice - costPrice);
                const stockBatchId = item.stockBatchId || item.stock_batch_id;

                await new Promise((resolve, reject) => {
                    const sql = `
                        INSERT INTO sale_invoice_items (sale_invoice_id, stock_batch_id, quantity, unit_price, line_total, cost_price, profit, notes, created_at, updated_at)
                        VALUES (?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
                    `;
                    db.run(sql, [
                        saleInvoiceId,
                        stockBatchId,
                        qty,
                        unitPrice,
                        lineTotal,
                        costPrice,
                        profit,
                        item.notes || null
                    ], function (err) {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                // Deduct from stock_batches remaining_quantity
                await new Promise((resolve, reject) => {
                    const sql = `UPDATE stock_batches SET remaining_quantity = remaining_quantity - ?, updated_at = datetime('now') WHERE id = ?`;
                    db.run(sql, [qty, stockBatchId], function (err) {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            }

            // 4. Handle initial payment if exists
            if (paidAmount > 0) {
                const cashboxId = input.cashboxId || input.cashbox_id;
                if (!cashboxId) {
                    const err = new Error('Cashbox is required when a payment is made');
                    err.code = 'VALIDATION_ERROR';
                    throw err;
                }

                const customerId = input.customerId || input.customer_id;
                if (!customerId) {
                    const err = new Error('Customer is required when a payment is made');
                    err.code = 'VALIDATION_ERROR';
                    throw err;
                }

                // Insert into payments
                await new Promise((resolve, reject) => {
                    const sql = `
                        INSERT INTO payments (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, payment_date, payment_method, reference_number, notes, created_at, updated_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
                    `;
                    db.run(sql, [
                        'customer',
                        customerId,
                        'sale',
                        saleInvoiceId,
                        cashboxId,
                        paidAmount,
                        input.invoiceDate || input.invoice_date || new Date().toISOString().split('T')[0],
                        input.paymentMethod || input.payment_method || 'cash',
                        input.paymentReference || input.payment_reference || input.reference_number || null,
                        'Initial payment for invoice ' + invoiceNumber
                    ], function (err) {
                        if (err) return reject(err);
                        resolve(this.lastID);
                    });
                });

                // Update cashbox balance and record transaction
                const cashbox = await new Promise((resolve, reject) => {
                    db.get(`SELECT balance FROM cashboxes WHERE id = ?`, [cashboxId], (err, row) => {
                        if (err) return reject(err);
                        resolve(row);
                    });
                });

                const balanceBefore = cashbox ? cashbox.balance : 0;
                const balanceAfter = balanceBefore + paidAmount;

                await new Promise((resolve, reject) => {
                    const sql = `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`;
                    db.run(sql, [balanceAfter, cashboxId], function (err) {
                        if (err) return reject(err);
                        resolve();
                    });
                });

                await new Promise((resolve, reject) => {
                    const sql = `
                        INSERT INTO cashbox_transactions (cashbox_id, reference_type, reference_id, amount, direction, balance_before, balance_after, transaction_date, notes, created_at, updated_at)
                        VALUES (?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
                    `;
                    db.run(sql, [
                        cashboxId,
                        'sale',
                        saleInvoiceId,
                        paidAmount,
                        'in',
                        balanceBefore,
                        balanceAfter,
                        input.invoiceDate || input.invoice_date || new Date().toISOString().split('T')[0],
                        'Payment for invoice ' + invoiceNumber
                    ], function (err) {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            }

            await new Promise((resolve, reject) => {
                db.run('COMMIT', (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            return await this.getFullSaleInvoice(saleInvoiceId);

        } catch (error) {
            await new Promise((resolve) => {
                db.run('ROLLBACK', () => resolve());
            });
            throw error;
        }
    }
}

module.exports = new SaleInvoiceController();
