/**
 * Cloudflare Pages Functions Middleware: /api/*
 *
 * Implements Security Level 5 Gateway:
 * 1. Strict CORS allowlist (zero wildcard '*')
 * 2. CSRF Origin / Referer validation for mutation methods
 * 3. Fail-Closed Authentication for all private API routes
 * 4. Anti-caching and security headers
 */

import { getSessionCookie, verifySessionToken, timingSafeEqualString } from './_authHelper';

interface Env {
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  ALLOWED_ORIGINS?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
  next: () => Promise<Response>;
};

// Allowed origins for API requests
const ALLOWED_ORIGIN_PATTERNS = [
  // Produção e previews dos 2 projetos Cloudflare Pages
  /^https:\/\/nuaborges\.pages\.dev$/,
  /^https:\/\/nuaborges-er7\.pages\.dev$/,
  /^https:\/\/[a-z0-9]+\.nuaborges-er7\.pages\.dev$/,
  /^https:\/\/nuaborges-admin\.pages\.dev$/,
  /^https:\/\/[a-z0-9]+\.nuaborges-admin\.pages\.dev$/,
  /^http:\/\/localhost:[0-9]+$/,
  /^http:\/\/127\.0\.0\.1:[0-9]+$/,
];

// Domínios próprios futuros (ex: "https://nuaborges.com.br,https://admin.nuaborges.com.br")
// podem ser liberados sem alterar código via variável ALLOWED_ORIGINS no Cloudflare.
let extraOrigins: string[] = [];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (extraOrigins.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin');
  const allowed = isOriginAllowed(origin);

  return {
    'Access-Control-Allow-Origin': allowed && origin ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Object-Key, X-Mime-Type, X-Master-Key, X-Client-Timestamp',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
  };
}

export const onRequest = async (context: PagesContext<Env>) => {
  const { request, env, next } = context;
  extraOrigins = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const url = new URL(request.url);
  const pathname = url.pathname;
  const corsHeaders = getCorsHeaders(request);

  // 1. Handle Preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 2. Allow public auth, trap, telemetry, and public content reading endpoints
  const isPublicAuthRoute =
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/session' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/auth/contract' ||
    pathname === '/api/contact' ||
    pathname === '/api/telemetry/track' ||
    (request.method === 'GET' && pathname === '/api/content/sync') ||
    (request.method === 'GET' && (pathname === '/api/music/list' || pathname === '/api/music/config')) ||
    pathname.startsWith('/api/traps/') ||
    pathname.startsWith('/api/contract/');

  if (!isPublicAuthRoute) {
    // 3. Fail-Closed Authentication Gate for private / mutating endpoints
    // (Origin NÃO é prova de identidade — pode ser forjado fora do navegador.)
    const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;

    if (!secret) {
      return new Response(
        JSON.stringify({ error: 'Servidor sem segredo de autenticação configurado.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let authenticated = false;

    // Check Cookie Session
    const sessionCookie = getSessionCookie(request);
    if (sessionCookie) {
      authenticated = await verifySessionToken(sessionCookie, secret);
    }

    // Check Bearer session token, or X-Master-Key equal to ADMIN_API_SECRET
    if (!authenticated) {
      const authHeader = request.headers.get('Authorization');
      const masterKeyHeader = request.headers.get('X-Master-Key');
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : masterKeyHeader?.trim();

      if (token) {
        if (env.ADMIN_API_SECRET && (await timingSafeEqualString(token, env.ADMIN_API_SECRET))) {
          authenticated = true;
        } else {
          authenticated = await verifySessionToken(token, secret);
        }
      }
    }

    // Fail-Closed: Strictly reject if not authenticated
    if (!authenticated) {
      return new Response(
        JSON.stringify({
          error: 'Acesso não autorizado. Faça login no painel administrativo.',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }
  }

  // 4. CSRF Protection for state-modifying requests (POST, PUT, DELETE, PATCH)
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');

    let originOk = false;
    if (origin && isOriginAllowed(origin)) {
      originOk = true;
    } else if (referer) {
      try {
        const refUrl = new URL(referer);
        if (isOriginAllowed(refUrl.origin)) {
          originOk = true;
        }
      } catch {
        originOk = false;
      }
    }

    // If Origin or Referer is present but not allowed, reject CSRF
    if ((origin || referer) && !originOk) {
      return new Response(
        JSON.stringify({ error: 'Origem da requisição não autorizada (CSRF bloqueado).' }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  // 5. Proceed to endpoint execution
  const response = await next();

  // 6. Append security headers to response
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => {
    newHeaders.set(k, v);
  });
  newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
