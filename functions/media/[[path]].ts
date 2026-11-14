/**
 * Cloudflare Pages Function: /media/[[path]]
 *
 * Serve fotos e vídeos enviados pelo painel admin a partir do Backblaze B2 (S3), com:
 * - Cache de borda (Cache API) para mídias públicas
 * - Fallback automático para assets estáticos do deploy (env.ASSETS)
 * - Proteção de anti-cache (no-store) e validação Supabase para mídias privadas
 * - Suporte a Range requests (necessário para vídeos no Safari/iOS)
 */

import { getMedia, MediaEnv } from '../api/_mediaStore';
import { verifySessionToken, timingSafeEqualString } from '../api/_authHelper';
import { getOrderFromSupabase } from '../api/_supabaseStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
  params: { path?: string | string[] };
  waitUntil?: (promise: Promise<any>) => void;
};

function getAllowedOrigin(request?: Request): string {
  const origin = request?.headers?.get('Origin') || '';
  if (!origin) return '';
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (/^https:\/\/([a-z0-9-]+\.)*nuaborges\.com\.br$/.test(origin)) return origin;
  if (/^https:\/\/([a-z0-9-]+\.)*phdev\.store$/.test(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.nuaborges-(admin|er7)\.pages\.dev$/.test(origin)) return origin;
  if (/^https:\/\/(nuaborges|nuaborges-admin|admingeral)\.pages\.dev$/.test(origin)) return origin;
  return '';
}

const PUBLIC_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
  'Accept-Ranges': 'bytes',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, ETag',
  'X-Content-Type-Options': 'nosniff',
};

const PRIVATE_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  'Accept-Ranges': 'bytes',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, ETag',
  'X-Content-Type-Options': 'nosniff',
};

function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  let start = match[1] ? parseInt(match[1], 10) : NaN;
  let end = match[2] ? parseInt(match[2], 10) : NaN;
  if (isNaN(start) && isNaN(end)) return null;
  if (isNaN(start)) {
    start = Math.max(0, size - end);
    end = size - 1;
  } else if (isNaN(end) || end >= size) {
    end = size - 1;
  }
  if (start > end || start >= size) return null;
  return { start, end };
}

