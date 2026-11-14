/**
 * Backblaze B2 Storage Provider (S3 Compatible API)
 *
 * Implements MediaStorageProvider using Backblaze B2 S3-compatible protocol.
 * Decoupled from application logic.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  MediaStorageProvider,
  PresignedUploadResult,
} from '../types';
import { MEDIA_CONFIG, isB2Configured } from '../config';
import { resolveMediaUrl } from '../urlResolver';

export class BackblazeB2Provider implements MediaStorageProvider {
  public readonly name = 'backblaze-b2';
  private s3Client: S3Client | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    if (!isB2Configured()) {
      return;
    }

    const { accessKeyId, secretAccessKey, endpoint, region: configuredRegion } = MEDIA_CONFIG.b2;

    if (accessKeyId && secretAccessKey && endpoint) {
      const regionMatch = endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
      const region = regionMatch ? regionMatch[1] : (configuredRegion || 'us-east-005');

      this.s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true, // Required for S3-compatible B2 endpoints
      });
    }
  }

  public isConfigured(): boolean {
    return isB2Configured() && this.s3Client !== null;
  }

  public getUrl(key: string): string {
    return resolveMediaUrl(key);
  }

  public async upload(
    data: Blob | ArrayBuffer | Uint8Array,
    key: string,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url: string; sizeBytes: number }> {
    if (!this.s3Client) {
      this.initClient();
      if (!this.s3Client) {
        throw new Error('Backblaze B2 is not configured. Check environment variables.');
      }
    }

    const bucket = MEDIA_CONFIG.b2.bucketName;
    if (!bucket) {
      throw new Error('B2 Bucket name is missing in configuration.');
    }

    let buffer: Uint8Array;
    let sizeBytes = 0;

    if (data instanceof Blob) {
      sizeBytes = data.size;
      const arrayBuffer = await data.arrayBuffer();
      buffer = new Uint8Array(arrayBuffer);
    } else if (data instanceof ArrayBuffer) {
      sizeBytes = data.byteLength;
      buffer = new Uint8Array(data);
    } else {
      sizeBytes = data.length;
      buffer = data;
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: metadata,
    });

    await this.s3Client.send(command);

    return {
      key,
      url: this.getUrl(key),
      sizeBytes,
    };
  }

  public async delete(key: string): Promise<boolean> {
    if (!this.s3Client) {
      this.initClient();
      if (!this.s3Client) return false;
    }

    const bucket = MEDIA_CONFIG.b2.bucketName;
    if (!bucket) return false;

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (err) {
      console.error('[BackblazeB2Provider] Delete error for key:', key, err);
      return false;
    }
  }

  public async deleteMany(keys: string[]): Promise<boolean> {
    if (!this.s3Client || keys.length === 0) return false;
    const bucket = MEDIA_CONFIG.b2.bucketName;
    if (!bucket) return false;

    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((k) => ({ Key: k })),
          Quiet: true,
        },
      });
      await this.s3Client.send(command);
      return true;
    } catch (err) {
      console.error('[BackblazeB2Provider] Batch delete error:', err);
      return false;
    }
  }

  public async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds = 300
  ): Promise<PresignedUploadResult> {
    if (!this.s3Client) {
      this.initClient();
      if (!this.s3Client) {
        throw new Error('Backblaze B2 is not configured for presigned upload.');
      }
    }

    const bucket = MEDIA_CONFIG.b2.bucketName;
    if (!bucket) {
      throw new Error('B2 Bucket name missing.');
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      uploadUrl,
      objectKey: key,
      publicUrl: this.getUrl(key),
    };
  }
}
