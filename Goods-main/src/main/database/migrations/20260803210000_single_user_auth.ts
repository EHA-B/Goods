import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function up(knex: Knex): Promise<void> {
  const existingUser = await knex('users').orderBy('id', 'asc').first();

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('password', 12);
    await knex('users').insert({
      username: 'admin',
      password_hash: passwordHash,
      full_name: 'مدير النظام',
      role: 'admin',
      isActive: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });
  }
}

export async function down(_knex: Knex): Promise<void> {
  // The system user is intentionally preserved on rollback.
}
