import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { BackupLog } from '../models';
import sequelize from '../config/db';
import { googleDriveService } from './googleDriveService';

dotenv.config();

export interface BackupOptions {
  type: 'daily' | 'weekly' | 'monthly' | 'manual';
  customFilename?: string;
  offsiteUpload?: boolean;
}

export class BackupService {
  private backupDir: string;

  constructor() {
    // In serverless environments like Vercel, use the writable /tmp directory
    const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (isServerless || !process.env.BACKUP_STORAGE_PATH) {
      this.backupDir = path.join(os.tmpdir(), 'hms_backups');
    } else {
      this.backupDir = path.resolve(process.env.BACKUP_STORAGE_PATH);
    }

    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
    } catch (e) {
      this.backupDir = os.tmpdir();
    }
  }

  /**
   * Generates a timestamped filename based on backup type.
   */
  private generateFilename(type: 'daily' | 'weekly' | 'monthly' | 'manual'): string {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    if (type === 'daily') return `daily_hospital_${YYYY}-${MM}-${DD}_${HH}-${min}.sql.gz`;
    if (type === 'weekly') return `weekly_hospital_${YYYY}-${MM}-${DD}.sql.gz`;
    if (type === 'monthly') return `monthly_hospital_${YYYY}-${MM}.sql.gz`;
    return `manual_hospital_${YYYY}-${MM}-${DD}_${HH}-${min}.sql.gz`;
  }

  /**
   * Calculates SHA-256 checksum of the generated backup archive.
   */
  private calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  /**
   * Generates a pure-JavaScript SQL dump of all MySQL tables and data.
   * Runs natively in serverless (AWS Lambda / Vercel) without external mysqldump CLI.
   */
  private async generatePureSqlDump(): Promise<string> {
    await sequelize.authenticate();
    const [tablesResult]: any = await sequelize.query('SHOW TABLES;');
    const tableKey = Object.keys(tablesResult[0] || {})[0];
    const tableNames: string[] = tablesResult.map((r: any) => r[tableKey]).filter(Boolean);

    let sql = `-- ========================================================\n`;
    sql += `-- Dr. Talha Clinic HMS Pure Database Backup\n`;
    sql += `-- Generated At: ${new Date().toISOString()}\n`;
    sql += `-- Database: ${process.env.DB_NAME || 'u526981273_drtalha_db'}\n`;
    sql += `-- ========================================================\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n`;
    sql += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
    sql += `SET NAMES utf8mb4;\n\n`;

    for (const tableName of tableNames) {
      // 1. Fetch Create Table SQL
      try {
        const [createResult]: any = await sequelize.query(`SHOW CREATE TABLE \`${tableName}\`;`);
        const createTableSql = createResult[0]?.['Create Table'] || createResult[0]?.['Create View'];
        if (createTableSql) {
          sql += `-- --------------------------------------------------------\n`;
          sql += `-- Table structure for table \`${tableName}\`\n`;
          sql += `-- --------------------------------------------------------\n`;
          sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
          sql += `${createTableSql};\n\n`;
        }

        // 2. Fetch Table Rows and format as INSERTs
        const [rows]: any = await sequelize.query(`SELECT * FROM \`${tableName}\`;`);
        if (Array.isArray(rows) && rows.length > 0) {
          sql += `-- Dumping data for table \`${tableName}\` (${rows.length} rows)\n`;
          const columns = Object.keys(rows[0]);
          const colList = columns.map((c) => `\`${c}\``).join(', ');

          // Chunk inserts to prevent oversized statements
          const chunkSize = 50;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const valueRows = chunk.map((row: any) => {
              const vals = columns.map((col) => {
                const val = row[col];
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'number') return String(val);
                if (typeof val === 'boolean') return val ? '1' : '0';
                if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                // Escape strings safely
                const escaped = String(val)
                  .replace(/\\/g, '\\\\')
                  .replace(/'/g, "\\'")
                  .replace(/\n/g, '\\n')
                  .replace(/\r/g, '\\r');
                return `'${escaped}'`;
              });
              return `(${vals.join(', ')})`;
            });

            sql += `INSERT INTO \`${tableName}\` (${colList}) VALUES\n${valueRows.join(',\n')};\n`;
          }
          sql += `\n`;
        }
      } catch (tableErr: any) {
        console.warn(`[Backup Warning] Error exporting table ${tableName}:`, tableErr.message);
      }
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sql += `-- Backup completed successfully --\n`;
    return sql;
  }

  /**
   * Executes a full non-destructive backup of the database, compresses into .sql.gz,
   * and directly syncs to Google Drive if configured.
   */
  public async createBackup(options: BackupOptions): Promise<{
    success: boolean;
    filename: string;
    filePath: string;
    fileSize: number;
    checksum: string | null;
    storageLocation: string;
    gdriveSynced: boolean;
    message: string;
  }> {
    const startedAt = new Date();
    const filename = options.customFilename || this.generateFilename(options.type);
    const filePath = path.join(this.backupDir, filename);

    // 1. Initialize Log Record in Hostinger MySQL
    let logRecord: BackupLog | null = null;
    try {
      logRecord = await BackupLog.create({
        backupType: options.type,
        filename,
        fileSize: 0,
        storageLocation: 'Local Disk',
        startedAt,
        status: 'IN_PROGRESS',
      });
    } catch (dbErr) {
      console.warn('[Backup Log Warning] Could not initialize log record in MySQL:', dbErr);
    }

    try {
      // 2. Generate pure SQL dump natively
      const sqlContent = await this.generatePureSqlDump();

      // 3. Compress using Gzip
      const compressedBuffer = zlib.gzipSync(Buffer.from(sqlContent, 'utf-8'));
      fs.writeFileSync(filePath, compressedBuffer);

      // 4. Verify output file
      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file was not created on disk.');
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        fs.unlinkSync(filePath);
        throw new Error('Backup file size is 0 bytes.');
      }

      const checksum = await this.calculateChecksum(filePath);
      const completedAt = new Date();

      // 5. Upload directly to Google Drive (Off-Site Cloud Sync)
      let storageLocation = 'Local Disk Archive';
      let gdriveSynced = false;

      try {
        const gdriveStatus = googleDriveService.getStatus();
        if (gdriveStatus.isConfigured) {
          console.log(`[Google Drive] Syncing ${filename} to Google Drive cloud folder...`);
          const gdriveResult = await googleDriveService.uploadBackupFile(filePath, filename);
          if (gdriveResult.success) {
            storageLocation = `Local + Google Drive [ID: ${gdriveResult.fileId}]`;
            gdriveSynced = true;
          } else {
            storageLocation = `Local (GDrive Notice: ${gdriveResult.message.slice(0, 50)})`;
          }
        }
      } catch (gdriveErr: any) {
        console.warn('[Google Drive Sync Warning]:', gdriveErr.message);
      }

      // 6. Update Success Status in MySQL Log Record
      if (logRecord) {
        await logRecord.update({
          fileSize: stats.size,
          storageLocation,
          checksum,
          completedAt,
          status: 'SUCCESS',
        });
      }

      return {
        success: true,
        filename,
        filePath,
        fileSize: stats.size,
        checksum,
        storageLocation,
        gdriveSynced,
        message: `Database backup completed successfully (${(stats.size / 1024).toFixed(2)} KB)${
          gdriveSynced ? ' & Synced to Google Drive' : ''
        }.`,
      };
    } catch (error: any) {
      if (logRecord) {
        await logRecord.update({
          status: 'FAILED',
          notes: error.message,
          completedAt: new Date(),
        });
      }

      console.error('[Backup Execution Error]:', error);
      throw error;
    }
  }

  /**
   * Cleans up local disk archives according to the retention policy:
   * - Daily: Kept for 14 days
   * - Weekly: Kept for 60 days
   * - Monthly: Kept for 365 days
   */
  public async cleanupOldBackups(): Promise<number> {
    let deletedCount = 0;
    try {
      if (!fs.existsSync(this.backupDir)) return 0;
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith('.sql.gz')) continue;
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

        if (file.startsWith('daily_') && ageInDays > 14) {
          fs.unlinkSync(filePath);
          deletedCount++;
        } else if (file.startsWith('weekly_') && ageInDays > 60) {
          fs.unlinkSync(filePath);
          deletedCount++;
        } else if (file.startsWith('manual_') && ageInDays > 7) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
      if (deletedCount > 0) {
        console.log(`[Backup Retention Policy] Purged ${deletedCount} expired local backup archives.`);
      }
    } catch (err: any) {
      console.warn('[Backup Cleanup Warning]:', err.message);
    }
    return deletedCount;
  }

  /**
   * Retrieves recent backup logs from MySQL database.
   */
  public async getBackupLogs(limit = 50): Promise<BackupLog[]> {
    return BackupLog.findAll({
      order: [['startedAt', 'DESC']],
      limit,
    });
  }
}

export const backupService = new BackupService();
