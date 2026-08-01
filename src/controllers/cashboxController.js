const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class CashboxController {

    async createCashbox(input) {
        if (!input || input.name === undefined || input.name === null) {
            const err = new Error('name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO cashboxes (name, parent_id, balance, initial_balance, currency, isActive, notes, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.name ?? null,
                input.parent_id ?? null,
                input.balance ?? null,
                input.initial_balance ?? null,
                input.currency ?? null,
                input.isActive ?? null,
                input.notes ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getCashbox(id);
    }

    async getCashbox(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM cashboxes WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'Cashbox not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllCashboxs() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT c.*, p.name as parent_name FROM cashboxes c LEFT JOIN cashboxes p ON c.parent_id = p.id`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async getCashboxesSummary() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    SUM(balance) as total_balance,
                    SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active_count
                 FROM cashboxes`,
                [],
                (err, cashboxStats) => {
                    if (err) return reject(err);
                    db.get(
                        `SELECT 
                            SUM(CASE WHEN direction = 'in' THEN amount ELSE 0 END) as total_in,
                            SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) as total_out
                         FROM cashbox_transactions`,
                        [],
                        (err, transactionStats) => {
                            if (err) return reject(err);
                            resolve({
                                total_balance: cashboxStats.total_balance || 0,
                                active_count: cashboxStats.active_count || 0,
                                total_in: transactionStats.total_in || 0,
                                total_out: transactionStats.total_out || 0
                            });
                        }
                    );
                }
            );
        });
    }

    async transfer(from_id, to_id, amount, date, notes) {
        if (!from_id || !to_id || !amount) {
            const err = new Error('from_id, to_id, and amount are required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        if (from_id === to_id) {
            const err = new Error('Cannot transfer to the same cashbox');
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

            const fromCashbox = await this.getCashbox(from_id);
            if (fromCashbox.balance < amount) {
                throw new Error('Insufficient balance');
            }

            const toCashbox = await this.getCashbox(to_id);

            const newFromBalance = fromCashbox.balance - amount;
            const newToBalance = toCashbox.balance + amount;
            const transactionDate = date || new Date().toISOString();

            await new Promise((resolve, reject) => {
                db.run(`UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [newFromBalance, from_id], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            await new Promise((resolve, reject) => {
                db.run(`UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`, [newToBalance, to_id], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            const cashboxTransactionController = require('./cashboxTransactionController');
            
            await cashboxTransactionController.createCashboxTransaction({
                cashbox_id: from_id,
                reference_type: 'transfer',
                reference_id: to_id,
                amount: amount,
                direction: 'out',
                balance_before: fromCashbox.balance,
                balance_after: newFromBalance,
                transaction_date: transactionDate,
                notes: notes
            });

            await cashboxTransactionController.createCashboxTransaction({
                cashbox_id: to_id,
                reference_type: 'transfer',
                reference_id: from_id,
                amount: amount,
                direction: 'in',
                balance_before: toCashbox.balance,
                balance_after: newToBalance,
                transaction_date: transactionDate,
                notes: notes
            });

            await new Promise((resolve, reject) => {
                db.run('COMMIT', (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            return { success: true, message: 'Transfer successful' };

        } catch (error) {
            await new Promise((resolve, reject) => {
                db.run('ROLLBACK', (err) => {
                    resolve();
                });
            });
            throw error;
        }
    }

    async updateCashbox(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            name: 'name',
            parent_id: 'parent_id',
            balance: 'balance',
            initial_balance: 'initial_balance',
            currency: 'currency',
            isActive: 'isActive',
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
        const sql = `UPDATE cashboxes SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };

        return this.getCashbox(id);
    }

//     async deleteCashbox(id) {
//         if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
//         const db = await dbmanager.init();
//         const info = await new Promise((resolve, reject) => {
//             db.run(`DELETE FROM cashboxes WHERE id = ?`, [id], function (err) {
//                 if (err) return reject(err);
//                 resolve({ changes: this.changes });
//             });
//         });
//         if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };
//         return { success: true, message: 'Cashbox deleted successfully' };
//     }
 }

module.exports = new CashboxController();
