import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('sale_invoices', (table) => {
    table.string('currency', 10).defaultTo('SYP');
    table.decimal('exchange_rate', 15, 6).defaultTo(1);
  });

  await knex.schema.alterTable('purchase_invoices', (table) => {
    table.string('currency', 10).defaultTo('SYP');
    table.decimal('exchange_rate', 15, 6).defaultTo(1);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('sale_invoices', (table) => {
    table.dropColumn('currency');
    table.dropColumn('exchange_rate');
  });

  await knex.schema.alterTable('purchase_invoices', (table) => {
    table.dropColumn('currency');
    table.dropColumn('exchange_rate');
  });
}
