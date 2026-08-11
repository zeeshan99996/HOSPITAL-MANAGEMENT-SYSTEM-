import sequelize from '../config/db';
import { StaffMember } from '../models';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('[Supabase DB] Connected successfully.');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "staff" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "phone" VARCHAR(255) DEFAULT '',
        "cnic" VARCHAR(255) DEFAULT '',
        "address" TEXT DEFAULT '',
        "designation" VARCHAR(255) NOT NULL DEFAULT 'Staff Member',
        "salary" DECIMAL(10, 2) DEFAULT 0.00,
        "status" VARCHAR(50) DEFAULT 'active',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✅ Created "staff" table in Supabase PostgreSQL!');

    await sequelize.query(`ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "staffId" INTEGER;`);
    await sequelize.query(`ALTER TABLE "nurses" ADD COLUMN IF NOT EXISTS "staffId" INTEGER;`);
    console.log('✅ Added "staffId" foreign key column to "doctors" and "nurses" tables.');

    const count = await StaffMember.count();
    console.log(`[Supabase DB] "staff" table total records count: ${count}`);

    process.exit(0);
  } catch (err: any) {
    console.error('❌ DB Script Error:', err);
    process.exit(1);
  }
}

main();
