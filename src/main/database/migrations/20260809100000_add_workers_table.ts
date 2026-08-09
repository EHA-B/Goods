import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // =============================================
  // جدول العمال (Workers)
  // =============================================
  await knex.schema.createTable('workers', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('phone', 20).nullable();
    table.text('address').nullable();
    table.decimal('balance', 15, 2).defaultTo(0);
    // 'employee' = موظف (fixed salary), 'worker' = عامل (daily/task)
    table.string('type', 20).notNullable().defaultTo('worker');
    table.text('notes').nullable();
    // 'active' | 'inactive'
    table.string('state', 20).notNullable().defaultTo('active');
    table.timestamp('created_at').nullable();
    table.timestamp('updated_at').nullable();

    table.index('name');
    table.index('type');
    table.index('state');
  });

  // =============================================
  // جدول دفعات العمال (Worker Payments)
  // =============================================
  await knex.schema.createTable('worker_payments', (table) => {
    table.increments('id').primary();
    table.integer('worker_id').unsigned().notNullable();
    table.integer('cashbox_id').unsigned().notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 10).notNullable().defaultTo('SYP');
    table.decimal('exchange_rate', 15, 6).notNullable().defaultTo(1);
    table.decimal('amount_base', 15, 2).notNullable().defaultTo(0);
    table.date('payment_date').notNullable();
    table.text('notes').nullable();
    // 'active' | 'reversed'
    table.string('status', 20).notNullable().defaultTo('active');
    table.text('reversal_reason').nullable();
    table.integer('reversed_payment_id').unsigned().nullable();
    table.integer('cashbox_transaction_id').unsigned().nullable();
    table.decimal('balance_before', 15, 2).nullable();
    table.decimal('balance_after', 15, 2).nullable();
    table.timestamp('created_at').nullable();
    table.timestamp('updated_at').nullable();

    table.foreign('worker_id').references('id').inTable('workers').onDelete('RESTRICT');
    table.foreign('cashbox_id').references('id').inTable('cashboxes').onDelete('RESTRICT');

    table.index('worker_id');
    table.index('cashbox_id');
    table.index('payment_date');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('worker_payments');
  await knex.schema.dropTableIfExists('workers');
}
