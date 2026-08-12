# Hostinger Deployment Guide & Setup Instructions

This document provides step-by-step instructions for deploying the **Hospital Management System (HMS)** on Hostinger hosting using **Hostinger MySQL Database** for application business data and **Supabase Auth** for identity management.

---

## 🏗️ Architecture Overview

```
                      Domain (Hostinger)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Frontend Application              Backend Node/Express API
  (Vite / Static Web Root)           (Node.js App / Reverse Proxy)
            │                                 │
            ├──────── Supabase Auth ──────────┤ (JWT Verification)
            │      (Authentication Only)      │
            │                                 ▼
            └─────────────────────────► Hostinger MySQL
                                     (Application Data)
                                              │
                                              ▼
                                     Automated Backup Engine
                                 (Daily / Weekly / Monthly)
```

---

## 📋 Prerequisites & Hostinger Environment Setup

1. **Hostinger Hosting Plan**: Business Web Hosting or VPS with Node.js support enabled.
2. **Hostinger MySQL Database**: Created via Hostinger hPanel -> Databases -> MySQL Databases.
3. **Supabase Project**: Active project with Supabase Auth enabled.

---

## ⚙️ Step 1: Environment Variables Configuration

Copy `.env.example` to `.env` on your Hostinger server and populate the real credentials:

```ini
# Hostinger MySQL Database Credentials
DB_DIALECT=mysql
DB_HOST=localhost # Or 127.0.0.1 (provided in Hostinger hPanel)
DB_PORT=3306
DB_NAME=u123456789_hms
DB_USER=u123456789_hmsuser
DB_PASSWORD=YourSecureHostingerDbPassword123!
DB_POOL_MAX=10
DB_POOL_MIN=2

# Supabase Auth Configuration
SUPABASE_URL=https://cboevanmnhphawnmfpjg.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Application Settings
PORT=5000
NODE_ENV=production
BACKUP_STORAGE_PATH=/home/u123456789/backups
BACKUP_RETENTION_DAILY_DAYS=7
BACKUP_RETENTION_WEEKLY_WEEKS=4
BACKUP_RETENTION_MONTHLY_MONTHS=12
```

---

## 🚀 Step 2: Database Initialization

Run the build and initialization scripts on the Hostinger server:

```bash
cd backend
npm install
npm run build
node dist/index.js
```
*The backend automatically initializes Hostinger MySQL tables (`users`, `patients`, `doctors`, `staff`, `admissions`, `appointments`, `invoices`, `backup_logs`, etc.).*

---

## ⏰ Step 3: Exact Hostinger Cron Job Configuration

Hostinger hPanel -> Advanced -> Cron Jobs -> Add New Cron Job.

### 1. Daily Backup Cron Job
- **Schedule**: Every day at 02:00 AM (`0 2 * * *`)
- **Command**:
  ```bash
  /usr/local/bin/node /home/u123456789/domains/yourdomain.com/public_html/backend/dist/scripts/runBackup.js --type=daily >> /home/u123456789/backups/daily_cron.log 2>&1
  ```

### 2. Weekly Backup Cron Job
- **Schedule**: Every Sunday at 03:00 AM (`0 3 * * 0`)
- **Command**:
  ```bash
  /usr/local/bin/node /home/u123456789/domains/yourdomain.com/public_html/backend/dist/scripts/runBackup.js --type=weekly >> /home/u123456789/backups/weekly_cron.log 2>&1
  ```

### 3. Monthly Backup Cron Job
- **Schedule**: 1st day of every month at 03:30 AM (`30 3 1 * *`)
- **Command**:
  ```bash
  /usr/local/bin/node /home/u123456789/domains/yourdomain.com/public_html/backend/dist/scripts/runBackup.js --type=monthly >> /home/u123456789/backups/monthly_cron.log 2>&1
  ```

---

## 🔒 Security Verification Checklist

- [x] Hostinger MySQL credentials stored strictly in server-side `.env`.
- [x] Web root (`public_html`) cannot access backup files (`/home/u123456789/backups`).
- [x] Supabase Service Role key stored ONLY on server.
- [x] CORS restricted to your Hostinger domain.
- [x] All protected endpoints enforce Supabase JWT validation & backend RBAC.
