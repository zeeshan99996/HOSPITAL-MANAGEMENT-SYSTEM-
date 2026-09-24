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
  const host = (process.env.DB_HOST || '46.17.175.230').trim();
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
  globalRef.sequelizeInstance = sequelize;
}

export default sequelize;
