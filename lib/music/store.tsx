'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { PlayerState } from './types';
import { useMusicPlayerEngine } from './useMusicPlayerEngine';

export interface VideoController {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  setVolume: (v: number) => void;
  setMuted: (muted: boolean) => void;
}

export interface MusicPlayerAPI extends PlayerState {
  currentTrack: import('./types').MusicTrack | undefined;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setTrack: (index: number) => void;

  openPlaylist: () => void;
  closePlaylist: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;

  audioRef: React.RefObject<HTMLAudioElement | null>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  getFrequencyBars: () => [number, number, number];

  reloadLibrary: () => void;

  registerVideoController: (controller: VideoController) => void;
  unregisterVideoController: () => void;
  onVideoTimeUpdate: (current: number, duration: number) => void;
  onVideoPlay: () => void;
  onVideoPause: () => void;
  onVideoEnded: () => void;
}

const MusicContext = createContext<MusicPlayerAPI | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = Boolean(
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/contrato') ||
    (typeof window !== 'undefined' && (
      window.location.hostname.startsWith('admin.') ||
      window.location.hostname.startsWith('admingeral.') ||
      window.location.pathname.startsWith('/admin') ||
      window.location.pathname.startsWith('/contrato')
    ))
  );

  // Ref do <audio> criado aqui (quem renderiza o elemento) e injetado na engine,
  // evitando ler um ref devolvido pelo hook durante o render.
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const engine = useMusicPlayerEngine(isAdmin, audioRef);

  const value: MusicPlayerAPI = {
    ...engine,
    openPlaylist: () => engine.setIsPlaylistOpen(true),
    closePlaylist: () => engine.setIsPlaylistOpen(false),
  };

  return (
    <MusicContext.Provider value={value}>
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        style={{ display: 'none' }}
      />
      {children}
    </MusicContext.Provider>
  );
}

export function useMusicPlayer(): MusicPlayerAPI {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusicPlayer deve ser usado dentro de MusicProvider');
  return ctx;
}
