import { Sequelize } from 'sequelize';
import sqlite3 from 'sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

import mysql2 from 'mysql2';

dotenv.config();

const dbDialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();

let sequelize: Sequelize;

if (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL) {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
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
} else if (dbDialect === 'mysql' || process.env.DB_HOST) {
  const host = process.env.DB_HOST || '195.35.59.4';
  const port = parseInt(process.env.DB_PORT || '3306');
  const database = process.env.DB_NAME || 'u526981273_BfYkc';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  console.log(`[Hostinger MySQL] Initializing Sequelize Pool with Hostinger MySQL Database: ${user}@${host}:${port}/${database}`);
  sequelize = new Sequelize(database, user, password, {
    host,
    port,
    dialect: 'mysql',
    dialectModule: mysql2,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    timezone: '+05:00',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      min: parseInt(process.env.DB_POOL_MIN || '0'),
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      connectTimeout: 20000
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: false,
    },
  });
} else {
  const isServerless = !!(process.env.VERCEL || process.env.TMPDIR);
  const dbPath = isServerless
    ? path.join('/tmp', 'hms.db')
    : path.resolve(__dirname, '../../hms.db');

  if (isServerless) {
    console.warn('[INFRASTRUCTURE WARNING] Serverless environment detected without persistent DATABASE_URL / SUPABASE_DB_URL. Defaulting to ephemeral /tmp/hms.db.');
  }

  console.log(`[Database] Initializing Local SQLite Database: ${dbPath}`);
  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: sqlite3,
    storage: dbPath,
    logging: false
  });
}

export default sequelize;
