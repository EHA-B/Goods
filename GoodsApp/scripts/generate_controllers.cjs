const fs = require('fs');
const path = require('path');

const tables = {
  suppliers: { name: 'Supplier', cols: ['name', 'phone', 'email', 'address', 'balance', 'notes', 'isActive'], req: 'name' },
  products: { name: 'Product', cols: ['name', 'unit', 'category', 'description', 'isActive'], req: 'name' },
  stock_batches: { name: 'StockBatch', cols: ['product_id', 'supplier_id', 'purchase_invoice_id', 'batch_code', 'quantity', 'remaining_quantity', 'purchase_price', 'received_date', 'expiry_date', 'notes', 'isActive'], req: 'product_id' },
  purchase_invoices: { name: 'PurchaseInvoice', cols: ['invoice_number', 'supplier_id', 'invoice_type', 'invoice_date', 'subtotal', 'discount', 'tax', 'total', 'paid_amount', 'status', 'notes'], req: 'invoice_number' },
  purchase_invoice_items: { name: 'PurchaseInvoiceItem', cols: ['purchase_invoice_id', 'product_id', 'quantity', 'unit_price', 'line_total', 'notes'], req: 'purchase_invoice_id' },
  sale_types: { name: 'SaleType', cols: ['name', 'commission_percentage', 'description', 'isActive'], req: 'name' },
  sale_invoices: { name: 'SaleInvoice', cols: ['invoice_number', 'customer_id', 'sale_type_id', 'cashbox_id', 'invoice_date', 'subtotal', 'discount', 'commission_percentage', 'commission_amount', 'tax', 'total', 'paid_amount', 'status', 'notes'], req: 'invoice_number' },
  sale_invoice_items: { name: 'SaleInvoiceItem', cols: ['sale_invoice_id', 'stock_batch_id', 'quantity', 'unit_price', 'line_total', 'cost_price', 'profit', 'supplier_due_amount', 'notes'], req: 'sale_invoice_id' },
  cashboxes: { name: 'Cashbox', cols: ['name', 'parent_id', 'balance', 'initial_balance', 'currency', 'isActive', 'notes'], req: 'name' },
  cashbox_transactions: { name: 'CashboxTransaction', cols: ['cashbox_id', 'reference_type', 'reference_id', 'amount', 'direction', 'balance_before', 'balance_after', 'transaction_date', 'notes'], req: 'cashbox_id' },
  transaction_categories: { name: 'TransactionCategory', cols: ['name', 'type', 'description', 'isActive'], req: 'name' },
  transactions: { name: 'Transaction', cols: ['category_id', 'cashbox_id', 'amount', 'direction', 'transaction_date', 'description', 'reference_number', 'notes'], req: 'category_id' },
  payments: { name: 'Payment', cols: ['party_type', 'party_id', 'payment_type', 'invoice_id', 'cashbox_id', 'amount', 'payment_date', 'payment_method', 'reference_number', 'notes'], req: 'party_type' },
  users: { name: 'User', cols: ['username', 'password_hash', 'full_name', 'email', 'phone', 'role', 'isActive', 'last_login'], req: 'username' },
  activity_logs: { name: 'ActivityLog', cols: ['user_id', 'action', 'table_name', 'record_id', 'old_data', 'new_data', 'ip_address', 'user_agent'], req: 'action' },
  settings: { name: 'Setting', cols: ['setting_key', 'setting_value', 'description', 'category'], req: 'setting_key' },
  stock_adjustments: { name: 'StockAdjustment', cols: ['stock_batch_id', 'quantity', 'reason', 'notes'], req: 'stock_batch_id' }
};

const controllersDir = path.join(__dirname, '..', '..', 'GoodsApp', 'src', 'controllers');

for (const [tableName, info] of Object.entries(tables)) {
  const { name, cols, req } = info;
  const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
  const controllerName = name + 'Controller';
  const fileName = lowerName + 'Controller.js';
  const filePath = path.join(controllersDir, fileName);

  if(fs.existsSync(filePath) && (fileName === 'customerController.js' || fileName === 'cashboxTransactionsController.js')) {
     continue; // user has this open or already exists
  }

  const createParams = cols.map(c => 'input.' + c + ' ?? null').join(',\n                ');
  const insertPlaceholders = cols.map(() => '?').join(',');
  
  const content = `const path = require('path');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

class ${controllerName} {

    async create${name}(input) {
        if (!input || input.${req} === undefined || input.${req} === null) {
            const err = new Error('${req} is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        const db = await dbmanager.init();
        const sql = \`
            INSERT INTO ${tableName} (${cols.join(', ')}, created_at, updated_at)
            VALUES (${insertPlaceholders}, datetime('now'), datetime('now'))
        \`;
        const id = await new Promise((resolve, reject) => {
            db.run(sql, [
                ${createParams}
            ], function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
        return this.get${name}(id);
    }

    async get${name}(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.get(
                \`SELECT * FROM ${tableName} WHERE id = ?\`,
                [id],
                (err, row) => {
                    if (err) return reject(err);
                    if (!row) return reject({ code: 'NOT_FOUND', message: '${name} not found' });
                    resolve(row);
                }
            );
        });
    }

    async getAll${name}s() {
        const db = await dbmanager.init();
        return await new Promise((resolve, reject) => {
            db.all(
                \`SELECT * FROM ${tableName}\`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async update${name}(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };

        const mapping = {
            ${cols.map(c => `${c}: '${c}'`).join(',\n            ')}
        };
        const sets = [];
        const params = [];

        for (const key of Object.keys(mapping)) {
            if (input && Object.prototype.hasOwnProperty.call(input, key)) {
                sets.push(\`\${mapping[key]} = ?\`);
                params.push(input[key] ?? null);
            }
        }

        if (sets.length === 0) {
            const err = new Error('No fields provided to update');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        sets.push(\`updated_at = datetime('now')\`);
        const sql = \`UPDATE ${tableName} SET \${sets.join(', ')} WHERE id = ?\`;
        params.push(id);

        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });

        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: '${name} not found' };

        return this.get${name}(id);
    }

    async delete${name}(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const db = await dbmanager.init();
        const info = await new Promise((resolve, reject) => {
            db.run(\`DELETE FROM ${tableName} WHERE id = ?\`, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
        if (!info || info.changes === 0) throw { code: 'NOT_FOUND', message: '${name} not found' };
        return { success: true, message: '${name} deleted successfully' };
    }
}

module.exports = new ${controllerName}();
`;
  
  fs.writeFileSync(filePath, content);
  console.log('Created ' + fileName);
}
