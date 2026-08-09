import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stock_adjustments', (table) => {
    table.decimal('quantity_before', 15, 3).notNullable().defaultTo(0);
    table.decimal('quantity_after', 15, 3).notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stock_adjustments', (table) => {
    table.dropColumn('quantity_before');
    table.dropColumn('quantity_after');
  });
}