export const onRequestGet = async (context: PagesContext<MediaEnv>) => {
  const { request, env, params } = context;
  const pathParam = params.path;
  const subpath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';

  if (!subpath || subpath.includes('..')) {
    return new Response('Caminho inválido', { status: 400 });
  }

  const isPrivateMedia = subpath.startsWith('private/') || subpath.includes('/private/');
  const allowedOrigin = getAllowedOrigin(request);

  // Validação de Autorização para Mídias Privadas
  if (isPrivateMedia) {
    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization');
    const token = (
      url.searchParams.get('token') ||
      url.searchParams.get('sessionToken') ||
      url.searchParams.get('purchaseToken') ||
      (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : '') ||
      ''
    ).trim();

    let authorized = false;

    // A. Verifica se é sessão administrativa válida
    const secret = (env as any)?.ADMIN_API_SECRET || (env as any)?.ADMIN_PASSWORD;
    if (secret && token) {
      if (await verifySessionToken(token, secret)) {
        authorized = true;
      } else if ((env as any)?.ADMIN_PASSWORD && (await timingSafeEqualString(token, (env as any).ADMIN_PASSWORD))) {
        authorized = true;
      }
    }

    // B. Se não for admin, verifica se possui compra aprovada e entitlement para a mídia solicitada
    if (!authorized && token) {
      try {
        const sbOrder = await getOrderFromSupabase(env, token);
        if (sbOrder && (sbOrder.status === 'paid' || sbOrder.status === 'approved')) {
          // Entitlement binding: verifica se a mídia solicitada pertence ao packId ou ao id do pedido
          const normalizedPath = subpath.toLowerCase();
          const targetPackId = sbOrder.packId ? sbOrder.packId.toLowerCase() : '';
          const targetOrderId = sbOrder.id ? sbOrder.id.toLowerCase() : '';

          const hasPackEntitlement = Boolean(targetPackId && (
            normalizedPath.includes(`/${targetPackId}/`) ||
            normalizedPath.includes(`_${targetPackId}`) ||
            normalizedPath.includes(targetPackId)
          ));
          const hasOrderEntitlement = Boolean(targetOrderId && (
            normalizedPath.includes(`/${targetOrderId}/`) ||
            normalizedPath.includes(targetOrderId)
          ));

          if (hasPackEntitlement || hasOrderEntitlement) {
            authorized = true;
          } else {
            console.warn(`[MediaAuth] Entitlement negado: pedido ${sbOrder.id} (pack: ${sbOrder.packId}) não cobre o arquivo ${subpath}`);
          }
        }
      } catch (err) {
        console.warn('[MediaAuth] Erro ao validar token no Supabase:', err);
      }
    }

    if (!authorized) {
      const unauthorizedHeaders: Record<string, string> = {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      };
      if (allowedOrigin) unauthorizedHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
      return new Response(
        JSON.stringify({
          error: 'Acesso negado. Esta mídia original é protegida e exige comprovação de compra ou autenticação administrativa.',
        }),
        { status: 403, headers: unauthorizedHeaders }
      );
    }
  }

  const baseHeaders = isPrivateMedia ? PRIVATE_CACHE_HEADERS : PUBLIC_CACHE_HEADERS;
  const cleanSubpath = subpath.replace(/^media\//, '');
  const key = `media/${cleanSubpath}`;
  const cache = !isPrivateMedia && (globalThis as any).caches?.default ? (globalThis as any).caches.default : undefined;
  const cacheKey = new Request(new URL(`/media/${cleanSubpath}`, request.url).toString(), { method: 'GET' });

  // 1. Tenta servir do cache de borda (apenas para mídias públicas)
  let full: Response | undefined;
  if (cache) {
    try {
      full = (await cache.match(cacheKey)) || undefined;
    } catch {}
  }

  let body: ArrayBuffer;
  let contentType: string;

  const responseHeaders: Record<string, string> = { ...baseHeaders };
  if (allowedOrigin) {
    responseHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  if (full) {
    body = await full.arrayBuffer();
    contentType = full.headers.get('Content-Type') || 'application/octet-stream';
  } else {
    let stored = await getMedia(env, key).catch(() => null);
    if (!stored && key !== cleanSubpath) {
      // Fallback para chaves gravadas sem o prefixo 'media/'
      stored = await getMedia(env, cleanSubpath).catch(() => null);
    }
    if (!stored && subpath !== cleanSubpath) {
      stored = await getMedia(env, subpath).catch(() => null);
    }
    // Fallback de variante no B2: se pediu mobile.webp ou thumb.webp e não encontrou, tenta full.webp
    if (!stored && (cleanSubpath.endsWith('/mobile.webp') || cleanSubpath.endsWith('/thumb.webp'))) {
      const fullFallback = cleanSubpath.replace(/\/(mobile|thumb)\.webp$/, '/full.webp');
      stored = await getMedia(env, `media/${fullFallback}`).catch(() => null);
      if (!stored) {
        stored = await getMedia(env, fullFallback).catch(() => null);
      }
    }

    if (!stored) {
      // Fallback estático: se a mídia não está no B2 e não é privada, busca direto dos assets estáticos do deploy
      if (!isPrivateMedia && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
        try {
          const assetRes = await env.ASSETS.fetch(request);
          if (assetRes.status === 200 || assetRes.status === 206) {
            return assetRes;
          }
          // Fallback de variante nos assets estáticos: se pediu mobile.webp ou thumb.webp, tenta full.webp
          if (cleanSubpath.endsWith('/mobile.webp') || cleanSubpath.endsWith('/thumb.webp')) {
            const fullUrl = new URL(request.url);
            fullUrl.pathname = fullUrl.pathname.replace(/\/(mobile|thumb)\.webp$/, '/full.webp');
            const fallbackReq = new Request(fullUrl.toString(), {
              method: request.method,
              headers: request.headers,
            });
            const fullRes = await env.ASSETS.fetch(fallbackReq);
            if (fullRes.status === 200 || fullRes.status === 206) {
              return fullRes;
            }
          }
        } catch (assetErr) {
          console.warn('[MediaServer] Erro no fallback env.ASSETS:', assetErr);
        }
      }

      const notFoundHeaders: Record<string, string> = {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'text/plain; charset=utf-8',
      };
      if (allowedOrigin) notFoundHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
      return new Response('Mídia não encontrada no armazenamento.', {
        status: 404,
        headers: notFoundHeaders,
      });
    }
    body = stored.body;
    contentType = stored.contentType;

    if (cache && !isPrivateMedia) {
      const toCache = new Response(body.slice(0), {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': contentType, 'Content-Length': String(body.byteLength) },
      });
      const p = cache.put(cacheKey, toCache).catch(() => {});
      if (context.waitUntil) context.waitUntil(p);
    }
  }

  const size = body.byteLength;
  const range = parseRange(request.headers.get('Range'), size);

  if (range) {
    const chunk = body.slice(range.start, range.end + 1);
    return new Response(chunk, {
      status: 206,
      headers: {
        ...responseHeaders,
        'Content-Type': contentType,
        'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
        'Content-Length': String(chunk.byteLength),
      },
    });
  }

  return new Response(body, {
    status: 200,
    headers: { ...responseHeaders, 'Content-Type': contentType, 'Content-Length': String(size) },
  });
};

export const onRequestHead = onRequestGet;

export const onRequestOptions = async (context: PagesContext<MediaEnv>) => {
  const allowedOrigin = getAllowedOrigin(context.request);
  const optionsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Max-Age': '86400',
  };
  if (allowedOrigin) {
    optionsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
  }
  return new Response(null, {
    status: 204,
    headers: optionsHeaders,
  });
};
