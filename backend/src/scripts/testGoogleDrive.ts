import { googleDriveService } from '../services/googleDriveService';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function testDrive() {
  console.log('--- TESTING GOOGLE DRIVE SERVICE ACCOUNT CONNECTIVITY ---');
  const status = googleDriveService.getStatus();
  console.log('Status Configuration:', status);

  try {
    console.log('\n1. Testing Google OAuth2 Token Generation...');
    const token = await googleDriveService.getAccessToken();
    console.log('SUCCESS: Generated Google OAuth2 Bearer token (length:', token.length, ')');

    console.log('\n2. Creating temporary test backup snapshot...');
    const tempFile = path.join(os.tmpdir(), `test_gdrive_sync_${Date.now()}.sql.gz`);
    fs.writeFileSync(tempFile, Buffer.from('Dr. Talha Clinic HMS Test Google Drive Cloud Snapshot Sync Content', 'utf-8'));

    console.log('\n3. Uploading to Google Drive Target Folder (Folder ID:', status.folderId, ')...');
    const result = await googleDriveService.uploadBackupFile(tempFile, path.basename(tempFile));
    console.log('Google Drive Upload Result:', result);

    // Cleanup temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    if (result.success) {
      console.log('\n🎉 ALL GOOGLE DRIVE TESTS PASSED! File ID:', result.fileId);
    } else {
      console.error('\n❌ Google Drive upload returned error:', result.message);
    }
  } catch (error: any) {
    console.error('\n❌ Exception during Google Drive Test:', error.message);
  }
}

testDrive();
