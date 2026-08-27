import type { Knex } from 'knex';

/**
 * Adds transport_cost and emptying_cost columns to purchase_invoices.
 *
 * These costs are already folded into the `total` column at creation time.
 * The new columns store them separately so they can be displayed in invoice
 * details and reports, and so the cancellation logic can reverse them cleanly.
 */
export async function up(knex: Knex): Promise<void> {
  const hasTransport = await knex.schema.hasColumn('purchase_invoices', 'transport_cost');
  if (!hasTransport) {
    await knex.schema.alterTable('purchase_invoices', (table) => {
      table.decimal('transport_cost', 15, 2).notNullable().defaultTo(0);
    });
  }

  const hasEmptying = await knex.schema.hasColumn('purchase_invoices', 'emptying_cost');
  if (!hasEmptying) {
    await knex.schema.alterTable('purchase_invoices', (table) => {
      table.decimal('emptying_cost', 15, 2).notNullable().defaultTo(0);
    });
  }
}

export async function down(_knex: Knex): Promise<void> {
  // SQLite does not support DROP COLUMN on older versions; skip for safety.
  // If needed, use the table-rebuild pattern.
}
