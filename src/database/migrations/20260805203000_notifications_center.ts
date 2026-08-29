import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notifications');
  if (!exists) {
    await knex.schema.createTable('notifications', (table) => {
      table.increments('id').primary();
      table.string('dedupe_key').notNullable().unique();
      table.string('type').notNullable().defaultTo('system');
      table.string('severity').notNullable().defaultTo('info');
      table.string('title').notNullable();
      table.text('body').nullable();
      table.string('entity_type').nullable();
      table.integer('entity_id').nullable();
      table.string('action_path').nullable();
      table.boolean('is_read').notNullable().defaultTo(false);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('read_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      table.index(['is_active', 'is_read', 'created_at'], 'idx_notifications_state');
      table.index(['type', 'severity'], 'idx_notifications_type');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}
