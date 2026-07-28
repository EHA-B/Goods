const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class CustomerController {

  async createCustomer(input){
    if (!input || !input.Name || input.Name.trim() === '') {
            const err = new Error('Name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db=await dbmanager.init();
        const sql=`
        INSERT INTO Customers(name,phone,email,address,balance,notes,isActive,created_at,updated_at)
        VALUES (
          ?,?,null,?,?,?,?,datetime('now'),datetime('now')
        )
        ` ;
         const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                input.Name,
                input.Phone ?? null,
                input.Email ?? null,
                input.Address ?? null,
                input.Balance ?? 0,
                input.notes ?? null,
                input.isActive ?? true,
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.getCustomer(id);
          
  }
  async getCustomer(id){
      if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                `SELECT id, name, phone, email, address, balance, notes, isActive, created_at, updated_at FROM Customers WHERE id = ?`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: 'Customer not found' });
                    resolve(row);
                }
            );
        });
  }
  
    async updateCustomer(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        if (input && input.name !== undefined && (typeof input.name !== 'string' || input.name.trim() === '')) {
            const err = new Error('Name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
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
            if (Object.prototype.hasOwnProperty.call(input || {}, key)) {
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
        const sql = `UPDATE Customers SET ${sets.join(', ')} WHERE id = ?`;
        params.push(id);

        const db = await dbManager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: 'Customer not found' };

        return this.getCustomer(id);
}
}
module.exports = new CustomerController();