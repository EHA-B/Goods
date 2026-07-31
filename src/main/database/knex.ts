import knex, { Knex } from 'knex';
import path from 'path';
import { app } from 'electron';

// Import migrations and seeds statically so Vite bundles them
import * as initialSchema from './migrations/20250101000000_initial_schema';
import * as consignmentMigration from './migrations/20260728141424_consignment_support';
import * as productCodeMigration from './migrations/20260731190000_add_product_code';
import * as optionalProductCodeMigration from './migrations/20260731210000_make_product_code_optional';
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

  console.log(`📁 Database location: ${dbPath}`);
}

export async function closeKnex(): Promise<void> {
  if (knexInstance) {
    await knexInstance.destroy();
    knexInstance = null;
  }
}