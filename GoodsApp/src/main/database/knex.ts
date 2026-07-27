import knex, { Knex } from 'knex';
import path from 'path';
import { app } from 'electron';

// Import migrations and seeds statically so Vite bundles them
import * as initialSchema from './migrations/20250101000000_initial_schema';
import * as cashboxesSeed from './seeds/01_cashboxes';
import * as usersSeed from './seeds/02_users';

let knexInstance: Knex | null = null;

class MigrationSource {
  async getMigrations() {
    return Promise.resolve(['20250101000000_initial_schema.ts']);
  }
  getMigrationName(migration: string) {
    return migration;
  }
  async getMigration(migration: string) {
    if (migration === '20250101000000_initial_schema.ts') {
      return initialSchema;
    }
    throw new Error(`Migration ${migration} not found`);
  }
}

class SeedSource {
  async getSeeds() {
    return Promise.resolve(['01_cashboxes.ts', '02_users.ts']);
  }
  async getSeed(seed: string) {
    if (seed === '01_cashboxes.ts') return cashboxesSeed;
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