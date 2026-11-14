'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { MusicTrack } from '@/lib/music';
import { getTrackVideoInfo } from '@/lib/music/mediaHelpers';
import { useMusicPlayer } from '@/lib/music';
import { Film, Maximize2 } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    _ytIframeApiLoading?: boolean;
    _ytIframeApiReadyCallbacks?: Array<() => void>;
  }
}

interface MiniVideoPlayerProps {
  track: MusicTrack;
  isCompact: boolean;
}

export function MiniVideoPlayer({ track, isCompact }: MiniVideoPlayerProps) {
  const {
    isPlaying,
    volume,
    isMuted,
    registerVideoController,
    unregisterVideoController,
    onVideoTimeUpdate,
    onVideoPlay,
    onVideoPause,
    onVideoEnded,
  } = useMusicPlayer();

  const videoInfo = getTrackVideoInfo(track);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytPollTimerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const containerId = useRef(`yt-player-${Math.random().toString(36).slice(2, 8)}`);

  // 1. Suporte a HTML5 Video direto (.mp4, .webm)
  useEffect(() => {
    if (!videoInfo.directVideoUrl) return;

    const vid = videoRef.current;
    if (!vid) return;

    registerVideoController({
      play: () => {
        vid.play().catch(() => {});
      },
      pause: () => {
        vid.pause();
      },
      seekTo: (time: number) => {
        try {
          vid.currentTime = time;
        } catch {}
      },
      setVolume: (v: number) => {
        vid.volume = Math.max(0, Math.min(1, v));
      },
      setMuted: (m: boolean) => {
        vid.muted = m;
      },
    });

    vid.volume = volume;
    vid.muted = isMuted;

    if (isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }

    return () => {
      unregisterVideoController();
    };
  }, [videoInfo.directVideoUrl, registerVideoController, unregisterVideoController]);

  // 2. Carregar YouTube IFrame API de forma segura e assíncrona
  const ensureYouTubeAPI = useCallback((onReadyCb: () => void) => {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      onReadyCb();
      return;
    }

    if (!window._ytIframeApiReadyCallbacks) {
      window._ytIframeApiReadyCallbacks = [];
    }
    window._ytIframeApiReadyCallbacks.push(onReadyCb);

    if (window._ytIframeApiLoading) return;
    window._ytIframeApiLoading = true;

    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevOnReady === 'function') {
        try {
          prevOnReady();
        } catch {}
      }
      if (window._ytIframeApiReadyCallbacks) {
        window._ytIframeApiReadyCallbacks.forEach((cb) => {
          try {
            cb();
          } catch {}
        });
        window._ytIframeApiReadyCallbacks = [];
      }
    };
  }, []);

  // 3. Montar / inicializar player do YouTube
  useEffect(() => {
    if (!videoInfo.isYouTube || !videoInfo.youtubeId) return;

    let destroyed = false;
    setIsReady(false);
    setLoadError(false);

    ensureYouTubeAPI(() => {
      if (destroyed || !containerRef.current) return;

      try {
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch {}
          ytPlayerRef.current = null;
        }

        const ytId = videoInfo.youtubeId!;
        const playerElement = document.createElement('div');
        playerElement.id = containerId.current;
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(playerElement);

        ytPlayerRef.current = new window.YT.Player(containerId.current, {
          videoId: ytId,
          playerVars: {
            autoplay: isPlaying ? 1 : 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event: any) => {
              if (destroyed) return;
              setIsReady(true);
              try {
                if (isMuted) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                  event.target.setVolume(Math.round(volume * 100));
                }
                if (isPlaying) {
                  event.target.playVideo();
                }
              } catch {}
            },
            onStateChange: (event: any) => {
              if (destroyed) return;
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
              if (event.data === 1) {
                onVideoPlay();
              } else if (event.data === 2) {
                onVideoPause();
              } else if (event.data === 0) {
                onVideoEnded();
              }
            },
            onError: () => {
              if (destroyed) return;
              setLoadError(true);
            },
          },
        });

        registerVideoController({
          play: () => {
            try {
              ytPlayerRef.current?.playVideo();
            } catch {}
          },
          pause: () => {
            try {
              ytPlayerRef.current?.pauseVideo();
            } catch {}
          },
          seekTo: (time: number) => {
            try {
              ytPlayerRef.current?.seekTo(time, true);
            } catch {}
          },
          setVolume: (v: number) => {
            try {
              ytPlayerRef.current?.setVolume(Math.round(v * 100));
            } catch {}
          },
          setMuted: (m: boolean) => {
            try {
              if (m) ytPlayerRef.current?.mute();
              else ytPlayerRef.current?.unMute();
            } catch {}
          },
        });
      } catch (err) {
        console.warn('[MiniVideoPlayer] Falha ao criar player do YouTube:', err);
        setLoadError(true);
      }
    });

    return () => {
      destroyed = true;
      unregisterVideoController();
      if (ytPollTimerRef.current) {
        clearInterval(ytPollTimerRef.current);
        ytPollTimerRef.current = null;
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [
    videoInfo.isYouTube,
    videoInfo.youtubeId,
    ensureYouTubeAPI,
    registerVideoController,
    unregisterVideoController,
    onVideoPlay,
    onVideoPause,
    onVideoEnded,
  ]);

  // 4. Polling contínuo de tempo e duração do YouTube
  useEffect(() => {
    if (!videoInfo.isYouTube) return;

    if (isPlaying) {
      if (ytPollTimerRef.current) clearInterval(ytPollTimerRef.current);
      ytPollTimerRef.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const cur = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            onVideoTimeUpdate(cur, dur);
          } catch {}
        }
      }, 350);
    } else {
      if (ytPollTimerRef.current) {
        clearInterval(ytPollTimerRef.current);
        ytPollTimerRef.current = null;
      }
    }

    return () => {
      if (ytPollTimerRef.current) {
        clearInterval(ytPollTimerRef.current);
        ytPollTimerRef.current = null;
      }
    };
  }, [isPlaying, videoInfo.isYouTube, onVideoTimeUpdate]);

  // 5. Sincronizar volume e mute dinamicamente no YouTube
  useEffect(() => {
    if (!videoInfo.isYouTube || !ytPlayerRef.current) return;
    try {
      if (isMuted) {
        ytPlayerRef.current.mute?.();
      } else {
        ytPlayerRef.current.unMute?.();
        ytPlayerRef.current.setVolume?.(Math.round(volume * 100));
      }
    } catch {}
  }, [volume, isMuted, videoInfo.isYouTube]);

  // Se a faixa atual não for vídeo, não renderiza nada
  if (!videoInfo.isVideo) {
    return null;
  }

  const handleRequestFullscreen = () => {
    const el = containerRef.current || videoRef.current;
    if (el) {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
    }
  };

  return (
    <div
      aria-hidden={isCompact}
      className={
        isCompact
          ? 'fixed -top-[9999px] -left-[9999px] w-[1px] h-[1px] opacity-0 pointer-events-none overflow-hidden'
          : 'relative w-full aspect-video rounded-xl overflow-hidden bg-black/95 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.7)] group transition-all duration-300'
      }
    >
      {/* Container para YouTube */}
      {videoInfo.isYouTube && (
        <div
          ref={containerRef}
          className="w-full h-full object-cover [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 [&_iframe]:rounded-xl"
        />
      )}

      {/* Container para Vídeo Direto (HTML5) */}
      {videoInfo.directVideoUrl && (
        <video
          ref={videoRef}
          src={videoInfo.directVideoUrl}
          playsInline
          preload="auto"
          className="w-full h-full object-cover rounded-xl"
          onPlay={onVideoPlay}
          onPause={onVideoPause}
          onEnded={onVideoEnded}
          onTimeUpdate={() => {
            if (videoRef.current) {
              onVideoTimeUpdate(videoRef.current.currentTime, videoRef.current.duration || 0);
            }
          }}
        />
      )}

      {/* Badge Editorial Superior Esquerdo */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 pointer-events-none transition-opacity duration-200">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-pulse" />
        <Film className="w-2.5 h-2.5 text-[#f4a7b9]" />
        <span className="text-[9px] font-mono tracking-widest uppercase text-white/90 font-medium">
          {videoInfo.providerBadge}
        </span>
      </div>

      {/* Botão de Tela Cheia / PiP no canto superior direito */}
      <button
        type="button"
        onClick={handleRequestFullscreen}
        aria-label="Expandir vídeo em tela cheia"
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        title="Tela cheia"
      >
        <Maximize2 className="w-3 h-3" />
      </button>

      {/* Mensagem de Erro Caso o Vídeo Falhe */}
      {loadError && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-3 text-center z-20">
          <p className="text-[11px] text-zinc-300 font-medium">Vídeo indisponível externamente</p>
          <p className="text-[9px] text-zinc-500 mt-0.5">A reprodução de áudio continuará na playlist</p>
        </div>
      )}
    </div>
  );
}
