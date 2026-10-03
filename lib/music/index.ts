// lib/music/index.ts — Re-exports centralizados do módulo de música
export { MusicProvider, useMusicPlayer } from './store';
export type { MusicPlayerAPI } from './store';
export type { MusicTrack, MusicConfig, MusicLibrary, PlayerState } from './types';
export { DEFAULT_LIBRARY, DEFAULT_CONFIG } from './types';
export { loadSavedVolume, saveVolume, loadSavedPosition, savePosition, clearPosition } from './persistence';
