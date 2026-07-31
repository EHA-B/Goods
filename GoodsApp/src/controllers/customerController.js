const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class CustomerController {
  async createCustomer(input) {
    const name = input?.name ?? input?.Name;

    if (typeof name !== 'string' || name.trim() === '') {
      const err = new Error('name is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const db = await dbmanager.init();
    const sql = `
      INSERT INTO customers
        (name, phone, email, address, balance, notes, isActive, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;

    const id = await new Promise((resolve, reject) => {
      db.run(
        sql,
        [
          name.trim(),
          input.phone ?? input.Phone ?? null,
          input.email ?? input.Email ?? null,
          input.address ?? input.Address ?? null,
          input.balance ?? input.Balance ?? 0,
          input.notes ?? null,
          input.isActive ?? 1,
        ],
        function (error) {
          if (error) return reject(error);
          resolve(this.lastID);
        },
      );
    });

    return this.getCustomer(id);
  }

  async getCustomer(id) {
    if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

    const db = await dbmanager.init();
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM customers WHERE id = ?`,
        [id],
        (error, row) => {
          if (error) return reject(error);
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
        `SELECT * FROM customers ORDER BY id DESC`,
        [],
        (error, rows) => {
          if (error) return reject(error);
          resolve(rows);
        },
      );
    });
  }

  async updateCustomer(id, input) {
    if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

    if (
      input?.name !== undefined &&
      (typeof input.name !== 'string' || input.name.trim() === '')
    ) {
      const err = new Error('name is required');
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
      isActive: 'isActive',
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
    params.push(id);

    const db = await dbmanager.init();
    const info = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE customers SET ${sets.join(', ')} WHERE id = ?`,
        params,
        function (error) {
          if (error) return reject(error);
          resolve({ changes: this.changes });
        },
      );
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
      db.run(`DELETE FROM customers WHERE id = ?`, [id], function (error) {
        if (error) return reject(error);
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
