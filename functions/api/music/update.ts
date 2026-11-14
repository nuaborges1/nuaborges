/**
 * PUT /api/music/update
 * Atualiza metadados de uma música na biblioteca.
 * Body JSON: { id, title?, artist?, coverUrl?, active?, order?, externalUrl?, youtubeVideoId?, type? }
 *
 * DELETE /api/music/update
 * Remove uma música da biblioteca (e opcionalmente do Backblaze B2).
 * Body JSON: { id, deleteFile?: boolean }
 */

import { recordAuditEvent } from '../_auditHelper';
import { loadLibrary, saveLibrary } from './upload';
import { deleteMedia, isMediaStorageConfigured, MediaEnv } from '../_mediaStore';

type PagesContext<T = any> = { request: Request; env: T };

export const onRequestPut = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;
  if (!isMediaStorageConfigured(env)) {
    return new Response(JSON.stringify({ error: 'Armazenamento não disponível.' }), { status: 500 });
  }

  try {
    const body = await request.json() as any;
    const { id, ...updates } = body;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID da música não fornecido.' }), { status: 400 });
    }

    const library = await loadLibrary(env);
    const idx = library.tracks.findIndex((t: any) => t.id === id);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: 'Música não encontrada na biblioteca.' }), { status: 404 });
    }

    // Campos atualizáveis
    const allowed = ['title', 'artist', 'coverUrl', 'active', 'order', 'duration', 'externalUrl', 'youtubeVideoId', 'type', 'url'];
    const track = { ...library.tracks[idx] };
    for (const field of allowed) {
      if (field in updates) {
        track[field] = updates[field];
      }
    }
    track.updatedAt = new Date().toISOString();
    library.tracks[idx] = track;
    library.tracks.sort((a: any, b: any) => (a.order || 999) - (b.order || 999));

    await saveLibrary(env, library);

    await recordAuditEvent(env, request, {
      type: 'MUSIC_UPDATE',
      severity: 'info',
      summary: `Música editada: "${track.title}"`,
      details: { id, changes: Object.keys(updates) },
    });

    return new Response(JSON.stringify({ success: true, track }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[MusicUpdate] Erro:', err);
    return new Response(JSON.stringify({ error: 'Falha ao atualizar música.' }), { status: 500 });
  }
};

export const onRequestDelete = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;
  if (!isMediaStorageConfigured(env)) {
    return new Response(JSON.stringify({ error: 'Armazenamento não disponível.' }), { status: 500 });
  }

  try {
    const body = await request.json() as { id: string; deleteFile?: boolean };
    if (!body.id) {
      return new Response(JSON.stringify({ error: 'ID da música não fornecido.' }), { status: 400 });
    }

    const library = await loadLibrary(env);
    const idx = library.tracks.findIndex((t: any) => t.id === body.id);
    if (idx === -1) {
      return new Response(JSON.stringify({ error: 'Música não encontrada.' }), { status: 404 });
    }

    const [removed] = library.tracks.splice(idx, 1);

    // Remove arquivo do Storage se solicitado e disponível
    if (body.deleteFile && removed.objectKey) {
      try {
        await deleteMedia(env, [removed.objectKey]);
      } catch (e) {
        console.warn('[MusicDelete] Não foi possível deletar arquivo do storage:', e);
      }
    }

    await saveLibrary(env, library);

    await recordAuditEvent(env, request, {
      type: 'MUSIC_DELETE',
      severity: 'warning',
      summary: `Música removida: "${removed.title}"`,
      details: { id: body.id, title: removed.title, deleteFile: body.deleteFile },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[MusicDelete] Erro:', err);
    return new Response(JSON.stringify({ error: 'Falha ao remover música.' }), { status: 500 });
  }
};
