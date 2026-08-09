import { initKnex, getKnex, closeKnex } from './knex';

let isInitialized = false;

export async function initDatabase(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    await initKnex();
    
    // تشغيل الترحيلات (migrations)
    await runMigrations();
    
    // تشغيل البيانات الافتراضية (seeds)
    await runSeeds();
    
    isInitialized = true;
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

export function getDatabase() {
  return getKnex();
}

export async function closeDatabase(): Promise<void> {
  await closeKnex();
  isInitialized = false;
}

async function runMigrations(): Promise<void> {
  const knex = getKnex();
  try {
    await knex.migrate.latest();
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

async function runSeeds(): Promise<void> {
  const knex = getKnex();
  try {
    // التحقق مما إذا كانت البيانات موجودة بالفعل في جدول المستخدمين
    const usersCount = await knex('users').count('id as count').first();
    
    if (usersCount && (usersCount as any).count === 0) {
      await knex.seed.run();
      console.log('✅ Seeds completed');
    } else {
      console.log('ℹ️ Seeds already exist, skipping...');
    }
  } catch (error) {
    console.error('❌ Seed error:', error);
   
  }
}