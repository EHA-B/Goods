const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class CustomerController {
  async createCustomer(input) {
    if (!input || typeof input.name !== 'string' || input.name.trim() === '') {
      const err = new Error('Name is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const db = await dbmanager.init();

    // Prevent duplicate customer names (case-insensitive)
    const existingCustomer = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(?)`,
        [input.name.trim()],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
    if (existingCustomer) {
      const err = new Error('يوجد عميل بنفس الاسم بالفعل');
      err.code = 'DUPLICATE_NAME';
      throw err;
    }

    const sql = `
      INSERT INTO customers (
        name, phone, email, address, balance, notes, isActive, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const id = await new Promise((resolve, reject) => {
      db.run(sql, [
        input.name.trim(),
        input.phone ?? null,
        input.email ?? null,
        input.address ?? null,
        input.balance ?? 0,
        input.notes ?? null,
        input.isActive ?? true,
      ], function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });

    return this.getCustomer(id);
  }

  async getCustomer(id) {
    if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
    const db = await dbmanager.init();

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT id, name, phone, email, address, balance, notes, isActive, created_at, updated_at FROM customers WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) return reject(err);
          if (!row) return reject({ code: 'NOT_FOUND', message: 'Customer not found' });
          resolve(row);
        },
      );
    });
  }

  async getAllCustomers() {
    const db = await dbmanager.init();
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, phone, email, address, balance, notes, isActive, created_at, updated_at FROM customers ORDER BY id DESC`,
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        },
      );
    });
  }

  async updateCustomer(id, input) {
    if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

    if (input && Object.prototype.hasOwnProperty.call(input, 'name')) {
      if (typeof input.name !== 'string' || input.name.trim() === '') {
        const err = new Error('Name is required');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
    }

    const mapping = {
      name: 'name',
      phone: 'phone',
      email: 'email',
      address: 'address',
      balance: 'balance',
      notes: 'notes',
      isActive: 'isActive',
    };

    const sets = [];
    const params = [];

    for (const key of Object.keys(mapping)) {
      if (Object.prototype.hasOwnProperty.call(input || {}, key)) {
        sets.push(`${mapping[key]} = ?`);
        params.push(key === 'name' ? input[key].trim() : (input[key] ?? null));
      }
    }

    if (sets.length === 0) {
      const err = new Error('No fields provided to update');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // Prevent duplicate customer names on rename (case-insensitive)
    if (input && Object.prototype.hasOwnProperty.call(input, 'name')) {
      const trimmedName = String(input.name).trim();
      if (trimmedName) {
        const db2 = await dbmanager.init();
        const duplicate = await new Promise((resolve, reject) => {
          db2.get(
            `SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(?) AND id <> ?`,
            [trimmedName, id],
            (err, row) => {
              if (err) return reject(err);
              resolve(row);
            }
          );
        });
        if (duplicate) {
          const err = new Error('يوجد عميل بنفس الاسم بالفعل');
          err.code = 'DUPLICATE_NAME';
          throw err;
        }
      }
    }

    sets.push(`updated_at = datetime('now')`);
    params.push(id);

    const db = await dbmanager.init();
    const info = await new Promise((resolve, reject) => {
      db.run(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`, params, function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      });
    });

    if (!info || info.changes === 0) {
      throw { code: 'NOT_FOUND', message: 'Customer not found' };
    }

    return this.getCustomer(id);
  }

  async deleteCustomer(id) {
    if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
    const db = await dbmanager.init();

    const info = await new Promise((resolve, reject) => {
      db.run(`DELETE FROM customers WHERE id = ?`, [id], function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      });
    });

    if (!info || info.changes === 0) {
      throw { code: 'NOT_FOUND', message: 'Customer not found' };
    }

    return { success: true, message: 'Customer deleted successfully' };
  }
}

module.exports = new CustomerController();
