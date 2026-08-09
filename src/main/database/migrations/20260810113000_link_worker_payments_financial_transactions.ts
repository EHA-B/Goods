import { Knex } from 'knex';

/**
 * Links worker payments to the financial transactions ledger.
 *
 * A worker salary/wage payment already affects the cashbox and worker balance.
 * This link lets the same atomic operation also create a row in `transactions`
 * without creating a second cashbox movement or deducting the cashbox twice.
 */
export async function up(knex: Knex): Promise<void> {
  const hasWorkerPayments = await knex.schema.hasTable('worker_payments');
  const hasTransactions = await knex.schema.hasTable('transactions');

  if (!hasWorkerPayments || !hasTransactions) {
    return;
  }

  const hasTransactionId = await knex.schema.hasColumn(
    'worker_payments',
    'transaction_id',
  );

  if (!hasTransactionId) {
    await knex.schema.alterTable('worker_payments', (table) => {
      table.integer('transaction_id').unsigned().nullable();
      table
        .foreign('transaction_id')
        .references('id')
        .inTable('transactions')
        .onDelete('RESTRICT');
      table.index('transaction_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasWorkerPayments = await knex.schema.hasTable('worker_payments');

  if (!hasWorkerPayments) {
    return;
  }

  const hasTransactionId = await knex.schema.hasColumn(
    'worker_payments',
    'transaction_id',
  );

  if (hasTransactionId) {
    await knex.schema.alterTable('worker_payments', (table) => {
      table.dropColumn('transaction_id');
    });
  }
}
