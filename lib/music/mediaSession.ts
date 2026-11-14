import type { MusicTrack } from './types';

export function updateMediaSessionMetadata(track: MusicTrack | undefined, playlistTitle?: string) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator) || !track) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Nua Borges',
      artist: track.artist || 'Nua Borges',
      album: playlistTitle || 'Sensual Lounge',
      artwork: [
        { src: track.coverUrl || '/images/nua/hero/hero-1.jpg', sizes: '512x512', type: 'image/jpeg' },
        { src: track.coverUrl || '/images/nua/hero/hero-1.jpg', sizes: '256x256', type: 'image/jpeg' },
      ],
    });
  } catch { }
}

export function updateMediaSessionPlayback(isPlaying: boolean, duration: number, currentTime: number) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    if (duration > 0 && typeof (navigator.mediaSession as any).setPositionState === 'function') {
      (navigator.mediaSession as any).setPositionState({
        duration: Math.max(0, duration),
        playbackRate: 1,
        position: Math.min(Math.max(0, currentTime), duration),
      });
    }
  } catch { }
}

interface MediaSessionActionHandlers {
  play: () => void;
  pause: () => void;
  prev: () => void;
  next: () => void;
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

export function setupMediaSessionHandlers({
  play,
  pause,
  prev,
  next,
  seekTo,
  getCurrentTime,
  getDuration,
}: MediaSessionActionHandlers): () => void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) return () => {};
  try {
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('stop', pause);
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (d.seekTime !== undefined) seekTo(d.seekTime);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (d) => {
      seekTo(Math.max(0, getCurrentTime() - (d.seekOffset || 10)));
    });
    navigator.mediaSession.setActionHandler('seekforward', (d) => {
      seekTo(Math.min(getDuration(), getCurrentTime() + (d.seekOffset || 10)));
    });
  } catch { }

  return () => {
    try {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('stop', null);
      navigator.mediaSession.setActionHandler('seekto', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    } catch { }
  };
}
