const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class UserController {

    async createUser(input) {
        if (!input || input.username === undefined || input.username === null) {
            const err = new Error('username is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO users (username, password_hash, full_name, email, phone, role, isActive, last_login, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.username ?? null,
                input.password_hash ?? null,
                input.full_name ?? null,
                input.email ?? null,
                input.phone ?? null,
                input.role ?? null,
                input.isActive ?? null,
                input.last_login ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getUser(id);
    }

    async getUser(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM users WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'User not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllUsers() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM users`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateUser(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            username: 'username',
            password_hash: 'password_hash',
            full_name: 'full_name',
            email: 'email',
            phone: 'phone',
            role: 'role',
            isActive: 'isActive',
            last_login: 'last_login'
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
        const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'User not found' };

        return this.getUser(id);
    }

    async deleteUser(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'User not found' };
        return { success: true, message: 'User deleted successfully' };
    }
}

module.exports = new UserController();
