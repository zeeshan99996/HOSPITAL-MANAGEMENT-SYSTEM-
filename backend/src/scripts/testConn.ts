import sequelize from '../config/db';
import '../models'; // Import all models
import { seedDatabase } from '../seeders/initialSeed';

async function testConnectionAndSync() {
  try {
    console.log('[Database Test] Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connection to Supabase database successful!');

    console.log('[Database Sync] Creating and syncing all HMS tables...');
    await sequelize.sync({ force: false });
    console.log('✅ All HMS database tables created & synced successfully!');

    console.log('[Database Seed] Seeding initial mock accounts & records...');
    await seedDatabase();
    console.log('🎉 Database fully initialized and seeded!');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database operation failed:', error.message);
    process.exit(1);
  }
}

testConnectionAndSync();
