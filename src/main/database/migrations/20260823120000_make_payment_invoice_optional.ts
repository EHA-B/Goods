import { Knex } from 'knex';

const TABLE_NAME = 'payments';
const TEMP_TABLE_NAME = 'payments_invoice_optional_tmp';

interface TableInfoRow {
  name: string;
  notnull: number;
}

function rowsFromRaw(result: unknown): TableInfoRow[] {
  if (Array.isArray(result)) return result as TableInfoRow[];
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as TableInfoRow[]) : [];
  }
  return [];
}

/**
 * Allows general payments without a specific invoice.
 *
 * This migration reconstructs the payments table and makes `invoice_id` nullable,
 * so we can record general party payments or receipts.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable(TABLE_NAME))) return;

  const tableInfo = rowsFromRaw(
    await knex.raw(`PRAGMA table_info(${TABLE_NAME})`),
  );
  const invoiceIdColumn = tableInfo.find((column) => column.name === 'invoice_id');

  if (!invoiceIdColumn || Number(invoiceIdColumn.notnull) === 0) return;

  const oldColumns = new Set(tableInfo.map((column) => column.name));
  const oldCountRow = await knex(TABLE_NAME)
    .count<{ count: number | string }[]>({ count: '*' })
    .first();
  const oldCount = Number(oldCountRow?.count ?? 0);

  await knex.raw('PRAGMA foreign_keys = OFF');

  try {
    await knex.schema.dropTableIfExists(TEMP_TABLE_NAME);

    await knex.schema.createTable(TEMP_TABLE_NAME, (table) => {
      table.increments('id').primary();
      table.string('party_type', 20).notNullable();
      table.integer('party_id').nullable();
      table.string('payment_type', 20).notNullable();
      table.integer('invoice_id').nullable(); // <-- CHANGED
      table.integer('cashbox_id').unsigned().notNullable();
      table.decimal('amount', 15, 2).notNullable();
      // Multi-currency support columns
      table.string('currency', 10).notNullable().defaultTo('SYP');
      table.decimal('exchange_rate', 15, 4).notNullable().defaultTo(1);
      table.decimal('amount_base', 15, 2).notNullable().defaultTo(0);
      
      table.date('payment_date').notNullable();
      table.string('payment_method', 20).notNullable().defaultTo('cash');
      table.string('reference_number', 50).nullable();
      table.text('notes').nullable();

      table.string('status', 20).notNullable().defaultTo('active');
      table.integer('reversed_payment_id').nullable();
      table.integer('cashbox_transaction_id').nullable();
      table.decimal('balance_before', 15, 2).nullable();
      table.decimal('balance_after', 15, 2).nullable();
      table.integer('created_by').nullable();
      table.text('reversal_reason').nullable();

      table.timestamp('created_at').nullable();
      table.timestamp('updated_at').nullable();

      table
        .foreign('cashbox_id')
        .references('id')
        .inTable('cashboxes')
        .onDelete('RESTRICT');
    });

    const targetColumns = [
      'id',
      'party_type',
      'party_id',
      'payment_type',
      'invoice_id',
      'cashbox_id',
      'amount',
      'currency',
      'exchange_rate',
      'amount_base',
      'payment_date',
      'payment_method',
      'reference_number',
      'notes',
      'status',
      'reversed_payment_id',
      'cashbox_transaction_id',
      'balance_before',
      'balance_after',
      'created_by',
      'reversal_reason',
      'created_at',
      'updated_at',
    ];

    const sourceExpression = (column: string): string => {
      if (oldColumns.has(column)) {
        if (column === 'status') return "COALESCE(status, 'active')";
        if (column === 'payment_method') return "COALESCE(payment_method, 'cash')";
        return column;
      }

      if (column === 'status') return "'active'";
      if (column === 'payment_method') return "'cash'";
      if (column === 'currency') return "'SYP'";
      if (column === 'exchange_rate') return "1";
      if (column === 'amount_base') return "amount";
      return 'NULL';
    };

    await knex.raw(`
      INSERT INTO ${TEMP_TABLE_NAME} (${targetColumns.join(', ')})
      SELECT ${targetColumns.map(sourceExpression).join(', ')}
      FROM ${TABLE_NAME}
    `);

    const newCountRow = await knex(TEMP_TABLE_NAME)
      .count<{ count: number | string }[]>({ count: '*' })
      .first();
    const newCount = Number(newCountRow?.count ?? 0);

    if (newCount !== oldCount) {
      throw new Error(
        `Payments migration count mismatch: old=${oldCount}, new=${newCount}`,
      );
    }

    await knex.schema.dropTable(TABLE_NAME);
    await knex.schema.renameTable(TEMP_TABLE_NAME, TABLE_NAME);

    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.index(['party_type', 'party_id'], 'idx_payments_party');
      table.index(['payment_type', 'invoice_id'], 'idx_payments_invoice');
      table.index('cashbox_id', 'idx_payments_cashbox');
      table.index('payment_date', 'idx_payments_date');
      table.index(
        ['party_type', 'party_id', 'payment_date'],
        'idx_payments_party_date',
      );
      table.index('status', 'idx_payments_status');
      table.index('reversed_payment_id', 'idx_payments_reversed_id');
    });

    await knex.raw(`
      UPDATE sqlite_sequence
      SET seq = (SELECT COALESCE(MAX(id), 0) FROM ${TABLE_NAME})
      WHERE name = '${TABLE_NAME}'
    `);
  } finally {
    await knex.raw('PRAGMA foreign_keys = ON');
  }

  const foreignKeyProblems = await knex.raw('PRAGMA foreign_key_check');
  const problemRows = Array.isArray(foreignKeyProblems)
    ? foreignKeyProblems
    : (foreignKeyProblems as { rows?: unknown[] } | undefined)?.rows ?? [];

  if (Array.isArray(problemRows) && problemRows.length > 0) {
    throw new Error(
      `Foreign-key check failed after payments migration: ${JSON.stringify(problemRows)}`,
    );
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Irreversible because we might have NULL invoice_id values.
}

export const config = {
  transaction: false,
};
