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

import { serveCatalogRoute, serveCatalogSitemap } from './_catalogSeo';
import { recordAuditEvent } from './api/_auditHelper';
import { recordPageview, isAdminIp } from './api/_telemetryHelper';

interface Env {
  ASSETS: { fetch: typeof fetch };
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

function sanitizePathForLog(rawPath: string): string {
  return String(rawPath || '/')
    .replace(/[<>"'`\\\u0000-\u001F\u007F]/g, '')
    .slice(0, 180) || '/';
}

async function routeRequest(context: PagesContext<Env>) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 0. Saneamento e Normalização Inteligente de URLs:
  // Se a rota possuir barras duplas (ex: //avulsos/teste) que causam SecurityError no History do navegador,
  // redireciona de imediato com 308 mantendo query params.
  if (url.pathname.includes('//')) {
    const cleanPath = url.pathname.replace(/\/+/g, '/');
    return Response.redirect(new URL(cleanPath + url.search, url.origin).toString(), 308);
  }

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

    const safeProbedPath = sanitizePathForLog(url.pathname);
    // Log the trapped bot in master audit
    await recordAuditEvent(env, request, {
      type: 'HONEYPOT_BOT_TRAP',
      severity: 'warning',
      summary: `Scanner malicioso neutralizado! Tentativa de acesso a rota vulnerável inexistente: ${safeProbedPath} por ${clientIp} [${country}]`,
      details: {
        clientIp,
        country,
        userAgent: String(userAgent).replace(/[<>"'`]/g, '').slice(0, 200),
        probedPath: safeProbedPath,
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
  // - Painéis e rotas de conta, entrega, reserva e pedido
  // - IPs de administradores/desenvolvedores conhecidos ou autenticados
  // - Cookies de sessão admin ou flag de bypass (nua_admin_bypass=1)
  // - Requisições vindas do painel geral (Origin/Referer admingeral)
  // - Pré-carregamentos de navegadores (Prefetch, Prerender, Speculation Rules, Next-Router-Prefetch, RSC)
  // - Chamadas com chaves de administração ou autorização
  // - Assets estáticos (.jpg, .png, .js, .css, etc.)
  const isExcludedPath = privateRoute.test(pathname);

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
      const safePagePath = sanitizePathForLog(url.pathname);
      context.waitUntil
        ? context.waitUntil(recordPageview(env, request, safePagePath))
        : recordPageview(env, request, safePagePath);
    } catch {
      // Ignora falha assíncrona de telemetria
    }
  }

  if ((request.method === 'GET' || request.method === 'HEAD') &&
      (pathname.startsWith('/avulsos/') && pathname !== '/avulsos/' || pathname === '/catalogo-publicado.json')) {
    return serveCatalogRoute(request, env, url, next);
  }

  if ((request.method === 'GET' || request.method === 'HEAD') && pathname === '/sitemap.xml') {
    return serveCatalogSitemap(request, env, await env.ASSETS.fetch(new URL('/sitemap.xml', url)));
  }

  // 1. Direct .txt requests (Next.js App Router static flight payloads)
  // Ignora explicitamente arquivos de texto padrão de SEO (robots.txt, humans.txt, security.txt)
  if (
    url.pathname.endsWith('.txt') &&
    url.pathname !== '/robots.txt' &&
    url.pathname !== '/humans.txt' &&
    url.pathname !== '/security.txt'
  ) {
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
        if (url.pathname.startsWith('/assistir/') && url.pathname !== '/assistir/sessao-tantrica.txt') {
          const fallbackRes = await env.ASSETS.fetch(
            new Request(new URL('/assistir/sessao-tantrica.txt', url.origin), {
              method: 'GET',
              headers: { Accept: 'text/x-component, text/plain, */*' },
            })
          );
          if (fallbackRes.status === 200 && !(fallbackRes.headers.get('content-type') || '').includes('text/html')) {
            const headers = new Headers(fallbackRes.headers);
            headers.set('Content-Type', 'text/x-component; charset=utf-8');
            headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
            return new Response(fallbackRes.body, { status: 200, headers });
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

  // 3. Roteamento Inteligente e Resiliente para Sala de Exibição (/assistir/:slug)
  if (url.pathname.startsWith('/assistir/')) {
    const slugPart = url.pathname.replace(/^\/assistir\//, '').replace(/\/$/, '');
    if (slugPart && !slugPart.includes('.')) {
      if (isRsc) {
        try {
          const directReq = new Request(new URL(`/assistir/${slugPart}.txt`, url.origin), {
            headers: { Accept: 'text/x-component, text/plain, */*' },
          });
          const res = await env.ASSETS.fetch(directReq);
          if (res.status === 200) {
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
              const headers = new Headers(res.headers);
              headers.set('Content-Type', 'text/x-component; charset=utf-8');
              headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
              return new Response(res.body, { status: 200, headers });
            }
          }
          const fallbackRsc = await env.ASSETS.fetch(new Request(new URL('/assistir/sessao-tantrica.txt', url.origin), {
            headers: { Accept: 'text/x-component, text/plain, */*' },
          }));
          if (fallbackRsc.status === 200) {
            const headers = new Headers(fallbackRsc.headers);
            headers.set('Content-Type', 'text/x-component; charset=utf-8');
            headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
            return new Response(fallbackRsc.body, { status: 200, headers });
          }
        } catch {}
      } else {
        try {
          const directRes = await env.ASSETS.fetch(request);
          if (directRes.status === 200) {
            return directRes;
          }
          const fallbackHtml = await env.ASSETS.fetch(new Request(new URL('/assistir/sessao-tantrica.html', url.origin)));
          if (fallbackHtml.status === 200) {
            const headers = new Headers(fallbackHtml.headers);
            headers.set('Content-Type', 'text/html; charset=utf-8');
            headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
            return new Response(fallbackHtml.body, { status: 200, headers });
          }
        } catch {}
      }
    }
  }

  // 3b. Roteamento Resiliente para Formulário Privado de Avaliação do Pré-lançamento (/avaliacao/:codigo)
  if (url.pathname.startsWith('/avaliacao/')) {
    const codePart = url.pathname.replace(/^\/avaliacao\//, '').replace(/\/$/, '');
    if (codePart && !codePart.includes('.')) {
      if (isRsc) {
        try {
          const fallbackRsc = await env.ASSETS.fetch(
            new Request(new URL('/avaliacao/_.txt', url.origin), {
              headers: { Accept: 'text/x-component, text/plain, */*' },
            })
          );
          if (fallbackRsc.status === 200) {
            const headers = new Headers(fallbackRsc.headers);
            headers.set('Content-Type', 'text/x-component; charset=utf-8');
            headers.set('Cache-Control', 'private, no-store');
            return new Response(fallbackRsc.body, { status: 200, headers });
          }
        } catch {}
      } else {
        try {
          const fallbackHtml = await env.ASSETS.fetch(
            new Request(new URL('/avaliacao/_.html', url.origin))
          );
          if (fallbackHtml.status === 200) {
            const headers = new Headers(fallbackHtml.headers);
            headers.set('Content-Type', 'text/html; charset=utf-8');
            headers.set('Cache-Control', 'private, no-store');
            return new Response(fallbackHtml.body, { status: 200, headers });
          }
        } catch {}
      }
    }
  }

  return next();
}

const privateRoute = /^\/(?:admin|admingeral|avaliacao|contrato|conta|minha-nua|cofre|assistir|chamadas\/(?:status|reserva)|personalizados\/pedido)(?=[/.]|$)/i;

export const onRequest = async (context: PagesContext<Env>) => {
  const url = new URL(context.request.url);
  const officialHost = url.hostname === 'nuaborges.com.br';
  if ((context.request.method === 'GET' || context.request.method === 'HEAD') &&
      (url.hostname === 'www.nuaborges.com.br' || (officialHost && url.protocol === 'http:'))) {
    url.protocol = 'https:';
    url.host = 'nuaborges.com.br';
    return Response.redirect(url, 308);
  }
  const response = await routeRequest(context);
  const isPrivate = privateRoute.test(url.pathname);
  if (!isPrivate && !url.hostname.endsWith('.pages.dev')) return response;
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (isPrivate) {
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Referrer-Policy', 'no-referrer');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};
