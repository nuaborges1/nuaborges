/**
 * Cloudflare Pages Function: /media/[[path]]
 *
 * Servidor de arquivos e imagens de alta performance diretamente do bucket R2.
 * Garante que qualquer foto ou vídeo enviado pelo painel admin seja servido instantaneamente
 * com cache de borda e headers de CORS universais.
 */

interface Env {
  BUCKET?: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
  params: { path?: string | string[] };
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env, params } = context;
  const pathParam = params.path;
  const subpath = Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '';
  
  if (!subpath) {
    return new Response('Caminho não especificado', { status: 400 });
  }

  // Tenta encontrar o objeto pela chave exata ou prefixando com 'media/'
  const keysToTry = [
    subpath.startsWith('media/') ? subpath : `media/${subpath}`,
    subpath,
  ];

  if (!env.BUCKET || typeof env.BUCKET.get !== 'function') {
    return new Response('Storage R2 não configurado ou indisponível', { status: 503 });
  }

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
    } catch {}
  }

  if (!object) {
    return new Response('Mídia não encontrada no armazenamento.', { status: 404 });
  }

  const headers = new Headers();
  if (object.writeHttpMetadata) {
    object.writeHttpMetadata(headers);
  }
  
  if (object.httpEtag) {
    headers.set('etag', object.httpEtag);
  }

  // Cache longo e imutável para alta performance
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, ETag');

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
