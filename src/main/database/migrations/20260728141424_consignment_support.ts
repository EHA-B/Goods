import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add balance to suppliers
  await knex.schema.alterTable('suppliers', (table) => {
    table.decimal('balance', 15, 2).defaultTo(0);
  });

  // 2. Add invoice_type to purchase_invoices
  await knex.schema.alterTable('purchase_invoices', (table) => {
    table.enum('invoice_type', ['standard', 'consignment']).defaultTo('standard');
  });

  // 3. Add purchase_invoice_id to stock_batches
  await knex.schema.alterTable('stock_batches', (table) => {
    table.integer('purchase_invoice_id').unsigned().nullable();
    table.foreign('purchase_invoice_id').references('id').inTable('purchase_invoices').onDelete('SET NULL');
  });

  // 4. Create stock_adjustments table for spoilage/adjustments
  await knex.schema.createTable('stock_adjustments', (table) => {
    table.increments('id').primary();
    table.integer('stock_batch_id').unsigned().notNullable();
    table.decimal('quantity', 15, 3).notNullable();
    table.string('reason', 255).notNullable();
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('stock_batch_id').references('id').inTable('stock_batches').onDelete('RESTRICT');
    table.index('stock_batch_id');
  });

  // 5. Insert the Commission Cashbox since existing databases skip seeds
  const existingCashbox = await knex('cashboxes').where('name', 'Commission Holding Cashbox').first();
  if (!existingCashbox) {
    await knex('cashboxes').insert({
      name: 'Commission Holding Cashbox',
      balance: 0,
      initial_balance: 0,
      currency: 'SYP',
      isActive: true,
      notes: 'Holding account for consignment/commission sales before settlement with suppliers.',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('stock_adjustments');
  
  await knex.schema.alterTable('stock_batches', (table) => {
    // Note: SQLite has limitations dropping foreign keys, but this is the standard Knex approach.
    table.dropColumn('purchase_invoice_id');
  });

  await knex.schema.alterTable('purchase_invoices', (table) => {
    table.dropColumn('invoice_type');
  });

  await knex.schema.alterTable('suppliers', (table) => {
    table.dropColumn('balance');
  });
}
