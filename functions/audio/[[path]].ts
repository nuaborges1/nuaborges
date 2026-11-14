/**
 * Cloudflare Pages Function: /audio/[[path]]
 *
 * Servidor de áudio de ultra-baixa latência diretamente do Backblaze B2.
 * - Suporte nativo a HTTP Range Requests (RFC 7233 / 206 Partial Content).
 * - Permite início imediato da reprodução sem esperar o download completo do arquivo.
 * - Suporta busca/seek imediato em qualquer ponto da faixa.
 * - Fallback automático para assets estáticos empacotados no deploy (env.ASSETS).
 * - Cache de borda com cabeçalhos CORS irrestritos para Web Audio API.
 */

import { getMedia, isMediaStorageConfigured, MediaEnv } from '../api/_mediaStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
  params: { path?: string | string[] };
};

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

function getAllowedOrigin(request?: Request): string {
  const origin = request?.headers?.get('Origin') || '';
  if (!origin) return '';
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (/^https:\/\/([a-z0-9-]+\.pages\.dev|(.*\.)?(nuaborges\.com|nuaborges\.com\.br|phdev\.store))$/.test(origin)) return origin;
  return '';
}

export const onRequestGet = async (context: PagesContext<MediaEnv>) => {
  const { request, env, params } = context;
  const allowedOrigin = getAllowedOrigin(request);
  const pathParam = params.path;
  const subpath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';

  if (!subpath) {
    return new Response('Arquivo de áudio não especificado', { status: 400 });
  }

  // Defesa estrita contra Path Traversal: impede .., barras invertidas e caracteres de escape
  const rawPath = decodeURIComponent(subpath);
  if (rawPath.includes('..') || rawPath.includes('\\') || rawPath.includes('\0')) {
    return new Response('Caminho de áudio inválido.', { status: 400 });
  }

  // Remove qualquer prefixo audio/ duplicado e extrai apenas o caminho limpo
  const cleanPath = rawPath.replace(/^audio\//, '').replace(/^\/+/, '');
  const ext = cleanPath.split('.').pop()?.toLowerCase();
  const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'webm'];

  if (!ext || !ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    return new Response('Formato de áudio não suportado ou inválido.', { status: 400 });
  }

  if (!isMediaStorageConfigured(env)) {
    return new Response('Storage de mídia indisponível', { status: 503 });
  }

  const targetKey = `audio/${cleanPath}`;

  let objectBody: ArrayBuffer | null = null;
  let objectContentType = getAudioContentType(subpath);
  let objectSize = 0;

  // 1. Recupera o áudio via _mediaStore (Backblaze B2 / S3)
  try {
    const s3Media = await getMedia(env, targetKey);
    if (s3Media) {
      objectBody = s3Media.body;
      objectSize = s3Media.size;
      if (s3Media.contentType) {
        objectContentType = s3Media.contentType;
      }
    }
  } catch { }

  // 2. Se não encontrou no B2, tenta servir do pacote estático do deploy via env.ASSETS
  if (!objectBody) {
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes.status === 200 || assetRes.status === 206) {
          return assetRes;
        }
      } catch { }
    }

    const notFoundHeaders: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
    };
    if (allowedOrigin) notFoundHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
    return new Response('Música não encontrada no armazenamento.', {
      status: 404,
      headers: notFoundHeaders,
    });
  }

  const headers = new Headers();
  headers.set('content-type', objectContentType);
  headers.set('Accept-Ranges', 'bytes');
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, ETag');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Content-Disposition', 'inline');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Timing-Allow-Origin', '*');

  const rangeHeader = request.headers.get('range');
  if (rangeHeader && rangeHeader.startsWith('bytes=')) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10) || 0;
    const end = parts[1] ? parseInt(parts[1], 10) : objectSize - 1;
    const chunkSize = (end - start) + 1;

    const slicedBuffer = objectBody.slice(start, end + 1);
    headers.set('Content-Range', `bytes ${start}-${end}/${objectSize}`);
    headers.set('Content-Length', String(chunkSize));

    return new Response(slicedBuffer, {
      status: 206,
      headers,
    });
  }

  headers.set('Content-Length', String(objectSize));
  return new Response(objectBody, {
    status: 200,
    headers,
  });
};

export const onRequestHead = async (context: PagesContext<MediaEnv>) => {
  const { request, env, params } = context;
  const pathParam = params.path;
  const subpath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';

  if (!subpath || !isMediaStorageConfigured(env)) {
    return new Response(null, { status: 404 });
  }

  const cleanPath = subpath.replace(/^audio\//, '').replace(/^\/+/, '');
  const targetKey = `audio/${cleanPath}`;
  const s3Media = await getMedia(env, targetKey);

  if (!s3Media) {
    return new Response(null, { status: 404 });
  }

  const headers = new Headers();
  headers.set('content-type', s3Media.contentType || getAudioContentType(subpath));
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(s3Media.size));

  const allowedOriginHead = getAllowedOrigin(request);
  if (allowedOriginHead) {
    headers.set('Access-Control-Allow-Origin', allowedOriginHead);
  }
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, ETag');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(null, { status: 200, headers });
};

export const onRequestOptions = async (context: PagesContext<MediaEnv>) => {
  const allowedOrigin = getAllowedOrigin(context.request);
  const optionsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
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
