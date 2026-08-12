# Automated MySQL Database Backup Engine & Restoration Guide

This document specifies the design, operation, retention policies, and restoration procedures for the Hostinger MySQL Automated Backup Engine.

---

## 🛑 Data Integrity Rule (Non-Destructive Guarantee)

> **CRITICAL RULE**: Taking a backup **NEVER** deletes, clears, truncates, or modifies live database tables. Live MySQL continues to operate normally. A backup creates a separate compressed `.sql.gz` snapshot copy on disk.

```
MySQL Live Database
        │
        ├── Continues Operating Normally (January, February, March, April, May...)
        │
        └── Creates Archive Snapshot Copy
                 ↓
          .sql.gz Backup File
```

---

## 📅 Backup Types & Naming Conventions

| Backup Type | Naming Format | Retention Period |
| :--- | :--- | :--- |
| **Daily Backup** | `daily_hospital_YYYY-MM-DD_HH-MM.sql.gz` | **7 Days** |
| **Weekly Backup** | `weekly_hospital_YYYY-MM-DD.sql.gz` | **4 Weeks** |
| **Monthly Archive** | `monthly_hospital_YYYY-MM.sql.gz` | **12 Months** |
| **Manual Snapshot** | `manual_hospital_YYYY-MM-DD_HH-MM.sql.gz` | Preserved |

---

## 🛡️ Verification & Audit Logging

Every automated or manual backup execution performs four validation steps:
1. **mysqldump Exit Code Verification**: Asserts code `0`.
2. **File Existence Check**: Asserts file is written to storage path.
3. **Non-Zero File Size**: Asserts file size > 0 bytes.
4. **SHA-256 Checksum Calculation**: Calculates hash and inserts record into `backup_logs` table in Hostinger MySQL.

### Database Audit Schema (`backup_logs`)
- `id`: Unique log identifier
- `backupType`: `daily` | `weekly` | `monthly` | `manual`
- `filename`: Backup archive filename
- `fileSize`: Size in bytes
- `storageLocation`: `local` | `offsite://<provider>/<filename>`
- `startedAt` / `completedAt`: Timestamps
- `status`: `IN_PROGRESS` | `SUCCESS` | `FAILED`
- `errorMessage`: Diagnostic error trace if failed
- `checksum`: SHA-256 hash string

---

## ☁️ Off-Site Backup Architecture (Pluggable Adapters)

Backups are saved locally in `/home/<user>/backups` (outside `public_html`). The backup engine includes a modular adapter structure (`OffsiteStorageAdapter`) in `backend/src/services/backupService.ts`:
- **Google Drive Adapter**
- **Amazon S3 / Compatible Object Storage Adapter**
- **OneDrive Adapter**

---

## 🔄 Restoration Walkthrough & CLI Utility

Before restoring into production, always perform pre-flight verification or test restoring into a temporary staging database (`test_hms_db`).

### 1. Pre-Flight Test Restoration Command
```bash
cd backend
npx ts-node src/scripts/restoreDatabase.ts --file=storage/backups/daily_hospital_2026-08-12_02-00.sql.gz --target-db=test_hms_db
```

### 2. Manual CLI Restore Command
```bash
gunzip -c storage/backups/daily_hospital_2026-08-12_02-00.sql.gz | mysql -u DB_USER -p DB_NAME
```

### 3. Production Restoration Command (Requires `--confirm-prod`)
```bash
node dist/scripts/restoreDatabase.js --file=/home/u123456789/backups/daily_hospital_2026-08-12_02-00.sql.gz --confirm-prod
```
