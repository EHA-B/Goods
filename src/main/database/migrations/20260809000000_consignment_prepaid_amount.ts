import { Knex } from 'knex';

/**
 * Migration: Add prepaid_amount to consignment_settlements
 *
 * When a consignment invoice has partial payments recorded before the settlement,
 * the prepaid_amount captures the total already paid to the supplier so the final
 * payout from the cashbox is correctly reduced.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('consignment_settlements', (table) => {
    table.decimal('prepaid_amount', 15, 2).notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('consignment_settlements', (table) => {
    table.dropColumn('prepaid_amount');
  });
}
