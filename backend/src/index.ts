import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/db';
import apiRouter from './routes/api';
import { seedDatabase } from './seeders/initialSeed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for local testing, restrict in prod
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard logger middleware
app.use((req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.originalUrl}`);
  next();
});

// Mounting Router
app.use('/api', apiRouter);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'HMS Service is running healthy.' });
});

// Database Synchronization & Server Startup
const startServer = async () => {
  try {
    // Authenticate connection
    await sequelize.authenticate();
    console.log('[Database] Connection has been established successfully.');

    // Sync database models (force: false preserves data if tables exist)
    await sequelize.sync({ force: false });
    console.log('[Database] Models synchronized with the database.');

    // Seed mock data if empty
    await seedDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`[Server] HMS backend running at: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
};

startServer();
