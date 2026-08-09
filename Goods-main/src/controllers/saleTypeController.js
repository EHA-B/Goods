const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class SaleTypeController {

    async createSaleType(input) {
        if (!input || input.name === undefined || input.name === null) {
            const err = new Error('name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = `
            INSERT INTO sale_types (name, commission_percentage, description, isActive, created_at, updated_at)
            VALUES (?,?,?,?, datetime('now'), datetime('now'))
        `;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.name ?? null,
                input.commission_percentage ?? null,
                input.description ?? null,
                input.isActive ?? null
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getSaleType(id);
    }

    async getSaleType(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM sale_types WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'SaleType not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAllSaleTypes() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM sale_types`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async updateSaleType(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            name: 'name',
            commission_percentage: 'commission_percentage',
            description: 'description',
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
        sets.push(`updated_at = datetime('now')`);
        const sql = `UPDATE sale_types SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'SaleType not found' };

        return this.getSaleType(id);
    }

    async deleteSaleType(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(`DELETE FROM sale_types WHERE id = ?`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'SaleType not found' };
        return { success: true, message: 'SaleType deleted successfully' };
    }
}

module.exports = new SaleTypeController();
