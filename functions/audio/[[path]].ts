/**
 * Cloudflare Pages Function: /audio/[[path]]
 *
 * Servidor de áudio de ultra-baixa latência diretamente do bucket R2.
 * - Suporte nativo a HTTP Range Requests (RFC 7233 / 206 Partial Content).
 * - Permite início imediato da reprodução sem esperar o download completo do arquivo.
 * - Suporta busca/seek imediato em qualquer ponto da faixa.
 * - Cache de borda com cabeçalhos CORS irrestritos para Web Audio API.
 */

interface Env {
  BUCKET?: any;
}

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

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env, params } = context;
  const pathParam = params.path;
  const subpath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';

  if (!subpath) {
    return new Response('Arquivo de áudio não especificado', { status: 400 });
  }

  if (!env.BUCKET || typeof env.BUCKET.get !== 'function') {
    return new Response('Storage R2 indisponível', { status: 503 });
  }

  // Tenta encontrar o arquivo pela chave com prefixo audio/ ou pela chave direta
  const keysToTry = [
    subpath.startsWith('audio/') ? subpath : `audio/${subpath}`,
    subpath,
    `media/${subpath}`,
  ];

  let object: any = null;
  const hasRange = request.headers.has('range');

  for (const k of keysToTry) {
    try {
      if (hasRange) {
        object = await env.BUCKET.get(k, {
          range: request.headers,
          onlyIf: request.headers,
        });
      } else {
        object = await env.BUCKET.get(k);
      }
      if (object) break;
    } catch {
      // Ignora erro e tenta próxima chave
    }
  }

  if (!object) {
    return new Response('Música não encontrada no armazenamento.', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Suporte a If-None-Match para evitar reenvio de dados já em cache no navegador
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && object.httpEtag && ifNoneMatch.includes(object.httpEtag)) {
    return new Response(null, {
      status: 304,
      headers: {
        'ETag': object.httpEtag,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const headers = new Headers();
  if (object.writeHttpMetadata) {
    object.writeHttpMetadata(headers);
  }

  if (object.httpEtag) {
    headers.set('etag', object.httpEtag);
  }

  // Garante Content-Type correto para áudio
  if (!headers.get('content-type') || headers.get('content-type') === 'application/octet-stream') {
    headers.set('content-type', getAudioContentType(subpath));
  }

  headers.set('Accept-Ranges', 'bytes');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, ETag');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Content-Disposition', 'inline');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Timing-Allow-Origin', '*');

  let status = 200;
  if (hasRange && object.range) {
    const start = object.range.offset ?? 0;
    const length = object.range.length ?? object.size;
    const end = start + length - 1;
    const total = object.size;
    headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    headers.set('Content-Length', String(length));
    status = 206;
  } else {
    headers.set('Content-Length', String(object.size));
    status = 200;
  }

  return new Response(object.body, {
    status,
    headers,
  });
};

export const onRequestHead = async (context: PagesContext<Env>) => {
  const { request, env, params } = context;
  const pathParam = params.path;
  const subpath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';

  if (!subpath || !env.BUCKET) {
    return new Response(null, { status: 404 });
  }

  const keysToTry = [
    subpath.startsWith('audio/') ? subpath : `audio/${subpath}`,
    subpath,
    `media/${subpath}`,
  ];

  let object: any = null;
  for (const k of keysToTry) {
    try {
      if (typeof env.BUCKET.head === 'function') {
        object = await env.BUCKET.head(k);
      } else {
        object = await env.BUCKET.get(k);
      }
      if (object) break;
    } catch { }
  }

  if (!object) {
    return new Response(null, { status: 404 });
  }

  const headers = new Headers();
  if (object.writeHttpMetadata) {
    object.writeHttpMetadata(headers);
  }
  if (object.httpEtag) {
    headers.set('etag', object.httpEtag);
  }
  if (!headers.get('content-type') || headers.get('content-type') === 'application/octet-stream') {
    headers.set('content-type', getAudioContentType(subpath));
  }
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, ETag');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(null, { status: 200, headers });
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
};
