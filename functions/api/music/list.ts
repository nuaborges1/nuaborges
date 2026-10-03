/**
 * GET /api/music/list
 * Retorna a biblioteca de músicas armazenada no R2.
 */

interface Env {
  BUCKET?: any;
  NEXT_PUBLIC_MEDIA_CDN_URL?: string;
}

type PagesContext<T = any> = { request: Request; env: T };

const MUSIC_LIBRARY_KEY = 'music/library.json';

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;

  try {
    if (env.BUCKET && typeof env.BUCKET.get === 'function') {
      const obj = await env.BUCKET.get(MUSIC_LIBRARY_KEY);
      if (obj) {
        const text = await obj.text();
        return new Response(text, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // Biblioteca vazia na primeira vez
    return new Response(
      JSON.stringify({ tracks: [], config: { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge' } }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    console.error('[MusicList] Erro:', err);
    return new Response(
      JSON.stringify({ error: 'Falha ao carregar biblioteca de músicas.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
