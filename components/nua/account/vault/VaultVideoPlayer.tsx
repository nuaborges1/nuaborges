'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Download,
  Film,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { resolveAssetHref, VaultFileItem } from './types';

interface VaultVideoPlayerProps {
  videos: VaultFileItem[];
  apiBase: string;
  fallbackPoster?: string;
  failedMediaUrls: Record<string, true>;
  retryVersions: Record<string, number>;
  onMarkFailed: (url: string) => void;
  onRetryMedia: (url: string) => void;
  onReloadAccess: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

// Memória de posição durante a sessão de navegação (em memória apenas, zero persistência em storage)
const sessionPlaybackPositions = new Map<string, number>();

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VaultVideoPlayer({
  videos,
  apiBase,
  fallbackPoster,
  failedMediaUrls,
  retryVersions,
  onMarkFailed,
  onRetryMedia,
  onReloadAccess,
}: VaultVideoPlayerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hoverTime, setHoverTime] = useState<{ ratio: number; seconds: number } | null>(null);
  const [pipSupported, setPipSupported] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeIdx = activeIdx < videos.length ? activeIdx : 0;
  const activeVideo = videos[safeIdx] || videos[0];

  useEffect(() => {
    setPipSupported(
      typeof document !== 'undefined' &&
        'pictureInPictureEnabled' in document &&
        Boolean((document as any).pictureInPictureEnabled)
    );
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Reset de estado local ao trocar de vídeo
  useEffect(() => {
    setPlaying(false);
    setHasStarted(false);
    setBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
    setControlsVisible(true);
  }, [activeVideo?.url]);

  const scheduleHideControls = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    if (playing) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 2600);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
      return;
    }
    scheduleHideControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [playing, scheduleHideControls]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      setHasStarted(true);
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    const next = Math.max(0, Math.min(el.duration, el.currentTime + delta));
    el.currentTime = next;
    setCurrentTime(next);
    scheduleHideControls();
  }, [scheduleHideControls]);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const nextMuted = !el.muted;
    el.muted = nextMuted;
    setMuted(nextMuted);
  }, []);

  const handleVolumeChange = (nextVol: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = nextVol;
    el.muted = nextVol === 0;
    setVolume(nextVol);
    setMuted(nextVol === 0);
  };

  const cycleRate = () => {
    const el = videoRef.current;
    const idx = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    if (el) el.playbackRate = next;
    setPlaybackRate(next);
  };

  const toggleFullscreen = useCallback(async () => {
    const box = containerRef.current;
    const vid = videoRef.current as any;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (box?.requestFullscreen) {
        await box.requestFullscreen();
      } else if (vid?.webkitEnterFullscreen) {
        vid.webkitEnterFullscreen();
      }
    } catch {}
  }, []);

  const togglePiP = async () => {
    const vid = videoRef.current as any;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (vid?.requestPictureInPicture) {
        await vid.requestPictureInPicture();
      }
    } catch {}
  };

  const handleScrub = (clientX: number) => {
    const bar = scrubberRef.current;
    const el = videoRef.current;
    if (!bar || !el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const next = ratio * el.duration;
    el.currentTime = next;
    setCurrentTime(next);
    scheduleHideControls();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) {
      if (e.key !== ' ' && e.key !== 'k' && e.key !== 'K') return;
    }
    if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekBy(10);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekBy(-10);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMute();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      void toggleFullscreen();
    }
  };

  if (!activeVideo) return null;

  const baseSrc = resolveAssetHref(apiBase, activeVideo.url);
  const version = retryVersions[activeVideo.url];
  const src = version ? `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}r=${version}` : baseSrc;
  const poster = activeVideo.posterUrl ? resolveAssetHref(apiBase, activeVideo.posterUrl) : fallbackPoster;
  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;
  const hasMultiple = videos.length > 1;

  const playerNode = (
    <div className="min-w-0 space-y-3">
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseMove={scheduleHideControls}
        onMouseLeave={() => {
          if (playing) setControlsVisible(false);
        }}
        className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
      >
        {failedMediaUrls[activeVideo.url] ? (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-[#08080c] p-8 text-center">
            <p className="text-sm text-zinc-400">
              Não foi possível reproduzir este vídeo agora. Sua visualização pode ter expirado.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => onRetryMedia(activeVideo.url)}
                className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
              >
                <RefreshCw className="size-3.5" />
                <span>Tentar novamente</span>
              </button>
              <button
                type="button"
                onClick={onReloadAccess}
                className="btn-primary !min-h-[38px] !px-4 !text-[11px]"
              >
                Recarregar acesso
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              key={`${activeVideo.url}-${version || 0}`}
              playsInline
              preload="metadata"
              poster={poster}
              controlsList={activeVideo.download ? undefined : 'nodownload'}
              onClick={togglePlay}
              onLoadedMetadata={(e) => {
                const el = e.currentTarget;
                if (Number.isFinite(el.duration)) setDuration(el.duration);
                const saved = sessionPlaybackPositions.get(activeVideo.url);
                if (saved && saved > 2 && saved < el.duration - 2) {
                  el.currentTime = saved;
                  setCurrentTime(saved);
                }
              }}
              onPlay={() => {
                setPlaying(true);
                setHasStarted(true);
                setBuffering(false);
              }}
              onPause={() => setPlaying(false)}
              onWaiting={() => setBuffering(true)}
              onCanPlay={() => setBuffering(false)}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                setCurrentTime(el.currentTime);
                sessionPlaybackPositions.set(activeVideo.url, el.currentTime);
                if (!el.paused) window.dispatchEvent(new Event('vaultplayback'));
                if (el.buffered.length > 0) {
                  setBufferedEnd(el.buffered.end(el.buffered.length - 1));
                }
              }}
              onEnded={() => {
                setPlaying(false);
                sessionPlaybackPositions.delete(activeVideo.url);
              }}
              onError={() => onMarkFailed(activeVideo.url)}
              className="aspect-video max-h-[74svh] w-full cursor-pointer bg-black object-contain"
              src={src}
            />

            {/* Estado inicial editorial — capa limpa com botão Play central */}
            {!hasStarted && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label={`Reproduzir ${activeVideo.label}`}
                className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/20 to-black/15 transition-colors hover:bg-black/30 cursor-pointer"
              >
                <span className="flex size-16 items-center justify-center rounded-full border border-white/20 bg-black/65 text-[#F5EEE9] shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-md transition-transform duration-300 group-hover:scale-105 group-hover:border-[#90364B] sm:size-20">
                  <Play className="ml-1 size-7 fill-[#F5EEE9] text-[#F5EEE9]" />
                </span>
                {(activeVideo.duration || duration > 0) && (
                  <span className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/75 px-3 py-1 font-mono text-xs text-zinc-200 tabular-nums backdrop-blur-sm">
                    {activeVideo.duration || formatClock(duration)}
                  </span>
                )}
              </button>
            )}

            {/* Indicador discreto de buffering */}
            {hasStarted && buffering && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/30">
                <Loader2 className="size-8 animate-spin text-[#C97A8D]" />
              </div>
            )}

            {/* Barra de controles cinematográfica NUA Borges */}
            {hasStarted && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 pb-3.5 pt-10 transition-opacity duration-300 sm:px-5 ${
                  controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                {/* Scrubber em vinho */}
                <div
                  ref={scrubberRef}
                  role="slider"
                  tabIndex={0}
                  aria-label="Linha do tempo do vídeo"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(duration)}
                  aria-valuenow={Math.round(currentTime)}
                  onClick={(e) => handleScrub(e.clientX)}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    setHoverTime({ ratio, seconds: ratio * duration });
                  }}
                  onMouseLeave={() => setHoverTime(null)}
                  className="group/scrub relative mb-3 flex h-5 cursor-pointer items-center touch-manipulation"
                >
                  {hoverTime && duration > 0 && (
                    <span
                      style={{ left: `${hoverTime.ratio * 100}%` }}
                      className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded-md border border-white/10 bg-black/90 px-2 py-0.5 font-mono text-[11px] text-[#F5EEE9] tabular-nums"
                    >
                      {formatClock(hoverTime.seconds)}
                    </span>
                  )}
                  <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/15 transition-all group-hover/scrub:h-1.5">
                    <div
                      style={{ width: `${bufferedPct}%` }}
                      className="absolute inset-y-0 left-0 bg-white/25"
                    />
                    <div
                      style={{ width: `${progressPct}%` }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#661C30] via-[#7A293D] to-[#C97A8D]"
                    />
                  </div>
                  <span
                    style={{ left: `${progressPct}%` }}
                    className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-[#F5EEE9] opacity-0 shadow transition-opacity group-hover/scrub:opacity-100"
                  />
                </div>

                {/* Controles principais */}
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-200">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={playing ? 'Pausar' : 'Reproduzir'}
                      className="flex size-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 cursor-pointer touch-manipulation"
                    >
                      {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => seekBy(-10)}
                      aria-label="Voltar 10 segundos"
                      title="-10s"
                      className="hidden size-8 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white sm:flex cursor-pointer"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => seekBy(10)}
                      aria-label="Avançar 10 segundos"
                      title="+10s"
                      className="hidden size-8 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white sm:flex cursor-pointer"
                    >
                      <RotateCw className="size-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5 pl-1">
                      <button
                        type="button"
                        onClick={toggleMute}
                        aria-label={muted ? 'Ativar som' : 'Silenciar'}
                        className="flex size-8 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                      >
                        {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      </button>
                      <input
                        type="range"
                        aria-label="Volume"
                        min={0}
                        max={1}
                        step={0.05}
                        value={muted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(Number(e.target.value))}
                        className="hidden h-1 w-16 cursor-pointer accent-[#C97A8D] md:block"
                      />
                    </div>

                    <span className="pl-1 font-mono text-[11px] text-zinc-300 tabular-nums">
                      {formatClock(currentTime)} <span className="text-zinc-500">/</span> {formatClock(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      type="button"
                      onClick={cycleRate}
                      aria-label={`Velocidade de reprodução: ${playbackRate}x`}
                      title="Alterar velocidade"
                      className="min-w-[38px] rounded-full px-2 py-1 font-mono text-[11px] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                      {playbackRate}x
                    </button>
                    {pipSupported && (
                      <button
                        type="button"
                        onClick={() => void togglePiP()}
                        aria-label="Janela flutuante"
                        title="Janela flutuante"
                        className="hidden size-8 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-white sm:flex cursor-pointer"
                      >
                        <PictureInPicture2 className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleFullscreen()}
                      aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                      title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                      className="flex size-9 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-white/10 hover:text-white cursor-pointer touch-manipulation"
                    >
                      {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Linha discreta abaixo do vídeo: título/duração + próximo/baixar quando aplicável */}
      {(activeVideo.hasCustomLabel || hasMultiple || activeVideo.download) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            {(activeVideo.hasCustomLabel || hasMultiple) && (
              <p className="truncate text-sm font-medium text-[#F5EEE9]">{activeVideo.label}</p>
            )}
            {hasMultiple && (
              <p className="text-xs text-zinc-500">
                Vídeo {safeIdx + 1} de {videos.length}
                {activeVideo.duration ? ` · ${activeVideo.duration}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasMultiple && safeIdx < videos.length - 1 && (
              <button
                type="button"
                onClick={() => setActiveIdx((i) => Math.min(videos.length - 1, i + 1))}
                className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
              >
                <span>Próximo</span>
                <ChevronRight className="size-3.5" />
              </button>
            )}
            {activeVideo.download && (
              <a
                download
                href={resolveAssetHref(apiBase, activeVideo.download)}
                className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
              >
                <Download className="size-3.5 text-[#C97A8D]" />
                <span>Baixar vídeo</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!hasMultiple) {
    return <div className="mx-auto max-w-4xl">{playerNode}</div>;
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
      {playerNode}
      <aside
        aria-label="Lista de reprodução"
        className="rounded-2xl border border-white/[0.08] bg-[#08080c] p-3"
      >
        <p className="px-2 pb-2.5 text-xs font-medium text-zinc-400">
          Lista de reprodução · {videos.length} vídeos
        </p>
        <div className="space-y-1.5">
          {videos.map((v, idx) => {
            const isCurrent = idx === safeIdx;
            const thumbSrc = v.posterUrl ? resolveAssetHref(apiBase, v.posterUrl) : fallbackPoster;
            return (
              <button
                key={v.url}
                type="button"
                onClick={() => setActiveIdx(idx)}
                aria-current={isCurrent ? 'true' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors cursor-pointer touch-manipulation ${
                  isCurrent
                    ? 'border-[#7A293D]/60 bg-[#661C30]/20 text-[#F5EEE9]'
                    : 'border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                <div className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.06] bg-zinc-950">
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover opacity-75"
                    />
                  ) : (
                    <Film className="size-4 text-zinc-600" />
                  )}
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <Play
                      className={`size-3.5 ${
                        isCurrent ? 'fill-[#C97A8D] text-[#C97A8D]' : 'text-white/80'
                      }`}
                    />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{v.label}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {isCurrent ? 'Em reprodução' : v.duration || `Vídeo ${idx + 1}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
