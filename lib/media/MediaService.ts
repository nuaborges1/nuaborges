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
import { BackblazeB2Provider } from './providers/BackblazeB2Provider';
import { HttpApiProvider, StorageNotConfiguredError } from './providers/HttpApiProvider';
import { LocalFallbackProvider } from './providers/LocalFallbackProvider';
import { optimizeImageFile, optimizeVideoFile } from './optimizer';
import { resolveMediaUrl } from './urlResolver';

/**
 * Diagnósticos de desenvolvimento. Em produção esses logs apenas poluem o
 * console do navegador; os detalhes continuam registrados no servidor.
 */
const IS_DEV_BUILD = process.env.NODE_ENV !== 'production';
const devLog = (...args: unknown[]) => {
  if (IS_DEV_BUILD) console.log(...args);
};
const devWarn = (...args: unknown[]) => {
  if (IS_DEV_BUILD) console.warn(...args);
};

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
      // In server/worker, use Backblaze B2 S3 provider if configured
      const b2 = new BackblazeB2Provider();
      this.provider = b2.isConfigured() ? b2 : this.fallbackProvider;
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
    const lowerName = file.name.toLowerCase();
    const isImage =
      file.type.startsWith('image/') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp') ||
      lowerName.endsWith('.avif');
    const isVideo =
      file.type.startsWith('video/') ||
      lowerName.endsWith('.mp4') ||
      lowerName.endsWith('.mov') ||
      lowerName.endsWith('.webm') ||
      lowerName.endsWith('.mkv') ||
      lowerName.endsWith('.m4v');

    if (!isImage && !isVideo) {
      return {
        valid: false,
        error: 'Formato não suportado. Por favor, envie uma foto (JPG, PNG, WebP, AVIF) ou vídeo (MP4, MOV, WebM, MKV).',
      };
    }

    if (isImage) {
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
      if (file.size > MEDIA_CONFIG.limits.maxVideoSizeBytes) {
        return {
          valid: false,
          error: `O vídeo excede o tamanho máximo de ${Math.round(
            MEDIA_CONFIG.limits.maxVideoSizeBytes / (1024 * 1024)
          )}MB para envio sem fracionamento.`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Safe upload wrapper.
   *
   * O fallback para LocalFallbackProvider (base64 em memória) só acontece quando o
   * backend responde explicitamente que NÃO há armazenamento configurado, e apenas
   * em localhost. Erros de validação, de rede ou de limite nunca viram "sucesso"
   * silencioso — eles propagam para a usuária.
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

      if (isLocalDev && err instanceof StorageNotConfiguredError) {
        devWarn(
          `[MediaService] Sem backend de armazenamento configurado (${this.provider.name}); usando fallback local temporário.`
        );
        return await this.fallbackProvider.upload(data, key, mimeType);
      }

      // Em produção nunca embute base64 no conteúdo: mostra o erro real para a usuária.
      throw err instanceof Error && err.message
        ? err
        : new Error('Não foi possível enviar o arquivo. Tente novamente.');
    }
  }

  private uploadCache = new Map<string, MediaItem>();

  public async getFileFingerprint(file: File): Promise<string> {
    try {
      const maxFullHashBytes = 50 * 1024 * 1024; // 50MB
      const blobToHash =
        file.size <= maxFullHashBytes
          ? file
          : new Blob([
              file.slice(0, 65536),
              file.slice(Math.max(0, file.size - 65536), file.size),
            ]);
      const buffer = await blobToHash.arrayBuffer();
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        return `sha256:${hashHex}`;
      }
      let hash = 0;
      const view = new DataView(buffer);
      for (let i = 0; i + 4 <= view.byteLength; i += 4) {
        hash = (hash << 5) - hash + (view.getUint32(i, true) || 0);
        hash |= 0;
      }
      return `fp_${file.size}_${Math.abs(hash)}`;
    } catch {
      return `fp_${file.size}_${file.lastModified}`;
    }
  }

  /**
   * Uploads and optimizes a media file.
   * For images: generates thumb, mobile, and full WebP variants.
   * For videos: generates a high-quality poster frame and uploads both.
   */
  public async uploadMedia(file: File, options?: UploadOptions): Promise<MediaItem> {
    const startTime = performance.now();

    // 1. Validation & Deduplication Fingerprint Check
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fingerprint = await this.getFileFingerprint(file);
    if (this.uploadCache.has(fingerprint)) {
      devLog(`[MediaService] Deduplicação inteligente: arquivo já processado nesta sessão (${file.name})`);
      const cached = this.uploadCache.get(fingerprint)!;
      if (options?.onProgress) options.onProgress(100);
      return cached;
    }

    const lowerName = file.name.toLowerCase();
    const isVideo =
      file.type.startsWith('video/') ||
      lowerName.endsWith('.mp4') ||
      lowerName.endsWith('.mov') ||
      lowerName.endsWith('.webm') ||
      lowerName.endsWith('.mkv') ||
      lowerName.endsWith('.m4v');

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

      // Upload video file (usando FastStart se MP4)
      const videoExt = file.name.split('.').pop() || 'mp4';
      const videoMime = file.type || (videoExt === 'mov' ? 'video/quicktime' : 'video/mp4');
      const videoKey = `${basePath}/video.${videoExt}`;
      const videoBlobToUpload = videoPkg.optimizedVideoBlob || file;

      const videoUpload = await this.safeUpload(
        videoBlobToUpload,
        videoKey,
        videoMime,
        { mediaId, type: 'video' }
      );

      if (options?.onProgress) options.onProgress(100);

      const elapsed = Math.round(performance.now() - startTime);
      devLog(
        `[MediaService] Video upload complete: ${safeBaseName} (${Math.round(
          videoPkg.sizeBytes / (1024 * 1024)
        )}MB, FastStart: ${videoPkg.wasFastStartApplied ? 'SIM' : 'NÃO'}, ${elapsed}ms)`
      );

      const videoItem: MediaItem = {
        id: mediaId,
        name: safeBaseName,
        objectKey: videoKey,
        mimeType: file.type,
        sizeBytes: videoPkg.sizeBytes,
        originalSizeBytes: file.size,
        bitrateKbps: videoPkg.bitrateKbps,
        wasFastStartApplied: videoPkg.wasFastStartApplied,
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
        fingerprint,
      };

      this.uploadCache.set(fingerprint, videoItem);
      return videoItem;
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
      devLog(
        `[MediaService] Image optimized & stored: ${safeBaseName} ` +
          `(${Math.round(imagePkg.originalSizeBytes / 1024)}KB -> ` +
          `${Math.round(imagePkg.totalOptimizedBytes / 1024)}KB, ` +
          `-${imagePkg.savingsPercentage}%, ${elapsed}ms)`
      );

      const primaryKey = variantsMap.full?.key || variantsMap.mobile?.key || `${basePath}/full.webp`;

      const imageItem: MediaItem = {
        id: mediaId,
        name: safeBaseName,
        objectKey: primaryKey,
        mimeType: 'image/webp',
        sizeBytes: imagePkg.totalOptimizedBytes,
        originalSizeBytes: imagePkg.originalSizeBytes,
        savingsPercentage: imagePkg.savingsPercentage,
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
        fingerprint,
      };

      this.uploadCache.set(fingerprint, imageItem);
      return imageItem;
    }
  }

  /**
   * Deletes a media item and all its associated variants from storage.
   * Prevents orphan files from accumulating in Backblaze B2.
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
