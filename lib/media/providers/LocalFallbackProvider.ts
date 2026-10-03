/**
 * Local Fallback Storage Provider
 *
 * Used for development / offline environments when Cloudflare R2 credentials
 * are not yet supplied in .env.local.
 */

import { MediaStorageProvider, PresignedUploadResult } from '../types';

export class LocalFallbackProvider implements MediaStorageProvider {
  public readonly name = 'local-fallback';
  private memoryStore = new Map<string, { dataUrl: string; sizeBytes: number }>();

  public isConfigured(): boolean {
    return true;
  }

  public getUrl(key: string): string {
    const item = this.memoryStore.get(key);
    if (item) {
      return item.dataUrl;
    }
    return key.startsWith('/') ? key : `/${key}`;
  }

  public async upload(
    data: Blob | ArrayBuffer | Uint8Array,
    key: string,
    mimeType: string
  ): Promise<{ key: string; url: string; sizeBytes: number }> {
    let sizeBytes = 0;
    let dataUrl = '';

    if (data instanceof Blob) {
      sizeBytes = data.size;
      dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(data);
      });
    } else {
      const uint8 = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
      sizeBytes = uint8.byteLength;
      let binary = '';
      for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const b64 = typeof btoa !== 'undefined' ? btoa(binary) : '';
      dataUrl = `data:${mimeType};base64,${b64}`;
    }

    this.memoryStore.set(key, { dataUrl, sizeBytes });

    return {
      key,
      url: dataUrl,
      sizeBytes,
    };
  }

  public async delete(key: string): Promise<boolean> {
    this.memoryStore.delete(key);
    return true;
  }

  public async deleteMany(keys: string[]): Promise<boolean> {
    keys.forEach((k) => this.memoryStore.delete(k));
    return true;
  }

  public async getPresignedUploadUrl(
    key: string
  ): Promise<PresignedUploadResult> {
    return {
      uploadUrl: '',
      objectKey: key,
      publicUrl: this.getUrl(key),
    };
  }
}
