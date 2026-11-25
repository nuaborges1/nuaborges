import { useState, useEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react';
import type { MusicTrack, MusicLibrary } from './types';
import { DEFAULT_CONFIG, DEFAULT_LIBRARY } from './types';
import {
  loadSavedVolume,
  saveVolume,
  loadSavedPosition,
  savePosition,
  loadDurationCache,
} from './persistence';
import {
  updateMediaSessionMetadata,
  updateMediaSessionPlayback,
  setupMediaSessionHandlers,
} from './mediaSession';
import { calculateFrequencyBars } from './equalizer';
import { useMusicShortcuts } from './useMusicShortcuts';
import { useMusicFades } from './useMusicFades';
import { useMusicAudioEvents } from './useMusicAudioEvents';
import { subscribeAdminUpdates } from '@/lib/adminSync';
import { useCrossTabAudioSync } from './useCrossTabAudioSync';
import { getTrackVideoInfo } from './mediaHelpers';
import type { VideoController } from './store';

import { getPublicApiUrl } from '../contentStore';

/**
 * Motor do player de música.
 *
 * `providedAudioRef` permite ao componente que renderiza o `<audio>` injetar o próprio
 * ref (o `MusicProvider`), em vez de ler um ref devolvido pelo hook durante o render.
 * Quando não informado, o hook cria o ref internamente (comportamento anterior).
 */
export function useMusicPlayerEngine(
  isAdmin: boolean,
  providedAudioRef?: RefObject<HTMLAudioElement | null>
) {
  const [library, setLibrary] = useState<MusicLibrary>(DEFAULT_LIBRARY);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = providedAudioRef ?? localAudioRef;
  const prefetchAudioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);

  const positionSaveRef = useRef<any>(null);
  const pendingSeekRef = useRef<{ trackId: string; time: number } | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<any>(null);

  const playHistoryRef = useRef<number[]>([]);

  const activeTracks = library.tracks.filter((t) => t.active);
  const currentTrack: MusicTrack | undefined = activeTracks[currentIndex];

  const videoControllerRef = useRef<VideoController | null>(null);

  const registerVideoController = useCallback((controller: VideoController) => {
    videoControllerRef.current = controller;
  }, []);

  const unregisterVideoController = useCallback(() => {
    videoControllerRef.current = null;
  }, []);

  const onVideoTimeUpdate = useCallback((cur: number, dur: number) => {
    setCurrentTime(cur);
    if (dur > 0 && isFinite(dur)) {
      setDuration(Math.round(dur));
    }
  }, []);

  const onVideoPlay = useCallback(() => {
    setIsPlaying(true);
    setAutoplayBlocked(false);
    setIsLoading(false);
    setError(null);
  }, []);

  const onVideoPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const { applyVolume, fadeIn, fadeOut, isFadingRef, cleanupFades } = useMusicFades({
    audioRef,
    volume,
    isMuted,
  });

  const {
    initWebAudio,
    suspendAudioContext,
    resumeAudioContext,
    broadcastPlay,
    closeAudioContext,
  } = useCrossTabAudioSync({
    audioRef,
    isPlaying,
    setIsPlaying,
  });

  const reloadLibrary = useCallback(async () => {
    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/music/list`, { cache: 'no-store' });
      if (!res.ok) return;
      const data: MusicLibrary = await res.json();
      if (data && Array.isArray(data.tracks)) {
        const durationCache = loadDurationCache();
        const hydratedTracks = data.tracks.map((t) => ({
          ...t,
          duration: t.duration || durationCache[t.id] || null,
        }));
        setLibrary({ tracks: hydratedTracks, config: { ...DEFAULT_CONFIG, ...data.config } });
      }
    } catch (e) {
      console.warn('[MusicStore] Falha ao carregar biblioteca:', e);
    } finally {
      setIsLibraryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    reloadLibrary();
  }, [reloadLibrary]);

  // Alteração de faixas/config no painel (ou pela IA) atualiza o player na hora.
  useEffect(() => subscribeAdminUpdates('music', () => reloadLibrary()), [reloadLibrary]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = loadSavedVolume();
    setVolumeState(saved);

    const savedPos = loadSavedPosition();
    if (savedPos) {
      pendingSeekRef.current = savedPos;
    }
  }, []);

  const prefetchNextTrack = useCallback((nextIdx: number) => {
    const nextT = activeTracks[nextIdx];
    if (!nextT?.url || typeof window === 'undefined') return;

    try {
      if (!prefetchAudioRef.current) {
        prefetchAudioRef.current = new Audio();
        prefetchAudioRef.current.preload = 'metadata';
      }
      if (prefetchAudioRef.current.src !== nextT.url) {
        prefetchAudioRef.current.src = nextT.url;
        prefetchAudioRef.current.load();
      }
    } catch { }
  }, [activeTracks]);

  const loadTrack = useCallback((track: MusicTrack, autoResume: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryCountRef.current = 0;

    const videoInfo = getTrackVideoInfo(track);
    if (videoInfo.isVideo) {
      audio.pause();
      try {
        audio.removeAttribute('src');
        audio.load();
      } catch { }

      setDuration(track.duration || 0);
      setCurrentTime(0);
      setError(null);
      setIsLoading(false);

      if (autoResume) {
        setIsPlaying(true);
        setAutoplayBlocked(false);
        if (videoControllerRef.current) {
          videoControllerRef.current.play();
        }
      }
      return;
    }

    if (!track.url) return;

    audio.pause();
    if (!audio.src || !audio.src.includes(track.url)) {
      audio.src = track.url;
      audio.preload = 'auto';
      audio.load();
    }

    setDuration(track.duration || 0);
    setCurrentTime(0);
    setError(null);
    setIsLoading(true);

    if (autoResume) {
      applyVolume(1);
      audio.muted = false;
      audio.play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
          setIsLoading(false);
          resumeAudioContext();
          broadcastPlay();

          const pending = pendingSeekRef.current;
          if (pending && pending.trackId === track.id) {
            pendingSeekRef.current = null;
            try { audio.currentTime = pending.time; } catch { }
          }
        })
        .catch(() => {
          setAutoplayBlocked(true);
          setIsLoading(false);
          audio.muted = true;
          audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
    }
  }, [applyVolume, resumeAudioContext, broadcastPlay, audioRef]);

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const videoInfo = getTrackVideoInfo(currentTrack);
    if (videoInfo.isVideo) return;
    if (!currentTrack.url) return;
    const audio = audioRef.current;
    if (!audio.src || !audio.src.includes(currentTrack.url)) {
      audio.src = currentTrack.url;
      audio.preload = 'none';
    }
  }, [currentTrack, audioRef]);

  useEffect(() => {
    if (!currentTrack) return;
    loadTrack(currentTrack, isPlaying);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const handleNetworkRecovery = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (retryCountRef.current < 3) {
      const delay = Math.min(3000, 500 * Math.pow(2, retryCountRef.current));
      retryCountRef.current++;

      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        const savedTime = audio.currentTime;
        audio.load();
        audio.currentTime = savedTime;
        audio.play().then(() => {
          setIsPlaying(true);
          setError(null);
          retryCountRef.current = 0;
        }).catch(() => { });
      }, delay);
    } else {
      setIsLoading(false);
      setIsPlaying(false);
      setError('Conexão instável. Verifique sua rede e tente novamente.');
    }
  }, [currentTrack, audioRef]);

  useMusicAudioEvents({
    audioRef,
    currentTrack,
    currentIndex,
    activeTracksCount: activeTracks.length,
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
  });

  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    if (positionSaveRef.current) clearInterval(positionSaveRef.current);
    positionSaveRef.current = setInterval(() => {
      if (currentTrack && audioRef.current) {
        savePosition(currentTrack.id, Math.floor(audioRef.current.currentTime));
      }
    }, 5000);
    return () => {
      if (positionSaveRef.current) clearInterval(positionSaveRef.current);
    };
  }, [isPlaying, currentTrack, audioRef]);

  useEffect(() => {
    updateMediaSessionMetadata(currentTrack, library.config.playlistTitle);
  }, [currentTrack, library.config.playlistTitle]);

  useEffect(() => {
    updateMediaSessionPlayback(isPlaying, duration, currentTime);
  }, [isPlaying, duration, currentTime]);

  useEffect(() => {
    return () => {
      cleanupFades();
      closeAudioContext();
      if (positionSaveRef.current) clearInterval(positionSaveRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [cleanupFades, closeAudioContext]);

  const play = useCallback(() => {
    const videoInfo = getTrackVideoInfo(currentTrack);
    if (videoInfo.isVideo) {
      setIsPlaying(true);
      setAutoplayBlocked(false);
      setError(null);
      setIsLoading(false);
      broadcastPlay();
      if (videoControllerRef.current) {
        videoControllerRef.current.play();
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    initWebAudio();
    resumeAudioContext();

    if (currentTrack?.url && (!audio.src || !audio.src.includes(currentTrack.url))) {
      audio.src = currentTrack.url;
      audio.preload = 'auto';
    }

    applyVolume(1);
    audio.muted = false;
    audio.play()
      .then(() => {
        setIsPlaying(true);
        setAutoplayBlocked(false);
        setError(null);
        setIsLoading(false);
        broadcastPlay();
      })
      .catch((err) => {
        console.warn('[MusicStore] Erro ao reproduzir áudio:', err);
        setAutoplayBlocked(true);
        setIsLoading(false);
        setIsPlaying(false);
      });
  }, [currentTrack, initWebAudio, resumeAudioContext, applyVolume, broadcastPlay, audioRef]);

  const pause = useCallback(() => {
    const videoInfo = getTrackVideoInfo(currentTrack);
    if (videoInfo.isVideo) {
      setIsPlaying(false);
      if (videoControllerRef.current) {
        videoControllerRef.current.pause();
      }
      return;
    }

    fadeOut(200).then(() => {
      audioRef.current?.pause();
      setIsPlaying(false);
      applyVolume(1);
      suspendAudioContext();
    });
  }, [currentTrack, fadeOut, applyVolume, suspendAudioContext, audioRef]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    if (activeTracks.length === 0) return;
    const videoInfo = getTrackVideoInfo(currentTrack);
    const advance = () => {
      if (shuffleMode && activeTracks.length > 1) {
        playHistoryRef.current.push(currentIndex);
        let nextIdx = currentIndex;
        while (nextIdx === currentIndex) {
          nextIdx = Math.floor(Math.random() * activeTracks.length);
        }
        setCurrentIndex(nextIdx);
      } else {
        setCurrentIndex((i) => (i + 1) % activeTracks.length);
      }
      setIsPlaying(true);
    };

    if (videoInfo.isVideo) {
      advance();
    } else {
      fadeOut(150).then(advance);
    }
  }, [activeTracks.length, currentIndex, currentTrack, shuffleMode, fadeOut]);

  const onVideoEnded = useCallback(() => {
    next();
  }, [next]);

  const prev = useCallback(() => {
    if (activeTracks.length === 0) return;
    const videoInfo = getTrackVideoInfo(currentTrack);
    if (videoInfo.isVideo) {
      if (currentTime > 3) {
        seekTo(0);
        return;
      }
    } else {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
    }

    const rewind = () => {
      if (shuffleMode && playHistoryRef.current.length > 0) {
        const lastIdx = playHistoryRef.current.pop();
        if (typeof lastIdx === 'number') {
          setCurrentIndex(lastIdx);
          setIsPlaying(true);
          return;
        }
      }
      setCurrentIndex((i) => (i - 1 + activeTracks.length) % activeTracks.length);
      setIsPlaying(true);
    };

    if (videoInfo.isVideo) {
      rewind();
    } else {
      fadeOut(150).then(rewind);
    }
  }, [activeTracks.length, currentTrack, currentTime, shuffleMode, fadeOut, audioRef]);

  const seekTo = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, duration || time));
    setCurrentTime(clamped);

    const videoInfo = getTrackVideoInfo(currentTrack);
    if (videoInfo.isVideo) {
      if (videoControllerRef.current) {
        videoControllerRef.current.seekTo(clamped);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (typeof (audio as any).fastSeek === 'function') {
        (audio as any).fastSeek(clamped);
      } else {
        audio.currentTime = clamped;
      }
    } catch { }
  }, [duration, currentTrack, audioRef]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    setIsMuted(false);
    saveVolume(clamped);
    if (videoControllerRef.current) {
      videoControllerRef.current.setVolume(clamped);
      videoControllerRef.current.setMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (videoControllerRef.current) {
        videoControllerRef.current.setMuted(nextMuted);
      }
      return nextMuted;
    });
  }, []);

  const hasAutoplayedRef = useRef(false);

  const setTrack = useCallback((index: number) => {
    if (index >= 0 && index < activeTracks.length) {
      if (index === currentIndex) {
        play();
        return;
      }
      if (shuffleMode) {
        playHistoryRef.current.push(currentIndex);
      }
      fadeOut(150).then(() => {
        setCurrentIndex(index);
        setIsPlaying(true);
      });
    }
  }, [activeTracks.length, currentIndex, shuffleMode, fadeOut, play]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'none') return 'all';
      if (prev === 'all') return 'one';
      return 'none';
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffleMode((prev) => !prev);
  }, []);

  useMusicShortcuts({
    toggle,
    toggleMute,
    next,
    prev,
    seekTo,
    currentTime,
    duration,
  });

  const getFrequencyBars = useCallback((): [number, number, number] => {
    if (!freqDataRef.current && analyserRef.current) {
      freqDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    }
    return calculateFrequencyBars(
      analyserRef.current,
      freqDataRef.current,
      isPlaying,
      isMuted,
      volume
    );
  }, [isPlaying, isMuted, volume]);

  useEffect(() => {
    return setupMediaSessionHandlers({
      play,
      pause,
      prev,
      next,
      seekTo,
      getCurrentTime: () => audioRef.current?.currentTime || 0,
      getDuration: () => duration || audioRef.current?.duration || 0,
    });
  }, [play, pause, prev, next, seekTo, duration, audioRef]);

  useEffect(() => {
    if (hasAutoplayedRef.current || !isLibraryLoaded || isAdmin || !library.config?.autoplay || !currentTrack) return;
    hasAutoplayedRef.current = true;
    const timer = setTimeout(() => {
      play();
    }, 600);
    return () => clearTimeout(timer);
  }, [isLibraryLoaded, isAdmin, library.config?.autoplay, currentTrack, play]);

  return {
    library,
    currentIndex,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    volume,
    isMuted,
    isPlaylistOpen,
    repeatMode,
    shuffleMode,
    autoplayBlocked,
    isLibraryLoaded,
    play,
    pause,
    toggle,
    next,
    prev,
    seekTo,
    setVolume,
    toggleMute,
    setTrack,
    setIsPlaylistOpen,
    toggleRepeat,
    toggleShuffle,
    audioRef,
    analyserRef,
    getFrequencyBars,
    reloadLibrary,
    registerVideoController,
    unregisterVideoController,
    onVideoTimeUpdate,
    onVideoPlay,
    onVideoPause,
    onVideoEnded,
  };
}
