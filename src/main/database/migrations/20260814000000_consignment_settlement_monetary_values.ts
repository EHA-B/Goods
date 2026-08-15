import { Knex } from 'knex';

/**
 * Adds monetary-value tracking to consignment_settlements:
 *
 *  spoilage_value  — the purchase-cost of goods written off as spoilage.
 *                    This amount is added to the supplier's payout (we compensate
 *                    the supplier for damaged goods that were in our custody).
 *
 *  return_value    — the purchase-cost of goods physically returned to the supplier.
 *                    This stays on our side (we don't pay for what we gave back),
 *                    and is recorded as an income entry in the transactions ledger.
 *
 *  return_income_transaction_id — FK to the transactions row created for the
 *                    return-value income entry, used during settlement reversal.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('consignment_settlements', (table) => {
    table.decimal('spoilage_value', 15, 3).defaultTo(0).nullable();
    table.decimal('return_value', 15, 3).defaultTo(0).nullable();
    table.integer('return_income_transaction_id').unsigned().nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('consignment_settlements', (table) => {
    table.dropColumn('spoilage_value');
    table.dropColumn('return_value');
    table.dropColumn('return_income_transaction_id');
  });
}
