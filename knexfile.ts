// knexfile.ts
import path from 'path';  
import { app } from 'electron'; 
import type { Knex } from 'knex';
const dbPath = path.join(app.getPath('userData'), 'farmer-market.db'); 

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: dbPath  
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations',
      extension: 'ts' // Tells Knex to look for .ts migration files
    },
    pool: {
      afterCreate: (conn: any, cb: any) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  }
};

export default config;
