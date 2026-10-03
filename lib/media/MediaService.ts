/**
 * Central Media Service
 *
 * Orchestrates upload validation, multi-variant generation, storage delegation,
 * and deletion across the decoupled storage provider.
 */

import {
  MediaItem,
  MediaStorageProvider,
  MediaVariant,
  UploadOptions,
} from './types';
import { MEDIA_CONFIG } from './config';
import { CloudflareR2Provider } from './providers/CloudflareR2Provider';
import { HttpApiProvider } from './providers/HttpApiProvider';
import { LocalFallbackProvider } from './providers/LocalFallbackProvider';
import { optimizeImageFile, optimizeVideoFile } from './optimizer';
import { resolveMediaUrl } from './urlResolver';

export class MediaService {
  private provider: MediaStorageProvider;
  private fallbackProvider = new LocalFallbackProvider();

  constructor(customProvider?: MediaStorageProvider) {
    if (customProvider) {
      this.provider = customProvider;
    } else if (typeof window !== 'undefined') {
      // In browser, use client-safe HTTP API provider
      this.provider = new HttpApiProvider();
    } else {
      // In server/worker, use R2 S3 provider if configured
      const r2 = new CloudflareR2Provider();
      this.provider = r2.isConfigured() ? r2 : this.fallbackProvider;
    }
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Sanitizes a file name to be URL and object-storage safe.
   */
  public sanitizeFileName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Validates a file against allowed MIME types and size constraints.
   */
  public validateFile(file: File): { valid: boolean; error?: string } {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return {
        valid: false,
        error: 'Formato não suportado. Por favor, envie uma foto (JPG, PNG, WebP, AVIF) ou vídeo (MP4, WebM).',
      };
    }

    if (isImage) {
      if (!MEDIA_CONFIG.limits.allowedImageTypes.includes(file.type)) {
        return {
          valid: false,
          error: 'Formato de imagem não suportado. Utilize JPG, PNG, WebP ou AVIF.',
        };
      }
      if (file.size > MEDIA_CONFIG.limits.maxImageSizeBytes) {
        return {
          valid: false,
          error: `A imagem excede o tamanho máximo de ${Math.round(
            MEDIA_CONFIG.limits.maxImageSizeBytes / (1024 * 1024)
          )}MB. Escolha um arquivo menor.`,
        };
      }
    }

    if (isVideo) {
      if (!MEDIA_CONFIG.limits.allowedVideoTypes.includes(file.type)) {
        return {
          valid: false,
          error: 'Formato de vídeo não suportado. Utilize MP4 ou WebM.',
        };
      }
      if (file.size > MEDIA_CONFIG.limits.maxVideoSizeBytes) {
        return {
          valid: false,
          error: `O vídeo excede o tamanho máximo de ${Math.round(
            MEDIA_CONFIG.limits.maxVideoSizeBytes / (1024 * 1024)
          )}MB para garantir carregamento instantâneo.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Safe upload wrapper that falls back to LocalFallbackProvider if Cloudflare
   * endpoint is not yet connected or configured.
   */
  private async safeUpload(
    data: Blob | ArrayBuffer | Uint8Array,
    key: string,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url: string; sizeBytes: number }> {
    try {
      return await this.provider.upload(data, key, mimeType, metadata);
    } catch (err: any) {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLocalDev = host === 'localhost' || host === '127.0.0.1';
      if (!isLocalDev) {
        // Em produção nunca embute base64 no conteúdo: mostra o erro real para a usuária.
        throw new Error(err?.message || 'Falha ao enviar o arquivo. Tente novamente.');
      }
      console.warn(
        `[MediaService] Provedor principal (${this.provider.name}) indisponível, usando fallback local:`,
        err?.message || err
      );
      return await this.fallbackProvider.upload(data, key, mimeType);
    }
  }

  /**
   * Uploads and optimizes a media file.
   * For images: generates thumb, mobile, and full WebP variants.
   * For videos: generates a high-quality poster frame and uploads both.
   */
  public async uploadMedia(file: File, options?: UploadOptions): Promise<MediaItem> {
    const startTime = performance.now();

    // 1. Validation
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const isVideo = file.type.startsWith('video/');
    const safeBaseName = this.sanitizeFileName(
      file.name.replace(/\.[^/.]+$/, '')
    );
    const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const folder = options?.folder || 'media';
    const basePath = `${folder}/${mediaId}`;

    if (options?.onProgress) options.onProgress(15);

    if (isVideo) {
      // Process Video
      const videoPkg = await optimizeVideoFile(file);
      if (options?.onProgress) options.onProgress(45);

      // Upload poster frame
      const posterKey = `${basePath}/poster.webp`;
      const posterUpload = await this.safeUpload(
        videoPkg.posterBlob,
        posterKey,
        'image/webp',
        { mediaId, type: 'poster' }
      );

      if (options?.onProgress) options.onProgress(70);

      // Upload video file
      const videoExt = file.name.split('.').pop() || 'mp4';
      const videoKey = `${basePath}/video.${videoExt}`;
      const videoUpload = await this.safeUpload(
        file,
        videoKey,
        file.type,
        { mediaId, type: 'video' }
      );

      if (options?.onProgress) options.onProgress(100);

      const elapsed = Math.round(performance.now() - startTime);
      console.log(`[MediaService] Video upload complete: ${safeBaseName} (${elapsed}ms)`);

      return {
        id: mediaId,
        name: safeBaseName,
        objectKey: videoKey,
        mimeType: file.type,
        sizeBytes: videoPkg.sizeBytes,
        width: videoPkg.width,
        height: videoPkg.height,
        durationSeconds: videoPkg.durationSeconds,
        isVideo: true,
        posterKey,
        posterUrl: posterUpload.url,
        variants: {
          original: {
            key: videoKey,
            url: videoUpload.url,
            width: videoPkg.width,
            height: videoPkg.height,
            sizeBytes: videoPkg.sizeBytes,
            format: videoExt,
          },
        },
        uploadedAt: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        provider: this.provider.name,
      };
    } else {
      // Process Image
      const imagePkg = await optimizeImageFile(file);
      if (options?.onProgress) options.onProgress(40);

      const variantsMap: MediaItem['variants'] = {};
      const stepIncrement = 50 / imagePkg.variants.length;
      let currentProgress = 40;

      for (const variant of imagePkg.variants) {
        const variantKey = `${basePath}/${variant.name}.webp`;
        const res = await this.safeUpload(
          variant.blob,
          variantKey,
          'image/webp',
          { mediaId, variant: variant.name }
        );

        variantsMap[variant.name] = {
          key: variantKey,
          url: res.url,
          width: variant.width,
          height: variant.height,
          sizeBytes: variant.sizeBytes,
          format: 'webp',
        };

        currentProgress += stepIncrement;
        if (options?.onProgress) options.onProgress(Math.round(currentProgress));
      }

      if (options?.onProgress) options.onProgress(100);

      const elapsed = Math.round(performance.now() - startTime);
      console.log(
        `[MediaService] Image optimized & stored: ${safeBaseName} ` +
          `(${Math.round(imagePkg.originalSizeBytes / 1024)}KB -> ` +
          `${Math.round(imagePkg.totalOptimizedBytes / 1024)}KB, ` +
          `-${imagePkg.savingsPercentage}%, ${elapsed}ms)`
      );

      const primaryKey = variantsMap.full?.key || variantsMap.mobile?.key || `${basePath}/full.webp`;

      return {
        id: mediaId,
        name: safeBaseName,
        objectKey: primaryKey,
        mimeType: 'image/webp',
        sizeBytes: imagePkg.totalOptimizedBytes,
        width: imagePkg.originalWidth,
        height: imagePkg.originalHeight,
        isVideo: false,
        variants: variantsMap,
        uploadedAt: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        provider: this.provider.name,
      };
    }
  }

  /**
   * Deletes a media item and all its associated variants from storage.
   * Prevents orphan files from accumulating in Cloudflare R2.
   */
  public async deleteMedia(media: MediaItem): Promise<boolean> {
    const keysToDelete: string[] = [];

    if (media.objectKey) keysToDelete.push(media.objectKey);
    if (media.posterKey) keysToDelete.push(media.posterKey);

    if (media.variants) {
      Object.values(media.variants).forEach((v) => {
        if (v?.key && !keysToDelete.includes(v.key)) {
          keysToDelete.push(v.key);
        }
      });
    }

    if (keysToDelete.length === 0) return true;

    try {
      if (this.provider.deleteMany) {
        return await this.provider.deleteMany(keysToDelete);
      } else {
        const results = await Promise.all(
          keysToDelete.map((k) => this.provider.delete(k))
        );
        return results.every(Boolean);
      }
    } catch (err) {
      console.error('[MediaService] Error deleting media keys:', keysToDelete, err);
      return false;
    }
  }
}

// Singleton instance for application use
export const mediaService = new MediaService();
