/**
 * Guardião de Host, CORS Estrito e Headers HTTP de Segurança.
 *
 * - Bloqueia origens fora da allowlist (HTTPS obrigatório em produção, zero wildcard '*').
 * - Impede que rotas exclusivamente administrativas respondam no host público `nuaborges.com.br`
 *   quando em produção, reduzindo superfície de ataque e respeitando barreiras do Cloudflare Access.
 * - Aplica headers de hardening (CSP default-src 'none', Permissions-Policy, HSTS, nosniff, DENY).
 */

import type { CentralEnv, RouteSurface } from './types';

export const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/nuaborges\.com\.br$/,
  /^https:\/\/([a-z0-9-]+\.)*nuaborges\.com\.br$/,
  /^https:\/\/nuaborges\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]{6,63}\.nuaborges\.pages\.dev$/,
  /^https:\/\/nuaborges-er7\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]{6,63}\.nuaborges-er7\.pages\.dev$/,
  /^https:\/\/nuaborges-staging\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]{2,63}\.nuaborges-staging\.pages\.dev$/,
  /^https:\/\/nuaborges-admin\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]{6,63}\.nuaborges-admin\.pages\.dev$/,
  /^https:\/\/nuaborges-admin-staging\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]{2,63}\.nuaborges-admin-staging\.pages\.dev$/,
  /^https:\/\/admingeral\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]{6,63}\.admingeral\.pages\.dev$/,
  /^https:\/\/([a-z0-9-]+\.)*phdev\.store$/,
];

const LOCAL_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:[0-9]+$/,
  /^http:\/\/127\.0\.0\.1:[0-9]+$/,
];

const ADMIN_HOST_PATTERNS = [
  /^admin\.nuaborges\.com\.br$/,
  /^admingeral\.nuaborges\.com\.br$/,
  /^nuaborges-admin\.pages\.dev$/,
  /^[a-z0-9-]{6,63}\.nuaborges-admin\.pages\.dev$/,
  /^nuaborges-admin-staging\.pages\.dev$/,
  /^[a-z0-9-]{2,63}\.nuaborges-admin-staging\.pages\.dev$/,
  /^admingeral\.pages\.dev$/,
  /^[a-z0-9-]{6,63}\.admingeral\.pages\.dev$/,
  /^([a-z0-9-]+\.)*phdev\.store$/,
];

export function collectExtraOrigins(env: CentralEnv): string[] {
  const list = String(env?.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (env?.NEXT_PUBLIC_SITE_URL) {
    list.push(String(env.NEXT_PUBLIC_SITE_URL).trim().replace(/\/$/, ''));
  }
  return list;
}

export function isOriginAllowed(
  origin: string | null,
  extraOrigins: string[],
  allowLocal: boolean
): boolean {
  if (!origin) return false;
  if (extraOrigins.includes(origin)) return true;
  if (ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin))) return true;
  if (allowLocal && LOCAL_ORIGIN_PATTERNS.some((p) => p.test(origin))) return true;
  return false;
}

export function isAdminHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  return ADMIN_HOST_PATTERNS.some((p) => p.test(h));
}

/**
 * Verifica se o host da requisição tem permissão para servir a superfície da rota.
 * Em produção, rotas puramente `admin`/`superadmin` exigem host administrativo
 * (`admin.nuaborges.com.br`, `*.nuaborges-admin.pages.dev`, `phdev.store`),
 * exceto quando env.ALLOW_ADMIN_ON_PUBLIC_HOST === 'true' (flag de transição opcional).
 */
export function isHostAllowedForSurface(
  url: URL,
  surface: RouteSurface,
  isProd: boolean,
  env: CentralEnv
): boolean {
  if (!isProd) return true;
  if (surface !== 'admin' && surface !== 'superadmin') return true;
  if (String(env?.ALLOW_ADMIN_ON_PUBLIC_HOST || '').toLowerCase() === 'true') return true;
  return isAdminHost(url.hostname);
}

export function buildCorsHeaders(
  request: Request,
  extraOrigins: string[],
  allowLocal: boolean
): Record<string, string> {
  const origin = request.headers.get('Origin');
  let allowed = isOriginAllowed(origin, extraOrigins, allowLocal);

  if (!allowed && origin) {
    try {
      const reqUrl = new URL(request.url);
      if (reqUrl.origin === origin) allowed = true;
    } catch {}
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Object-Key, X-Mime-Type, X-Object-SHA256, X-Master-Key, X-Client-Timestamp, X-Signature, X-Request-Id, X-Nua-Client, Cache-Control, Pragma, If-Modified-Since, Range',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
  };

  if (allowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function applySecurityHeaders(
  response: Response,
  corsHeaders: Record<string, string>,
  url: URL,
  correlationId: string
): Response {
  const headers = new Headers(response.headers);

  if (!corsHeaders['Access-Control-Allow-Origin']) {
    headers.delete('Access-Control-Allow-Origin');
  }
  for (const [k, v] of Object.entries(corsHeaders)) {
    headers.set(k, v);
  }
  if (corsHeaders['Access-Control-Allow-Origin']) {
    headers.append('Vary', 'Origin');
  }

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  headers.set('X-Correlation-Id', correlationId);

  if (url.protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
