// lib/music/mediaHelpers.ts — Utilitários para detecção e reprodução multimídia (Áudio, Vídeo MP4, YouTube)

import type { MusicTrack } from './types';

export interface TrackVideoInfo {
  isVideo: boolean;
  isYouTube: boolean;
  youtubeId: string | null;
  directVideoUrl: string | null;
  providerBadge: string;
}

/**
 * Extrai o ID do vídeo do YouTube de qualquer formato de URL
 * (youtube.com/watch?v=, youtu.be/, youtube.com/embed/, shorts, etc.)
 */
export function extractYouTubeId(urlStr?: string | null): string | null {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname.includes('youtu.be')) {
      const cleanPath = parsed.pathname.replace(/^\//, '').split('?')[0].split('/')[0];
      return cleanPath && cleanPath.length >= 8 ? cleanPath : null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.replace('/embed/', '').split('?')[0];
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.replace('/shorts/', '').split('?')[0];
      }
      return parsed.searchParams.get('v');
    }
  } catch {
    // Fallback regex para URLs parciais ou malformadas
    const match = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
    return match ? match[1] : null;
  }
  const match = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Identifica se a faixa contém vídeo e extrai suas credenciais
 */
export function getTrackVideoInfo(track?: MusicTrack | null): TrackVideoInfo {
  if (!track) {
    return {
      isVideo: false,
      isYouTube: false,
      youtubeId: null,
      directVideoUrl: null,
      providerBadge: 'Áudio',
    };
  }

  const rawUrl = track.url || track.externalUrl || '';
  const ytId = track.youtubeVideoId || extractYouTubeId(rawUrl) || extractYouTubeId(track.externalUrl);
  const isYouTube = Boolean(ytId) || track.type === 'youtube_video' || track.type === 'yt_music';

  const isDirectVideo = Boolean(
    !isYouTube && (
      track.mimeType?.startsWith('video/') ||
      /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(rawUrl) ||
      track.type === ('video' as any)
    )
  );

  let badge = 'Áudio HQ';
  if (isYouTube) badge = 'YouTube Video';
  else if (isDirectVideo) badge = 'Vídeo HD';
  else if (track.type === 'spotify_track') badge = 'Spotify';
  else if (track.type === 'apple_music') badge = 'Apple Music';

  return {
    isVideo: isYouTube || isDirectVideo,
    isYouTube,
    youtubeId: ytId || null,
    directVideoUrl: isDirectVideo ? rawUrl : null,
    providerBadge: badge,
  };
}

/**
 * Retorna se a faixa é de vídeo
 */
export function isVideoTrack(track?: MusicTrack | null): boolean {
  return getTrackVideoInfo(track).isVideo;
}
