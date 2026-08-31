import type { Knex } from 'knex';

/** Stores who bears each purchase extra cost. Existing invoices remain 'company'. */
export async function up(knex: Knex): Promise<void> {
  const hasTransportBearer = await knex.schema.hasColumn('purchase_invoices', 'transport_cost_bearer');
  if (!hasTransportBearer) {
    await knex.schema.alterTable('purchase_invoices', (table) => {
      table.string('transport_cost_bearer', 20).notNullable().defaultTo('company');
    });
  }
  const hasEmptyingBearer = await knex.schema.hasColumn('purchase_invoices', 'emptying_cost_bearer');
  if (!hasEmptyingBearer) {
    await knex.schema.alterTable('purchase_invoices', (table) => {
      table.string('emptying_cost_bearer', 20).notNullable().defaultTo('company');
    });
  }
}

export async function down(_knex: Knex): Promise<void> {}
