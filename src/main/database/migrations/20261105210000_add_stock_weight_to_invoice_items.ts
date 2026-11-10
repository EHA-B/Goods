import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('purchase_invoice_items')) {
    const hasStockWeight = await knex.schema.hasColumn('purchase_invoice_items', 'stock_weight');
    if (!hasStockWeight) {
      await knex.schema.alterTable('purchase_invoice_items', (table) => {
        table.decimal('stock_weight', 15, 3).notNullable().defaultTo(0);
      });
    }
  }

  if (await knex.schema.hasTable('sale_invoice_items')) {
    const hasStockWeight = await knex.schema.hasColumn('sale_invoice_items', 'stock_weight');
    if (!hasStockWeight) {
      await knex.schema.alterTable('sale_invoice_items', (table) => {
        table.decimal('stock_weight', 15, 3).notNullable().defaultTo(0);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('purchase_invoice_items')) {
    const hasStockWeight = await knex.schema.hasColumn('purchase_invoice_items', 'stock_weight');
    if (hasStockWeight) {
      await knex.schema.alterTable('purchase_invoice_items', (table) => {
        table.dropColumn('stock_weight');
      });
    }
  }

  if (await knex.schema.hasTable('sale_invoice_items')) {
    const hasStockWeight = await knex.schema.hasColumn('sale_invoice_items', 'stock_weight');
    if (hasStockWeight) {
      await knex.schema.alterTable('sale_invoice_items', (table) => {
        table.dropColumn('stock_weight');
      });
    }
  }
}
