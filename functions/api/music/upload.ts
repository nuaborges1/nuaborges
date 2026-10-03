/**
 * POST /api/music/upload
 * Faz upload de arquivo de áudio para o R2 e registra na biblioteca.
 *
 * Headers esperados:
 *   X-Object-Key: audio/nome-do-arquivo.mp3
 *   X-Mime-Type: audio/mpeg
 *   X-Track-Title: Título da Música
 *   X-Track-Artist: Nome do Artista
 *   X-Track-Order: 1 (opcional)
 * Body: raw binary do arquivo de áudio
 */

import { isValidObjectKey, verifyMagicBytes } from '../_security';
import { recordAuditEvent } from '../_auditHelper';

interface Env {
  BUCKET?: any;
  NEXT_PUBLIC_MEDIA_CDN_URL?: string;
}

type PagesContext<T = any> = { request: Request; env: T };

const MAX_AUDIO_BYTES = 60 * 1024 * 1024; // 60MB
const MUSIC_LIBRARY_KEY = 'music/library.json';

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/flac',
]);

async function loadLibrary(bucket: any): Promise<{ tracks: any[]; config: any }> {
  try {
    const obj = await bucket.get(MUSIC_LIBRARY_KEY);
    if (obj) {
      const text = await obj.text();
      return JSON.parse(text);
    }
  } catch { }
  return { tracks: [], config: { enabled: true, autoplay: false, playlistTitle: 'Sensual Lounge' } };
}

async function saveLibrary(bucket: any, library: { tracks: any[]; config: any }) {
  await bucket.put(MUSIC_LIBRARY_KEY, JSON.stringify(library, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const key = request.headers.get('X-Object-Key');
    const rawMime = (request.headers.get('X-Mime-Type') || '').toLowerCase().trim();
    const trackTitle = request.headers.get('X-Track-Title') || 'Sem título';
    const trackArtist = request.headers.get('X-Track-Artist') || '';
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

    if (!env.BUCKET || typeof env.BUCKET.put !== 'function') {
      return new Response(
        JSON.stringify({ error: 'Serviço de armazenamento não disponível.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upload para R2
    await env.BUCKET.put(key, bodyBytes, {
      httpMetadata: {
        contentType: verifiedMime,
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Gera URL pública
    const cdnBase = (env.NEXT_PUBLIC_MEDIA_CDN_URL || 'https://nuaborges.phstatic.com.br').replace(/\/$/, '');
    const audioUrl = `${cdnBase}/${key}`;

    // Registra na biblioteca
    const library = await loadLibrary(env.BUCKET);
    const trackId = `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newTrack = {
      id: trackId,
      title: trackTitle.substring(0, 200),
      artist: trackArtist.substring(0, 200),
      url: audioUrl,
      objectKey: key,
      coverUrl: coverUrl || null,
      active: true,
      order: isNaN(trackOrder) ? library.tracks.length + 1 : trackOrder,
      addedAt: new Date().toISOString(),
      sizeBytes: bodyBytes.byteLength,
      mimeType: verifiedMime,
      duration: null, // será preenchido pelo player na primeira reprodução
    };

    library.tracks.push(newTrack);
    library.tracks.sort((a: any, b: any) => (a.order || 999) - (b.order || 999));
    await saveLibrary(env.BUCKET, library);

    // Auditoria
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
