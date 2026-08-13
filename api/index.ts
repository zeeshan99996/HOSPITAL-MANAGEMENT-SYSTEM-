import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from '../backend/src/routes/api';
import sequelize from '../backend/src/config/db';
import '../backend/src/models';
import { seedDatabase } from '../backend/src/seeders/initialSeed';

dotenv.config();

let app: express.Application | null = null;
let isDbInitialized = false;

function getApp(): express.Application {
  if (app) return app;

  const instance = express();

  // Enable CORS
  instance.use(cors({
    origin: '*',
    credentials: true
  }));

  // Security Headers
  instance.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Body parsers
  instance.use(express.json());
  instance.use(express.urlencoded({ extended: true }));

  // Health check route
  instance.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'HMS Service running healthy on Vercel.' });
  });

  instance.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'HMS API Service running healthy on Vercel.' });
  });

  const handleDbHealth = async (req: any, res: any) => {
    try {
      await sequelize.authenticate();
      const dialect = sequelize.getDialect();
      let showTablesQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema='public';";
      if (dialect === 'mysql') {
        showTablesQuery = 'SHOW TABLES;';
      } else if (dialect === 'sqlite') {
        showTablesQuery = "SELECT name FROM sqlite_master WHERE type='table';";
      }
      const [tables]: any = await sequelize.query(showTablesQuery);
      return res.status(200).json({
        status: 'CONNECTED',
        dialect,
        host: dialect === 'sqlite' ? 'local' : (process.env.DB_HOST || '195.35.59.4'),
        database: dialect === 'sqlite' ? 'local_sqlite' : (process.env.DB_NAME || 'u526981273_drtalha_db'),
        user: dialect === 'sqlite' ? 'local' : (process.env.DB_USER || 'u526981273_drtalha_db'),
        tableCount: tables ? tables.length : 0,
        message: `Successfully connected to ${dialect.toUpperCase()} Database!`
      });
    } catch (err: any) {
      return res.status(200).json({
        status: 'DISCONNECTED',
        host: process.env.DB_HOST || '195.35.59.4',
        database: process.env.DB_NAME || 'u526981273_drtalha_db',
        user: process.env.DB_USER || 'u526981273_drtalha_db',
        error: err.message,
        message: 'Failed to connect to Database. Please verify DB_USER and DB_PASSWORD.'
      });
    }
  };

  instance.get('/health/db', handleDbHealth);
  instance.get('/api/health/db', handleDbHealth);

  // Lazy DB & Seeding Middleware
  instance.use(async (req, res, next) => {
    if (!isDbInitialized) {
      try {
        console.log('[Vercel Serverless] Initializing DB Connection & Seeding...');
        await sequelize.authenticate();
        await sequelize.sync({ force: false });

        if (sequelize.getDialect() === 'postgres') {
          // Run PostgreSQL-specific migrations safely
          const patientCols = ['dob', 'age', 'tokenNumber', 'paymentAmount', 'area', 'guardianName', 'cnic', 'paymentMethod', 'email', 'phone', 'address', 'bloodGroup', 'allergies', 'insuranceProvider', 'insurancePolicyNum', 'emergencyContactName', 'emergencyContactPhone'];
          for (const col of patientCols) {
            try {
              await sequelize.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "${col}" VARCHAR(255);`);
            } catch (e) {}
          }

          const userCols = [
            { name: 'deletedAt', type: 'TIMESTAMP WITH TIME ZONE' },
            { name: 'phone', type: 'VARCHAR(255)' },
            { name: 'status', type: 'VARCHAR(255) DEFAULT \'active\'' },
            { name: 'roleId', type: 'INTEGER' },
            { name: 'supabase_user_id', type: 'VARCHAR(255)' },
          ];
          for (const col of userCols) {
            try {
              await sequelize.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`);
            } catch (e) {}
          }

          try {
            await sequelize.query(`
              CREATE TABLE IF NOT EXISTS "system_users" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR(255) NOT NULL,
                "email" VARCHAR(255) NOT NULL UNIQUE,
                "password" VARCHAR(255) NOT NULL,
                "phone" VARCHAR(50) DEFAULT '',
                "role" VARCHAR(50) NOT NULL DEFAULT 'admin',
                "status" VARCHAR(50) NOT NULL DEFAULT 'active',
                "supabase_user_id" VARCHAR(255),
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "deletedAt" TIMESTAMP WITH TIME ZONE
              );
            `);
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
            await sequelize.query(`ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "staffId" INTEGER;`);
            await sequelize.query(`ALTER TABLE "nurses" ADD COLUMN IF NOT EXISTS "staffId" INTEGER;`);

            const extraUserCols = ['cnic', 'address', 'designation', 'salary', 'isStaffMember'];
            for (const col of extraUserCols) {
              try {
                await sequelize.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "${col}";`);
              } catch (e) {}
            }
          } catch (e) {
            console.warn('[Staff Migration Warning]:', e);
          }
        } else if (sequelize.getDialect() === 'mysql') {
          try {
            const mysqlCols = [
              { table: 'admissions', col: 'admissionCategory', type: 'VARCHAR(255) DEFAULT \'medical\'' },
              { table: 'admissions', col: 'stayType', type: 'VARCHAR(255) DEFAULT \'short\'' },
              { table: 'admissions', col: 'surgeryDetails', type: 'TEXT' },
              { table: 'admissions', col: 'treatmentPlan', type: 'TEXT' },
              { table: 'users', col: 'deletedAt', type: 'DATETIME' },
              { table: 'users', col: 'roleId', type: 'INT' },
              { table: 'users', col: 'supabase_user_id', type: 'VARCHAR(255)' },
              { table: 'doctors', col: 'staffId', type: 'INT' },
              { table: 'nurses', col: 'staffId', type: 'INT' }
            ];

            for (const item of mysqlCols) {
              try {
                await sequelize.query(`ALTER TABLE \`${item.table}\` ADD COLUMN \`${item.col}\` ${item.type};`);
              } catch (e) {}
            }
          } catch (mErr) {
            console.warn('[MySQL Serverless Migration Warning]:', mErr);
          }
        }

        await seedDatabase();
        isDbInitialized = true;
        console.log('[Serverless DB Init] Complete.');
      } catch (err: any) {
        console.error('[Serverless DB Init Error]:', err.message);
        // Do not crash serverless request
      }
    }
    next();
  });

  // Mount API Router on both /api and root
  instance.use('/api', apiRouter);
  instance.use('/', apiRouter);

  // API 404 Fallback - Ensures API routes never render frontend HTML
  instance.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
      status: 'NOT_FOUND',
      path: req.originalUrl || req.url,
      message: 'The requested API endpoint does not exist.'
    });
  });

  // Global Error Handler
  instance.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Global Vercel Express Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : undefined
      });
    }
  });

  app = instance;
  return app;
}

export default async function handler(req: any, res: any) {
  try {
    const expressApp = getApp();
    return expressApp(req, res);
  } catch (err: any) {
    console.error('[Vercel Handler Critical Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Critical Serverless Handler Error', details: err.message });
    }
  }
}
