/**
 * Security Level 5 Utility Library — Nua Borges
 * (Copy local às Pages Functions para resolução correta pelo Wrangler)
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
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
  'audio/flac',
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

  if (trimmed.startsWith('#')) {
    return /^#[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : fallback;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }

  if (trimmed.toLowerCase().startsWith('mailto:')) {
    const emailPart = trimmed.substring(7).split('?')[0];
    if (isValidEmail(emailPart)) return trimmed;
    return fallback;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'https:' || protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
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
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .substring(0, maxLength);
}

/**
 * Strictly validates Cloudflare R2 object keys to prevent path traversal,
 * arbitrary overwrite, or deletion outside designated folders.
 */
export function isValidObjectKey(key: string | null | undefined): boolean {
  if (!key || typeof key !== 'string') return false;

  if (key.length > 512 || key.length < 5) return false;

  if (
    key.includes('..') ||
    key.includes('\0') ||
    key.includes('//') ||
    key.startsWith('/') ||
    key.endsWith('/')
  ) {
    return false;
  }

  if (!key.startsWith('media/') && !key.startsWith('audio/')) {
    return false;
  }

  return /^[a-zA-Z0-9_\-\.\/]+$/.test(key);
}

/**
 * Validates file signature (Magic Bytes) from raw binary buffer.
 */
export function verifyMagicBytes(
  bytes: Uint8Array
): { valid: boolean; detectedMime?: string; error?: string } {
  if (!bytes || bytes.length < 12) {
    return { valid: false, error: 'Arquivo muito pequeno ou cabeçalho inválido.' };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
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

  // WebP: RIFF....WEBP
  const isRiff =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebp =
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isRiff && isWebp) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  // MP4: 'ftyp' at offset 4
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return { valid: true, detectedMime: 'video/mp4' };
  }

  // WebM: EBML header
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return { valid: true, detectedMime: 'video/webm' };
  }

  // MP3: ID3v2 header (ID3) or MPEG sync frame (FF FB / FF F3 / FF F2)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return { valid: true, detectedMime: 'audio/mpeg' };
  }
  if (bytes[0] === 0xff && (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2)) {
    return { valid: true, detectedMime: 'audio/mpeg' };
  }

  // WAV: RIFF....WAVE
  const isRiffWav =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWave =
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
  if (isRiffWav && isWave) {
    return { valid: true, detectedMime: 'audio/wav' };
  }

  // M4A / AAC: ftyp at offset 4 (same as MP4 — detect M4A by brand)
  if (
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    // M4A brands: M4A , M4B , isom, mp42
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === 'M4A ' || brand === 'M4B ' || brand === 'f4v ') {
      return { valid: true, detectedMime: 'audio/mp4' };
    }
    // Already caught as video/mp4 above for other brands — we allow both
    return { valid: true, detectedMime: 'video/mp4' };
  }

  // OGG: OggS
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return { valid: true, detectedMime: 'audio/ogg' };
  }

  // FLAC: fLaC
  if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return { valid: true, detectedMime: 'audio/flac' };
  }

  return { valid: false, error: 'Assinatura binária (magic bytes) incompatível.' };
}
