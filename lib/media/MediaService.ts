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
import { optimizeImageFile, optimizeVideoFile, VARIANT_CONFIGS } from './optimizer';
import { resolveMediaUrl } from './urlResolver';
import { sha256File } from './sha256File';
import { getPublicApiUrl, getStoredSessionToken } from '../sessionToken';

const IMAGE_TRANSFORM_VERSION = 'v1';
const VIDEO_POSTER_TRANSFORM_VERSION = 'v1';

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
  ): Promise<{ key: string; url: string; sizeBytes: number; sha256?: string }> {
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

  private inFlightUploads = new Map<string, Promise<MediaItem>>();

  public async getFileFingerprint(file: File): Promise<string> {
    return `sha256:${await sha256File(file)}`;
  }

  private async postMediaIndex(path: 'claim' | 'complete' | 'fail', body: Record<string, unknown>) {
    if (typeof window === 'undefined') throw new Error('O índice de mídia só pode ser usado no painel autenticado.');
    const token = getStoredSessionToken();
    const response = await fetch(`${getPublicApiUrl()}/api/media/${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((result as any)?.error || `Falha no índice de mídia (${response.status}).`);
    return result as Record<string, any>;
  }

  private async markUploadFailed(claim: { assetId: string; claimToken: string }): Promise<void> {
    try {
      await this.postMediaIndex('fail', claim);
    } catch (err) {
      devWarn('[MediaService] Não foi possível marcar a reserva de mídia como falha.', err);
    }
  }

  /**
   * Uploads and optimizes a media file.
   * For images: generates thumb, mobile, and full WebP variants.
   * For videos: generates a high-quality poster frame and uploads both.
   */
  public async uploadMedia(file: File, options?: UploadOptions): Promise<MediaItem> {
    // 1. Validation & Deduplication Fingerprint Check
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fingerprint = await this.getFileFingerprint(file);
    const folder = options?.folder || 'media';
    const accessScope = options?.accessScope || (folder.toLowerCase().includes('private') ? 'private' : 'public');
    const scopedFingerprint = `${accessScope}:${fingerprint}`;
    const inFlight = this.inFlightUploads.get(scopedFingerprint);
    if (inFlight) {
      const item = await inFlight;
      options?.onProgress?.(100);
      return { ...item, reused: true };
    }

    const pending = this.uploadClaimedMedia(file, fingerprint, accessScope, options);
    this.inFlightUploads.set(scopedFingerprint, pending);
    try {
      return await pending;
    } finally {
      this.inFlightUploads.delete(scopedFingerprint);
    }
  }

  private async uploadClaimedMedia(
    file: File,
    fingerprint: string,
    accessScope: 'public' | 'private',
    options?: UploadOptions
  ): Promise<MediaItem> {
    const startTime = performance.now();
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
    let assetClaim: { assetId: string; claimToken: string } | null = null;
    let mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    let basePath = '';

    try {
      const claim = await this.postMediaIndex('claim', {
        sha256: fingerprint.slice('sha256:'.length),
        accessScope,
        mimeType: file.type || options?.mimeType || 'application/octet-stream',
        sizeBytes: file.size,
        originalName: file.name,
        processingVersion: isVideo
          ? `video:${VIDEO_POSTER_TRANSFORM_VERSION}:faststart-v1`
          : `image:${IMAGE_TRANSFORM_VERSION}:${VARIANT_CONFIGS.map((item) => `${item.name}-${item.maxWidth}x${item.maxHeight}-${item.quality}-${item.maxTargetBytes}`).join('_')}`,
      });
      if (claim.reused && claim.mediaItem) {
        options?.onProgress?.(100);
        return { ...(claim.mediaItem as MediaItem), reused: true };
      }
      if (claim.assetId && claim.claimToken && claim.storageKey) {
        assetClaim = { assetId: String(claim.assetId), claimToken: String(claim.claimToken) };
        mediaId = `media-${assetClaim.assetId}`;
        basePath = String(claim.storageKey);
      }
    } catch (claimErr) {
      devWarn('[MediaService] Não foi possível reservar a mídia; upload interrompido para evitar duplicação.', claimErr);
      throw claimErr instanceof Error
        ? new Error(`Não foi possível verificar se este arquivo já existe. ${claimErr.message}`)
        : new Error('Não foi possível verificar se este arquivo já existe. O envio foi interrompido.');
    }

    if (!assetClaim) {
      throw new Error('A reserva do arquivo não foi confirmada. O envio foi interrompido para evitar duplicação.');
    }

    try {

    if (options?.onProgress) options.onProgress(15);

    if (isVideo) {
      // Process Video
      const videoPkg = await optimizeVideoFile(file);
      if (options?.onProgress) options.onProgress(45);

      // Upload poster frame
      const posterTransformKey = `poster:${videoPkg.posterWidth}x${videoPkg.posterHeight}:webp:q82:max81920:clarity12:${VIDEO_POSTER_TRANSFORM_VERSION}`;
      const posterKey = `${basePath}/poster-${videoPkg.posterWidth}x${videoPkg.posterHeight}-q82-max81920-clarity12-${VIDEO_POSTER_TRANSFORM_VERSION}.webp`;
      const posterUpload = await this.safeUpload(
        videoPkg.posterBlob,
        posterKey,
        'image/webp',
        { mediaId, type: 'poster' }
      );

      if (options?.onProgress) options.onProgress(70);

      // Upload video file (usando FastStart se MP4)
      const videoMime = file.type || 'video/mp4';
      const videoKey = `${basePath}/video-${videoMime.replace('/', '-')}-faststart-v1`;
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
            format: 'video',
            mimeType: videoMime,
            transformKey: `video:${videoMime}:faststart-v1`,
            sha256: videoUpload.sha256,
          },
          poster: {
            key: posterKey,
            url: posterUpload.url,
            width: videoPkg.posterWidth,
            height: videoPkg.posterHeight,
            sizeBytes: videoPkg.posterBlob.size,
            format: 'webp',
            mimeType: 'image/webp',
            transformKey: posterTransformKey,
            sha256: posterUpload.sha256,
          },
        },
        uploadedAt: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        provider: this.provider.name,
        fingerprint,
        processingVersion: `video:${VIDEO_POSTER_TRANSFORM_VERSION}:faststart-v1`,
      };

      // Private/sold videos retain the exact uploaded bytes separately from
      // the playback-ready FastStart copy. Public teasers do not create this
      // commercial-original variant.
      if (accessScope === 'private') {
        const optimizedHash = await sha256File(videoBlobToUpload);
        if (optimizedHash !== fingerprint.slice('sha256:'.length)) {
          const originalKey = `${basePath}/commercial-original`;
          const originalUpload = await this.safeUpload(file, originalKey, videoMime, { mediaId, type: 'commercial-original' });
          videoItem.variants.commercialOriginal = {
            key: originalKey,
            url: originalUpload.url,
            width: videoPkg.width,
            height: videoPkg.height,
            sizeBytes: file.size,
            format: 'original',
            mimeType: videoMime,
            transformKey: `source:${videoMime}:exact-bytes:v1`,
            sha256: originalUpload.sha256,
          };
        }
      }

      if (assetClaim) {
        const completion = await this.postMediaIndex('complete', {
          ...assetClaim,
          mediaItem: videoItem,
        });
        if (completion.ok !== true) throw new Error('O vídeo foi enviado, mas o registro no acervo não foi confirmado.');
      }
      return { ...videoItem, reused: false };
    } else {
      // Process Image
      const imagePkg = await optimizeImageFile(file);
      if (options?.onProgress) options.onProgress(40);

      const variantsMap: MediaItem['variants'] = {};
      const stepIncrement = 50 / imagePkg.variants.length;
      let currentProgress = 40;

      for (const variant of imagePkg.variants) {
        const variantConfig = VARIANT_CONFIGS.find((config) => config.name === variant.name);
        const quality = Math.round((variantConfig?.quality || 0.8) * 100);
        const maxTargetBytes = variantConfig?.maxTargetBytes || 0;
        const transformKey = `image:${variant.name}:${variant.width}x${variant.height}:webp:q${quality}:max${maxTargetBytes}:clarity12:${IMAGE_TRANSFORM_VERSION}`;
        const variantKey = `${basePath}/variants/${variant.name}-${variant.width}x${variant.height}-q${quality}-${IMAGE_TRANSFORM_VERSION}.webp`;
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
          mimeType: 'image/webp',
          transformKey,
          sha256: res.sha256,
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
        processingVersion: `image:${IMAGE_TRANSFORM_VERSION}:${VARIANT_CONFIGS.map((item) => `${item.name}-${item.maxWidth}x${item.maxHeight}-${item.quality}-${item.maxTargetBytes}`).join('_')}`,
      };

      if (assetClaim) {
        const completion = await this.postMediaIndex('complete', {
          ...assetClaim,
          mediaItem: imageItem,
        });
        if (completion.ok !== true) throw new Error('A foto foi enviada, mas o registro no acervo não foi confirmado.');
      }
      return { ...imageItem, reused: false };
    }
    } catch (error) {
      if (assetClaim) {
        await this.markUploadFailed(assetClaim).catch(() => {});
      }
      throw error;
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
        return await this.provider.deleteMany(keysToDelete, [media.id]);
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
