const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class SupplierController {

    async createSupplier(input) {
        if (!input || input.name === undefined || input.name === null) {
            const err = new Error('name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();

        // Prevent duplicate supplier names (case-insensitive)
        const trimmedName = String(input.name).trim();
        const existingSupplier = await new Promise((resolve, reject) => {
            db.get(
                `SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(?)`,
                [trimmedName],
                (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                }
            );
        });
        if (existingSupplier) {
            const err = new Error('يوجد مورد بنفس الاسم بالفعل');
            err.code = 'DUPLICATE_NAME';
            throw err;
        }

        const sql = `
            INSERT INTO suppliers (name, phone, email, address, balance, notes, isActive, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.name ?? null,
                input.phone ?? null,
                input.email ?? null,
                input.address ?? null,
                input.balance ?? null,
                input.notes ?? null,
                input.isActive ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getSupplier(id);
    }

    async getSupplier(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM suppliers WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'Supplier not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllSuppliers() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM suppliers`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateSupplier(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            name: 'name',
            phone: 'phone',
            email: 'email',
            address: 'address',
            balance: 'balance',
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

        // Prevent duplicate supplier names on rename (case-insensitive)
        if (input && Object.prototype.hasOwnProperty.call(input, 'name')) {
            const trimmedName = String(input.name).trim();
            if (trimmedName) {
                const db2 = await dbmanager.init();
                const duplicate = await new Promise((resolve, reject) => {
                    db2.get(
                        `SELECT id FROM suppliers WHERE LOWER(TRIM(name)) = LOWER(?) AND id <> ?`,
                        [trimmedName, id],
                        (err, row) => {
                            if (err) return reject(err);
                            resolve(row);
                        }
                    );
                });
                if (duplicate) {
                    const err = new Error('يوجد مورد بنفس الاسم بالفعل');
                    err.code = 'DUPLICATE_NAME';
                    throw err;
                }
            }
        }

        sets.push(`updated_at = datetime('now')`);
        const sql = `UPDATE suppliers SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Supplier not found' };

        return this.getSupplier(id);
    }

    async deleteSupplier(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM suppliers WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Supplier not found' };
        return { success: true, message: 'Supplier deleted successfully' };
    }

    async getSupplierTransactions(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        
        const payments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT pay.*, cb.name AS cashbox_name
                 FROM payments pay
                 LEFT JOIN cashboxes cb ON cb.id = pay.cashbox_id
                 WHERE pay.party_type = 'supplier' AND pay.party_id = ?
                 ORDER BY pay.payment_date DESC, pay.id DESC`,
                [id],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows || []);
                }
            );
        });

        const purchases = await new Promise((resolve, reject) => {
            db.all(
                `SELECT id, invoice_number, invoice_date, invoice_type, total,
                        paid_amount, remaining_amount, status, notes
                 FROM purchase_invoices
                 WHERE supplier_id = ?
                 ORDER BY invoice_date DESC, id DESC`,
                [id],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows || []);
                }
            );
        });

        const stockBatches = await new Promise((resolve, reject) => {
            db.all(
                `SELECT sb.*, p.name AS product_name
                 FROM stock_batches sb
                 LEFT JOIN products p ON sb.product_id = p.id
                 WHERE sb.supplier_id = ?
                 ORDER BY sb.received_date DESC, sb.id DESC`,
                [id],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows || []);
                }
            );
        });

        return {
            payments,
            purchases,
            stockBatches
        };
    }
}

module.exports = new SupplierController();
