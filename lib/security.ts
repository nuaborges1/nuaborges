/**
 * Security Level 5 Utility Library — Nua Borges
 *
 * Provides defensive programming primitives:
 * - URL and Protocol sanitization (anti-XSS)
 * - Safe text filtering
 * - Strict object key format validation (anti-IDOR & anti-path traversal)
 * - File signature / Magic Bytes verification (anti-MIME spoofing)
 */

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/**
 * Validates and sanitizes dynamic URLs rendered in href attributes or redirects.
 * Strictly prevents javascript:, data:, vbscript: and malformed payloads.
 */
export function sanitizeUrl(
  url: string | null | undefined,
  fallback = '#'
): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();

  // Allow internal hash anchors (#inicio, #galeria, etc.)
  if (trimmed.startsWith('#')) {
    // Only allow alphanumeric characters, hyphens and underscores in anchors
    return /^#[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : fallback;
  }

  // Allow relative paths starting with / (e.g. /admin, /images/...)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }

  // Allow mailto: only if formatted properly
  if (trimmed.toLowerCase().startsWith('mailto:')) {
    const emailPart = trimmed.substring(7).split('?')[0];
    if (isValidEmail(emailPart)) {
      return trimmed;
    }
    return fallback;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    // Enforce https: or http: only
    if (protocol === 'https:' || protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // Malformed URL, reject
    return fallback;
  }

  return fallback;
}

/**
 * Validates standard email addresses against RFC-5322 compatible regex.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Sanitizes plain text input, stripping HTML tags and control characters.
 */
export function sanitizeText(
  input: string | null | undefined,
  maxLength = 500
): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Strip potential HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Strip control characters
    .trim()
    .substring(0, maxLength);
}

/**
 * Strictly validates Cloudflare R2 object keys to prevent path traversal,
 * arbitrary overwrite, or deletion outside designated folders.
 */
export function isValidObjectKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;

  // Max key length
  if (key.length > 512 || key.length < 5) return false;

  // Forbid path traversal, null bytes, double slashes, leading/trailing slashes
  if (
    key.includes('..') ||
    key.includes('\0') ||
    key.includes('//') ||
    key.startsWith('/') ||
    key.endsWith('/')
  ) {
    return false;
  }

  // Must reside strictly inside the 'media/' namespace
  if (!key.startsWith('media/')) {
    return false;
  }

  // Allowed character set: alphanumeric, hyphens, underscores, dots, and single slashes
  return /^[a-zA-Z0-9_\-\.\/]+$/.test(key);
}

/**
 * Validates file signature (Magic Bytes) from raw binary buffer.
 * Ensures an uploaded file matches its declared MIME type and prevents
 * executable/script disguised as images.
 */
export function verifyMagicBytes(
  bytes: Uint8Array
): { valid: boolean; detectedMime?: string; error?: string } {
  if (!bytes || bytes.length < 12) {
    return { valid: false, error: 'Arquivo muito pequeno ou cabeçalho inválido.' };
  }

  // 1. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // 3. WebP: 'RIFF' .... 'WEBP'
  const isRiff =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebp =
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isRiff && isWebp) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  // 4. MP4 / MOV: 'ftyp' starting at byte offset 4
  if (
    bytes[4] === 0x66 && // 'f'
    bytes[5] === 0x74 && // 't'
    bytes[6] === 0x79 && // 'y'
    bytes[7] === 0x70 // 'p'
  ) {
    return { valid: true, detectedMime: 'video/mp4' };
  }

  // 5. WebM: EBML header (1A 45 DF A3)
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return { valid: true, detectedMime: 'video/webm' };
  }

  return { valid: false, error: 'Assinatura binária (magic bytes) incompatível.' };
}
