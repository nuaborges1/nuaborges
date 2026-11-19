import { LibraryImageItem } from '../types';
import { mediaService, resolveMediaUrl } from '../media';
import { invalidateMediaListCache } from '../media/mediaListCache';

export async function optimizeAndStoreImage(
  file: File,
  onProgress?: (percent: number) => void,
  accessScope: 'public' | 'private' = 'public'
): Promise<LibraryImageItem> {
  const media = await mediaService.uploadMedia(file, {
    fileName: file.name,
    mimeType: file.type,
    accessScope,
    onProgress,
  });

  const displayUrl = media.isVideo
    ? (media.variants?.original?.url || resolveMediaUrl(media.objectKey))
    : (media.variants?.full?.url || media.variants?.mobile?.url || resolveMediaUrl(media.objectKey));

  const newImage: LibraryImageItem = {
    id: media.id,
    name: media.name,
    url: displayUrl,
    objectKey: media.objectKey,
    uploadedAt: media.uploadedAt,
    usedIn: [],
    sizeBytes: media.sizeBytes,
    width: media.width,
    height: media.height,
    durationSeconds: media.durationSeconds,
    duration: media.durationSeconds
      ? `${Math.floor(media.durationSeconds / 60)}:${String(media.durationSeconds % 60).padStart(2, '0')}`
      : undefined,
    isVideo: media.isVideo,
    posterUrl: media.posterUrl,
    provider: media.provider,
    fileHash: media.fingerprint,
    originalSizeBytes: media.originalSizeBytes,
    savingsPercentage: media.savingsPercentage,
    bitrateKbps: media.bitrateKbps,
    wasFastStartApplied: media.wasFastStartApplied,
    variants: media.variants,
  };

  invalidateMediaListCache();
  return newImage;
}

export async function deleteStoredMedia(item: LibraryImageItem): Promise<boolean> {
  const rawObjectKey = item.objectKey || item.url;
  let objectKey = rawObjectKey;
  try {
    if (/^https?:\/\//i.test(rawObjectKey)) objectKey = new URL(rawObjectKey).pathname.replace(/^\/+/, '');
  } catch { /* the API will reject malformed keys safely */ }
  const result = await mediaService.deleteMedia({
    id: item.id,
    name: item.name,
    objectKey,
    mimeType: item.isVideo ? 'video/mp4' : 'image/webp',
    sizeBytes: item.sizeBytes || 0,
    isVideo: Boolean(item.isVideo),
    posterKey: item.posterUrl
      ? (item.posterUrl.startsWith('http')
          ? new URL(item.posterUrl).pathname.replace(/^\/+/, '')
          : item.posterUrl.replace(/^\/+/, ''))
      : undefined,
    variants: item.variants || {},
    uploadedAt: item.uploadedAt,
    provider: item.provider || 'default',
  });
  invalidateMediaListCache();
  return result;
}
