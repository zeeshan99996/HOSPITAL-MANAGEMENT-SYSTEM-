import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Safely load compiled backend modules
let apiRouter: any;
let sequelize: any;

try {
  const routesMod = require('../backend/dist/routes/api');
  apiRouter = routesMod.default || routesMod;
  const dbMod = require('../backend/dist/config/db');
  sequelize = dbMod.default || dbMod;
  require('../backend/dist/models');
} catch (distErr) {
  try {
    const routesMod = require('../backend/src/routes/api');
    apiRouter = routesMod.default || routesMod;
    const dbMod = require('../backend/src/config/db');
    sequelize = dbMod.default || dbMod;
    require('../backend/src/models');
  } catch (srcErr) {
    console.error('[API Module Loading Error]:', distErr, srcErr);
  }
}

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
      if (!sequelize) {
        throw new Error('Database module could not be loaded.');
      }
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

  // Lazy DB Middleware & Passive Automated Backup Strategy Evaluator
  let lastPassiveBackupCheck = 0;
  instance.use(async (req, res, next) => {
    if (!isDbInitialized && sequelize) {
      try {
        console.log('[Vercel Serverless] Initializing DB Connection...');
        await sequelize.authenticate();
        await sequelize.sync({ force: false });
        isDbInitialized = true;
        console.log('[Serverless DB Init] Complete.');
      } catch (err: any) {
        console.error('[Serverless DB Init Error]:', err.message);
      }
    }

    // Passive Background Automated Backup Strategy Evaluation (once per hour in serverless)
    const now = Date.now();
    if (isDbInitialized && now - lastPassiveBackupCheck > 60 * 60 * 1000) {
      lastPassiveBackupCheck = now;
      setTimeout(async () => {
        try {
          let schedulerMod: any;
          try {
            schedulerMod = require('../backend/dist/services/backupScheduler');
          } catch (e) {
            schedulerMod = require('../backend/src/services/backupScheduler');
          }
          const backupScheduler = schedulerMod.backupScheduler || schedulerMod.default || schedulerMod;
          if (backupScheduler && typeof backupScheduler.evaluateAndRunStrategy === 'function') {
            await backupScheduler.evaluateAndRunStrategy();
          }
        } catch (schedErr: any) {
          console.warn('[Passive Serverless Backup Notice]:', schedErr.message);
        }
      }, 2000);
    }

    next();
  });

  // Mount API Router on both /api and root
  if (apiRouter) {
    instance.use('/api', apiRouter);
    instance.use('/', apiRouter);
  }

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
