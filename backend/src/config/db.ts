import { Sequelize } from 'sequelize';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbDialect = (process.env.DB_DIALECT || '').toLowerCase();
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

let sequelize: Sequelize;

if (databaseUrl || dbDialect === 'postgres' || dbDialect === 'supabase') {
  if (databaseUrl) {
    console.log('[Database] Initializing Sequelize with PostgreSQL URL');
    sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  } else {
    const host = process.env.DB_HOST || 'db.cboevanmnhphawnmfpjg.supabase.co';
    const port = parseInt(process.env.DB_PORT || '5432');
    const database = process.env.DB_NAME || 'postgres';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || '';

    console.log(`[Database] Initializing Sequelize with Supabase/PostgreSQL: ${host}:${port}/${database}`);
    sequelize = new Sequelize(database, user, password, {
      host,
      port,
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
} else if (dbDialect === 'mysql') {
  console.log(`[Database] Initializing Sequelize with MySQL: ${process.env.DB_HOST}`);
  sequelize = new Sequelize(
    process.env.DB_NAME || 'hms_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  const dbPath = process.env.VERCEL || process.env.TMPDIR
    ? path.join('/tmp', 'hms.db')
    : path.resolve(__dirname, '../../hms.db');

  console.log(`[Database] Initializing Sequelize with SQLite: ${dbPath}`);
  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: sqlite3,
    storage: dbPath,
    logging: false
  });
}

export default sequelize;
