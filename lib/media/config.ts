/**
 * Centralized Media & Backblaze B2 Configuration
 *
 * IMPORTANT:
 * - Server credentials (Access Key, Secret Key) must NEVER be prefixed with NEXT_PUBLIC_
 * - Public CDN domain is safe for client-side use to resolve image URLs
 */

export interface MediaConfig {
  provider: 'backblaze-b2' | 'local';
  b2: {
    accessKeyId?: string;
    secretAccessKey?: string;
    bucketName?: string;
    endpoint?: string;
    region?: string;
  };
  cdn: {
    baseUrl: string;
    rootRedirectUrl: string;
  };
  limits: {
    maxImageSizeBytes: number; // e.g. 15MB before optimization
    maxVideoSizeBytes: number; // e.g. 25MB
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
  };
}

// Public CDN domain (opcional). Vazio = mídias servidas pelo próprio site em /media/...
const DEFAULT_CDN_URL = process.env.NEXT_PUBLIC_MEDIA_CDN_URL || '';

export const MEDIA_CONFIG: MediaConfig = {
  provider:
    (process.env.MEDIA_STORAGE_PROVIDER as 'backblaze-b2' | 'local') ||
    (process.env.B2_APPLICATION_KEY_ID || process.env.BACKBLAZE_B2_ACCESS_KEY_ID || process.env.B2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID ? 'backblaze-b2' : 'local'),

  b2: {
    accessKeyId:
      process.env.B2_APPLICATION_KEY_ID ||
      process.env.BACKBLAZE_B2_ACCESS_KEY_ID ||
      process.env.B2_ACCESS_KEY_ID ||
      process.env.S3_ACCESS_KEY_ID,
    secretAccessKey:
      process.env.B2_APPLICATION_KEY ||
      process.env.BACKBLAZE_B2_SECRET_ACCESS_KEY ||
      process.env.B2_SECRET_ACCESS_KEY ||
      process.env.S3_SECRET_ACCESS_KEY,
    bucketName:
      process.env.B2_BUCKET_NAME ||
      process.env.BACKBLAZE_B2_BUCKET_NAME ||
      process.env.S3_BUCKET_NAME ||
      'nuaborges-media',
    endpoint:
      process.env.B2_ENDPOINT ||
      process.env.BACKBLAZE_B2_ENDPOINT ||
      process.env.S3_ENDPOINT ||
      'https://s3.us-east-005.backblazeb2.com',
    region:
      process.env.B2_REGION ||
      process.env.BACKBLAZE_B2_REGION ||
      process.env.S3_REGION ||
      'us-east-005',
  },

  cdn: {
    baseUrl: DEFAULT_CDN_URL.replace(/\/$/, ''),
    rootRedirectUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges-er7.pages.dev',
  },

  limits: {
    maxImageSizeBytes: 15 * 1024 * 1024, // 15MB
    maxVideoSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedImageTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/avif',
    ],
    allowedVideoTypes: [
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ],
  },
};

/**
 * Checks if Backblaze B2 server credentials are fully configured.
 */
export function isB2Configured(): boolean {
  return Boolean(
    MEDIA_CONFIG.b2.accessKeyId &&
      MEDIA_CONFIG.b2.secretAccessKey &&
      MEDIA_CONFIG.b2.bucketName &&
      MEDIA_CONFIG.b2.endpoint
  );
}
