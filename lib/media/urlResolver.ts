/**
 * Decoupled Media URL Resolver & Responsive Helper
 *
 * Ensures that no component has hardcoded storage or CDN domains.
 * All URLs are resolved dynamically against the active environment configuration.
 */

import { MEDIA_CONFIG } from './config';
import { MediaItem } from './types';

export type MediaVariantName = 'thumb' | 'mobile' | 'full' | 'original';

/**
 * Resolves an objectKey or existing URL into a fully qualified CDN URL.
 *
 * Examples:
 * - resolveMediaUrl('/images/nua/hero/hero-1.jpg') -> '/images/nua/hero/hero-1.jpg'
 * - resolveMediaUrl('data:image/webp;base64,...') -> 'data:image/webp;base64,...'
 * - resolveMediaUrl('media/abc123/full.webp') -> '/media/abc123/full.webp'
 */
export function resolveMediaUrl(
  keyOrUrl: string | undefined | null,
  variant?: MediaVariantName
): string {
  if (!keyOrUrl) return '';

  // Data URLs (base64) - retorna imediatamente sem tocar
  if (keyOrUrl.startsWith('data:')) {
    return keyOrUrl;
  }

  // Already an absolute HTTP/HTTPS URL
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    return keyOrUrl;
  }

  // Local static asset in public folder (e.g. /images/..., /icon.svg) - exceto /media/ que suporta variantes e armazenamento
  if (keyOrUrl.startsWith('/') && !keyOrUrl.startsWith('/media/')) {
    return keyOrUrl;
  }

  // Clean object key
  let cleanKey = keyOrUrl.replace(/^(r2|b2|s3):\/\//, '').replace(/^\/+/, '');

  const lowerKey = cleanKey.toLowerCase();
  const isVideoKey =
    lowerKey.endsWith('.mp4') ||
    lowerKey.endsWith('.webm') ||
    lowerKey.endsWith('.mov') ||
    lowerKey.endsWith('.m4v') ||
    lowerKey.includes('/video.');

  const isPosterKey =
    lowerKey.endsWith('/poster.webp') ||
    lowerKey.endsWith('/poster.jpg') ||
    lowerKey.endsWith('/poster.png') ||
    lowerKey.endsWith('/poster.jpeg') ||
    lowerKey.includes('/poster.');

  // If a specific variant is requested for IMAGES, adapt variant key if needed.
  // NEVER adapt variants for video files or video poster frames.
  if (variant && !isVideoKey && !isPosterKey && !cleanKey.includes(`/${variant}.`)) {
    const parentFolder = cleanKey.includes('/')
      ? cleanKey.substring(0, cleanKey.lastIndexOf('/'))
      : cleanKey;
    cleanKey = `${parentFolder}/${variant}.webp`;
  }

  const cdnBase = MEDIA_CONFIG.cdn.baseUrl;
  if (!cdnBase) {
    // If no CDN is configured, return as root relative path
    return `/${cleanKey}`;
  }

  return `${cdnBase}/${cleanKey}`;
}

/**
 * Generates an HTML srcset string for responsive image loading
 * using the multi-size variants stored in Backblaze B2.
 */
export function getResponsiveSrcSet(media: MediaItem): string | undefined {
  if (!media.variants) return undefined;

  const parts: string[] = [];
  if (media.variants.thumb) {
    parts.push(`${resolveMediaUrl(media.variants.thumb.key)} 400w`);
  }
  if (media.variants.mobile) {
    parts.push(`${resolveMediaUrl(media.variants.mobile.key)} 800w`);
  }
  if (media.variants.full) {
    parts.push(`${resolveMediaUrl(media.variants.full.key)} 1600w`);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}

/**
 * Returns standard recommended sizes attribute based on intended display container.
 */
export function getStandardSizes(context: 'hero' | 'gallery' | 'about' | 'card'): string {
  switch (context) {
    case 'hero':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 58vw';
    case 'gallery':
      return '(max-width: 640px) 280px, (max-width: 1024px) 350px, 390px';
    case 'about':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 42vw';
    case 'card':
    default:
      return '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';
  }
}

/**
 * Robust detection of whether a media item or URL is a video.
 * Checks item.isVideo, mimeType, URL patterns, filename patterns.
 */
export function isMediaVideo(
  itemOrUrl:
    | { isVideo?: boolean; url?: string; name?: string; mimeType?: string }
    | string
    | null
    | undefined
): boolean {
  if (!itemOrUrl) return false;
  if (typeof itemOrUrl === 'string') {
    const lower = itemOrUrl.toLowerCase();
    return (
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.m4v') ||
      lower.includes('/video.') ||
      lower.includes('.mp4?') ||
      lower.includes('.webm?') ||
      lower.includes('.mov?')
    );
  }
  if (itemOrUrl.isVideo) return true;
  if (itemOrUrl.mimeType && itemOrUrl.mimeType.toLowerCase().startsWith('video/')) return true;
  return isMediaVideo(itemOrUrl.url) || isMediaVideo(itemOrUrl.name);
}

/**
 * Resolves the actual playable video source and poster URL.
 * Automatically transforms poster.webp to video.mp4 when needed.
 */
export function resolveVideoPlaySource(
  itemOrUrl:
    | { isVideo?: boolean; url?: string; posterUrl?: string; variants?: any }
    | string
    | null
    | undefined
): { videoUrl: string; posterUrl: string } {
  if (!itemOrUrl) return { videoUrl: '', posterUrl: '' };

  let rawUrl = '';
  let rawPoster = '';

  if (typeof itemOrUrl === 'string') {
    rawUrl = itemOrUrl;
  } else {
    rawUrl = itemOrUrl.variants?.original?.url || itemOrUrl.url || '';
    rawPoster = itemOrUrl.posterUrl || '';
  }

  let videoUrl = rawUrl;
  if (videoUrl.includes('/poster.webp')) {
    videoUrl = videoUrl.replace('/poster.webp', '/video.mp4');
  }

  // Apenas utiliza poster se ele realmente foi fornecido/gerado
  // NUNCA inventa poster.webp fictício que resulta em 404 e ícone de imagem quebrada
  const posterUrl = rawPoster;

  return {
    videoUrl: resolveMediaUrl(videoUrl),
    posterUrl: posterUrl ? resolveMediaUrl(posterUrl) : '',
  };
}
