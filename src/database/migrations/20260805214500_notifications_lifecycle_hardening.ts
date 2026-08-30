import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notifications');
  if (!exists) return;

  const columns = [
    ['generation', (table: Knex.AlterTableBuilder) => table.integer('generation').notNullable().defaultTo(1)],
    ['first_seen_at', (table: Knex.AlterTableBuilder) => table.timestamp('first_seen_at').nullable()],
    ['last_triggered_at', (table: Knex.AlterTableBuilder) => table.timestamp('last_triggered_at').nullable()],
    ['resolved_at', (table: Knex.AlterTableBuilder) => table.timestamp('resolved_at').nullable()],
    ['dismissed_at', (table: Knex.AlterTableBuilder) => table.timestamp('dismissed_at').nullable()],
  ] as const;

  for (const [name, add] of columns) {
    if (!(await knex.schema.hasColumn('notifications', name))) {
      await knex.schema.alterTable('notifications', add);
    }
  }

  await knex('notifications').whereNull('generation').update({ generation: 1 });
  await knex('notifications').whereNull('first_seen_at').update({ first_seen_at: knex.ref('created_at') });
  await knex('notifications').whereNull('last_triggered_at').update({ last_triggered_at: knex.ref('created_at') });

  await knex.schema.alterTable('notifications', (table) => {
    table.index(['is_active', 'dismissed_at', 'is_read'], 'idx_notifications_visible_state');
    table.index(['last_triggered_at'], 'idx_notifications_last_triggered');
  });
}

export async function down(_knex: Knex): Promise<void> {
  // Historical hardening migration: intentionally non-destructive.
}
