import { Knex } from 'knex';

/**
 * Runtime compatibility for databases created before the hardened purchases module.
 *
 * This migration is intentionally additive. It does not rebuild purchase_invoices,
 * so it preserves consignment fields and existing foreign-key relationships.
 */
export async function up(knex: Knex): Promise<void> {
  const hasPurchaseInvoices = await knex.schema.hasTable('purchase_invoices');
  if (!hasPurchaseInvoices) return;

  if (!(await knex.schema.hasColumn('purchase_invoices', 'discount_amount'))) {
    await knex.schema.alterTable('purchase_invoices', (table) => {
      table.decimal('discount_amount', 15, 2).notNullable().defaultTo(0);
    });

    await knex.raw(`
      UPDATE purchase_invoices
      SET discount_amount = COALESCE(discount, 0)
    `);
  }

  if (!(await knex.schema.hasColumn('purchase_invoices', 'remaining_amount'))) {
    await knex.schema.alterTable('purchase_invoices', (table) => {
      table.decimal('remaining_amount', 15, 2).notNullable().defaultTo(0);
    });

    await knex.raw(`
      UPDATE purchase_invoices
      SET remaining_amount = CASE
        WHEN COALESCE(total, 0) - COALESCE(paid_amount, 0) > 0
          THEN COALESCE(total, 0) - COALESCE(paid_amount, 0)
        ELSE 0
      END
    `);
  }

  const hasPayments = await knex.schema.hasTable('payments');
  if (hasPayments) {
    const paymentColumns: Array<[string, (table: any) => void]> = [
      ['status', (table) => table.string('status', 20).notNullable().defaultTo('active')],
      ['reversed_payment_id', (table) => table.integer('reversed_payment_id').nullable()],
      ['cashbox_transaction_id', (table) => table.integer('cashbox_transaction_id').nullable()],
      ['balance_before', (table) => table.decimal('balance_before', 15, 2).nullable()],
      ['balance_after', (table) => table.decimal('balance_after', 15, 2).nullable()],
      ['created_by', (table) => table.integer('created_by').nullable()],
      ['reversal_reason', (table) => table.text('reversal_reason').nullable()],
    ];

    for (const [column, addColumn] of paymentColumns) {
      if (!(await knex.schema.hasColumn('payments', column))) {
        await knex.schema.alterTable('payments', addColumn);
      }
    }

    await knex('payments').whereNull('status').update({ status: 'active' });
  }

  if (!(await knex.schema.hasTable('stock_movements'))) {
    await knex.schema.createTable('stock_movements', (table) => {
      table.increments('id').primary();
      table.integer('product_id').unsigned().notNullable();
      table.integer('stock_batch_id').unsigned().notNullable();
      table.string('movement_type', 40).notNullable();
      table.decimal('quantity', 15, 3).notNullable();
      table.decimal('quantity_before', 15, 3).notNullable();
      table.decimal('quantity_after', 15, 3).notNullable();
      table.string('reference_type', 40).nullable();
      table.integer('reference_id').nullable();
      table.string('reference_number', 100).nullable();
      table.integer('supplier_id').unsigned().nullable();
      table.integer('customer_id').unsigned().nullable();
      table.text('notes').nullable();
      table.integer('created_by').nullable();
      table.timestamp('created_at').nullable();

      table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
      table.foreign('stock_batch_id').references('id').inTable('stock_batches').onDelete('RESTRICT');

      table.index('product_id', 'idx_sm_product_id');
      table.index('stock_batch_id', 'idx_sm_batch_id');
      table.index('movement_type', 'idx_sm_movement_type');
      table.index('reference_type', 'idx_sm_reference_type');
      table.index('reference_id', 'idx_sm_reference_id');
      table.index('created_at', 'idx_sm_created_at');
    });
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Intentionally irreversible: removing compatibility columns would risk data loss.
}
