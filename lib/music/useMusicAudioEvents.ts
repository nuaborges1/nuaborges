import { useEffect, useRef } from 'react';
import type { MusicTrack } from './types';
import { saveTrackDuration } from './persistence';
import { getPublicApiUrl } from '../contentStore';

interface UseMusicAudioEventsOptions {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTrack: MusicTrack | undefined;
  currentIndex: number;
  activeTracksCount: number;
  isPlaying: boolean;
  repeatMode: 'none' | 'one' | 'all';
  shuffleMode: boolean;
  isFadingRef: React.MutableRefObject<boolean>;
  playHistoryRef: React.MutableRefObject<number[]>;
  fadeOut: (ms?: number) => Promise<void>;
  prefetchNextTrack: (idx: number) => void;
  handleNetworkRecovery: () => void;
  resumeAudioContext: () => void;
  suspendAudioContext: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (dur: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setAutoplayBlocked: (blocked: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function useMusicAudioEvents({
  audioRef,
  currentTrack,
  currentIndex,
  activeTracksCount,
  isPlaying,
  repeatMode,
  shuffleMode,
  isFadingRef,
  playHistoryRef,
  fadeOut,
  prefetchNextTrack,
  handleNetworkRecovery,
  resumeAudioContext,
  suspendAudioContext,
  setCurrentTime,
  setDuration,
  setIsPlaying,
  setAutoplayBlocked,
  setIsLoading,
  setError,
  setCurrentIndex,
}: UseMusicAudioEventsOptions) {
  const bufferTimeoutRef = useRef<any>(null);
  const listenMilestoneEmittedRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const cur = audio.currentTime;
      const dur = audio.duration;
      setCurrentTime(cur);

      if (dur > 15 && cur / dur > 0.70) {
        const nextIdx = (currentIndex + 1) % activeTracksCount;
        prefetchNextTrack(nextIdx);
      }

      if (cur >= 30 && currentTrack && listenMilestoneEmittedRef.current !== currentTrack.id) {
        listenMilestoneEmittedRef.current = currentTrack.id;
        try {
          const apiUrl = getPublicApiUrl();
          fetch(`${apiUrl}/api/telemetry/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'track_listen_30s',
              trackId: currentTrack.id,
              title: currentTrack.title,
            }),
          }).catch(() => { });
        } catch { }
      }

      if (dur > 10 && dur - cur <= 3 && !isFadingRef.current) {
        fadeOut(2800);
      }
    };

    const onDurationChange = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        const d = Math.round(audio.duration);
        setDuration(d);
        if (currentTrack) {
          saveTrackDuration(currentTrack.id, d);
          if (!currentTrack.duration) {
            try {
              const apiUrl = getPublicApiUrl();
              fetch(`${apiUrl}/api/music/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: currentTrack.id, duration: d }),
              }).catch(() => { });
            } catch { }
          }
        }
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      setAutoplayBlocked(false);
      setIsLoading(false);
      setError(null);
      resumeAudioContext();
    };

    const onPause = () => {
      setIsPlaying(false);
      suspendAudioContext();
    };

    const onWaiting = () => {
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
      bufferTimeoutRef.current = setTimeout(() => setIsLoading(true), 140);
    };

    const onCanPlay = () => {
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
      setIsLoading(false);
    };

    const onPlaying = () => {
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
      setIsLoading(false);
    };

    const onStalled = () => {
      if (isPlaying) handleNetworkRecovery();
    };

    const onError = () => {
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
      const code = audio.error?.code;

      if (code === 2) {
        handleNetworkRecovery();
      } else {
        setIsLoading(false);
        setIsPlaying(false);
        if (code === 3) setError('Falha na decodificação do áudio.');
        else if (code === 4) setError('Formato ou fonte de áudio não suportada.');
        else setError('Não foi possível reproduzir este arquivo.');
      }
    };

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        const d = Math.round(audio.duration);
        setDuration(d);
        if (currentTrack) saveTrackDuration(currentTrack.id, d);
      }
      setIsLoading(false);
    };

    const onEnded = () => {
      isFadingRef.current = false;
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => { });
        return;
      }

      if (shuffleMode && activeTracksCount > 1) {
        let nextIdx = currentIndex;
        while (nextIdx === currentIndex && activeTracksCount > 1) {
          nextIdx = Math.floor(Math.random() * activeTracksCount);
        }
        playHistoryRef.current.push(currentIndex);
        setCurrentIndex(nextIdx);
        return;
      }

      const nextIdx = currentIndex + 1;
      if (nextIdx >= activeTracksCount) {
        if (repeatMode === 'all') {
          setCurrentIndex(0);
        } else {
          setIsPlaying(false);
        }
        return;
      }
      setCurrentIndex(nextIdx);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    };
  }, [
    audioRef,
    currentIndex,
    activeTracksCount,
    repeatMode,
    shuffleMode,
    currentTrack,
    isPlaying,
    isFadingRef,
    playHistoryRef,
    fadeOut,
    handleNetworkRecovery,
    prefetchNextTrack,
    resumeAudioContext,
    suspendAudioContext,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setAutoplayBlocked,
    setIsLoading,
    setError,
    setCurrentIndex,
  ]);

  return {
    clearBufferTimeout: () => {
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    },
    resetMilestone: () => {
      listenMilestoneEmittedRef.current = null;
    },
  };
}
