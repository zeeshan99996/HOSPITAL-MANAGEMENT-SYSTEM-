import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from '../src/config/db';
import apiRouter from '../src/routes/api';
import { seedDatabase } from '../src/seeders/initialSeed';

dotenv.config();

const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

// HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src *;");
  next();
});

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serverless DB Init Middleware
let isDbInitialized = false;
app.use(async (req, res, next) => {
  if (!isDbInitialized) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: false });
      await seedDatabase();
      isDbInitialized = true;
    } catch (err) {
      console.error('[Database Init Error]:', err);
    }
  }
  next();
});

// Logger
app.use((req, res, next) => {
  console.log(`[Vercel API Request] ${req.method} ${req.originalUrl}`);
  next();
});

// Mount Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'HMS Service running healthy on Vercel.' });
});

export default app;
