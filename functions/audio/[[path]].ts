/**
 * Cloudflare Pages Function: /audio/[[path]]
 *
 * Servidor de áudio por streaming (zero buffer integral em RAM) diretamente do Backblaze B2:
 * - Streaming via `getMediaStream` com HTTP Range Requests (206 Partial Content)
 * - HEAD via `headMedia` sem baixar o arquivo
 * - Validação estrita compartilhada contra path traversal e extensões inválidas
 * - Allowlist CORS ancorada aos domínios oficiais
 */

import { getMediaStream, headMedia, isMediaStorageConfigured, MediaEnv } from '../api/_mediaStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
  params: { path?: string | string[] };
};

const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'webm'];

function getAudioContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
      return 'audio/mp4';
    case 'ogg':
      return 'audio/ogg';
    case 'flac':
      return 'audio/flac';
    case 'aac':
      return 'audio/aac';
    case 'webm':
      return 'audio/webm';
    default:
      return 'audio/mpeg';
  }
}

function getAllowedOrigin(request?: Request, env?: any): string {
  const origin = request?.headers?.get('Origin') || '';
  if (!origin) return '';
  const isProd = String(env?.ENVIRONMENT || 'production').trim().toLowerCase() === 'production';
  if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (/^https:\/\/([a-z0-9-]+\.)*nuaborges\.com\.br$/.test(origin)) return origin;
  if (/^https:\/\/([a-z0-9-]+\.)*phdev\.store$/.test(origin)) return origin;
  if (/^https:\/\/([a-z0-9-]{6,63}\.)?(nuaborges|nuaborges-er7|nuaborges-admin|admingeral)\.pages\.dev$/.test(origin)) {
    return origin;
  }
  return '';
}

function resolveSafeAudioKey(pathParam?: string | string[]): { ok: true; targetKey: string } | { ok: false; status: number; error: string } {
  const subpath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';
  if (!subpath) {
    return { ok: false, status: 400, error: 'Arquivo de áudio não especificado.' };
  }

  let rawPath: string;
  try {
    rawPath = decodeURIComponent(subpath);
  } catch {
    return { ok: false, status: 400, error: 'Caminho de áudio malformado.' };
  }

  if (rawPath.includes('..') || rawPath.includes('\\') || rawPath.includes('\0') || rawPath.includes('/private/')) {
    return { ok: false, status: 400, error: 'Caminho de áudio inválido.' };
  }

  const cleanPath = rawPath.replace(/^audio\//, '').replace(/^\/+/, '');
  const ext = cleanPath.split('.').pop()?.toLowerCase();
  if (!cleanPath || !ext || !ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    return { ok: false, status: 400, error: 'Formato de áudio não suportado ou inválido.' };
  }

  return { ok: true, targetKey: `audio/${cleanPath}` };
}

export const onRequestGet = async (context: PagesContext<MediaEnv>) => {
  const { request, env, params } = context;
  const allowedOrigin = getAllowedOrigin(request, env);
  const resolved = resolveSafeAudioKey(params.path);
  if (!resolved.ok) {
    return new Response(resolved.error, { status: resolved.status });
  }

  const requestedRange = request.headers.get('Range') || undefined;
  if (requestedRange && !/^bytes=(\d*)-(\d*)$/.test(requestedRange.trim())) {
    return new Response('Cabeçalho Range inválido.', { status: 416 });
  }

  let stored: Awaited<ReturnType<typeof getMediaStream>> = null;
  if (isMediaStorageConfigured(env)) {
    try {
      stored = await getMediaStream(env, resolved.targetKey, requestedRange);
    } catch (err: any) {
      console.error('[AudioServer] B2 stream falhou:', err?.name || 'UnknownError');
    }
  }

  if (!stored) {
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes.status === 200 || assetRes.status === 206) {
          return assetRes;
        }
      } catch {}
    }

    const notFoundHeaders: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    };
    if (allowedOrigin) notFoundHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
    return new Response('Música não encontrada no armazenamento.', {
      status: 404,
      headers: notFoundHeaders,
    });
  }

  const headers = new Headers();
  headers.set('content-type', stored.contentType || getAudioContentType(resolved.targetKey));
  headers.set('Accept-Ranges', 'bytes');
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, ETag');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Content-Disposition', 'inline');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (stored.contentLength !== undefined) {
    headers.set('Content-Length', String(stored.contentLength));
  }
  if (stored.contentRange) {
    headers.set('Content-Range', stored.contentRange);
  }

  const partial = Boolean(requestedRange && stored.contentRange);
  return new Response(stored.body, {
    status: partial ? 206 : 200,
    headers,
  });
};

export const onRequestHead = async (context: PagesContext<MediaEnv>) => {
  const { request, env, params } = context;
  const resolved = resolveSafeAudioKey(params.path);
  if (!resolved.ok) {
    return new Response(null, { status: resolved.status });
  }
  if (!isMediaStorageConfigured(env)) {
    return new Response(null, { status: 404 });
  }

  let meta: Awaited<ReturnType<typeof headMedia>> = null;
  try {
    meta = await headMedia(env, resolved.targetKey);
  } catch {
    return new Response(null, { status: 502 });
  }

  if (!meta) {
    return new Response(null, { status: 404 });
  }

  const headers = new Headers();
  headers.set('content-type', meta.contentType || getAudioContentType(resolved.targetKey));
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(meta.size));

  const allowedOriginHead = getAllowedOrigin(request, env);
  if (allowedOriginHead) {
    headers.set('Access-Control-Allow-Origin', allowedOriginHead);
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, ETag');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(null, { status: 200, headers });
};

export const onRequestOptions = async (context: PagesContext<MediaEnv>) => {
  const allowedOrigin = getAllowedOrigin(context.request, context.env);
  const optionsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Max-Age': '86400',
  };
  if (allowedOrigin) {
    optionsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
    optionsHeaders['Vary'] = 'Origin';
  }
  return new Response(null, {
    status: 204,
    headers: optionsHeaders,
  });
};
