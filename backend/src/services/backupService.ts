import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { BackupLog } from '../models';
import sequelize from '../config/db';

dotenv.config();

export interface BackupOptions {
  type: 'daily' | 'weekly' | 'monthly' | 'manual';
  customFilename?: string;
  offsiteUpload?: boolean;
}

export interface OffsiteStorageAdapter {
  name: string;
  uploadFile(filePath: string, filename: string): Promise<string>;
}

// Default pluggable Off-Site Storage Adapter (Google Drive / S3 placeholder structure)
class DefaultOffsiteAdapter implements OffsiteStorageAdapter {
  name = process.env.OFFSITE_STORAGE_TYPE || 'local_storage';

  async uploadFile(filePath: string, filename: string): Promise<string> {
    const provider = process.env.OFFSITE_STORAGE_TYPE || 'none';
    if (provider === 'none' || !process.env.OFFSITE_STORAGE_ENABLED) {
      return 'local_only';
    }

    console.log(`[Offsite Backup Adapter] Uploading ${filename} to ${provider}...`);
    // Structural extension point for Google Drive, OneDrive, or AWS S3 SDK
    return `offsite://${provider}/${filename}`;
  }
}

export class BackupService {
  private backupDir: string;

  constructor() {
    this.backupDir = process.env.BACKUP_STORAGE_PATH
      ? path.resolve(process.env.BACKUP_STORAGE_PATH)
      : path.resolve(__dirname, '../../storage/backups');

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
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
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', err => reject(err));
    });
  }

  /**
   * Executes a full non-destructive mysqldump backup of the Hostinger MySQL database.
   */
  public async createBackup(options: BackupOptions): Promise<{
    success: boolean;
    filename: string;
    filePath: string;
    fileSize: number;
    checksum: string | null;
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
        storageLocation: 'local',
        startedAt,
        status: 'IN_PROGRESS',
      });
    } catch (dbErr) {
      console.warn('[Backup Log Warning] Could not initialize log record in MySQL:', dbErr);
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '3306';
    const dbName = process.env.DB_NAME || 'hms_db';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';

    // 2. Build mysqldump command
    const passFlag = password ? `-p"${password.replace(/"/g, '\\"')}"` : '';
    const dumpCmd = `mysqldump --host="${host}" --port=${port} --user="${user}" ${passFlag} --single-transaction --quick --routines --triggers "${dbName}" | gzip > "${filePath}"`;

    try {
      await new Promise<void>((resolve, reject) => {
        exec(dumpCmd, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
          if (error) {
            return reject(new Error(`mysqldump execution failed: ${error.message}. Stderr: ${stderr}`));
          }
          return resolve();
        });
      });

      // 3. Post-Backup Verification Steps
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

      // 4. Handle Off-Site Upload (Pluggable Adapter)
      let storageLocation = 'local';
      try {
        const adapter = new DefaultOffsiteAdapter();
        storageLocation = await adapter.uploadFile(filePath, filename);
      } catch (offsiteErr) {
        console.warn('[Offsite Upload Warning]:', offsiteErr);
      }

      // 5. Update Success Status in MySQL Log Record
      if (logRecord) {
        await logRecord.update({
          fileSize: stats.size,
          storageLocation,
          completedAt,
          status: 'SUCCESS',
          checksum,
        });
      }

      // 6. Run Retention Cleanup
      await this.enforceRetentionPolicies();

      return {
        success: true,
        filename,
        filePath,
        fileSize: stats.size,
        checksum,
        message: `Backup '${filename}' created and verified successfully (${(stats.size / 1024 / 1024).toFixed(2)} MB).`,
      };
    } catch (err: any) {
      console.error('[Backup Engine Error]:', err.message);

      if (logRecord) {
        try {
          await logRecord.update({
            completedAt: new Date(),
            status: 'FAILED',
            errorMessage: err.message,
          });
        } catch (lErr) {}
      }

      return {
        success: false,
        filename,
        filePath,
        fileSize: 0,
        checksum: null,
        message: `Backup failed: ${err.message}`,
      };
    }
  }

  /**
   * Enforces retention policy by removing OLD BACKUP FILES ONLY.
   * Live database tables are NEVER altered or deleted.
   */
  public async enforceRetentionPolicies(): Promise<{ deletedFiles: string[] }> {
    const deletedFiles: string[] = [];
    const dailyRetentionDays = parseInt(process.env.BACKUP_RETENTION_DAILY_DAYS || '7');
    const weeklyRetentionWeeks = parseInt(process.env.BACKUP_RETENTION_WEEKLY_WEEKS || '4');
    const monthlyRetentionMonths = parseInt(process.env.BACKUP_RETENTION_MONTHLY_MONTHS || '12');

    const now = Date.now();
    const dailyMaxAgeMs = dailyRetentionDays * 24 * 60 * 60 * 1000;
    const weeklyMaxAgeMs = weeklyRetentionWeeks * 7 * 24 * 60 * 60 * 1000;
    const monthlyMaxAgeMs = monthlyRetentionMonths * 30 * 24 * 60 * 60 * 1000;

    try {
      const files = fs.readdirSync(this.backupDir);
      for (const file of files) {
        if (!file.endsWith('.sql.gz')) continue;

        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        const fileAgeMs = now - stats.mtimeMs;

        let shouldDelete = false;
        if (file.startsWith('daily_') && fileAgeMs > dailyMaxAgeMs) shouldDelete = true;
        if (file.startsWith('weekly_') && fileAgeMs > weeklyMaxAgeMs) shouldDelete = true;
        if (file.startsWith('monthly_') && fileAgeMs > monthlyMaxAgeMs) shouldDelete = true;

        if (shouldDelete) {
          fs.unlinkSync(filePath);
          deletedFiles.push(file);
          console.log(`[Retention Cleanup] Deleted expired backup file: ${file}`);
        }
      }
    } catch (rErr) {
      console.warn('[Retention Cleanup Warning]:', rErr);
    }

    return { deletedFiles };
  }

  /**
   * Retrieves historical backup log records from Hostinger MySQL.
   */
  public async getBackupLogs(limit = 50): Promise<BackupLog[]> {
    try {
      return await BackupLog.findAll({
        order: [['createdAt', 'DESC']],
        limit,
      });
    } catch (err) {
      return [];
    }
  }
}

export const backupService = new BackupService();
export default backupService;
