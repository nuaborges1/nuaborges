/**
 * Centralized Media & Cloudflare Configuration
 *
 * IMPORTANT:
 * - Server credentials (Access Key, Secret Key, Account ID) must NEVER be prefixed with NEXT_PUBLIC_
 * - Public CDN domain is safe for client-side use to resolve image URLs
 * - Zero hardcoded account IDs or tokens!
 */

export interface MediaConfig {
  provider: 'cloudflare-r2' | 'local';
  r2: {
    accountId?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    bucketName?: string;
    endpoint?: string;
  };
  cdn: {
    baseUrl: string;
    rootRedirectUrl: string;
  };
  limits: {
    maxImageSizeBytes: number; // e.g. 15MB before optimization
    maxVideoSizeBytes: number; // e.g. 50MB
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
  };
}

// Public CDN domain (opcional). Vazio = mídias servidas pelo próprio site em /media/...
const DEFAULT_CDN_URL = process.env.NEXT_PUBLIC_MEDIA_CDN_URL || '';

export const MEDIA_CONFIG: MediaConfig = {
  provider:
    (process.env.MEDIA_STORAGE_PROVIDER as 'cloudflare-r2' | 'local') ||
    (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? 'cloudflare-r2' : 'local'),

  r2: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'nuaborges-media',
    endpoint:
      process.env.CLOUDFLARE_R2_ENDPOINT ||
      (process.env.CLOUDFLARE_ACCOUNT_ID
        ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : undefined),
  },

  cdn: {
    baseUrl: DEFAULT_CDN_URL.replace(/\/$/, ''),
    rootRedirectUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges-er7.pages.dev',
  },

  limits: {
    maxImageSizeBytes: 15 * 1024 * 1024, // 15MB
    maxVideoSizeBytes: 25 * 1024 * 1024, // 25MB (limite por arquivo do Cloudflare KV gratuito)
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
      'video/quicktime', // .mov will be accepted and noted
    ],
  },
};

/**
 * Checks if Cloudflare R2 server credentials are fully configured.
 * This is safe to run on server or edge environments.
 */
export function isR2Configured(): boolean {
  return Boolean(
    MEDIA_CONFIG.r2.accessKeyId &&
      MEDIA_CONFIG.r2.secretAccessKey &&
      MEDIA_CONFIG.r2.bucketName &&
      (MEDIA_CONFIG.r2.endpoint || MEDIA_CONFIG.r2.accountId)
  );
}
