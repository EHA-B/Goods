import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex('cashboxes').del();

  // Try to reset the auto-increment sequence so IDs start at 1
  try {
    await knex.raw('DELETE FROM sqlite_sequence WHERE name="cashboxes"');
  } catch (e) {
    // Ignore if sequence table doesn't exist
  }

  // 1. Create main cashbox (SYP)
  const [sypCashboxId] = await knex('cashboxes').insert({
    name: 'الصندوق الرئيسي (ل.س)',
    parent_id: null,
    initial_balance: 0,
    balance: 0,
    currency: 'SYP',
    isActive: true,
    notes: 'الصندوق الرئيسي بالليرة السورية',
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });

  // 2. Create main cashbox (USD)
  await knex('cashboxes').insert({
    name: 'الصندوق الرئيسي (دولار)',
    parent_id: null,
    initial_balance: 0,
    balance: 0,
    currency: 'USD',
    isActive: true,
    notes: 'الصندوق الرئيسي بالدولار الأمريكي',
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });

  // 3. Create the commission / consignment cashbox
 
}