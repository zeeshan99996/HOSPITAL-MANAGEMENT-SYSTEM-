import mysql2 from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load both backend/.env and root/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testConnection() {
  const host = (process.env.DB_HOST || '195.35.59.4').trim();
  const port = parseInt(process.env.DB_PORT || '3306');
  const database = (process.env.DB_NAME || 'u526981273_drtalha_db').trim();
  const user = (process.env.DB_USER || 'u526981273_drtalha_db').trim();
  const password = process.env.DB_PASSWORD || '';

  console.log(`[Hostinger MySQL Tester] Attempting connection to:`);
  console.log(`   Host:     ${host}`);
  console.log(`   Port:     ${port}`);
  console.log(`   User:     ${user}`);
  console.log(`   Database: ${database}`);
  console.log(`   Password: ${password ? '******** (' + password.length + ' chars)' : 'MISSING'}`);
  console.log(`--------------------------------------------------`);

  try {
    const connection = await mysql2.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000
    });

    console.log('✅ [SUCCESS] Hostinger MySQL connection established successfully!');
    const [rows] = await connection.execute('SHOW TABLES;');
    console.log(`📊 Found ${(rows as any[]).length} tables in database '${database}':`);
    console.log((rows as any[]).map(r => Object.values(r)[0]));
    await connection.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ [CONNECTION FAILED] Error details:');
    console.error('Code:   ', err.code);
    console.error('Message:', err.message);
    process.exit(1);
  }
}

testConnection();
