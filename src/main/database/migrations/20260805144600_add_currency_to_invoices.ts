import { Knex } from 'knex';

async function addInvoiceCurrencyColumns(knex: Knex, tableName: string): Promise<void> {
  if (!(await knex.schema.hasColumn(tableName, 'currency'))) {
    await knex.schema.alterTable(tableName, (table) => {
      table.string('currency', 10).notNullable().defaultTo('SYP');
    });
  }
  if (!(await knex.schema.hasColumn(tableName, 'exchange_rate'))) {
    await knex.schema.alterTable(tableName, (table) => {
      table.decimal('exchange_rate', 15, 6).notNullable().defaultTo(1);
    });
  }

  await knex.raw(`
    UPDATE ${tableName}
    SET currency = COALESCE(NULLIF(currency, ''), 'SYP'),
        exchange_rate = CASE WHEN exchange_rate IS NULL OR exchange_rate <= 0 THEN 1 ELSE exchange_rate END
  `);
}

export async function up(knex: Knex): Promise<void> {
  await addInvoiceCurrencyColumns(knex, 'sale_invoices');
  await addInvoiceCurrencyColumns(knex, 'purchase_invoices');
}

export async function down(_knex: Knex): Promise<void> {
  // Compatibility migration: intentionally not rolled back.
}
