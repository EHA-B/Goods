import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // =============================================
  // 1. جدول العملاء (Customers)
  // =============================================
  await knex.schema.createTable('customers', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('phone', 20);
    table.string('email', 100);
    table.text('address');
    table.decimal('balance', 15, 2).defaultTo(0);
    table.text('notes');
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);
    
    table.index('phone');
    table.index('isActive');
  });

  // =============================================
  // 2. جدول الموردين (Suppliers)
  // =============================================
  await knex.schema.createTable('suppliers', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('phone', 20);
    table.string('email', 100);
    table.text('address');
    table.text('notes');
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);
    
    table.index('phone');
    table.index('isActive');
  });

  // =============================================
  // 3. جدول المنتجات (Products)
  // =============================================
  await knex.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('unit', 20).notNullable();
    table.string('category', 50);
    table.text('description');
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);
    
    table.index('name');
    table.index('category');
    table.index('isActive');
  });

  // =============================================
  // 4. جدول دفعات المخزون (Stock_Batches)
  // =============================================
  await knex.schema.createTable('stock_batches', (table) => {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable();
    table.integer('supplier_id').unsigned().notNullable();
    table.string('batch_code', 50).unique();
    table.decimal('quantity', 15, 3).notNullable();
    table.decimal('remaining_quantity', 15, 3).notNullable();
    table.decimal('purchase_price', 15, 2).notNullable();
    table.date('received_date').notNullable();
    table.date('expiry_date');
    table.text('notes');
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);
    
    table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
    table.foreign('supplier_id').references('id').inTable('suppliers').onDelete('RESTRICT');
    
    table.index('product_id');
    table.index('supplier_id');
    table.index('batch_code');
    table.index('received_date');
    table.index('remaining_quantity');
  });

  // =============================================
  // 5. جدول فواتير الشراء (Purchase_Invoices)
  // =============================================
  await knex.schema.createTable('purchase_invoices', (table) => {
    table.increments('id').primary();
    table.string('invoice_number', 50).unique().notNullable();
    table.integer('supplier_id').unsigned().notNullable();
    table.date('invoice_date').notNullable();
    table.decimal('subtotal', 15, 2).notNullable().defaultTo(0);
    table.decimal('discount', 15, 2).defaultTo(0);
    table.decimal('tax', 15, 2).defaultTo(0);
    table.decimal('total', 15, 2).notNullable().defaultTo(0);
    table.decimal('paid_amount', 15, 2).defaultTo(0);
    table.enum('status', ['draft', 'confirmed', 'paid', 'cancelled']).defaultTo('draft');
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('supplier_id').references('id').inTable('suppliers').onDelete('RESTRICT');
    
    table.index('supplier_id');
    table.index('invoice_number');
    table.index('invoice_date');
    table.index('status');
  });

  // =============================================
  // 6. جدول تفاصيل فواتير الشراء (Purchase_Invoice_Items)
  // =============================================
  await knex.schema.createTable('purchase_invoice_items', (table) => {
    table.increments('id').primary();
    table.integer('purchase_invoice_id').unsigned().notNullable();
    table.integer('product_id').unsigned().notNullable();
    table.decimal('quantity', 15, 3).notNullable();
    table.decimal('unit_price', 15, 2).notNullable();
    table.decimal('line_total', 15, 2).notNullable();
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('purchase_invoice_id').references('id').inTable('purchase_invoices').onDelete('CASCADE');
    table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
    
    table.index('purchase_invoice_id');
    table.index('product_id');
  });

  // =============================================
  // 7. جدول أنواع البيع (Sale_Types)
  // =============================================
  await knex.schema.createTable('sale_types', (table) => {
    table.increments('id').primary();
    table.string('name', 50).unique().notNullable();
    table.decimal('commission_percentage', 5, 2).defaultTo(0);
    table.text('description');
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);
    
    table.index('isActive');
  });

  // =============================================
  // 8. جدول فواتير البيع (Sale_Invoices)
  // =============================================
  await knex.schema.createTable('sale_invoices', (table) => {
    table.increments('id').primary();
    table.string('invoice_number', 50).unique().notNullable();
    table.integer('customer_id').unsigned().notNullable();
    table.integer('sale_type_id').unsigned().notNullable();
    table.integer('cashbox_id').unsigned();
    table.date('invoice_date').notNullable();
    table.decimal('subtotal', 15, 2).notNullable().defaultTo(0);
    table.decimal('discount', 15, 2).defaultTo(0);
    table.decimal('commission_percentage', 5, 2).defaultTo(0);
    table.decimal('commission_amount', 15, 2).defaultTo(0);
    table.decimal('tax', 15, 2).defaultTo(0);
    table.decimal('total', 15, 2).notNullable().defaultTo(0);
    table.decimal('paid_amount', 15, 2).defaultTo(0);
    table.enum('status', ['draft', 'confirmed', 'paid', 'cancelled']).defaultTo('draft');
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('customer_id').references('id').inTable('customers').onDelete('RESTRICT');
    table.foreign('sale_type_id').references('id').inTable('sale_types').onDelete('RESTRICT');
    
    table.index('customer_id');
    table.index('invoice_number');
    table.index('invoice_date');
    table.index('status');
    table.index('cashbox_id');
  });

  // =============================================
  // 9. جدول تفاصيل فواتير البيع (Sale_Invoice_Items)
  // =============================================
  await knex.schema.createTable('sale_invoice_items', (table) => {
    table.increments('id').primary();
    table.integer('sale_invoice_id').unsigned().notNullable();
    table.integer('stock_batch_id').unsigned().notNullable();
    table.decimal('quantity', 15, 3).notNullable();
    table.decimal('unit_price', 15, 2).notNullable();
    table.decimal('line_total', 15, 2).notNullable();
    table.decimal('cost_price', 15, 2).notNullable();
    table.decimal('profit', 15, 2).defaultTo(0);
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('sale_invoice_id').references('id').inTable('sale_invoices').onDelete('CASCADE');
    table.foreign('stock_batch_id').references('id').inTable('stock_batches').onDelete('RESTRICT');
    
    table.index('sale_invoice_id');
    table.index('stock_batch_id');
  });

  // =============================================
  // 10. جدول الصناديق النقدية (Cashboxes)
  // =============================================
  await knex.schema.createTable('cashboxes', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.integer('parent_id').unsigned().nullable();
    table.decimal('balance', 15, 2).defaultTo(0);
    table.decimal('initial_balance', 15, 2).defaultTo(0);
    table.string('currency', 10).defaultTo('SAR');
    table.boolean('isActive').defaultTo(true);
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('parent_id').references('id').inTable('cashboxes').onDelete('SET NULL');
    
    table.index('parent_id');
    table.index('isActive');
  });

  // =============================================
  // 11. جدول حركات الصناديق (Cashbox_Transactions)
  // =============================================
  await knex.schema.createTable('cashbox_transactions', (table) => {
    table.increments('id').primary();
    table.integer('cashbox_id').unsigned().notNullable();
    table.enum('reference_type', ['sale', 'purchase', 'expense', 'income', 'transfer']).notNullable();
    table.integer('reference_id').notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.enum('direction', ['in', 'out']).notNullable();
    table.decimal('balance_before', 15, 2).notNullable();
    table.decimal('balance_after', 15, 2).notNullable();
    table.dateTime('transaction_date').defaultTo(knex.fn.now());
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('cashbox_id').references('id').inTable('cashboxes').onDelete('RESTRICT');
    
    table.index('cashbox_id');
    table.index(['reference_type', 'reference_id']);
    table.index('transaction_date');
  });

  // =============================================
  // 12. جدول فئات المصاريف والإيرادات (Transaction_Categories)
  // =============================================
  await knex.schema.createTable('transaction_categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.enum('type', ['expense', 'income']).notNullable();
    table.text('description');
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);
    
    table.index('type');
    table.index('isActive');
  });

  // =============================================
  // 13. جدول المصاريف والإيرادات (Transactions)
  // =============================================
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().notNullable();
    table.integer('cashbox_id').unsigned().notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.enum('direction', ['expense', 'income']).notNullable();
    table.date('transaction_date').notNullable();
    table.text('description');
    table.string('reference_number', 50);
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('category_id').references('id').inTable('transaction_categories').onDelete('RESTRICT');
    table.foreign('cashbox_id').references('id').inTable('cashboxes').onDelete('RESTRICT');
    
    table.index('category_id');
    table.index('cashbox_id');
    table.index('transaction_date');
    table.index('direction');
  });

  // =============================================
  // 14. جدول المدفوعات (Payments)
  // =============================================
  await knex.schema.createTable('payments', (table) => {
    table.increments('id').primary();
    table.enum('party_type', ['customer', 'supplier']).notNullable();
    table.integer('party_id').notNullable();
    table.enum('payment_type', ['sale', 'purchase']).notNullable();
    table.integer('invoice_id').notNullable();
    table.integer('cashbox_id').unsigned().notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.date('payment_date').notNullable();
    table.enum('payment_method', ['cash', 'bank', 'credit_card', 'cheque', 'online']).defaultTo('cash');
    table.string('reference_number', 50);
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('cashbox_id').references('id').inTable('cashboxes').onDelete('RESTRICT');
    
    table.index(['party_type', 'party_id']);
    table.index(['payment_type', 'invoice_id']);
    table.index('cashbox_id');
    table.index('payment_date');
  });

  // =============================================
  // 15. جدول المستخدمين (Users)
  // =============================================
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 100).notNullable();
    table.string('email', 100).unique();
    table.string('phone', 20);
    table.enum('role', ['admin', 'manager', 'cashier', 'viewer']).defaultTo('cashier');
    table.boolean('isActive').defaultTo(true);
    table.dateTime('last_login');
    table.timestamps(true, true);
    
    table.index('username');
    table.index('email');
    table.index('isActive');
  });

  // =============================================
  // 16. جدول سجل النشاطات (Activity_Logs)
  // =============================================
  await knex.schema.createTable('activity_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().nullable();
    table.string('action', 100).notNullable();
    table.string('table_name', 50).notNullable();
    table.integer('record_id').notNullable();
    table.json('old_data');
    table.json('new_data');
    table.string('ip_address', 45);
    table.text('user_agent');
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
    
    table.index('user_id');
    table.index('table_name');
    table.index('created_at');
  });

  // =============================================
  // 17. جدول الإعدادات (Settings)
  // =============================================
  await knex.schema.createTable('settings', (table) => {
    table.increments('id').primary();
    table.string('setting_key', 50).unique().notNullable();
    table.text('setting_value');
    table.text('description');
    table.string('category', 50).defaultTo('general');
    table.timestamps(true, true);
    
    table.index('setting_key');
    table.index('category');
  });

  // =============================================
  // الفهارس الإضافية لتحسين الأداء
  // =============================================
  await knex.schema.alterTable('sale_invoices', (table) => {
    table.index(['customer_id', 'status']);
    table.index(['invoice_date', 'status']);
  });

  await knex.schema.alterTable('purchase_invoices', (table) => {
    table.index(['supplier_id', 'status']);
  });

  await knex.schema.alterTable('stock_batches', (table) => {
    table.index(['product_id', 'remaining_quantity']);
  });

  await knex.schema.alterTable('cashbox_transactions', (table) => {
    table.index(['cashbox_id', 'transaction_date']);
  });

  await knex.schema.alterTable('payments', (table) => {
    table.index(['party_type', 'party_id', 'payment_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  // حذف الجداول بترتيب عكسي (مع مراعاة المفاتيح الأجنبية)
  await knex.schema.dropTableIfExists('activity_logs');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('transaction_categories');
  await knex.schema.dropTableIfExists('cashbox_transactions');
  await knex.schema.dropTableIfExists('cashboxes');
  await knex.schema.dropTableIfExists('sale_invoice_items');
  await knex.schema.dropTableIfExists('sale_invoices');
  await knex.schema.dropTableIfExists('sale_types');
  await knex.schema.dropTableIfExists('purchase_invoice_items');
  await knex.schema.dropTableIfExists('purchase_invoices');
  await knex.schema.dropTableIfExists('stock_batches');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('suppliers');
  await knex.schema.dropTableIfExists('customers');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('settings');
}