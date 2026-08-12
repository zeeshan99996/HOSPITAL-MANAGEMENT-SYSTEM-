import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Hostinger Database Restore Utility
 * Usage: npx ts-node src/scripts/restoreDatabase.ts --file=storage/backups/daily_hospital_2026-08-12_02-00.sql.gz [--target-db=test_hms_db]
 */
async function restoreDatabase() {
  const args = process.argv.slice(2);
  let backupFileArg = '';
  let targetDb = process.env.DB_NAME || 'hms_db';
  let confirmProduction = false;

  for (const arg of args) {
    if (arg.startsWith('--file=')) {
      backupFileArg = arg.split('=')[1];
    }
    if (arg.startsWith('--target-db=')) {
      targetDb = arg.split('=')[1];
    }
    if (arg === '--confirm-prod') {
      confirmProduction = true;
    }
  }

  if (!backupFileArg) {
    console.error('❌ Error: Backup file path required. Usage: npx ts-node src/scripts/restoreDatabase.ts --file=<path_to_sql_gz>');
    process.exit(1);
  }

  const filePath = path.resolve(backupFileArg);
  console.log(`========================================`);
  console.log(`[Hostinger DB Restore Utility] Pre-flight Verification`);
  console.log(`========================================`);
  console.log(`Target File: ${filePath}`);
  console.log(`Target Database: ${targetDb}`);

  // 1. Verify File Existence
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Restore Aborted: Backup file '${filePath}' does not exist.`);
    process.exit(1);
  }

  // 2. Verify Non-Zero File Size
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    console.error(`❌ Restore Aborted: Backup file '${filePath}' is 0 bytes.`);
    process.exit(1);
  }

  console.log(`✅ Pre-flight Check Passed: File exists (${(stats.size / 1024 / 1024).toFixed(2)} MB).`);

  // 3. Prevent Unintentional Production Overwrites
  if (targetDb === process.env.DB_NAME && !confirmProduction) {
    console.warn(`\n⚠️  WARNING: You are attempting to restore directly into the LIVE production database '${targetDb}'.`);
    console.warn(`It is recommended to test restoring into a temporary database first:`);
    console.warn(`   npx ts-node src/scripts/restoreDatabase.ts --file=${backupFileArg} --target-db=test_${targetDb}\n`);
    console.warn(`To force restoring directly into live production, append: --confirm-prod`);
    process.exit(1);
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';

  const passFlag = password ? `-p"${password.replace(/"/g, '\\"')}"` : '';
  const restoreCmd = `gunzip -c "${filePath}" | mysql --host="${host}" --port=${port} --user="${user}" ${passFlag} "${targetDb}"`;

  console.log(`Starting Database Restoration process...`);
  exec(restoreCmd, { maxBuffer: 1024 * 1024 * 500 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Restore Failed: ${error.message}`);
      console.error(`Stderr output: ${stderr}`);
      process.exit(1);
    }
    console.log(`✅ [RESTORE SUCCESSFUL]: Database '${targetDb}' restored successfully from '${path.basename(filePath)}'.`);
    process.exit(0);
  });
}

restoreDatabase();
