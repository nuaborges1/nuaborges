// lib/music/types.ts — Tipos do sistema de música

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;           // URL pública do arquivo de áudio no CDN
  objectKey?: string;    // Chave R2 (audio/nome.mp3)
  coverUrl?: string;     // URL da capa (imagem)
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
  autoplay: boolean;      // Padrão: false. Admin controla. NUNCA sobreposto por localStorage.
  playlistTitle?: string;
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

// Faixas de exemplo locais usadas quando não há biblioteca no R2
export const FALLBACK_TRACKS: MusicTrack[] = [];

export const DEFAULT_CONFIG: MusicConfig = {
  enabled: true,
  autoplay: false,
  playlistTitle: 'Sensual Lounge',
};

export const DEFAULT_LIBRARY: MusicLibrary = {
  tracks: FALLBACK_TRACKS,
  config: DEFAULT_CONFIG,
};
