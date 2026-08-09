import type { Knex } from 'knex';

const TABLE_NAME = 'sale_invoices';
const TEMP_TABLE_NAME = 'sale_invoices_runtime_compatibility_tmp';

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
 * Historical/runtime compatibility migration for Sales.
 *
 * IMPORTANT:
 * - This exact filename is already recorded in deployed `knex_migrations`
 *   tables, so it must never be deleted or renamed.
 * - Existing databases that already ran it only need the file to remain in the
 *   migration source so Knex can validate migration history.
 * - Databases that have not run it yet are upgraded safely and idempotently.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable(TABLE_NAME))) return;

  const tableInfo = rowsFromRaw(
    await knex.raw(`PRAGMA table_info(${TABLE_NAME})`),
  );
  const columns = new Set(tableInfo.map((column) => column.name));
  const customerColumn = tableInfo.find((column) => column.name === 'customer_id');
  const saleTypeColumn = tableInfo.find((column) => column.name === 'sale_type_id');

  const schemaAlreadyCompatible =
    columns.has('discount_amount') &&
    columns.has('remaining_amount') &&
    Number(customerColumn?.notnull ?? 0) === 0 &&
    Number(saleTypeColumn?.notnull ?? 0) === 0;

  if (schemaAlreadyCompatible) return;

  const oldCountRow = await knex(TABLE_NAME)
    .count<{ count: number | string }[]>({ count: '*' })
    .first();
  const oldCount = Number(oldCountRow?.count ?? 0);

  // SQLite cannot remove NOT NULL constraints in-place, therefore the table is
  // rebuilt. The migration is explicitly non-transactional (see config below)
  // so PRAGMA foreign_keys can be disabled while replacing the parent table.
  await knex.raw('PRAGMA foreign_keys = OFF');

  try {
    await knex.schema.dropTableIfExists(TEMP_TABLE_NAME);

    await knex.schema.createTable(TEMP_TABLE_NAME, (table) => {
      table.increments('id').primary();
      table.string('invoice_number', 50).notNullable().unique();
      table.integer('customer_id').unsigned().nullable();
      table.integer('sale_type_id').unsigned().nullable();
      table.integer('cashbox_id').unsigned().nullable();
      table.date('invoice_date').notNullable();
      table.decimal('subtotal', 15, 2).notNullable().defaultTo(0);
      table.decimal('discount', 15, 2).notNullable().defaultTo(0);
      table.decimal('discount_amount', 15, 2).notNullable().defaultTo(0);
      table.decimal('commission_percentage', 5, 2).notNullable().defaultTo(0);
      table.decimal('commission_amount', 15, 2).notNullable().defaultTo(0);
      table.decimal('tax', 15, 2).notNullable().defaultTo(0);
      table.decimal('total', 15, 2).notNullable().defaultTo(0);
      table.decimal('paid_amount', 15, 2).notNullable().defaultTo(0);
      table.decimal('remaining_amount', 15, 2).notNullable().defaultTo(0);
      table.string('status', 20).notNullable().defaultTo('draft');
      table.text('notes').nullable();
      table.timestamp('cancelled_at').nullable();
      table.text('cancellation_reason').nullable();
      table.timestamp('created_at').nullable();
      table.timestamp('updated_at').nullable();

      table
        .foreign('customer_id')
        .references('id')
        .inTable('customers')
        .onDelete('SET NULL');
      table
        .foreign('sale_type_id')
        .references('id')
        .inTable('sale_types')
        .onDelete('SET NULL');
      table
        .foreign('cashbox_id')
        .references('id')
        .inTable('cashboxes')
        .onDelete('SET NULL');
    });

    const source = (column: string, fallback = 'NULL'): string =>
      columns.has(column) ? column : fallback;

    const discountSource = columns.has('discount_amount')
      ? 'COALESCE(discount_amount, 0)'
      : columns.has('discount')
        ? 'COALESCE(discount, 0)'
        : '0';

    const legacyDiscountSource = columns.has('discount')
      ? 'COALESCE(discount, 0)'
      : discountSource;

    const remainingSource = columns.has('remaining_amount')
      ? 'COALESCE(remaining_amount, 0)'
      : `CASE
          WHEN ${source('status', "'draft'")} = 'cancelled' THEN 0
          ELSE MAX(0, COALESCE(${source('total', '0')}, 0) - COALESCE(${source('paid_amount', '0')}, 0))
        END`;

    await knex.raw(`
      INSERT INTO ${TEMP_TABLE_NAME} (
        id,
        invoice_number,
        customer_id,
        sale_type_id,
        cashbox_id,
        invoice_date,
        subtotal,
        discount,
        discount_amount,
        commission_percentage,
        commission_amount,
        tax,
        total,
        paid_amount,
        remaining_amount,
        status,
        notes,
        cancelled_at,
        cancellation_reason,
        created_at,
        updated_at
      )
      SELECT
        ${source('id')},
        ${source('invoice_number')},
        ${source('customer_id')},
        ${source('sale_type_id')},
        ${source('cashbox_id')},
        ${source('invoice_date')},
        COALESCE(${source('subtotal', '0')}, 0),
        ${legacyDiscountSource},
        ${discountSource},
        COALESCE(${source('commission_percentage', '0')}, 0),
        COALESCE(${source('commission_amount', '0')}, 0),
        COALESCE(${source('tax', '0')}, 0),
        COALESCE(${source('total', '0')}, 0),
        COALESCE(${source('paid_amount', '0')}, 0),
        ${remainingSource},
        COALESCE(${source('status', "'draft'")}, 'draft'),
        ${source('notes')},
        ${source('cancelled_at')},
        ${source('cancellation_reason')},
        ${source('created_at')},
        ${source('updated_at')}
      FROM ${TABLE_NAME}
    `);

    const newCountRow = await knex(TEMP_TABLE_NAME)
      .count<{ count: number | string }[]>({ count: '*' })
      .first();
    const newCount = Number(newCountRow?.count ?? 0);

    if (newCount !== oldCount) {
      throw new Error(
        `Sale invoices migration count mismatch: old=${oldCount}, new=${newCount}`,
      );
    }

    await knex.schema.dropTable(TABLE_NAME);
    await knex.schema.renameTable(TEMP_TABLE_NAME, TABLE_NAME);

    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.index('customer_id', 'idx_sale_invoices_customer_id');
      table.index('sale_type_id', 'idx_sale_invoices_sale_type_id');
      table.index('cashbox_id', 'idx_sale_invoices_cashbox_id');
      table.index('invoice_date', 'idx_sale_invoices_invoice_date');
      table.index('status', 'idx_sale_invoices_status');
      table.index(['customer_id', 'status'], 'idx_sale_invoices_customer_status');
      table.index(['invoice_date', 'status'], 'idx_sale_invoices_date_status');
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
      `Foreign-key check failed after sale migration: ${JSON.stringify(problemRows)}`,
    );
  }
}

export async function down(_knex: Knex): Promise<void> {
  // Intentionally irreversible. Removing compatibility columns or restoring
  // NOT NULL constraints would invalidate supported walk-in cash sales.
}

export const config = {
  transaction: false,
};
