import { Knex } from 'knex';

/**
 * Normalizes system-created cashboxes from the legacy SAR default to SYP.
 * User-created cashboxes are intentionally left unchanged to avoid rewriting
 * legitimate historical currencies.
 */
export async function up(knex: Knex): Promise<void> {
  const systemNames = [
    'الصندوق الرئيسي',
    'صندوق العمولة',
    
  ];

  await knex('cashboxes')
    .whereIn('name', systemNames)
    .andWhere('currency', 'SAR')
    .update({ currency: 'SYP', updated_at: knex.fn.now() });
}

export async function down(): Promise<void> {
  // Intentionally irreversible: converting a system default back to SAR would
  // reintroduce the legacy configuration error.
}
