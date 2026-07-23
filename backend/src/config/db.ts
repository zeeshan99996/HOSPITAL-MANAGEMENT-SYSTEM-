import { Sequelize } from 'sequelize';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isSqlite = process.env.DB_DIALECT === 'sqlite' || !process.env.DB_HOST;

let sequelize: Sequelize;

if (isSqlite) {
  const dbPath = process.env.VERCEL || process.env.TMPDIR
    ? path.join('/tmp', 'hms.db')
    : path.resolve(__dirname, '../../hms.db');

  console.log(`[Database] Initializing Sequelize with SQLite: ${dbPath}`);
  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: sqlite3,
    storage: dbPath,
    logging: false, // Set to console.log for SQL debug
  });
} else {
  console.log(`[Database] Initializing Sequelize with MySQL: ${process.env.DB_HOST}`);
  sequelize = new Sequelize(
    process.env.DB_NAME || 'hms_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );
}

export default sequelize;
