import { googleDriveService } from '../services/googleDriveService';
import https from 'https';

async function testFolderAccess() {
  const token = await googleDriveService.getAccessToken();
  const folderId = '1Qcr65DEjl35e7Oatpo5-lV243PYPWkaF';

  const req = https.request({
    hostname: 'www.googleapis.com',
    path: `/drive/v3/files/${folderId}?supportsAllDrives=true&fields=id,name,owners,permissions,capabilities`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Folder Metadata Response (Status:', res.statusCode, '):', body);
    });
  });

  req.on('error', (err) => console.error('Req error:', err));
  req.end();
}

testFolderAccess();
