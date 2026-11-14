import { useEffect, useRef, useCallback } from 'react';

interface UseCrossTabAudioSyncOptions {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export function useCrossTabAudioSync({
  audioRef,
  isPlaying,
  setIsPlaying,
}: UseCrossTabAudioSyncOptions) {
  const tabIdRef = useRef(`tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initWebAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx || audioCtxRef.current) return;
      audioCtxRef.current = new Ctx();
    } catch { }
  }, []);

  const suspendAudioContext = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
      audioCtxRef.current.suspend().catch(() => { });
    }
  }, []);

  const resumeAudioContext = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => { });
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      if (document.hidden) {
        if (!isPlaying) suspendAudioContext();
      } else {
        if (isPlaying) resumeAudioContext();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying, suspendAudioContext, resumeAudioContext]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      const channel = new BroadcastChannel('nua_music_sync');
      syncChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === 'PLAY' && event.data?.sender !== tabIdRef.current) {
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
      };

      return () => {
        channel.close();
        syncChannelRef.current = null;
      };
    } catch { }
  }, [audioRef, setIsPlaying]);

  const broadcastPlay = useCallback(() => {
    syncChannelRef.current?.postMessage({
      type: 'PLAY',
      sender: tabIdRef.current,
    });
  }, []);

  const closeAudioContext = useCallback(() => {
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { }
    }
  }, []);

  return {
    initWebAudio,
    suspendAudioContext,
    resumeAudioContext,
    broadcastPlay,
    closeAudioContext,
  };
}
