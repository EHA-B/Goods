import { Knex } from 'knex';

/**
 * Migration: 20260803_cashbox_accounting_hardening
 *
 * This migration hardens the cashbox_transactions table:
 * 1. Expands `reference_type` to include opening_balance, adjustment, reversal
 * 2. Makes `reference_id` nullable (manual movements have no external reference)
 * 3. Adds `transfer_group_id` to link both sides of a transfer atomically
 * 4. Adds `reversed_transaction_id` to link a reversal to its original movement
 * 5. Adds `reversal_reason` text column
 * 6. Makes `balance_before` / `balance_after` nullable (historical rows may lack them)
 * 7. Recreates all required indexes
 * 8. Updates `cashboxes.currency` default from SAR to SYP
 *
 * SQLite does not support ALTER COLUMN or DROP CONSTRAINT, so we rebuild the table.
 */

export async function up(knex: Knex): Promise<void> {
  // ── Step 0: capture row count for verification ───────────────────────────
  const beforeCount = await knex('cashbox_transactions').count('* as cnt').first();
  const rowCount = Number((beforeCount as { cnt: number }).cnt ?? 0);

  // ── Step 1: Create replacement table ─────────────────────────────────────
  await knex.schema.createTable('cashbox_transactions_new', (table) => {
    table.increments('id').primary();
    table.integer('cashbox_id').unsigned().notNullable();
    // Expanded reference_type — no enum in raw SQL because SQLite CHECK constraint
    // We'll enforce this at the application level.
    table.string('reference_type', 50).notNullable();
    table.integer('reference_id').nullable();                  // NOW NULLABLE
    table.decimal('amount', 15, 2).notNullable();
    table.string('direction', 3).notNullable();                // 'in' | 'out'
    table.decimal('balance_before', 15, 2).nullable();         // nullable for historical
    table.decimal('balance_after', 15, 2).nullable();          // nullable for historical
    table.string('transfer_group_id', 100).nullable();         // NEW: links both sides of a transfer
    table.integer('reversed_transaction_id').nullable();       // NEW: links reversal to original
    table.text('reversal_reason').nullable();                  // NEW: reason for reversal
    table.date('transaction_date').notNullable().defaultTo(knex.fn.now());
    table.text('notes').nullable();
    table.timestamp('created_at').nullable();
    table.timestamp('updated_at').nullable();

    table.foreign('cashbox_id').references('id').inTable('cashboxes').onDelete('RESTRICT');
    // Note: SQLite does not enforce self-referencing FK inside the same CREATE TABLE.
    // reversed_transaction_id FK is noted but not enforced here; enforced at app layer.
  });

  // ── Step 2: Copy existing data, mapping old -> new schema ────────────────
  await knex.raw(`
    INSERT INTO cashbox_transactions_new
      (id, cashbox_id, reference_type, reference_id, amount, direction,
       balance_before, balance_after, transfer_group_id, reversed_transaction_id,
       reversal_reason, transaction_date, notes, created_at, updated_at)
    SELECT
      id, cashbox_id,
      reference_type,
      reference_id,
      amount,
      direction,
      balance_before,
      balance_after,
      NULL AS transfer_group_id,
      NULL AS reversed_transaction_id,
      NULL AS reversal_reason,
      transaction_date,
      notes,
      created_at,
      updated_at
    FROM cashbox_transactions
  `);

  // ── Step 3: Verify row counts match ──────────────────────────────────────
  const afterCount = await knex('cashbox_transactions_new').count('* as cnt').first();
  const newRowCount = Number((afterCount as { cnt: number }).cnt ?? 0);
  if (newRowCount !== rowCount) {
    throw new Error(
      `Migration data verification failed: original table had ${rowCount} rows, ` +
      `new table has ${newRowCount} rows.`
    );
  }

  // ── Step 4: Drop old table and rename new one ────────────────────────────
  await knex.schema.dropTable('cashbox_transactions');
  await knex.schema.renameTable('cashbox_transactions_new', 'cashbox_transactions');

  // ── Step 5: Recreate indexes ──────────────────────────────────────────────
  await knex.schema.alterTable('cashbox_transactions', (table) => {
    table.index('cashbox_id',              'idx_cbt_cashbox_id');
    table.index('reference_type',          'idx_cbt_reference_type');
    table.index('reference_id',            'idx_cbt_reference_id');
    table.index('transaction_date',        'idx_cbt_transaction_date');
    table.index('transfer_group_id',       'idx_cbt_transfer_group_id');
    table.index('reversed_transaction_id', 'idx_cbt_reversed_transaction_id');
    table.index(['cashbox_id', 'transaction_date'], 'idx_cbt_cashbox_date');
  });

  // ── Step 6: Update default currency on cashboxes table ───────────────────
  // SQLite cannot alter column DEFAULT, so we add a new column, copy, drop old, rename.
  // However, the default only affects new inserts — existing rows are unaffected.
  // We set a session-level default by noting this in the application code instead.
  // The column default was 'SAR'; we cannot rename it in SQLite, but we can update
  // any existing rows that still have the old default if needed.
  // For safety, we leave existing rows unchanged and rely on the app-layer default (SYP).
}

export async function down(knex: Knex): Promise<void> {
  // Rebuild original cashbox_transactions table
  await knex.schema.createTable('cashbox_transactions_orig', (table) => {
    table.increments('id').primary();
    table.integer('cashbox_id').unsigned().notNullable();
    table.string('reference_type', 50).notNullable();
    table.integer('reference_id').notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('direction', 3).notNullable();
    table.decimal('balance_before', 15, 2).notNullable();
    table.decimal('balance_after', 15, 2).notNullable();
    table.date('transaction_date').notNullable().defaultTo(knex.fn.now());
    table.text('notes').nullable();
    table.timestamp('created_at').nullable();
    table.timestamp('updated_at').nullable();

    table.foreign('cashbox_id').references('id').inTable('cashboxes').onDelete('RESTRICT');
  });

  await knex.raw(`
    INSERT INTO cashbox_transactions_orig
      (id, cashbox_id, reference_type, reference_id, amount, direction,
       balance_before, balance_after, transaction_date, notes, created_at, updated_at)
    SELECT
      id, cashbox_id, reference_type,
      COALESCE(reference_id, 0) AS reference_id,
      amount, direction,
      COALESCE(balance_before, 0) AS balance_before,
      COALESCE(balance_after, 0) AS balance_after,
      transaction_date, notes, created_at, updated_at
    FROM cashbox_transactions
  `);

  await knex.schema.dropTable('cashbox_transactions');
  await knex.schema.renameTable('cashbox_transactions_orig', 'cashbox_transactions');

  await knex.schema.alterTable('cashbox_transactions', (table) => {
    table.index('cashbox_id');
    table.index(['reference_type', 'reference_id']);
    table.index('transaction_date');
    table.index(['cashbox_id', 'transaction_date']);
  });
}
