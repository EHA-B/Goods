import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Check if USD cashbox exists
  const usdCashbox = await knex('cashboxes').where('currency', 'USD').first();
  if (!usdCashbox) {
    await knex('cashboxes').insert({
      name: 'Main Safe (USD)',
      balance: 0,
      initial_balance: 0,
      currency: 'USD',
      isActive: true,
      notes: 'Main cashbox for US Dollars',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }

  // Ensure SYP main safe exists
  const sypCashbox = await knex('cashboxes').where('currency', 'SYP').first();
  if (!sypCashbox) {
    await knex('cashboxes').insert({
      name: 'Main Safe (SYP)',
      balance: 0,
      initial_balance: 0,
      currency: 'SYP',
      isActive: true,
      notes: 'Main cashbox for Syrian Pounds',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }
}
