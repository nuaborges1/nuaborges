/**
 * POST /api/music/upload
 * Faz upload de arquivo de áudio ou registra faixa/vídeo externo na biblioteca (Backblaze B2).
 *
 * Headers esperados (para upload de arquivo de áudio):
 *   X-Object-Key: audio/nome-do-arquivo.mp3
 *   X-Mime-Type: audio/mpeg
 *   X-Track-Title: Título da Música
 *   X-Track-Artist: Nome do Artista
 *   X-Track-Order: 1 (opcional)
 * Body: raw binary do arquivo de áudio ou JSON com link externo
 */

import { isValidObjectKey, verifyMagicBytes } from '../_security';
import { recordAuditEvent } from '../_auditHelper';
import { isMediaStorageConfigured, putMedia, getMedia, MediaEnv } from '../_mediaStore';

type PagesContext<T = any> = { request: Request; env: T };

const MAX_AUDIO_BYTES = 60 * 1024 * 1024; // 60MB
const MUSIC_LIBRARY_KEY = 'music/library.json';

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/flac', 'audio/aac',
]);

export async function loadLibrary(env: MediaEnv): Promise<{ tracks: any[]; config: any }> {
  try {
    const obj = await getMedia(env, MUSIC_LIBRARY_KEY);
    if (obj && obj.body) {
      const decoder = new TextDecoder();
      const text = decoder.decode(obj.body);
      return JSON.parse(text);
    }
  } catch (err: any) {
    console.error('[MusicUpload] Erro ao carregar biblioteca de música do B2/Storage:', err?.message || err);
  }
  return { tracks: [], config: { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge' } };
}

export async function saveLibrary(env: MediaEnv, library: { tracks: any[]; config: any }) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(JSON.stringify(library, null, 2));
  await putMedia(env, MUSIC_LIBRARY_KEY, bytes.buffer, 'application/json');
}

export const onRequestPost = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;

  try {
    if (!isMediaStorageConfigured(env)) {
      return new Response(
        JSON.stringify({ error: 'Serviço de armazenamento não disponível.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // A. Tratamento de Link Externo (JSON Body: Spotify, YouTube, Apple Music, etc.)
    if (contentType.includes('application/json')) {
      const body = await request.json() as any;
      const { title, artist, url, type, externalUrl, youtubeVideoId, coverUrl, order } = body;

      if (!title || (!url && !externalUrl)) {
        return new Response(
          JSON.stringify({ error: 'Título e URL de mídia são obrigatórios.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const library = await loadLibrary(env);
      const trackId = `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const trackOrder = parseInt(order || '999', 10);

      const newTrack = {
        id: trackId,
        title: String(title).substring(0, 200),
        artist: String(artist || 'Nua Borges').substring(0, 200),
        url: url || externalUrl,
        externalUrl: externalUrl || url,
        type: type || 'external_audio',
        youtubeVideoId: youtubeVideoId || null,
        coverUrl: coverUrl || null,
        active: true,
        order: isNaN(trackOrder) ? library.tracks.length + 1 : trackOrder,
        addedAt: new Date().toISOString(),
      };

      library.tracks.push(newTrack);
      library.tracks.sort((a: any, b: any) => (a.order || 999) - (b.order || 999));
      await saveLibrary(env, library);

      await recordAuditEvent(env, request, {
        type: 'MUSIC_UPLOAD',
        severity: 'info',
        summary: `Nova faixa externa registrada: "${title}" (${type || 'external'})`,
        details: { id: trackId, title, artist, type },
      });

      return new Response(
        JSON.stringify({ success: true, track: newTrack }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // B. Tratamento de Upload de Arquivo Binário (MP3, M4A, WAV, etc.)
    const key = request.headers.get('X-Object-Key');
    const rawMime = (request.headers.get('X-Mime-Type') || '').toLowerCase().trim();
    const trackTitle = request.headers.get('X-Track-Title') || 'Sem título';
    const trackArtist = request.headers.get('X-Track-Artist') || 'Nua Borges';
    const trackOrder = parseInt(request.headers.get('X-Track-Order') || '999', 10);
    const coverUrl = request.headers.get('X-Track-Cover') || '';

    // Validação da chave
    if (!key || !isValidObjectKey(key)) {
      return new Response(
        JSON.stringify({ error: 'Chave de objeto inválida. Use o formato: audio/nome-do-arquivo.mp3' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificação de tipo de áudio
    if (!AUDIO_MIME_TYPES.has(rawMime) && !key.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)) {
      return new Response(
        JSON.stringify({ error: 'Somente arquivos de áudio são aceitos (MP3, WAV, M4A, OGG, FLAC).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Leitura do corpo
    const bodyBytes = await request.arrayBuffer();
    if (!bodyBytes || bodyBytes.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: 'Arquivo vazio.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Tamanho máximo
    if (bodyBytes.byteLength > MAX_AUDIO_BYTES) {
      return new Response(
        JSON.stringify({ error: `O arquivo excede o limite de ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))}MB.` }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificação de magic bytes
    const magicCheck = verifyMagicBytes(new Uint8Array(bodyBytes.slice(0, 32)));
    if (!magicCheck.valid) {
      return new Response(
        JSON.stringify({ error: 'Arquivo inválido ou corrompido. Verifique se é um arquivo de áudio válido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const verifiedMime = magicCheck.detectedMime || rawMime || 'audio/mpeg';

    // Salva no Backblaze B2 / Storage
    await putMedia(env, key, bodyBytes, verifiedMime);

    // Gera URL pública
    const cdnBase = (env.NEXT_PUBLIC_MEDIA_CDN_URL || '').replace(/\/$/, '');
    const audioUrl = cdnBase ? `${cdnBase}/${key}` : `/${key}`;

    // Registra na biblioteca
    const library = await loadLibrary(env);
    const trackId = `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTrack = {
      id: trackId,
      title: trackTitle.substring(0, 200),
      artist: trackArtist.substring(0, 200),
      url: audioUrl,
      objectKey: key,
      type: 'audio_file',
      coverUrl: coverUrl || null,
      active: true,
      order: isNaN(trackOrder) ? library.tracks.length + 1 : trackOrder,
      addedAt: new Date().toISOString(),
      sizeBytes: bodyBytes.byteLength,
      mimeType: verifiedMime,
      duration: null,
    };

    library.tracks.push(newTrack);
    library.tracks.sort((a: any, b: any) => (a.order || 999) - (b.order || 999));
    await saveLibrary(env, library);

    await recordAuditEvent(env, request, {
      type: 'MUSIC_UPLOAD',
      severity: 'info',
      summary: `Nova música adicionada: "${trackTitle}" (${Math.round(bodyBytes.byteLength / 1024)} KB)`,
      details: { key, url: audioUrl, title: trackTitle, artist: trackArtist, sizeBytes: bodyBytes.byteLength },
    });

    return new Response(
      JSON.stringify({ success: true, track: newTrack }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[MusicUpload] Erro:', err);
    return new Response(
      JSON.stringify({ error: 'Falha ao processar o arquivo de áudio.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
