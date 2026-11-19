/**
 * Media Storage Types and Interfaces
 * Decoupled from any specific cloud provider.
 */

export type SupportedImageFormat = 'webp' | 'jpeg' | 'png' | 'avif';
export type SupportedVideoFormat = 'mp4' | 'webm';

export type MediaMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/avif'
  | 'video/mp4'
  | 'video/webm';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface MediaVariant {
  key: string;
  url: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
  transformKey?: string;
  mimeType?: string;
  sha256?: string;
}

export interface MediaItem {
  id: string;
  name: string;
  objectKey: string;
  mimeType: MediaMimeType | string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  isVideo: boolean;
  posterKey?: string;
  posterUrl?: string;
  fingerprint?: string;
  processingVersion?: string;
  variants: {
    thumb?: MediaVariant;
    mobile?: MediaVariant;
    full?: MediaVariant;
    original?: MediaVariant;
    poster?: MediaVariant;
    commercialOriginal?: MediaVariant;
  };
  alt?: string;
  originalSizeBytes?: number;
  savingsPercentage?: number;
  bitrateKbps?: number;
  wasFastStartApplied?: boolean;
  uploadedAt: string;
  provider: string;
}

export interface UploadOptions {
  fileName: string;
  mimeType: string;
  folder?: string;
  accessScope?: 'public' | 'private';
  generateVariants?: boolean;
  onProgress?: (percent: number) => void;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  cacheControl?: string;
  fields?: Record<string, string>;
}

export interface MediaStorageProvider {
  readonly name: string;
  isConfigured(): boolean;
  upload(
    data: Blob | ArrayBuffer | Uint8Array,
    key: string,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url: string; sizeBytes: number; sha256?: string }>;
  delete(key: string): Promise<boolean>;
  deleteMany?(keys: string[], mediaIds?: string[]): Promise<boolean>;
  getUrl(key: string): string;
  getPresignedUploadUrl?(
    key: string,
    mimeType: string,
    expiresInSeconds?: number
  ): Promise<PresignedUploadResult>;
}
