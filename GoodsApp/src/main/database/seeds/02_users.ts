import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  await knex('users').del();

  const hashedPassword = await bcrypt.hash('password', 10);

  await knex('users').insert([
    {
      username: 'admin',
      password_hash: hashedPassword,
      full_name: 'مدير النظام',
      email: 'admin@farmersmarket.com',
      role: 'admin',
      isActive: true,
    },
  ]);
}