/**
 * Criptografia e Segurança — Núcleo de Identidade NUA ID
 *
 * Utiliza exclusivamente Web Crypto API (SubtleCrypto) nativa:
 * - CSPRNG para códigos OTP e identificadores de sessão
 * - Hash criptográfico SHA-256 com sal para armazenamento de OTPs
 * - HMAC-SHA256 para assinatura de cookies de sessão
 * - Comparação segura em tempo constante (anti timing-attack)
 */

function toUint8Array(str: string): Uint8Array & BufferSource {
  return new TextEncoder().encode(str) as unknown as Uint8Array & BufferSource;
}

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Comparação em tempo constante para mitigar timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aLen = a.length;
  const bLen = b.length;
  const maxLen = Math.max(aLen, bLen);
  let result = aLen ^ bLen;
  for (let i = 0; i < maxLen; i++) {
    const charA = i < aLen ? a.charCodeAt(i) : 0;
    const charB = i < bLen ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  return result === 0;
}

/**
 * Gera código OTP numérico de 6 dígitos aleatório usando CSPRNG.
 */
export function generateOtpCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  // Garante distribuição uniforme entre 100000 e 999999
  const code = 100000 + (buf[0] % 900000);
  return code.toString();
}

/**
 * Gera token de sessão aleatório de 128 bits de entropia.
 */
export function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `sess_${hex}`;
}

/**
 * Gera hash SHA-256 do OTP com sal para que o código em texto plano
 * nunca permaneça desprotegido no banco de dados.
 */
export async function hashOtpCode(code: string, salt: string): Promise<string> {
  const input = `${salt}:${code.trim()}`;
  const digest = await crypto.subtle.digest('SHA-256', toUint8Array(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Assina um sessionId via HMAC-SHA256 para compor o cookie de sessão.
 */
export async function signSessionCookie(sessionId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    toUint8Array(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, toUint8Array(sessionId));
  const sigB64 = toBase64Url(signature);
  return `${sessionId}.${sigB64}`;
}

/**
 * Verifica a assinatura HMAC-SHA256 do cookie e retorna o sessionId íntegro.
 */
export async function verifySessionCookie(signedCookie: string | null | undefined, secret: string): Promise<string | null> {
  if (!signedCookie || !secret) return null;
  const parts = signedCookie.split('.');
  if (parts.length !== 2) return null;
  const [sessionId, providedSig] = parts;

  const key = await crypto.subtle.importKey(
    'raw',
    toUint8Array(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expectedSigBuffer = await crypto.subtle.sign('HMAC', key, toUint8Array(sessionId));
  const expectedSig = toBase64Url(expectedSigBuffer);

  if (!timingSafeEqual(providedSig, expectedSig)) {
    return null;
  }
  return sessionId;
}

/**
 * Anonymiza o IP do cliente gerando um hash truncado de 16 caracteres.
 */
export async function hashClientIp(ip: string | null | undefined, secret: string): Promise<string> {
  if (!ip) return 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', toUint8Array(`${secret}:${ip}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).slice(0, 16).join('');
}

export function getClientIp(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf && cf.trim()) return cf.trim();
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', toUint8Array(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
