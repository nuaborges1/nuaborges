/**
 * Cloudflare Pages Functions Middleware: /api/*
 *
 * Implements Security Level 5 Gateway:
 * 1. Strict CORS allowlist (HTTPS-only em produção, zero wildcard '*')
 * 2. CSRF Origin / Referer validation for mutation methods
 * 3. Fail-Closed Authentication & RBAC for all private API routes
 * 4. Anti-caching and security headers
 */

import {
  getSessionCookie,
  parseAndVerifySessionToken,
  timingSafeEqualString,
  isRouteAuthorizedForRole,
  UserRole,
} from './_authHelper';

interface Env {
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  ALLOWED_ORIGINS?: string;
  NODE_ENV?: string;
  ENVIRONMENT?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
  next: () => Promise<Response>;
};

// Allowed origins for API requests (estritamente ancorados)
const ALLOWED_ORIGIN_PATTERNS = [
  // Domínio de produção oficial Nua Borges e subdomínios (HTTPS apenas em produção)
  /^https:\/\/nuaborges\.com\.br$/,
  /^https:\/\/([a-z0-9-]+\.)*nuaborges\.com\.br$/,
  // Produção e previews oficiais da Nua Borges na Cloudflare Pages
  /^https:\/\/nuaborges\.pages\.dev$/,
  /^https:\/\/nuaborges-er7\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]+\.nuaborges-er7\.pages\.dev$/,
  /^https:\/\/nuaborges-admin\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]+\.nuaborges-admin\.pages\.dev$/,
  /^https:\/\/admingeral\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]+\.admingeral\.pages\.dev$/,
  /^https:\/\/([a-z0-9-]+\.)*admingeral-[a-z0-9-]+\.pages\.dev$/,
  // Subdomínios estritos phdev.store
  /^https:\/\/([a-z0-9-]+\.)*phdev\.store$/,
  // Desenvolvimento local restrito
  /^http:\/\/localhost:[0-9]+$/,
  /^http:\/\/127\.0\.0\.1:[0-9]+$/,
];

