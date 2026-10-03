/**
 * Edge Authentication & Cryptography Helper — Cloudflare Pages Functions
 *
 * Implements:
 * - Constant-time string comparison (timing attack defense)
 * - HMAC-SHA256 cryptographic session token generation and verification
 * - Secure cookie extraction and formatting
 */

const DEFAULT_FALLBACK_SECRET = 'nua-borges-edge-auth-secret-key-v1-2026';

function toUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Constant-time string comparison preventing timing side-channel attacks.
 * Operates across Node.js, V8 isolates, and Cloudflare Edge runtimes.
 */
export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
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
 * Derives an HMAC-SHA256 CryptoKey from a secret string.
 */
async function getHmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    toUint8Array(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Creates a signed session token: <base64Payload>.<base64Signature>
 */
export async function createSessionToken(
  secret: string,
  expiresInSeconds = 86400
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = toBase64Url(nonceBytes);

  const payloadObj = {
    sub: 'admin',
    iat: now,
    exp: now + expiresInSeconds,
    nonce,
  };

  const payloadStr = JSON.stringify(payloadObj);
  const payloadB64 = toBase64Url(toUint8Array(payloadStr));

  const key = await getHmacKey(secret || DEFAULT_FALLBACK_SECRET);
  const signature = await crypto.subtle.sign('HMAC', key, toUint8Array(payloadB64));
  const sigB64 = toBase64Url(signature);

  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifies a signed session token. Returns true if valid and unexpired.
 */
export async function verifySessionToken(
  token: string | null | undefined,
  secret: string
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, sigB64] = parts;

  try {
    const key = await getHmacKey(secret || DEFAULT_FALLBACK_SECRET);
    const sigBytes = fromBase64Url(sigB64);
    const validSig = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      toUint8Array(payloadB64)
    );

    if (!validSig) return false;

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== 'number' || now >= payload.exp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts the __Host-Admin-Session cookie value from request headers.
 */
export function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const c of cookies) {
    const [name, ...val] = c.trim().split('=');
    if (name === '__Host-Admin-Session' || name === 'nua_admin_session') {
      return val.join('=');
    }
  }

  return null;
}

/**
 * Generates Set-Cookie header for __Host-Admin-Session
 */
export function buildSessionCookie(token: string, maxAge = 86400): string {
  // Use __Host- prefix in production HTTPS environments
  const isSecure = true;
  const name = isSecure ? '__Host-Admin-Session' : 'nua_admin_session';
  return `${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

/**
 * Generates deletion Set-Cookie header
 */
export function buildClearCookie(): string {
  return `__Host-Admin-Session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0, nua_admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
