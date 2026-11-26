/**
 * Criptografia autenticada (AES-256-GCM) e utilitários PKCE/State para OAuth Google.
 * 100% compatível com Cloudflare Workers / Pages Functions (Web Crypto API).
 */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(rawSecret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(rawSecret);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptToken(plaintext: string, secretKey: string): Promise<string> {
  if (!secretKey || secretKey.length < 16) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY ausente ou muito curta.');
  }
  const key = await deriveAesKey(secretKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  );
  return `v1:${bytesToBase64Url(iv)}:${bytesToBase64Url(ciphertext)}`;
}

export async function decryptToken(payload: string, secretKey: string): Promise<string> {
  if (!secretKey || secretKey.length < 16) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY ausente ou muito curta.');
  }
  const parts = String(payload || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw new Error('Formato de token criptografado inválido.');
  }
  const key = await deriveAesKey(secretKey);
  const iv = base64UrlToBytes(parts[1]);
  const ciphertext = base64UrlToBytes(parts[2]);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );
  return new TextDecoder().decode(decrypted);
}

export function generatePkceVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64Url(bytes);
}

export async function generatePkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function signOAuthState(payload: Record<string, unknown>, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const body = bytesToBase64Url(new TextEncoder().encode(json));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return `${body}.${bytesToBase64Url(sig)}`;
}

export async function verifyOAuthState<T = Record<string, unknown>>(
  token: string,
  secret: string
): Promise<T | null> {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const [body, sigB64] = parts;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sigBytes = base64UrlToBytes(sigB64);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes as BufferSource,
    new TextEncoder().encode(body)
  );
  if (!valid) return null;
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(body));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
