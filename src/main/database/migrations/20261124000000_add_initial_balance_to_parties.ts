import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('customers')) {
    const hasInitialBalance = await knex.schema.hasColumn('customers', 'initial_balance');
    if (!hasInitialBalance) {
      await knex.schema.alterTable('customers', (table) => {
        table.decimal('initial_balance', 15, 2).notNullable().defaultTo(0);
      });

      await knex.raw(`
        UPDATE customers
        SET initial_balance = ROUND(
          COALESCE(balance, 0)
          - COALESCE((
              SELECT SUM(COALESCE(si.total, 0) * COALESCE(NULLIF(si.exchange_rate, 0), 1))
              FROM sale_invoices si
              WHERE si.customer_id = customers.id
                AND LOWER(COALESCE(si.status, '')) NOT IN ('cancelled', 'draft')
            ), 0)
          + COALESCE((
              SELECT SUM(COALESCE(p.amount_base, p.amount * COALESCE(NULLIF(p.exchange_rate, 0), 1), 0))
              FROM payments p
              WHERE (p.party_type = 'customer' OR (p.party_type IS NULL AND p.payment_type = 'sale'))
                AND p.party_id = customers.id
                AND LOWER(COALESCE(p.status, 'active')) = 'active'
                AND p.payment_type IN ('sale', 'general_receipt')
            ), 0)
          - COALESCE((
              SELECT SUM(COALESCE(p.amount_base, p.amount * COALESCE(NULLIF(p.exchange_rate, 0), 1), 0))
              FROM payments p
              WHERE p.party_type = 'customer'
                AND p.party_id = customers.id
                AND LOWER(COALESCE(p.status, 'active')) = 'active'
                AND p.payment_type = 'general_payment'
            ), 0)
        , 2)
      `);
    }
  }

  if (await knex.schema.hasTable('suppliers')) {
    const hasInitialBalance = await knex.schema.hasColumn('suppliers', 'initial_balance');
    if (!hasInitialBalance) {
      await knex.schema.alterTable('suppliers', (table) => {
        table.decimal('initial_balance', 15, 2).notNullable().defaultTo(0);
      });

      await knex.raw(`
        UPDATE suppliers
        SET initial_balance = ROUND(
          COALESCE(balance, 0)
          - COALESCE((
              SELECT SUM(COALESCE(pi.total, 0) * COALESCE(NULLIF(pi.exchange_rate, 0), 1))
              FROM purchase_invoices pi
              WHERE pi.supplier_id = suppliers.id
                AND LOWER(COALESCE(pi.status, '')) NOT IN ('cancelled', 'draft')
                AND COALESCE(pi.invoice_type, 'standard') <> 'consignment'
            ), 0)
          + COALESCE((
              SELECT SUM(COALESCE(p.amount_base, p.amount * COALESCE(NULLIF(p.exchange_rate, 0), 1), 0))
              FROM payments p
              WHERE (p.party_type = 'supplier' OR (p.party_type IS NULL AND p.payment_type = 'purchase'))
                AND p.party_id = suppliers.id
                AND LOWER(COALESCE(p.status, 'active')) = 'active'
                AND p.payment_type IN ('purchase', 'general_payment')
            ), 0)
          - COALESCE((
              SELECT SUM(COALESCE(p.amount_base, p.amount * COALESCE(NULLIF(p.exchange_rate, 0), 1), 0))
              FROM payments p
              WHERE p.party_type = 'supplier'
                AND p.party_id = suppliers.id
                AND LOWER(COALESCE(p.status, 'active')) = 'active'
                AND p.payment_type = 'general_receipt'
            ), 0)
        , 2)
      `);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('customers')) {
    const hasInitialBalance = await knex.schema.hasColumn('customers', 'initial_balance');
    if (hasInitialBalance) {
      await knex.schema.alterTable('customers', (table) => {
        table.dropColumn('initial_balance');
      });
    }
  }

  if (await knex.schema.hasTable('suppliers')) {
    const hasInitialBalance = await knex.schema.hasColumn('suppliers', 'initial_balance');
    if (hasInitialBalance) {
      await knex.schema.alterTable('suppliers', (table) => {
        table.dropColumn('initial_balance');
      });
    }
  }
}
