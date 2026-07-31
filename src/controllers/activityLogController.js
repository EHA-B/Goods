const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class ActivityLogController {

    async createActivityLog(input) {
        if (!input || input.action === undefined || input.action === null) {
            const err = new Error('action is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO activity_logs (user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.user_id ?? null,
                input.action ?? null,
                input.table_name ?? null,
                input.record_id ?? null,
                input.old_data ?? null,
                input.new_data ?? null,
                input.ip_address ?? null,
                input.user_agent ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getActivityLog(id);
    }

    async getActivityLog(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM activity_logs WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'ActivityLog not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllActivityLogs() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM activity_logs`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateActivityLog(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            user_id: 'user_id',
            action: 'action',
            table_name: 'table_name',
            record_id: 'record_id',
            old_data: 'old_data',
            new_data: 'new_data',
            ip_address: 'ip_address',
            user_agent: 'user_agent'
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
        const sql = `UPDATE activity_logs SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'ActivityLog not found' };

        return this.getActivityLog(id);
    }

    async deleteActivityLog(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM activity_logs WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'ActivityLog not found' };
        return { success: true, message: 'ActivityLog deleted successfully' };
    }
}

module.exports = new ActivityLogController();
