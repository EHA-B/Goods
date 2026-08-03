import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  await knex('cashboxes').del();

  await knex('cashboxes').insert([
    {
      name: 'الصندوق الرئيسي',
      parent_id: null,
      initial_balance: 0,
      balance: 0,
      currency: 'SYP',
      notes: 'الصندوق الرئيسي للنظام',
    },
  ]);
  await knex('cashboxes').insert([
    {
      name: 'صندوق العمولة',
      parent_id: 1,
      initial_balance: 0,
      balance: 0,
      currency: 'SYP',
      notes: 'خاص ببيانات البيع بالعمولة ',
    },
  ]);
}