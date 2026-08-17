import http from 'http';
import https from 'https';
import url from 'url';
import readline from 'readline';

/**
 * Interactive CLI helper to get Google Drive OAuth2 Refresh Token
 * Run: npx ts-node src/scripts/getGoogleDriveOAuthToken.ts <CLIENT_ID> <CLIENT_SECRET>
 */
async function getOAuthToken() {
  const args = process.argv.slice(2);
  let clientId = args[0] || process.env.GOOGLE_DRIVE_CLIENT_ID;
  let clientSecret = args[1] || process.env.GOOGLE_DRIVE_CLIENT_SECRET;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

  if (!clientId) {
    clientId = await question('Enter Google OAuth CLIENT_ID: ');
  }
  if (!clientSecret) {
    clientSecret = await question('Enter Google OAuth CLIENT_SECRET: ');
  }

  clientId = clientId?.trim();
  clientSecret = clientSecret?.trim();

  if (!clientId || !clientSecret) {
    console.error('CLIENT_ID and CLIENT_SECRET are required.');
    process.exit(1);
  }

  const redirectUri = 'http://localhost:5555/oauth2callback';
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  console.log('\n======================================================');
  console.log('🔗 Open this URL in your browser to Authorize Google Drive:');
  console.log('======================================================\n');
  console.log(authUrl);
  console.log('\nWaiting for authentication callback on http://localhost:5555/oauth2callback ...\n');

  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    if (parsedUrl.pathname === '/oauth2callback') {
      const code = parsedUrl.query.code as string;
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: No authorization code received.</h1>');
        return;
      }

      // Exchange code for Refresh Token
      const postData = new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString();

      const tokenReq = https.request(
        {
          hostname: 'oauth2.googleapis.com',
          path: '/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (tokenRes) => {
          let body = '';
          tokenRes.on('data', (c) => (body += c));
          tokenRes.on('end', () => {
            const tokenData = JSON.parse(body);
            if (tokenData.refresh_token) {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <div style="font-family: sans-serif; text-align: center; padding: 40px;">
                  <h1 style="color: #10b981;">🎉 Authorization Successful!</h1>
                  <p>You can close this tab and return to your terminal.</p>
                </div>
              `);

              console.log('\n======================================================');
              console.log('✅ GOOGLE DRIVE REFRESH TOKEN GENERATED SUCCESSFULLY!');
              console.log('======================================================\n');
              console.log('Add these 3 lines to your backend .env file:\n');
              console.log(`GOOGLE_DRIVE_CLIENT_ID=${clientId}`);
              console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${clientSecret}`);
              console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokenData.refresh_token}\n`);
              console.log('======================================================\n');
            } else {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`<h1>Error retrieving refresh token: ${body}</h1>`);
              console.error('Error exchanging token:', body);
            }
            server.close();
            rl.close();
            process.exit(0);
          });
        }
      );

      tokenReq.write(postData);
      tokenReq.end();
    }
  });

  server.listen(5555);
}

getOAuthToken();
