import { Knex } from 'knex';

async function addColumnIfMissing(
  knex: Knex,
  tableName: string,
  columnName: string,
  addColumn: (table: Knex.CreateTableBuilder) => void,
): Promise<void> {
  if (!(await knex.schema.hasColumn(tableName, columnName))) {
    await knex.schema.alterTable(tableName, addColumn);
  }
}

export async function up(knex: Knex): Promise<void> {
  await addColumnIfMissing(knex, 'stock_batches', 'purchase_currency', (table) => {
    table.string('purchase_currency', 10).notNullable().defaultTo('SYP');
  });
  await addColumnIfMissing(knex, 'stock_batches', 'purchase_exchange_rate', (table) => {
    table.decimal('purchase_exchange_rate', 15, 6).notNullable().defaultTo(1);
  });
  await addColumnIfMissing(knex, 'stock_batches', 'purchase_price_base', (table) => {
    table.decimal('purchase_price_base', 15, 2).notNullable().defaultTo(0);
  });

  await addColumnIfMissing(knex, 'payments', 'currency', (table) => {
    table.string('currency', 10).notNullable().defaultTo('SYP');
  });
  await addColumnIfMissing(knex, 'payments', 'exchange_rate', (table) => {
    table.decimal('exchange_rate', 15, 6).notNullable().defaultTo(1);
  });
  await addColumnIfMissing(knex, 'payments', 'amount_base', (table) => {
    table.decimal('amount_base', 15, 2).notNullable().defaultTo(0);
  });

  await knex.raw(`
    UPDATE stock_batches
    SET purchase_currency = COALESCE(NULLIF(purchase_currency, ''), 'SYP'),
        purchase_exchange_rate = CASE
          WHEN purchase_exchange_rate IS NULL OR purchase_exchange_rate <= 0 THEN 1
          ELSE purchase_exchange_rate
        END,
        purchase_price_base = CASE
          WHEN purchase_price_base IS NULL OR purchase_price_base = 0
            THEN ROUND(COALESCE(purchase_price, 0) *
              CASE WHEN purchase_exchange_rate IS NULL OR purchase_exchange_rate <= 0 THEN 1 ELSE purchase_exchange_rate END, 2)
          ELSE purchase_price_base
        END
  `);

  await knex.raw(`
    UPDATE payments
    SET currency = COALESCE(
          NULLIF(currency, ''),
          CASE
            WHEN payment_type = 'sale' THEN (
              SELECT COALESCE(NULLIF(si.currency, ''), 'SYP')
              FROM sale_invoices si WHERE si.id = payments.invoice_id
            )
            ELSE (
              SELECT COALESCE(NULLIF(pi.currency, ''), 'SYP')
              FROM purchase_invoices pi WHERE pi.id = payments.invoice_id
            )
          END,
          'SYP'
        ),
        exchange_rate = CASE
          WHEN exchange_rate IS NULL OR exchange_rate <= 0 THEN COALESCE(
            CASE
              WHEN payment_type = 'sale' THEN (
                SELECT CASE WHEN si.exchange_rate IS NULL OR si.exchange_rate <= 0 THEN 1 ELSE si.exchange_rate END
                FROM sale_invoices si WHERE si.id = payments.invoice_id
              )
              ELSE (
                SELECT CASE WHEN pi.exchange_rate IS NULL OR pi.exchange_rate <= 0 THEN 1 ELSE pi.exchange_rate END
                FROM purchase_invoices pi WHERE pi.id = payments.invoice_id
              )
            END,
            1
          )
          ELSE exchange_rate
        END
  `);

  await knex.raw(`
    UPDATE payments
    SET amount_base = ROUND(COALESCE(amount, 0) *
      CASE WHEN exchange_rate IS NULL OR exchange_rate <= 0 THEN 1 ELSE exchange_rate END, 2)
    WHERE amount_base IS NULL OR amount_base = 0
  `);
}

export async function down(_knex: Knex): Promise<void> {
  // Compatibility migration: intentionally not rolled back.
}
