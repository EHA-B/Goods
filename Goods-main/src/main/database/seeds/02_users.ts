import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  const existingUser = await knex('users').orderBy('id', 'asc').first();
  if (existingUser) return;

  const hashedPassword = await bcrypt.hash('password', 12);
  await knex('users').insert({
    username: 'admin',
    password_hash: hashedPassword,
    full_name: 'مدير النظام',
    role: 'admin',
    isActive: true,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });
}
