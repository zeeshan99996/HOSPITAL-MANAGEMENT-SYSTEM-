import { googleDriveService } from '../services/googleDriveService';
import https from 'https';

async function testUploadVariants() {
  const token = await googleDriveService.getAccessToken();
  const folderId = '1Qcr65DEjl35e7Oatpo5-lV243PYPWkaF';

  // Variant 1: Simple metadata creation first
  console.log('Testing Variant 1: Resumable Upload Session...');
  const metadata = JSON.stringify({
    name: 'test_backup_sample.txt',
    parents: [folderId],
    mimeType: 'text/plain'
  });

  const req = https.request({
    hostname: 'www.googleapis.com',
    path: `/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'Content-Length': Buffer.byteLength(metadata)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Resumable init status:', res.statusCode);
      const location = res.headers['location'];
      console.log('Location header:', location);
      if (location) {
        // Upload chunk
        const content = 'Test backup content string';
        const uploadReq = https.request(location, {
          method: 'PUT',
          headers: {
            'Content-Length': Buffer.byteLength(content),
            'Content-Type': 'text/plain'
          }
        }, (upRes) => {
          let upBody = '';
          upRes.on('data', c => upBody += c);
          upRes.on('end', () => {
            console.log('Upload Result Status:', upRes.statusCode, upBody);
          });
        });
        uploadReq.write(content);
        uploadReq.end();
      } else {
        console.log('Init error response:', body);
      }
    });
  });

  req.write(metadata);
  req.end();
}

testUploadVariants();
