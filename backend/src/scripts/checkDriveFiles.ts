import dotenv from 'dotenv';
dotenv.config();
import { googleDriveService } from '../services/googleDriveService';

async function checkFiles() {
  console.log('--- CHECKING GOOGLE DRIVE FILES ---');
  try {
    const accessToken = await (googleDriveService as any).getAccessToken();
    console.log('Access token acquired successfully.');

    // Query files list
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log('Target Folder ID in .env:', folderId);

    const res = await (googleDriveService as any).makeRequest({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files?pageSize=20&fields=files(id,name,parents,webViewLink,createdTime,owners,shared)&q=trashed=false`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('Drive API Response Code:', res.statusCode);
    const data = JSON.parse(res.data);
    console.log('Total files found in Drive:', data.files?.length);
    if (data.files) {
      data.files.forEach((f: any) => {
        console.log(`- File: "${f.name}" | ID: ${f.id} | Parents: ${JSON.stringify(f.parents)} | Link: ${f.webViewLink} | Owner: ${f.owners?.[0]?.emailAddress}`);
      });
    }
  } catch (err: any) {
    console.error('Error checking drive files:', err.message);
  }
}

checkFiles();
