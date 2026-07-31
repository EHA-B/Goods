import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 1. Check if the cashbox already exists to prevent duplicates on multiple runs
  const existingCashbox = await knex('cashboxes')
    .where('name', 'Commission Holding Cashbox')
    .first();

  // 2. Insert if it doesn't exist
  if (!existingCashbox) {
    // You could also link this to a parent_id here if you have a specific main cashbox id, 
    // but for now it's an independent root cashbox.
    await knex('cashboxes').insert({
      name: 'Commission Holding Cashbox',
      balance: 0,
      initial_balance: 0,
      currency: 'SAR',
      isActive: true,
      notes: 'Holding account for consignment/commission sales before settlement with suppliers.',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
  }
}
