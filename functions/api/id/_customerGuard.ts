/**
 * Customer Guard & Cookie Management — NUA ID
 *
 * Garante:
 * - Cookie HttpOnly, SameSite=Lax, Secure (em HTTPS, com prefixo __Host-)
 * - Sessão de cliente 100% isolada da autenticação do painel administrativo
 * - Verificação no servidor a cada requisição protegida (invariante 3)
 * - Rejeição imediata de sessões revogadas, expiradas ou perfis anonimizados
 */

import { verifySessionCookie, signSessionCookie } from './_crypto';
import {
  CustomerProfile,
  CustomerSessionRecord,
  getCustomerSessionById,
  getProfileById,
  NuaIdEnv,
  saveCustomerSession,
} from './_nuaIdStore';

export const PROD_SESSION_COOKIE_NAME = '__Host-nua_id_session';
export const DEV_SESSION_COOKIE_NAME = 'nua_id_session';
export const SESSION_HINT_COOKIE_NAME = 'nua_id_hint';
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 dias

import { getNuaIdSecret, isProductionEnv } from '../_central/secrets';

export function getIdSecret(env: NuaIdEnv): string | null {
  const dedicated = getNuaIdSecret(env as any);
  if (dedicated) return dedicated;

  // Em produção nunca reutiliza ADMIN_API_SECRET no domínio de cliente (NUA-AUD-016)
  if (!isProductionEnv(env as any)) {
    const devFallback =
      env?.ADMIN_API_SECRET ||
      (typeof process !== 'undefined'
        ? process.env?.NUA_ID_SECRET || process.env?.ADMIN_API_SECRET
        : undefined);
    if (devFallback && typeof devFallback === 'string' && devFallback.trim()) {
      return devFallback.trim();
    }
  }
  return null;
}

export function isHttpsRequest(request: Request): boolean {
  try {
    const url = new URL(request.url);
    if (url.protocol === 'https:') return true;
    const xfProto = request.headers.get('x-forwarded-proto');
    if (xfProto === 'https') return true;
  } catch {}
  return false;
}

export function extractCustomerSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  let devFallback: string | null = null;

  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (name === PROD_SESSION_COOKIE_NAME && val) {
      return decodeURIComponent(val);
    }
    if (name === DEV_SESSION_COOKIE_NAME && val) {
      devFallback = decodeURIComponent(val);
    }
  }
  return devFallback;
}

export async function buildCustomerSessionCookieHeader(
  sessionId: string,
  secret: string,
  request: Request,
  maxAgeSeconds = SESSION_DURATION_SECONDS
): Promise<string> {
  const signed = await signSessionCookie(sessionId, secret);
  const secure = isHttpsRequest(request);
  const name = secure ? PROD_SESSION_COOKIE_NAME : DEV_SESSION_COOKIE_NAME;
  const parts = [
    `${name}=${encodeURIComponent(signed)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildCustomerHintCookieHeader(
  request: Request,
  maxAgeSeconds = SESSION_DURATION_SECONDS
): string {
  const secure = isHttpsRequest(request);
  const parts = [
    `${SESSION_HINT_COOKIE_NAME}=1`,
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearCustomerSessionCookies(request: Request): string[] {
  const secure = isHttpsRequest(request);
  const cookies = [
    `${DEV_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    `${SESSION_HINT_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
  ];
  if (secure) {
    cookies.push(
      `${PROD_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    );
  }
  return cookies;
}

export interface AuthenticatedCustomerContext {
  session: CustomerSessionRecord;
  profile: CustomerProfile;
}

/**
 * Resolve e valida a sessão atual do cliente sem lançar erro.
 */
export async function resolveCustomerSession(
  request: Request,
  env: NuaIdEnv
): Promise<AuthenticatedCustomerContext | null> {
  const secret = getIdSecret(env);
  if (!secret) return null;

  const rawCookie = extractCustomerSessionCookie(request);
  if (!rawCookie) return null;

  const sessionId = await verifySessionCookie(rawCookie, secret);
  if (!sessionId) return null;

  const session = await getCustomerSessionById(env, sessionId);
  if (!session || session.isRevoked) return null;

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const profile = await getProfileById(env, session.profileId);
  if (!profile || profile.status !== 'active') {
    return null;
  }

  // Rejeita sessões criadas antes de uma revogação global (exceto a sessão mantida ativa explicitamente)
  if (
    profile.sessionsValidAfter &&
    session.id !== profile.sessionsExemptId &&
    new Date(session.createdAt).getTime() < new Date(profile.sessionsValidAfter).getTime()
  ) {
    return null;
  }

  // Atualiza lastSeenAt no máximo a cada 15 minutos para evitar escritas excessivas
  const lastSeenMs = new Date(session.lastSeenAt || 0).getTime();
  if (Date.now() - lastSeenMs > 15 * 60 * 1000) {
    session.lastSeenAt = new Date().toISOString();
    await saveCustomerSession(env, session).catch(() => {});
  }

  return { session, profile };
}

/**
 * Exige sessão válida de cliente. Retorna `{ ok: true, session, profile }` ou `{ ok: false, response }`.
 */
export async function requireCustomer(
  request: Request,
  env: NuaIdEnv
): Promise<
  | { ok: true; session: CustomerSessionRecord; profile: CustomerProfile }
  | { ok: false; response: Response }
> {
  const ctx = await resolveCustomerSession(request, env);
  if (!ctx) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          success: false,
          authenticated: false,
          error: 'Sessão expirada ou não autenticada. Entre novamente na sua conta NUA ID.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          },
        }
      ),
    };
  }
  return { ok: true, session: ctx.session, profile: ctx.profile };
}

/**
 * Formata rótulo legível e discreto do dispositivo a partir do User-Agent.
 */
export function parseDeviceLabel(userAgent: string | null): string {
  const ua = userAgent || '';
  if (!ua) return 'Navegador desconhecido';

  let os = 'Desktop';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Navegador';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return `${browser} em ${os}`;
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}
