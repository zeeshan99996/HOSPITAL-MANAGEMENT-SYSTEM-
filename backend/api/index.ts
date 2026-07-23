import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

  // Health check route (Instant 200 response, no DB required)
  instance.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'HMS Service running healthy on Vercel.' });
  });

  instance.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'HMS API Service running healthy on Vercel.' });
  });

  // Lazy DB & Routes Middleware
  instance.use(async (req, res, next) => {
    if (!isDbInitialized) {
      try {
        console.log('[Vercel Serverless] Initializing DB Connection & Seeding...');
        const sequelize = (await import('../src/config/db')).default;
        const { seedDatabase } = await import('../src/seeders/initialSeed');
        await sequelize.authenticate();
        await sequelize.sync({ force: false });
        await seedDatabase();
        isDbInitialized = true;
        console.log('[Vercel Serverless] DB Sync & Seeding Complete.');
      } catch (err: any) {
        console.error('[Lazy DB Init Error]:', err);
      }
    }
    next();
  });

  // Route Dispatcher
  instance.use(async (req, res, next) => {
    try {
      const apiRouter = (await import('../src/routes/api')).default;
      
      // Normalize URL for Express sub-router matching on Vercel
      if (req.url.startsWith('/api')) {
        req.url = req.url.substring(4) || '/';
      }
      
      apiRouter(req, res, next);
    } catch (err: any) {
      console.error('[Router Import Error]:', err);
      next(err);
    }
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
