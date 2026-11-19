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
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
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
 * Strictly validates object storage keys (Backblaze B2) to prevent path traversal,
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

  // WebM / MKV: EBML header (1A 45 DF A3)
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return { valid: true, detectedMime: 'video/webm' };
  }

  // MP4 / MOV / QuickTime / M4A: Flexible ISOBMFF Box Scanner in first 128 bytes
  // Scans for atoms: 'ftyp', 'moov', 'mdat', 'wide', 'free', 'skip', 'qt  '
  const maxScan = Math.min(bytes.length - 3, 128);
  let hasFtyp = false;
  let hasMoovOrMdat = false;
  let isQuickTimeBrand = false;
  let isAudioBrand = false;
  let isAvifBrand = false;

  for (let i = 0; i < maxScan; i++) {
    const tag = String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
    if (tag === 'ftyp') {
      hasFtyp = true;
      if (i + 7 < bytes.length) {
        const brand = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
        if (brand === 'qt  ' || brand === 'moov') {
          isQuickTimeBrand = true;
        } else if (brand === 'M4A ' || brand === 'M4B ' || brand === 'f4v ') {
          isAudioBrand = true;
        } else if (brand === 'avif' || brand === 'avis') {
          isAvifBrand = true;
        }
      }
    } else if (tag === 'moov' || tag === 'mdat' || tag === 'wide' || tag === 'free' || tag === 'skip' || tag === 'qt  ') {
      hasMoovOrMdat = true;
    }
  }

  if (hasFtyp || hasMoovOrMdat) {
    if (isAvifBrand) return { valid: true, detectedMime: 'image/avif' };
    if (isAudioBrand) {
      return { valid: true, detectedMime: 'audio/mp4' };
    }
    if (isQuickTimeBrand) {
      return { valid: true, detectedMime: 'video/quicktime' };
    }
    return { valid: true, detectedMime: 'video/mp4' };
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

/**
 * Validador estrito de ambiente para simulação de pagamentos.
 *
 * GARANTIA ABSOLUTA DE SEGURANÇA CONTRA VAZAMENTO PARA PRODUÇÃO:
 * - Em PRODUÇÃO (nuaborges.com, nuaborges.pages.dev, Cloudflare Pages Edge):
 *   Retorna estritamente FALSE. Qualquer flag de simulação, parâmetro bypass ou rota de teste
 *   é sumariamente rejeitada com 403 Forbidden.
 * - Em LOCALHOST (desenvolvimento estrito em http://localhost ou 127.0.0.1 com ENVIRONMENT != 'production'):
 *   Retorna TRUE, permitindo testes rápidos de compra sem cobrança real.
 */
export function isLocalhostPaymentSimulationAllowed(request: Request, env: any): boolean {
  // 1. Variáveis de ambiente Cloudflare / Node
  const envName = (
    env?.ENVIRONMENT ||
    env?.NODE_ENV ||
    (typeof process !== 'undefined' ? process.env?.NODE_ENV : '') ||
    ''
  ).toLowerCase();

  if (envName === 'production') {
    return false;
  }

  // 2. Análise da URL da requisição
  try {
    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const isLocalHostname = (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local')
    );

    if (!isLocalHostname) {
      return false;
    }

    // 3. Validação do Host header (Anti Host-Header Injection)
    const hostHeader = (request.headers.get('host') || '').toLowerCase().split(':')[0];
    if (
      hostHeader !== 'localhost' &&
      hostHeader !== '127.0.0.1' &&
      hostHeader !== '[::1]' &&
      !hostHeader.endsWith('.local')
    ) {
      return false;
    }

    // 4. Se houver CF-Connecting-IP de rede pública externa, não é localhost
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    if (cfConnectingIp && cfConnectingIp !== '127.0.0.1' && cfConnectingIp !== '::1') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

