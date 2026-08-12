import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from '../backend/src/routes/api';

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

  // Lazy DB & Seeding Middleware
  instance.use(async (req, res, next) => {
    if (!isDbInitialized) {
      try {
        console.log('[Vercel Serverless] Initializing DB Connection & Seeding...');
        await import('../backend/src/models');
        const sequelize = (await import('../backend/src/config/db')).default;
        const { seedDatabase } = await import('../backend/src/seeders/initialSeed');
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
