import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('cashboxes').del();

  await knex('cashboxes').insert([
    {
      name: 'الصندوق الرئيسي',
      parent_id: null,
      initial_balance: 0,
      balance: 0,
      currency: 'SAR',
      notes: 'الصندوق الرئيسي للنظام',
    },
  ]);
}