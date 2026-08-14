import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/db';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for local testing, restrict in prod
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

    // Safe DB column migrations for PostgreSQL / MySQL
    const dialect = sequelize.getDialect();
    if (dialect === 'postgres') {
      try {
        await sequelize.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS "admissionCategory" VARCHAR DEFAULT 'medical';`);
        await sequelize.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS "stayType" VARCHAR DEFAULT 'short';`);
        await sequelize.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS "surgeryDetails" TEXT;`);
        await sequelize.query(`ALTER TABLE admissions ADD COLUMN IF NOT EXISTS "treatmentPlan" TEXT;`);
        await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;`);
        await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "roleId" INTEGER;`);
        await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "supabase_user_id" VARCHAR(255);`);
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
      } catch (mErr) {
        console.warn('[PostgreSQL Migration Warning]:', mErr);
      }
    } else if (dialect === 'mysql') {
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
          } catch (e) {
            // Column already exists or duplicate column error in MySQL
          }
        }
      } catch (mErr) {
        console.warn('[MySQL Migration Warning]:', mErr);
      }
    }

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
