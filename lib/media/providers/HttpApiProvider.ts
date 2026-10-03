/**
 * HTTP API Storage Provider (Client-Safe)
 *
 * Implements MediaStorageProvider for browser environments.
 * It NEVER requires or exposes Cloudflare API credentials on the client.
 * Instead, it delegates authentication and upload URLs to the edge endpoints
 * (/api/media/presign or /api/media/upload).
 */

import { MediaStorageProvider, PresignedUploadResult } from '../types';
import { resolveMediaUrl } from '../urlResolver';

export class HttpApiProvider implements MediaStorageProvider {
  public readonly name = 'cloudflare-r2-api';

  public isConfigured(): boolean {
    // Available in browser whenever running
    return typeof window !== 'undefined';
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
    const blob = data instanceof Blob ? data : new Blob([data as any], { type: mimeType });
    const sizeBytes = blob.size;

    // Strategy 1: Try Presigned URL direct PUT (fastest, zero edge memory load)
    try {
      const presignRes = await fetch('/api/media/presign', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, mimeType }),
      });

      if (presignRes.ok) {
        const { uploadUrl, publicUrl } = (await presignRes.json()) as PresignedUploadResult;

        if (uploadUrl) {
          const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: {
              'Content-Type': mimeType,
            },
          });

          if (putRes.ok) {
            return {
              key,
              url: publicUrl || resolveMediaUrl(key),
              sizeBytes,
            };
          }
        }
      }
    } catch {
      // Fall through to direct upload endpoint
    }

    // Strategy 2: Direct upload endpoint
    const uploadRes = await fetch('/api/media/upload', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': mimeType,
        'X-Object-Key': key,
        'X-Mime-Type': mimeType,
      },
      body: blob,
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      throw new Error(errData.error || `Falha no upload (${uploadRes.status})`);
    }

    const resJson = await uploadRes.json();
    return {
      key,
      url: resJson.url || resolveMediaUrl(key),
      sizeBytes,
    };
  }

  public async delete(key: string): Promise<boolean> {
    try {
      const res = await fetch('/api/media/delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: [key] }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async deleteMany(keys: string[]): Promise<boolean> {
    try {
      const res = await fetch('/api/media/delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
