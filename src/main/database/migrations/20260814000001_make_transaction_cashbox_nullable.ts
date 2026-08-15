import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Step 0: capture row count for verification ───────────────────────────
  const beforeCount = await knex('transactions').count('* as cnt').first();
  const rowCount = Number((beforeCount as { cnt: number }).cnt ?? 0);

  // ── Step 1: Create replacement table ─────────────────────────────────────
  await knex.schema.createTable('transactions_nullable_cashbox', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().notNullable();
    // MAKE CASHBOX_ID NULLABLE for non-cash expenses
    table.integer('cashbox_id').unsigned().nullable();
    table.decimal('amount', 15, 2).notNullable();
    table.enum('direction', ['expense', 'income']).notNullable();
    table.date('transaction_date').notNullable();
    table.text('description');
    table.string('reference_number', 50);
    table.text('notes');
    
    table.string('status', 20).defaultTo('active').notNullable();
    table.integer('cashbox_transaction_id').unsigned().nullable();
    table.timestamp('cancelled_at').nullable();
    table.text('cancellation_reason').nullable();
    table.integer('reversed_transaction_id').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();

    table.timestamp('created_at').nullable();
    table.timestamp('updated_at').nullable();
    
    table.foreign('category_id').references('id').inTable('transaction_categories').onDelete('RESTRICT');
    table.foreign('cashbox_id').references('id').inTable('cashboxes').onDelete('RESTRICT');
    table.foreign('cashbox_transaction_id').references('id').inTable('cashbox_transactions').onDelete('RESTRICT');
  });

  // ── Step 2: Copy existing data ───────────────────────────────────────────
  await knex.raw(`
    INSERT INTO transactions_nullable_cashbox
      (id, category_id, cashbox_id, amount, direction, transaction_date, 
       description, reference_number, notes, status, cashbox_transaction_id, cancelled_at, cancellation_reason, reversed_transaction_id, created_by, created_at, updated_at)
    SELECT
      id, category_id, cashbox_id, amount, direction, transaction_date, 
      description, reference_number, notes, status, cashbox_transaction_id, cancelled_at, cancellation_reason, reversed_transaction_id, created_by, created_at, updated_at
    FROM transactions
  `);

  // ── Step 3: Verify row counts match ──────────────────────────────────────
  const afterCount = await knex('transactions_nullable_cashbox').count('* as cnt').first();
  const newRowCount = Number((afterCount as { cnt: number }).cnt ?? 0);
  if (newRowCount !== rowCount) {
    throw new Error(
      `Migration data verification failed: original table had ${rowCount} rows, ` +
      `new table has ${newRowCount} rows.`
    );
  }

  // ── Step 4: Drop old table and rename new one ────────────────────────────
  await knex.schema.dropTable('transactions');
  await knex.schema.renameTable('transactions_nullable_cashbox', 'transactions');

  // ── Step 5: Recreate indexes ──────────────────────────────────────────────
  await knex.schema.alterTable('transactions', (table) => {
    table.index('category_id');
    table.index('cashbox_id');
    table.index('transaction_date');
    table.index('direction');
    table.index('status');
    table.index('cashbox_transaction_id');
    table.index('reversed_transaction_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Can't safely downgrade if we have NULL cashbox_ids, so we set them to 1 temporarily or delete them
  // A proper downgrade would require mapping them to a valid cashbox_id
  await knex.raw(`DELETE FROM transactions WHERE cashbox_id IS NULL`);

  await knex.schema.createTable('transactions_orig_notnull', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().notNullable();
    table.integer('cashbox_id').unsigned().notNullable(); // Back to not null
    table.decimal('amount', 15, 2).notNullable();
    table.enum('direction', ['expense', 'income']).notNullable();
    table.date('transaction_date').notNullable();
    table.text('description');
    table.string('reference_number', 50);
    table.text('notes');
    
    table.string('status', 20).defaultTo('active').notNullable();
    table.integer('cashbox_transaction_id').unsigned().nullable();
    table.timestamp('cancelled_at').nullable();
    table.text('cancellation_reason').nullable();
    table.integer('reversed_transaction_id').unsigned().nullable();
    table.integer('created_by').unsigned().nullable();

    table.timestamp('created_at').nullable();
    table.timestamp('updated_at').nullable();
    
    table.foreign('category_id').references('id').inTable('transaction_categories').onDelete('RESTRICT');
    table.foreign('cashbox_id').references('id').inTable('cashboxes').onDelete('RESTRICT');
    table.foreign('cashbox_transaction_id').references('id').inTable('cashbox_transactions').onDelete('RESTRICT');
  });

  await knex.raw(`
    INSERT INTO transactions_orig_notnull
      (id, category_id, cashbox_id, amount, direction, transaction_date, 
       description, reference_number, notes, status, cashbox_transaction_id, cancelled_at, cancellation_reason, reversed_transaction_id, created_by, created_at, updated_at)
    SELECT
      id, category_id, cashbox_id, amount, direction, transaction_date, 
      description, reference_number, notes, status, cashbox_transaction_id, cancelled_at, cancellation_reason, reversed_transaction_id, created_by, created_at, updated_at
    FROM transactions
  `);

  await knex.schema.dropTable('transactions');
  await knex.schema.renameTable('transactions_orig_notnull', 'transactions');

  await knex.schema.alterTable('transactions', (table) => {
    table.index('category_id');
    table.index('cashbox_id');
    table.index('transaction_date');
    table.index('direction');
    table.index('status');
    table.index('cashbox_transaction_id');
    table.index('reversed_transaction_id');
  });
}
