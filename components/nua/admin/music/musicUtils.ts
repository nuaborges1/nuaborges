/**
 * Utilitários e constantes para a Biblioteca de Músicas
 */

export function fmtBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtDuration(s?: number | null): string {
  if (!s || !isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

export const ACCEPTED_AUDIO_FORMATS = '.mp3,.wav,.m4a,.ogg,.flac,audio/*';
export const MAX_AUDIO_MB = 60;
