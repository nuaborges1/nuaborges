/**
 * Edge Authentication & Cryptography Helper — Cloudflare Pages Functions
 *
 * Implements:
 * - Constant-time string comparison (timing attack defense)
 * - HMAC-SHA256 cryptographic session token generation and verification
 * - Secure cookie extraction and formatting
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

function fromBase64Url(str: string): Uint8Array & BufferSource {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes as unknown as Uint8Array & BufferSource;
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
  if (!secret || typeof secret !== 'string') {
    throw new Error('Secret de autenticação ausente ou inválido.');
  }
  return await crypto.subtle.importKey(
    'raw',
    toUint8Array(secret) as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export type UserRole = 'dev' | 'client' | 'contract_dev' | 'contract_client' | 'admin';

export interface SessionPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
  nonce: string;
}

/**
 * Creates a signed session token: <base64Payload>.<base64Signature>
 */
export async function createSessionToken(
  secret: string,
  roleOrExpires: UserRole | number = 'dev',
  expiresInSeconds = 86400
): Promise<string> {
  if (!secret) {
    throw new Error('Impossível emitir token de sessão sem segredo de servidor configurado.');
  }
  const now = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = toBase64Url(nonceBytes);

  let role: UserRole = 'dev';
  let duration = expiresInSeconds;

  if (typeof roleOrExpires === 'number') {
    duration = roleOrExpires;
    role = 'admin';
  } else if (typeof roleOrExpires === 'string') {
    role = roleOrExpires;
  }

  const payloadObj: SessionPayload = {
    sub: role === 'dev' ? 'philippe_dev' : role === 'client' ? 'nayara_client' : role,
    role,
    iat: now,
    exp: now + duration,
    nonce,
  };

  const payloadStr = JSON.stringify(payloadObj);
  const payloadB64 = toBase64Url(toUint8Array(payloadStr));

  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    toUint8Array(payloadB64) as unknown as BufferSource
  );
  const sigB64 = toBase64Url(signature);

  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifies a signed session token and extracts the authenticated payload.
 * Returns null if invalid or expired.
 */
export async function parseAndVerifySessionToken(
  token: string | null | undefined,
  secret: string
): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string' || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;

  try {
    const key = await getHmacKey(secret);
    const sigBytes = fromBase64Url(sigB64);
    const validSig = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      toUint8Array(payloadB64) as unknown as BufferSource
    );

    if (!validSig) return null;

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadJson) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== 'number' || now >= payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Verifies a signed session token. Returns true if valid and unexpired.
 */
export async function verifySessionToken(
  token: string | null | undefined,
  secret: string
): Promise<boolean> {
  const payload = await parseAndVerifySessionToken(token, secret);
  return payload !== null;
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
  return `${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * Appends Set-Cookie deletion headers to a Response Headers collection
 */
export function appendClearCookies(headers: Headers): void {
  headers.append(
    'Set-Cookie',
    '__Host-Admin-Session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
  );
  headers.append(
    'Set-Cookie',
    'nua_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
  );
}

/**
 * Generates deletion Set-Cookie header
 */
export function buildClearCookie(): string {
  return '__Host-Admin-Session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

/**
 * Matriz Centralizada de Autorização por Papel (RBAC) — Nua Borges
 *
 * Papéis:
 * - 'admin' | 'dev': Acesso completo a todas as rotas privadas.
 * - 'client': Acesso às rotas do portal da cliente (solicitações autorizadas,
 *             parcelas financeiras para pagamento, Nua IA).
 *             Bloqueado em CMS, uploads/exclusões, finanças administrativas e auditoria.
 * - 'contract_client': Estritamente restrito a visualizar e assinar contrato como contratante.
 * - 'contract_dev': Estritamente restrito a visualizar e assinar contrato como desenvolvedor.
 */
export function isRouteAuthorizedForRole(
  pathname: string,
  method: string,
  role: UserRole,
  requestAction?: string
): boolean {
  // admin e dev possuem autorização irrestrita
  if (role === 'admin' || role === 'dev') {
    return true;
  }

  // contract_client: restrito estritamente a /api/contract/sign
  if (role === 'contract_client') {
    return pathname === '/api/contract/sign';
  }

  // contract_dev: restrito estritamente a /api/contract/sign
  if (role === 'contract_dev') {
    return pathname === '/api/contract/sign';
  }

  // client: portal da Nayara
  if (role === 'client') {
    // 1. Central de Solicitações
    if (pathname === '/api/requests') {
      if (method === 'GET') return true;
      if (method === 'POST') {
        // Permitido apenas ações de cliente: interview, create, message
        // Ações de 'delete' e 'update' (alterar status/plano) são exclusivas do dev/admin
        if (!requestAction || ['interview', 'create', 'message'].includes(requestAction)) {
          return true;
        }
        return false;
      }
    }

    // 2. Módulos Financeiros da Cliente (pagamento das parcelas)
    if (
      pathname === '/api/finance/installments' ||
      pathname === '/api/finance/create-preference' ||
      pathname === '/api/finance/pix' ||
      pathname === '/api/finance/verify'
    ) {
      return true;
    }

    // Bloqueia expressamente gestão financeira do desenvolvedor
    if (pathname === '/api/finance/admin') {
      return false;
    }

    // 3. Assistente Nua IA
    if (
      pathname === '/api/nua-ai/chat' ||
      pathname === '/api/nua-ai/conversations' ||
      pathname.startsWith('/api/nua-ai/conversations/') ||
      pathname === '/api/nua-ai/approve-action'
    ) {
      return true;
    }

    // 3b. Gestão Operacional da Cliente (Chamadas VIP, Personalizados, Feed de Pedidos e Financeiro Comercial)
    if (
      pathname === '/api/appointments/admin' ||
      pathname === '/api/appointments/sync' ||
      pathname === '/api/personalizados/admin' ||
      pathname === '/api/admin/orders-feed' ||
      pathname === '/api/admin/customers' ||
      pathname === '/api/stripe/dashboard'
    ) {
      return true;
    }

    // 4. Leitura do status do contrato
    if (pathname === '/api/contract/sign' && method === 'GET') {
      return true;
    }

    // 5. Leitura pública de conteúdo e música
    if (pathname === '/api/content/sync' && method === 'GET') {
      return true;
    }
    if ((pathname === '/api/music/list' || pathname === '/api/music/config') && method === 'GET') {
      return true;
    }

    // Qualquer outra rota de mutação de CMS, mídia, música ou telemetria administrativa é negada
    return false;
  }

  return false;
}

