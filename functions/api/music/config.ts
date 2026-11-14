/**
 * GET /api/music/config  — Retorna configurações do player
 * PUT /api/music/config  — Salva configurações do player
 *
 * Config: { enabled, autoplay, playlistTitle, reorderTracks? }
 */

import { recordAuditEvent } from '../_auditHelper';
import { loadLibrary, saveLibrary } from './upload';
import { isMediaStorageConfigured, MediaEnv } from '../_mediaStore';

type PagesContext<T = any> = { request: Request; env: T };

export const onRequestGet = async (context: PagesContext<MediaEnv>) => {
  const { env } = context;
  try {
    const library = await loadLibrary(env);
    return new Response(JSON.stringify({ config: library.config || { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge' } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ config: { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPut = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;
  if (!isMediaStorageConfigured(env)) {
    return new Response(JSON.stringify({ error: 'Armazenamento não disponível.' }), { status: 500 });
  }

  try {
    const body = await request.json() as any;
    const library = await loadLibrary(env);

    // Campos de configuração permitidos
    const allowedConfig = ['enabled', 'autoplay', 'playlistTitle'];
    const newConfig = { ...(library.config || {}) };
    for (const field of allowedConfig) {
      if (field in body) newConfig[field] = body[field];
    }
    library.config = newConfig;

    // Reordenação de faixas (array de IDs na nova ordem)
    if (Array.isArray(body.reorderTracks)) {
      const orderMap = new Map<string, number>();
      body.reorderTracks.forEach((id: string, i: number) => orderMap.set(id, i + 1));
      library.tracks = library.tracks.map((t: any) => ({
        ...t,
        order: orderMap.has(t.id) ? orderMap.get(t.id) : t.order,
      }));
      library.tracks.sort((a: any, b: any) => (a.order || 999) - (b.order || 999));
    }

    await saveLibrary(env, library);

    await recordAuditEvent(env, request, {
      type: 'MUSIC_CONFIG',
      severity: 'info',
      summary: `Configurações do player atualizadas`,
      details: { config: newConfig },
    });

    return new Response(JSON.stringify({ success: true, config: newConfig }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[MusicConfig] Erro:', err);
    return new Response(JSON.stringify({ error: 'Falha ao salvar configurações.' }), { status: 500 });
  }
};

export const onRequestOptions = async () => new Response(null, { status: 204 });
export const onRequest = async (context: PagesContext<MediaEnv>) => {
  if (context.request.method === 'PUT') return onRequestPut(context);
  return onRequestGet(context);
};
