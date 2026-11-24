const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));
const { ensurePartyInitialBalanceColumn } = require('./utils/invoiceUtils');

class SupplierController {

    async createSupplier(input) {
        if (!input || input.name === undefined || input.name === null) {
            const err = new Error('name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        await ensurePartyInitialBalanceColumn(db, 'suppliers');

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

        const initialBalance = Number(input.initial_balance ?? input.balance ?? 0);
        const balance = input.balance !== undefined && input.balance !== null
            ? Number(input.balance)
            : initialBalance;

        const sql = `
            INSERT INTO suppliers (name, phone, email, address, balance, initial_balance, notes, isActive, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.name ?? null,
                input.phone ?? null,
                input.email ?? null,
                input.address ?? null,
                Number.isFinite(balance) ? balance : 0,
                Number.isFinite(initialBalance) ? initialBalance : 0,
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
        await ensurePartyInitialBalanceColumn(db, 'suppliers');
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
        await ensurePartyInitialBalanceColumn(db, 'suppliers');
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
        const db = await dbmanager.init();
        await ensurePartyInitialBalanceColumn(db, 'suppliers');

        const mapping = {
            name: 'name',
            phone: 'phone',
            email: 'email',
            address: 'address',
            balance: 'balance',
            initial_balance: 'initial_balance',
            notes: 'notes',
            isActive: 'isActive'
        };
        const sets = [];
        const params = [];

        const hasInitialBalance = Boolean(input && Object.prototype.hasOwnProperty.call(input, 'initial_balance'));
        const hasBalance = Boolean(input && Object.prototype.hasOwnProperty.call(input, 'balance'));

        if (hasInitialBalance && !hasBalance) {
            const existing = await new Promise((resolve, reject) => {
                db.get(`SELECT balance, initial_balance FROM suppliers WHERE id = ?`, [id], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            });
            if (!existing) throw { code: 'NOT_FOUND', message: 'Supplier not found' };

            const nextInitial = Number(input.initial_balance ?? 0);
            if (!Number.isFinite(nextInitial)) {
                const err = new Error('الرصيد الافتتاحي غير صالح');
                err.code = 'VALIDATION_ERROR';
                throw err;
            }
            const prevInitial = Number(existing.initial_balance ?? 0);
            const prevBalance = Number(existing.balance ?? 0);
            const nextBalance = Math.round((prevBalance + (nextInitial - prevInitial)) * 100) / 100;

            sets.push('initial_balance = ?');
            params.push(nextInitial);
            sets.push('balance = ?');
            params.push(nextBalance);
        }

        for (const key of Object.keys(mapping)) {
            if (hasInitialBalance && !hasBalance && (key === 'initial_balance' || key === 'balance')) {
                continue;
            }
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

        if (input && Object.prototype.hasOwnProperty.call(input, 'name')) {
            const trimmedName = String(input.name).trim();
            if (trimmedName) {
                const duplicate = await new Promise((resolve, reject) => {
                    db.get(
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
                `SELECT id, invoice_number, invoice_date, invoice_type, total, currency,
                        paid_amount, remaining_amount, status, settlement_status, notes
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

        return {
            payments,
            purchases,
            stockBatches: [],
        };
    }
}

module.exports = new SupplierController();