// Domínios próprios adicionais via variável de ambiente ALLOWED_ORIGINS
let extraOrigins: string[] = [];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (extraOrigins.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin');
  let allowed = isOriginAllowed(origin);
  if (!allowed && origin) {
    try {
      const reqUrl = new URL(request.url);
      if (reqUrl.origin === origin) {
        allowed = true;
      }
    } catch {}
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Object-Key, X-Mime-Type, X-Master-Key, X-Client-Timestamp, X-Signature, X-Request-Id, X-Nua-Client, Cache-Control, Pragma, If-Modified-Since, Range',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
  };

  if (allowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export const onRequest = async (context: PagesContext<Env>) => {
  const { request, env, next } = context;
  extraOrigins = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (env.NEXT_PUBLIC_SITE_URL) {
    extraOrigins.push(env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''));
  }
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

  // 2. Allow explicit public endpoints (alinhado com as rotas reais públicas)
  const isPublicAuthRoute =
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/session' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/auth/contract' ||
    pathname === '/api/contact' ||
    pathname === '/api/telemetry/track' ||
    (request.method === 'GET' && pathname === '/api/content/sync') ||
    (request.method === 'GET' && (pathname === '/api/music/list' || pathname === '/api/music/config')) ||
    pathname === '/api/traps/scraper' ||
    pathname === '/api/contract/sign' ||
    pathname === '/api/finance/webhook' ||
    pathname === '/api/webhooks/mercadopago' ||
    pathname === '/api/appointments/availability' ||
    pathname === '/api/appointments/book' ||
    pathname === '/api/appointments/lookup' ||
    pathname === '/api/appointments/pix' ||
    pathname === '/api/appointments/sync' ||
    pathname === '/api/payments/create-pix' ||
    pathname === '/api/payments/status' ||
    pathname === '/api/payments/verify-access' ||
    pathname === '/api/payments/recover-access' ||
    pathname === '/api/payments/send-otp' ||
    pathname === '/api/payments/verify-otp' ||
    pathname === '/api/personalizados/create' ||
    pathname === '/api/personalizados/status' ||
    pathname === '/api/stripe/create-checkout' ||
    pathname === '/api/stripe/webhook' ||
    pathname === '/api/webhooks/stripe';

  if (!isPublicAuthRoute) {
    // Em desenvolvimento local estrito (apenas se não for produção)
    const isLocalRequest =
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      (env.ENVIRONMENT !== 'production' && (typeof process === 'undefined' || process.env?.NODE_ENV !== 'production'));

    let authenticated = false;
    let userRole: UserRole | null = null;

    if (isLocalRequest) {
      authenticated = true;
      userRole = 'dev';
    } else {
      // 3. Fail-Closed Authentication Gate for private / mutating endpoints
      // Segredo dedicado para HMAC de sessões
      const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;

      if (!secret) {
        return new Response(
          JSON.stringify({ error: 'Servidor sem segredo criptográfico de autenticação configurado.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check Cookie Session
      const sessionCookie = getSessionCookie(request);
      if (sessionCookie) {
        const payload = await parseAndVerifySessionToken(sessionCookie, secret);
        if (payload) {
          authenticated = true;
          userRole = payload.role;
        }
      }

      // Check Bearer session token, ou X-Master-Key se configurada
      if (!authenticated) {
        const authHeader = request.headers.get('Authorization');
        const masterKeyHeader = request.headers.get('X-Master-Key');
        const token = authHeader?.startsWith('Bearer ')
          ? authHeader.substring(7).trim()
          : masterKeyHeader?.trim();

        if (token) {
          if (
            (env.ADMIN_API_SECRET && (await timingSafeEqualString(token, env.ADMIN_API_SECRET))) ||
            (env.ADMIN_PASSWORD && (await timingSafeEqualString(token, env.ADMIN_PASSWORD)))
          ) {
            authenticated = true;
            userRole = 'admin';
          } else {
            const payload = await parseAndVerifySessionToken(token, secret);
            if (payload) {
              authenticated = true;
              userRole = payload.role;
            }
          }
        }
      }

      // Fail-Closed: Strictly reject if not authenticated
      if (!authenticated || !userRole) {
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

      // 3.1. Centralized Role-Based Access Control (RBAC) Enforcement
      let requestAction: string | undefined;
      if (pathname === '/api/requests' && request.method === 'POST') {
        try {
          const cloned = request.clone();
          const body: any = await cloned.json();
          requestAction = body?.action;
        } catch {}
      }

      const isAuthorized = isRouteAuthorizedForRole(pathname, request.method, userRole, requestAction);
      if (!isAuthorized) {
        return new Response(
          JSON.stringify({
            error: 'Acesso negado: Perfil de usuário sem autorização para esta operação (RBAC).',
            role: userRole,
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          }
        );
      }
    }
  }

  // 4. CSRF Protection for state-modifying requests (POST, PUT, DELETE, PATCH)
  const isWebhookPath =
    pathname === '/api/finance/webhook' ||
    pathname === '/api/webhooks/mercadopago' ||
    pathname === '/api/webhooks/stripe' ||
    pathname === '/api/stripe/webhook';
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && !isWebhookPath) {
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');

    if (origin && !isOriginAllowed(origin)) {
      return new Response(
        JSON.stringify({ error: 'Origem de requisição não autorizada (CSRF Protection).' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!origin && referer) {
      try {
        const refUrl = new URL(referer);
        if (!isOriginAllowed(refUrl.origin)) {
          return new Response(
            JSON.stringify({ error: 'Referer de requisição não autorizado (CSRF Protection).' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Referer inválido.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  // 5. Proceed to Route Handler with Security Headers
  const response = await next();
  const newHeaders = new Headers(response.headers);

  Object.entries(corsHeaders).forEach(([k, v]) => {
    newHeaders.set(k, v);
  });

  // Security Hardening Headers
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};
