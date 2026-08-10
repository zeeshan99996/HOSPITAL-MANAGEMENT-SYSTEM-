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
        const sequelize = (await import('../backend/src/config/db')).default;
        const { seedDatabase } = await import('../backend/src/seeders/initialSeed');
        await sequelize.authenticate();
        await sequelize.sync({ force: false });

        const colsToAlter = ['dob', 'age', 'tokenNumber', 'paymentAmount', 'area', 'guardianName', 'cnic', 'paymentMethod', 'email', 'phone', 'address', 'bloodGroup', 'allergies', 'insuranceProvider', 'insurancePolicyNum', 'emergencyContactName', 'emergencyContactPhone'];
        for (const col of colsToAlter) {
          try {
            await sequelize.query(`ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "${col}" VARCHAR(255);`);
          } catch (e) {}
          try {
            await sequelize.query(`ALTER TABLE "patients" ALTER COLUMN "${col}" DROP NOT NULL;`);
          } catch (e) {}
        }

        await seedDatabase();
        isDbInitialized = true;
        console.log('[Vercel Serverless] DB Sync & Seeding Complete.');
      } catch (err: any) {
        console.error('[Lazy DB Init Error]:', err);
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
