import knex, { Knex } from 'knex';
import path from 'path';
import { app } from 'electron';

// Import migrations and seeds statically so Vite bundles them
import * as initialSchema from './migrations/20250101000000_initial_schema';
import * as consignmentMigration from './migrations/20260728141424_consignment_support';
import * as productCodeMigration from './migrations/20260731190000_add_product_code';
import * as optionalProductCodeMigration from './migrations/20260731210000_make_product_code_optional';
import * as quantityBeforeAfterMigration from './migrations/20260801135327_add_quantity_before_after_to_stock_adjustments';
import * as cashboxAccountingHardening from './migrations/20260803_cashbox_accounting_hardening';
import * as singleUserAuthMigration from './migrations/20260803210000_single_user_auth';
import * as consignmentSettlementsMigration from './migrations/20260804130000_consignment_settlements';
import * as financialTransactionsHardening from './migrations/20260804140000_financial_transactions_hardening';
import * as purchaseRuntimeCompatibility from './migrations/20260804170000_purchase_runtime_compatibility';
import * as saleRuntimeCompatibility from './migrations/20260804200000_sale_runtime_compatibility';
import * as paymentPartyOptionalMigration from './migrations/20260804210000_make_payment_party_optional';
import * as cashboxesSeed from './seeds/01_cashboxes';
import * as usersSeed from './seeds/02_users';
import * as commissionCashboxSeed from './seeds/01_commission_cashbox';

let knexInstance: Knex | null = null;

class MigrationSource {
  async getMigrations() {
    return Promise.resolve([
      '20250101000000_initial_schema.ts',
      '20260728141424_consignment_support.ts',
      '20260731190000_add_product_code.ts',
      '20260731210000_make_product_code_optional.ts',
      '20260801135327_add_quantity_before_after_to_stock_adjustments.ts',
      '20260803_cashbox_accounting_hardening.ts',
      '20260803210000_single_user_auth.ts',
      '20260804130000_consignment_settlements.ts',
      '20260804140000_financial_transactions_hardening.ts',
      '20260804170000_purchase_runtime_compatibility.ts',
      '20260804200000_sale_runtime_compatibility.ts',
      '20260804210000_make_payment_party_optional.ts'
    ]);
  }
  getMigrationName(migration: string) {
    return migration;
  }
  async getMigration(migration: string) {
    if (migration === '20250101000000_initial_schema.ts') {
      return initialSchema;
    }
    if (migration === '20260728141424_consignment_support.ts') {
      return consignmentMigration;
    }
    if (migration === '20260731190000_add_product_code.ts') {
      return productCodeMigration;
    }
    if (migration === '20260731210000_make_product_code_optional.ts') {
      return optionalProductCodeMigration;
    }
    if (migration === '20260801135327_add_quantity_before_after_to_stock_adjustments.ts') {
      return quantityBeforeAfterMigration;
    }
    if (migration === '20260803_cashbox_accounting_hardening.ts') {
      return cashboxAccountingHardening;
    }
    if (migration === '20260803210000_single_user_auth.ts') {
      return singleUserAuthMigration;
    }
    if (migration === '20260804130000_consignment_settlements.ts') {
      return consignmentSettlementsMigration;
    }
    if (migration === '20260804140000_financial_transactions_hardening.ts') {
      return financialTransactionsHardening;
    }
    if (migration === '20260804170000_purchase_runtime_compatibility.ts') {
      return purchaseRuntimeCompatibility;
    }
    if (migration === '20260804200000_sale_runtime_compatibility.ts') {
      return saleRuntimeCompatibility;
    }
    if (migration === '20260804210000_make_payment_party_optional.ts') {
      return paymentPartyOptionalMigration;
    }
    throw new Error(`Migration ${migration} not found`);
  }
}

class SeedSource {
  async getSeeds() {
    return Promise.resolve(['01_cashboxes.ts', '01_commission_cashbox.ts', '02_users.ts']);
  }
  async getSeed(seed: string) {
    if (seed === '01_cashboxes.ts') return cashboxesSeed;
    if (seed === '01_commission_cashbox.ts') return commissionCashboxSeed;
    if (seed === '02_users.ts') return usersSeed;
    throw new Error(`Seed ${seed} not found`);
  }
}

export function getKnex(): Knex {
  if (!knexInstance) {
    throw new Error('Knex not initialized. Call initKnex() first.');
  }
  return knexInstance;
}

export async function initKnex(): Promise<void> {
  const dbPath = path.join(app.getPath('userData'), 'farmer-market.db');

  knexInstance = knex({
    client: 'sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
    migrations: {
      migrationSource: new MigrationSource(),
      tableName: 'knex_migrations',
    },
    seeds: {
      seedSource: new SeedSource(),
    },
    pool: {
      afterCreate: (conn: any, done: any) => {
        conn.run('PRAGMA foreign_keys = ON', done);
      },
    },
  });

  (global as any).__knex = knexInstance;

  console.log(`📁 Database location: ${dbPath}`);
}

export async function closeKnex(): Promise<void> {
  if (knexInstance) {
    await knexInstance.destroy();
    knexInstance = null;
  }
}