/**
 * Cloudflare Pages Function: /media/[[path]]
 *
 * Serve fotos e vídeos enviados pelo painel admin a partir do R2 (se habilitado)
 * ou do Workers KV NUA_MEDIA (plano gratuito), com:
 * - Cache de borda (Cache API) para economizar leituras do KV
 * - Suporte a Range requests (necessário para vídeos no Safari/iOS)
 */

import { getMedia, MediaEnv } from '../api/_mediaStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
  params: { path?: string | string[] };
  waitUntil?: (promise: Promise<any>) => void;
};

const BASE_HEADERS: Record<string, string> = {
  'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
  'Accept-Ranges': 'bytes',
  'Access-Control-Allow-Origin': '*',
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

  const key = `media/${subpath}`;
  const cache = (globalThis as any).caches?.default as Cache | undefined;
  const cacheKey = new Request(new URL(`/media/${subpath}`, request.url).toString(), { method: 'GET' });

  // 1. Tenta servir do cache de borda (respostas completas 200)
  let full: Response | undefined;
  if (cache) {
    try {
      full = (await cache.match(cacheKey)) || undefined;
    } catch {}
  }

  let body: ArrayBuffer;
  let contentType: string;

  if (full) {
    body = await full.arrayBuffer();
    contentType = full.headers.get('Content-Type') || 'application/octet-stream';
  } else {
    const stored = await getMedia(env, key).catch(() => null);
    if (!stored) {
      return new Response('Mídia não encontrada no armazenamento.', {
        status: 404,
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    body = stored.body;
    contentType = stored.contentType;

    if (cache) {
      const toCache = new Response(body.slice(0), {
        status: 200,
        headers: { ...BASE_HEADERS, 'Content-Type': contentType, 'Content-Length': String(body.byteLength) },
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
        ...BASE_HEADERS,
        'Content-Type': contentType,
        'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
        'Content-Length': String(chunk.byteLength),
      },
    });
  }

  return new Response(body, {
    status: 200,
    headers: { ...BASE_HEADERS, 'Content-Type': contentType, 'Content-Length': String(size) },
  });
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Max-Age': '86400',
    },
  });
};
