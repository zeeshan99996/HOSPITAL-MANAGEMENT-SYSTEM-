import dotenv from 'dotenv';
import { backupService } from '../services/backupService';
import sequelize from '../config/db';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  let backupType: 'daily' | 'weekly' | 'monthly' | 'manual' = 'daily';

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      const val = arg.split('=')[1].toLowerCase();
      if (['daily', 'weekly', 'monthly', 'manual'].includes(val)) {
        backupType = val as any;
      }
    }
  }

  console.log(`========================================`);
  console.log(`[Hostinger Backup Runner] Starting ${backupType.toUpperCase()} database backup...`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`========================================`);

  try {
    await sequelize.authenticate();
    console.log('[DB Status] Hostinger MySQL connection verified.');

    const result = await backupService.createBackup({ type: backupType });

    if (result.success) {
      console.log(`✅ [BACKUP SUCCESS]: ${result.message}`);
      console.log(`Filename: ${result.filename}`);
      console.log(`File Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`SHA-256 Checksum: ${result.checksum}`);
      process.exit(0);
    } else {
      console.error(`❌ [BACKUP ERROR]: ${result.message}`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ [FATAL BACKUP RUNNER EXCEPTION]:', err.message);
    process.exit(1);
  }
}

main();
