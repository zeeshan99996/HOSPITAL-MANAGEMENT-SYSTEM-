import { Sequelize } from 'sequelize';
import sqlite3 from 'sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbDialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();

let sequelize: Sequelize;

if (dbDialect === 'mysql' || (process.env.DB_HOST && !process.env.DATABASE_URL && dbDialect !== 'postgres')) {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306');
  const database = process.env.DB_NAME || 'hms_db';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  console.log(`[Hostinger MySQL] Initializing Sequelize Pool with Hostinger MySQL Database: ${user}@${host}:${port}/${database}`);
  sequelize = new Sequelize(database, user, password, {
    host,
    port,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+05:00',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      min: parseInt(process.env.DB_POOL_MIN || '0'),
      acquire: 30000,
      idle: 10000,
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false,
    },
  });
} else if (process.env.DATABASE_URL || dbDialect === 'postgres' || dbDialect === 'supabase') {
  const DEFAULT_SUPABASE_URL = 'postgresql://postgres.cboevanmnhphawnmfpjg:Pak%40pass.3499@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || DEFAULT_SUPABASE_URL;

  console.log('[Database] Initializing Sequelize with PostgreSQL URL');
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    dialectModule: pg,
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
