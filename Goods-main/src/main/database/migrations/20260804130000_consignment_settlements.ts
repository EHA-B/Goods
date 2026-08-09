import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create consignment_settlements
  await knex.schema.createTable('consignment_settlements', (table) => {
    table.increments('id').primary();
    table.integer('purchase_invoice_id').unsigned().notNullable();
    table.string('settlement_number').notNullable().unique();
    table.timestamp('settlement_date').notNullable();
    table.decimal('total_sales_amount', 15, 2).notNullable();
    table.decimal('commission_percentage', 5, 2).notNullable();
    table.decimal('commission_amount', 15, 2).notNullable();
    table.decimal('supplier_share', 15, 2).notNullable();
    table.integer('cashbox_id').unsigned().notNullable();
    table.integer('cashbox_transaction_id').unsigned().nullable();
    table.integer('payment_id').unsigned().nullable();
    table.string('currency', 3).notNullable();
    table.string('remaining_stock_policy').notNullable();
    table.decimal('returned_quantity', 15, 3).defaultTo(0);
    table.decimal('spoilage_quantity', 15, 3).defaultTo(0);
    table.decimal('carried_quantity', 15, 3).defaultTo(0);
    table.string('status').notNullable().defaultTo('completed'); // completed, reversed
    table.integer('reversed_settlement_id').unsigned().nullable();
    table.string('reversal_reason').nullable();
    table.text('notes').nullable();
    table.integer('created_by').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.foreign('purchase_invoice_id').references('id').inTable('purchase_invoices').onDelete('RESTRICT');
    table.foreign('cashbox_id').references('id').inTable('cashboxes').onDelete('RESTRICT');
    
    // Partial unique index for active completed settlement
    // SQLite doesn't natively support full partial unique indexes easily without WHERE clause,
    // but knex standard unique covers it mostly. For SQLite we'll just index.
    table.index('purchase_invoice_id');
    table.index('cashbox_id');
    table.index('status');
    table.index('settlement_date');
  });

  // 2. Create consignment_settlement_items
  await knex.schema.createTable('consignment_settlement_items', (table) => {
    table.increments('id').primary();
    table.integer('settlement_id').unsigned().notNullable();
    table.integer('purchase_invoice_item_id').unsigned().nullable();
    table.integer('product_id').unsigned().notNullable();
    table.integer('stock_batch_id').unsigned().notNullable();
    table.decimal('received_quantity', 15, 3).notNullable();
    table.decimal('sold_quantity', 15, 3).notNullable();
    table.decimal('remaining_quantity', 15, 3).notNullable();
    table.decimal('sales_amount', 15, 2).notNullable();
    table.string('resolution_policy').notNullable(); // e.g. return_to_supplier, spoilage
    table.decimal('resolved_quantity', 15, 3).notNullable();
    table.integer('stock_movement_id').unsigned().nullable(); // can map to stock_adjustments if spoilage
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('settlement_id').references('id').inTable('consignment_settlements').onDelete('CASCADE');
    table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
    table.foreign('stock_batch_id').references('id').inTable('stock_batches').onDelete('RESTRICT');
  });

  // 3. Add fields to purchase_invoices
  await knex.schema.alterTable('purchase_invoices', (table) => {
    table.string('settlement_status').defaultTo('pending'); // pending, settled, reversed
    table.timestamp('settled_at').nullable();
    table.integer('consignment_settlement_id').unsigned().nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('purchase_invoices', (table) => {
    table.dropColumn('settlement_status');
    table.dropColumn('settled_at');
    table.dropColumn('consignment_settlement_id');
  });

  await knex.schema.dropTableIfExists('consignment_settlement_items');
  await knex.schema.dropTableIfExists('consignment_settlements');
}
