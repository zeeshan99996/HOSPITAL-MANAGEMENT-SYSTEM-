import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import mysql2 from 'mysql2';

dotenv.config();

const dbDialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();
const hasDatabaseUrl = !!(process.env.DATABASE_URL || process.env.SUPABASE_DB_URL);
const hasMysqlConfig = !!(
  process.env.DB_HOST &&
  process.env.DB_HOST !== 'your_hostinger_mysql_host_or_ip' &&
  process.env.DB_HOST.trim() !== ''
);

const globalRef = global as any;

let sequelize: Sequelize;

if (globalRef.sequelizeInstance) {
  sequelize = globalRef.sequelizeInstance;
} else {
  if (hasDatabaseUrl) {
    const pg = require('pg');
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
  } else if (hasMysqlConfig || dbDialect === 'mysql') {
    const host = (process.env.DB_HOST || '195.35.59.4').trim();
    const port = parseInt(process.env.DB_PORT || '3306');
    const database = (process.env.DB_NAME || 'u526981273_drtalha_db').trim();
    const user = (process.env.DB_USER || 'u526981273_drtalha_db').trim();
    const password = process.env.DB_PASSWORD || 'Pak@pass.3499';

    const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const maxPool = isServerless ? parseInt(process.env.DB_POOL_MAX || '2') : parseInt(process.env.DB_POOL_MAX || '5');
    const idleTimeout = isServerless ? 5000 : 10000;

    console.log(`[Hostinger MySQL] Initializing Sequelize Pool (Serverless: ${isServerless}, PoolMax: ${maxPool}) with Hostinger MySQL Database: ${user}@${host}:${port}/${database}`);
    sequelize = new Sequelize(database, user, password, {
      host,
      port,
      dialect: 'mysql',
      dialectModule: mysql2,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      timezone: '+05:00',
      pool: {
        max: maxPool,
        min: 0,
        acquire: 30000,
        idle: idleTimeout,
        evict: 5000,
      },
      dialectOptions: {
        connectTimeout: 20000,
        decimalNumbers: true
      },
      define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        timestamps: true,
        underscored: false,
      },
    });
  } else {
    const sqlite3 = require('sqlite3');
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
  globalRef.sequelizeInstance = sequelize;
}

export default sequelize;
