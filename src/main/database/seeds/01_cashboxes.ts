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

  // 1. Create main cashbox first
  const [mainCashboxId] = await knex('cashboxes').insert({
    name: 'الصندوق الرئيسي',
    parent_id: null,
    initial_balance: 0,
    balance: 0,
    currency: 'SYP',
    isActive: true,
    notes: 'الصندوق الرئيسي للنظام',
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });

  // 2. Create the commission cashbox linked to the main cashbox
  await knex('cashboxes').insert({
    name: 'صندوق العمولة',
    parent_id: mainCashboxId || 1,
    initial_balance: 0,
    balance: 0,
    currency: 'SYP',
    isActive: true,
    notes: 'خاص ببيانات البيع بالعمولة (Holding account for consignment/commission sales)',
    created_at: knex.fn.now(),
    updated_at: knex.fn.now()
  });
}