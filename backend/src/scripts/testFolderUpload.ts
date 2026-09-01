import dotenv from 'dotenv';
dotenv.config();
import { googleDriveService } from '../services/googleDriveService';
import fs from 'fs';
import path from 'path';

async function testUploadToFolder() {
  const actualFolderId = '1Qcr65DEjl35e7Oatpo5-lV243PYPWkaF';
  console.log('Testing upload with actual folder ID:', actualFolderId);

  (googleDriveService as any).folderId = actualFolderId;

  // Create a sample test file
  const testPath = path.join(__dirname, 'test_backup.sql.gz');
  fs.writeFileSync(testPath, 'TEST_DRIVE_BACKUP_CONTENT');

  const result = await googleDriveService.uploadBackupFile(testPath, 'test_drive_in_folder.sql.gz');
  console.log('Upload Result:', result);

  if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
}

testUploadToFolder();
