/**
 * /api/music/list
 * Retorna a biblioteca de músicas armazenada no Backblaze B2.
 */

import { loadLibrary } from './upload';
import { MediaEnv } from '../_mediaStore';

type PagesContext<T = any> = { request: Request; env: T };

function getAllowedOrigin(request: Request, env?: any): string {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return '';
  const isProd = String(env?.ENVIRONMENT || 'production').trim().toLowerCase() === 'production';
  if (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  if (/^https:\/\/([a-z0-9-]+\.)*(nuaborges\.com\.br|phdev\.store)$/.test(origin)) return origin;
  if (/^https:\/\/([a-z0-9-]{6,63}\.)?(nuaborges|nuaborges-er7|nuaborges-admin|admingeral)\.pages\.dev$/.test(origin)) {
    return origin;
  }
  return '';
}

export const onRequestOptions = async () => {
  return new Response(null, { status: 204 });
};

export const onRequestGet = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;
  const origin = getAllowedOrigin(request);
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
  if (origin) {
    baseHeaders['Access-Control-Allow-Origin'] = origin;
  }

  try {
    const library = await loadLibrary(env);
    return new Response(JSON.stringify(library), {
      status: 200,
      headers: baseHeaders,
    });
  } catch (err) {
    console.error('[MusicList] Erro:', err);
    return new Response(
      JSON.stringify({ tracks: [], config: { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge' } }),
      {
        status: 200,
        headers: baseHeaders,
      }
    );
  }
};

export const onRequestPost = onRequestGet;
export const onRequest = onRequestGet;
