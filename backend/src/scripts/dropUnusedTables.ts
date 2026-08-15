import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback

import sequelize from '../config/db';

async function dropUnusedTables() {
  console.log('Connecting to Hostinger MySQL Database to remove 5 unused tables...');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully.');

    const tablesToDrop = [
      'role_permissions',
      'permissions',
      'roles',
      'nurses',
      'wards'
    ];

    console.log('Disabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    for (const table of tablesToDrop) {
      console.log(`Dropping table if exists: \`${table}\`...`);
      await sequelize.query(`DROP TABLE IF EXISTS \`${table}\`;`);
      console.log(`✅ Table \`${table}\` dropped successfully.`);
    }

    console.log('Re-enabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    // Verify remaining tables
    const [results]: any = await sequelize.query('SHOW TABLES;');
    console.log('\n--- Remaining Tables in Database ---');
    const tableNames = results.map((r: any) => Object.values(r)[0]);
    console.log(tableNames.sort().join('\n'));
    console.log(`\n✅ Operation complete! Total active tables remaining: ${tableNames.length}`);

    await sequelize.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error executing table drop:', error);
    process.exit(1);
  }
}

dropUnusedTables();
