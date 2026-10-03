/**
 * Decoupled Media URL Resolver & Responsive Helper
 *
 * Ensures that no component has hardcoded Cloudflare or CDN domains.
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
 * - resolveMediaUrl('media/abc123/full.webp') -> 'https://cdn.nuaborges.phstatic.com.br/media/abc123/full.webp'
 * - resolveMediaUrl('r2://media/abc123/full.webp') -> 'https://cdn.nuaborges.phstatic.com.br/media/abc123/full.webp'
 */
export function resolveMediaUrl(
  keyOrUrl: string | undefined | null,
  variant?: MediaVariantName
): string {
  if (!keyOrUrl) return '';

  // Already an absolute HTTP/HTTPS URL
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    return keyOrUrl;
  }

  // Base64 Data URL
  if (keyOrUrl.startsWith('data:')) {
    return keyOrUrl;
  }

  // Local static asset in public folder
  if (keyOrUrl.startsWith('/')) {
    return keyOrUrl;
  }

  // Clean object key
  let cleanKey = keyOrUrl.replace(/^r2:\/\//, '').replace(/^\/+/, '');

  // If a specific variant is requested and the key ends in /{some-variant}.webp,
  // we can adapt it if needed:
  if (variant && !cleanKey.includes(`/${variant}.`)) {
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
 * using the multi-size variants stored in Cloudflare R2.
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
