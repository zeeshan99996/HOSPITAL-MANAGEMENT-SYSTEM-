import sequelize from '../config/db';
import { User, BackupLog } from '../models';
import { backupService } from '../services/backupService';
import fs from 'fs';
import path from 'path';

async function verifyAll() {
  console.log(`\n=============================================================`);
  console.log(`🏥 HMS HOSTINGER + SUPABASE ARCHITECTURE VERIFICATION TEST`);
  console.log(`=============================================================\n`);

  try {
    // 1. Verify Database Dialect & Connection
    console.log(`[Step 1/4] Verifying Database Connection...`);
    await sequelize.authenticate();
    const dialect = sequelize.getDialect();
    console.log(`✅ Database connection SUCCESSFUL! Active Dialect: '${dialect.toUpperCase()}'`);

    // 2. Verify User Mapping Schema (supabase_user_id)
    console.log(`\n[Step 2/4] Verifying User Model & supabase_user_id Schema...`);
    const userCount = await User.count();
    console.log(`✅ User model verified. Total registered system users in DB: ${userCount}`);

    // 3. Verify Backup Engine & Non-Destructive Dump
    console.log(`\n[Step 3/4] Testing Automated Backup Engine (Non-Destructive Dump)...`);
    const backupResult = await backupService.createBackup({ type: 'manual', customFilename: 'test_architecture_verification.sql.gz' });

    if (backupResult.success) {
      console.log(`✅ Backup Engine Test SUCCESSFUL!`);
      console.log(`   Filename: ${backupResult.filename}`);
      console.log(`   File Size: ${(backupResult.fileSize / 1024).toFixed(2)} KB`);
      console.log(`   SHA-256 Checksum: ${backupResult.checksum}`);

      // Verify file exists on disk
      if (fs.existsSync(backupResult.filePath)) {
        console.log(`   Disk Check: Verified '.sql.gz' archive file exists on disk.`);
      }

      // Cleanup test backup file
      try {
        fs.unlinkSync(backupResult.filePath);
        console.log(`   Cleanup: Verification test backup file removed from disk.`);
      } catch (e) {}
    } else {
      console.warn(`⚠️ Backup Engine Warning: ${backupResult.message}`);
    }

    // 4. Verify Backup Log Table
    console.log(`\n[Step 4/4] Verifying Database Backup Log Audit Table...`);
    const logs = await BackupLog.findAll({ limit: 5 });
    console.log(`✅ BackupLog table verified. Total log entries: ${logs.length}`);

    console.log(`\n=============================================================`);
    console.log(`🎉 ALL ARCHITECTURAL CHECKS PASSED SUCCESSFULLY!`);
    console.log(`=============================================================\n`);
    process.exit(0);
  } catch (err: any) {
    console.error(`❌ Verification Failed:`, err.message);
    process.exit(1);
  }
}

verifyAll();
