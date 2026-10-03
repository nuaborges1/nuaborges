/**
 * Root Cloudflare Pages Functions Middleware
 *
 * 1. Guarantees Next.js App Router client-side routing (RSC payload serving):
 *    When Next.js router sends an RSC prefetch/navigation request (header `RSC: 1` or query `_rsc`),
 *    or requests a `.txt` flight payload directly,
 *    this middleware retrieves the corresponding `.txt` flight payload from `env.ASSETS`
 *    and responds with `Content-Type: text/x-component; charset=utf-8` and anti-stale cache headers.
 *    This prevents Cloudflare Pages from returning HTML instead of the RSC stream,
 *    eliminating hard page reloads and ensuring that React context (MusicProvider, audio playback)
 *    is 100% continuous and never interrupted across page transitions.
 */

import { recordAuditEvent } from './api/_auditHelper';
import { recordPageview, isAdminIp } from './api/_telemetryHelper';

interface Env {
  ASSETS: { fetch: typeof fetch };
  BUCKET?: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
  next: () => Promise<Response>;
  waitUntil?: (promise: Promise<any>) => void;
};

// Common bot scanner attack paths to trap
const SCANNER_HONEYPOT_PATHS = [
  '/wp-login.php',
  '/wp-admin',
  '/wp-login',
  '/xmlrpc.php',
  '/.env',
  '/.git',
  '/phpmyadmin',
  '/pma',
  '/administrator',
  '/admin/login.php',
  '/setup.php',
  '/config.php',
  '/shell.php',
];

export const onRequest = async (context: PagesContext<Env>) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();

  // 0. Scanner Bot Trap: Intercept unauthorized vulnerability scanners
  const isBotTrap = SCANNER_HONEYPOT_PATHS.some(
    (trap) => pathname === trap || pathname.startsWith(`${trap}/`)
  );

  if (isBotTrap) {
    const clientIp =
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For') ||
      '127.0.0.1';
    const country = request.headers.get('CF-IPCountry') || 'Desconhecido';
    const userAgent = request.headers.get('User-Agent') || 'Desconhecido';

    // Log the trapped bot in master audit
    await recordAuditEvent(env, request, {
      type: 'HONEYPOT_BOT_TRAP',
      severity: 'warning',
      summary: `Scanner malicioso neutralizado! Tentativa de acesso a rota vulnerável inexistente: ${url.pathname} por ${clientIp} [${country}]`,
      details: {
        clientIp,
        country,
        userAgent,
        probedPath: url.pathname,
      },
    });

    return new Response(
      JSON.stringify({
        error: 'Not Found',
        message: 'Endpoint does not exist on this server.',
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'X-Robots-Tag': 'noindex, nofollow',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  // Skip API routes (handled by functions/api/*)
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  // Telemetria EXCLUSIVA de Visitantes Públicos da Nua Borges
  // Ignora terminantemente:
  // - Painéis administrativos (/admin, /admingeral)
  // - IPs de administradores/desenvolvedores conhecidos ou autenticados
  // - Cookies de sessão admin ou flag de bypass (nua_admin_bypass=1)
  // - Requisições vindas do painel geral (Origin/Referer admingeral)
  // - Pré-carregamentos de navegadores (Prefetch, Prerender, Speculation Rules, Next-Router-Prefetch, RSC)
  // - Chamadas com chaves de administração ou autorização
  // - Assets estáticos (.jpg, .png, .js, .css, etc.)
  const isExcludedPath =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/admingeral');

  const cookieHeader = request.headers.get('Cookie') || '';
  const hasAdminCookie =
    cookieHeader.includes('__Host-Admin-Session') ||
    cookieHeader.includes('nua_admin_session') ||
    cookieHeader.includes('nua_admin_bypass=1');

  const secPurpose = (request.headers.get('Sec-Purpose') || '').toLowerCase();
  const purpose = (request.headers.get('Purpose') || '').toLowerCase();
  const secFetchDest = (request.headers.get('Sec-Fetch-Dest') || '').toLowerCase();
  const secFetchMode = (request.headers.get('Sec-Fetch-Mode') || '').toLowerCase();

  const isPrefetchOrBackground =
    purpose.includes('prefetch') ||
    secPurpose.includes('prefetch') ||
    secPurpose.includes('prerender') ||
    secPurpose.includes('preview') ||
    request.headers.has('Next-Router-Prefetch') ||
    request.headers.get('RSC') === '1' ||
    request.headers.has('X-Master-Key') ||
    request.headers.has('Authorization') ||
    (secFetchDest !== '' && secFetchDest !== 'document') ||
    secFetchMode === 'cors';

  const originHeader = request.headers.get('Origin') || '';
  const refererHeader = request.headers.get('Referer') || '';
  const isFromAdmin =
    originHeader.includes('admingeral') ||
    refererHeader.includes('admingeral') ||
    refererHeader.includes('/admin') ||
    refererHeader.includes('/admingeral');

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '';
  const isKnownAdmin = isAdminIp(clientIp);

  const isStaticAsset = pathname.includes('.') && !pathname.endsWith('.html');

  if (
    request.method === 'GET' &&
    !isExcludedPath &&
    !hasAdminCookie &&
    !isPrefetchOrBackground &&
    !isFromAdmin &&
    !isKnownAdmin &&
    !isStaticAsset
  ) {
    try {
      context.waitUntil
        ? context.waitUntil(recordPageview(env, request, url.pathname))
        : recordPageview(env, request, url.pathname);
    } catch {
      // Ignora falha assíncrona de telemetria
    }
  }

  // 1. Direct .txt requests (Next.js App Router static flight payloads)
  if (url.pathname.endsWith('.txt')) {
    try {
      // Strip any search/query from the txt request to match the static asset cleanly in env.ASSETS
      const cleanTxtUrl = new URL(url.pathname, url.origin);
      const txtReq = new Request(cleanTxtUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'text/x-component, text/plain, */*' },
      });
      const txtRes = await env.ASSETS.fetch(txtReq);

      if (txtRes.status === 200) {
        const contentType = txtRes.headers.get('content-type') || '';
        // Never serve an HTML SPA fallback as an RSC flight stream
        if (!contentType.includes('text/html')) {
          const headers = new Headers(txtRes.headers);
          headers.set('Content-Type', 'text/x-component; charset=utf-8');
          headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
          return new Response(txtRes.body, {
            status: 200,
            headers,
          });
        }
      }
    } catch {
      // Fallback to normal flow
    }
    return next();
  }

  // 2. Client-side RSC navigation requests (header `rsc: 1` or query `_rsc`)
  const isRsc = request.headers.get('rsc') === '1' || url.searchParams.has('_rsc');
  const hasExt = url.pathname.includes('.') && !url.pathname.endsWith('/');

  if (isRsc && !hasExt) {
    let cleanPath = url.pathname.replace(/\/$/, '');
    if (!cleanPath) cleanPath = '/index';

    try {
      // Ensure we query ASSETS with clean path, without query strings or hashes
      const txtUrl = new URL(`${cleanPath}.txt`, url.origin);
      const txtReq = new Request(txtUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'text/x-component, text/plain, */*' },
      });
      const txtRes = await env.ASSETS.fetch(txtReq);

      if (txtRes.status === 200) {
        const contentType = txtRes.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          const headers = new Headers(txtRes.headers);
          headers.set('Content-Type', 'text/x-component; charset=utf-8');
          headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
          return new Response(txtRes.body, {
            status: 200,
            headers,
          });
        }
      }
    } catch {
      // Fallback to normal flow
    }
  }

  return next();
};
