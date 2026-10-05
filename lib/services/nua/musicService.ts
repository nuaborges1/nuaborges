/**
 * Serviço de Músicas e Playlist — Projeto Nua Borges
 * Responsável pelo carregamento, upload, edição e configurações de áudio
 */

import { getStoredSessionToken } from '@/lib/contentStore';
import type { MusicTrack, MusicConfig } from '@/lib/music/types';

function getAuthHeaders(contentType: string = 'application/json') {
  const token = getStoredSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': contentType,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchMusicTracks(): Promise<{ tracks: MusicTrack[]; config?: MusicConfig }> {
  try {
    const res = await fetch('/api/music/list', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return {
        tracks: Array.isArray(data.tracks) ? data.tracks : [],
        config: data.config,
      };
    }
  } catch (err) {
    console.warn('[musicService] Falha ao carregar faixas:', err);
  }
  return { tracks: [] };
}

export async function uploadMusicTrack(params: {
  file: File;
  title: string;
  artist: string;
}): Promise<{ success: boolean; track?: MusicTrack; error?: string }> {
  try {
    const ext = params.file.name.split('.').pop() || 'mp3';
    const safeTitle = params.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const key = `audio/${safeTitle}-${Date.now()}.${ext}`;
    const token = getStoredSessionToken();

    const res = await fetch('/api/music/upload', {
      method: 'POST',
      headers: {
        'Content-Type': params.file.type || 'audio/mpeg',
        'X-Object-Key': key,
        'X-Mime-Type': params.file.type || 'audio/mpeg',
        'X-Track-Title': params.title.trim().substring(0, 200),
        'X-Track-Artist': params.artist.trim().substring(0, 200),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: params.file,
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: true, track: data.track };
    }

    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || `Erro ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha no upload.' };
  }
}

export async function updateMusicTrack(params: {
  id: string;
  title?: string;
  artist?: string;
  active?: boolean;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/music/update', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteMusicTrack(id: string, deleteFile = true): Promise<boolean> {
  try {
    const res = await fetch('/api/music/update', {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, deleteFile }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateMusicConfig(config: {
  autoplay?: boolean;
  enabled?: boolean;
  playlistTitle?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/music/config', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch {
    return false;
  }
}
