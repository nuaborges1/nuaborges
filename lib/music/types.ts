// lib/music/types.ts — Tipos do sistema de música e central multimídia

export type TrackType = 'audio_file' | 'youtube_video' | 'spotify_track' | 'yt_music' | 'apple_music' | 'external_audio';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;           // URL pública do arquivo de áudio ou link de streaming
  objectKey?: string;    // Chave no storage (audio/nome.mp3)
  type?: TrackType;      // Tipo de mídia
  externalUrl?: string;  // Link original do Spotify, YouTube, Apple Music, etc.
  youtubeVideoId?: string | null; // ID do vídeo no YouTube
  coverUrl?: string | null;     // URL da capa
  active: boolean;
  order: number;
  addedAt?: string;
  updatedAt?: string;
  sizeBytes?: number;
  mimeType?: string;
  duration?: number | null; // segundos, preenchido ao carregar
}

export interface MusicConfig {
  enabled: boolean;
  autoplay: boolean;      // Padrão: false. Admin controla.
  playlistTitle?: string;
  backgroundVideoEnabled?: boolean;
}

export interface MusicLibrary {
  tracks: MusicTrack[];
  config: MusicConfig;
}

export interface PlayerState {
  // Biblioteca
  library: MusicLibrary;

  // Reprodução
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;

  // Volume
  volume: number;
  isMuted: boolean;

  // Controles
  repeatMode: 'none' | 'one' | 'all';
  shuffleMode: boolean;
  isPlaylistOpen: boolean;

  // Status
  autoplayBlocked: boolean;
  isLibraryLoaded: boolean;
}

export const FALLBACK_TRACKS: MusicTrack[] = [];

export const DEFAULT_CONFIG: MusicConfig = {
  enabled: true,
  autoplay: false,
  playlistTitle: 'Sensual Lounge',
  backgroundVideoEnabled: true,
};

export const DEFAULT_LIBRARY: MusicLibrary = {
  tracks: FALLBACK_TRACKS,
  config: DEFAULT_CONFIG,
};
