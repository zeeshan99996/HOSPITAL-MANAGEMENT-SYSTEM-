import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export interface GoogleDriveUploadResult {
  success: boolean;
  fileId?: string;
  filename?: string;
  webViewLink?: string;
  message: string;
}

export interface GoogleDriveStatus {
  isConfigured: boolean;
  serviceAccountEmail?: string;
  folderId?: string;
  authType: 'service_account' | 'oauth_refresh' | 'none';
  message: string;
}

export class GoogleDriveService {
  private serviceAccountEmail: string | null = null;
  private privateKey: string | null = null;
  private folderId: string | null = null;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private refreshToken: string | null = null;

  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.initCredentials();
  }

  /**
   * Initializes credentials from Environment variables or optional JSON file.
   */
  private initCredentials() {
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;
    this.clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || null;
    this.clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || null;
    this.refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || null;

    // 1. Try raw JSON string or Base64 in GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY
    if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY) {
      try {
        let raw = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY.trim();
        if (!raw.startsWith('{')) {
          raw = Buffer.from(raw, 'base64').toString('utf-8');
        }
        const parsed = JSON.parse(raw);
        this.serviceAccountEmail = parsed.client_email || null;
        this.privateKey = parsed.private_key || null;
      } catch (e: any) {
        console.warn('[Google Drive] Failed to parse GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY:', e.message);
      }
    }

    // 2. Try explicit EMAIL and PRIVATE_KEY environment variables
    if (!this.privateKey && process.env.GOOGLE_DRIVE_PRIVATE_KEY) {
      this.serviceAccountEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || null;
      this.privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n');
    }

    // 3. Try service account file if path provided
    if (!this.privateKey && process.env.GOOGLE_DRIVE_KEY_FILE) {
      try {
        const filePath = path.resolve(process.env.GOOGLE_DRIVE_KEY_FILE);
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(fileContent);
          this.serviceAccountEmail = parsed.client_email || null;
          this.privateKey = parsed.private_key || null;
        }
      } catch (e: any) {
        console.warn('[Google Drive] Failed to read key file:', e.message);
      }
    }

    // 4. Try default root google-service-account.json file
    if (!this.privateKey) {
      try {
        const rootJsonPath = path.resolve(__dirname, '../../google-service-account.json');
        const altJsonPath = path.resolve(__dirname, '../../../google-service-account.json');
        const targetPath = fs.existsSync(rootJsonPath) ? rootJsonPath : (fs.existsSync(altJsonPath) ? altJsonPath : null);
        if (targetPath) {
          const fileContent = fs.readFileSync(targetPath, 'utf-8');
          const parsed = JSON.parse(fileContent);
          this.serviceAccountEmail = parsed.client_email || null;
          this.privateKey = parsed.private_key || null;
        }
      } catch (e: any) {}
    }

    // 5. Default folder ID from environment or user's target folder
    if (!this.folderId) {
      this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1Qcr65DEjI35e7Oatpo5-IV243PYPWkaF';
    }
  }

  /**
   * Helper to make HTTPS requests without external dependencies.
   */
  private makeRequest(options: https.RequestOptions, postData?: Buffer | string): Promise<{ statusCode: number; data: string }> {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve({ statusCode: res.statusCode || 500, data: body });
        });
      });

      req.on('error', (err) => reject(err));

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  /**
   * Generates a signed RS256 JWT assertion for Google OAuth token endpoint.
   */
  private generateSignedJwt(): string {
    if (!this.serviceAccountEmail || !this.privateKey) {
      throw new Error('Google Service Account email or private key is missing.');
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claimSet = {
      iss: this.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const base64UrlEncode = (str: string) =>
      Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    const signature = signer.sign(this.privateKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${unsignedToken}.${signature}`;
  }

  /**
   * Obtains a valid Google OAuth Access Token via Service Account or Refresh Token.
   */
  public async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedAccessToken && now < this.tokenExpiresAt - 60000) {
      return this.cachedAccessToken;
    }

    this.initCredentials();

    // 1. OAuth2 Refresh Token Flow (Prioritized if user supplied OAuth Refresh Token)
    if (this.refreshToken) {
      try {
        const postData = new URLSearchParams({
          client_id: this.clientId || '407408718192-eac4e443vda28d772vh2268593kvoq88.apps.googleusercontent.com',
          client_secret: this.clientSecret || 'dKla-dKla_dKla_dKla_dKla_',
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }).toString();

        const response = await this.makeRequest(
          {
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData),
            },
          },
          postData
        );

        const parsed = JSON.parse(response.data);
        if (response.statusCode === 200 && parsed.access_token) {
          console.log('[Google Drive] Successfully generated Access Token from Refresh Token!');
          this.cachedAccessToken = parsed.access_token;
          this.tokenExpiresAt = Date.now() + (parsed.expires_in || 3600) * 1000;
          return this.cachedAccessToken!;
        }
      } catch (rfErr: any) {
        console.warn('[Google Drive Refresh Token Notice]:', rfErr.message);
      }
    }

    // 2. Service Account Flow (Fallback for server automated backups)
    if (this.serviceAccountEmail && this.privateKey) {
      const assertion = this.generateSignedJwt();
      const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(assertion)}`;

      const response = await this.makeRequest(
        {
          hostname: 'oauth2.googleapis.com',
          path: '/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        postData
      );

      const parsed = JSON.parse(response.data);
      if (response.statusCode !== 200 || !parsed.access_token) {
        throw new Error(`Google Service Account Token Error: ${parsed.error_description || parsed.error || response.data}`);
      }

      this.cachedAccessToken = parsed.access_token;
      this.tokenExpiresAt = Date.now() + (parsed.expires_in || 3600) * 1000;
      return this.cachedAccessToken!;
    }

    throw new Error('Google Drive credentials not configured. Please set GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY or OAuth credentials in .env.');
  }

  /**
   * Uploads a local file buffer directly to Google Drive via multipart upload.
   */
  public async uploadBackupFile(filePath: string, filename: string): Promise<GoogleDriveUploadResult> {
    try {
      this.initCredentials();
      const accessToken = await this.getAccessToken();

      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist at ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      const boundary = `-------HMS_BACKUP_BOUNDARY_${Date.now()}`;

      // Metadata JSON part
      const metadata: any = {
        name: filename,
        description: `Dr. Talha Clinic Automated Database Backup (${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })})`,
        mimeType: 'application/gzip',
      };

      if (this.folderId) {
        metadata.parents = [this.folderId];
      }

      const metadataString = JSON.stringify(metadata);

      const preBuffer = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadataString}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/gzip\r\n\r\n`
      );

      const postBuffer = Buffer.from(`\r\n--${boundary}--`);
      const fullPayload = Buffer.concat([preBuffer, fileBuffer, postBuffer]);

      const response = await this.makeRequest(
        {
          hostname: 'www.googleapis.com',
          path: '/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,size',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
            'Content-Length': fullPayload.length,
          },
        },
        fullPayload
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        const parsed = JSON.parse(response.data);
        console.log(`[Google Drive] Successfully uploaded ${filename} (ID: ${parsed.id}) to Google Drive!`);
        return {
          success: true,
          fileId: parsed.id,
          filename: parsed.name || filename,
          webViewLink: parsed.webViewLink || `https://drive.google.com/file/d/${parsed.id}/view`,
          message: `Successfully uploaded to Google Drive folder.`,
        };
      } else if (response.statusCode === 404 && metadata.parents) {
        console.warn('[Google Drive Upload Notice] Parent folder ID returned 404 Not Found. Retrying upload directly to Google Drive root storage...');
        delete metadata.parents;
        const retryMetaStr = JSON.stringify(metadata);
        const retryPreBuffer = Buffer.from(
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${retryMetaStr}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/gzip\r\n\r\n`
        );
        const retryPayload = Buffer.concat([retryPreBuffer, fileBuffer, postBuffer]);

        const retryRes = await this.makeRequest(
          {
            hostname: 'www.googleapis.com',
            path: '/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,size',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
              'Content-Length': retryPayload.length,
            },
          },
          retryPayload
        );

        if (retryRes.statusCode >= 200 && retryRes.statusCode < 300) {
          const parsed = JSON.parse(retryRes.data);
          console.log(`[Google Drive Retry Success] Uploaded ${filename} (ID: ${parsed.id}) to Google Drive storage!`);
          return {
            success: true,
            fileId: parsed.id,
            filename: parsed.name || filename,
            webViewLink: parsed.webViewLink || `https://drive.google.com/file/d/${parsed.id}/view`,
            message: `Successfully uploaded to Google Drive storage.`,
          };
        }
        throw new Error(`Google Drive API error (${retryRes.statusCode}): ${retryRes.data}`);
      } else {
        throw new Error(`Google Drive API error (${response.statusCode}): ${response.data}`);
      }
    } catch (error: any) {
      console.error('[Google Drive Upload Error]:', error.message);
      return {
        success: false,
        message: `Google Drive sync error: ${error.message}`,
      };
    }
  }

  /**
   * Checks the current configuration & connectivity status of Google Drive integration.
   */
  public getStatus(): GoogleDriveStatus {
    this.initCredentials();

    if (this.serviceAccountEmail && this.privateKey) {
      return {
        isConfigured: true,
        serviceAccountEmail: this.serviceAccountEmail,
        folderId: this.folderId || 'Root Directory',
        authType: 'service_account',
        message: `Connected via Service Account (${this.serviceAccountEmail})`,
      };
    }

    if (this.clientId && this.refreshToken) {
      return {
        isConfigured: true,
        folderId: this.folderId || 'Root Directory',
        authType: 'oauth_refresh',
        message: 'Connected via Google OAuth2 Refresh Token',
      };
    }

    return {
      isConfigured: false,
      authType: 'none',
      message: 'Google Drive backup is ready. Configure GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY in .env to enable direct cloud sync.',
    };
  }
}

export const googleDriveService = new GoogleDriveService();
