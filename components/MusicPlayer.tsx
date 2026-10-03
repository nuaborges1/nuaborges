'use client';

/**
 * MusicPlayer — Player de música editorial integrado ao universo da Nua Borges.
 * - Animação CSS suave ao entrar/sair do modo Super Compacto (pill ↔ card).
 * - Controle de volume manual com slider de gradiente visual.
 * - Sincronização real dos equalizadores com a música (Web Audio API & Beat-Engine).
 * - Suporte total a faixas do YouTube e arquivos locais.
 * - Totalmente desativado e oculto no painel administrativo (/admin).
 */

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMusicPlayer } from '@/lib/music';

// ─── Coração com Sincronização nos Picos Mais Altos (Kicks / Batidas Fortes) ───
function HeartBeat({ active }: { active: boolean }) {
  const { getFrequencyBars } = useMusicPlayer();
  const heartRef = useRef<HTMLSpanElement>(null);
  const currentScaleRef = useRef(1.0);
  const lastBeatTimeRef = useRef(0);

  useEffect(() => {
    // Quando pausado: não consome CPU de rAF; modo idle sereno (CSS puro)
    if (!active) {
      if (heartRef.current) {
        heartRef.current.style.transform = '';
        heartRef.current.style.filter = '';
        heartRef.current.style.opacity = '';
      }
      return;
    }

    let animId: number;

    const tick = () => {
      const el = heartRef.current;
      if (!el) {
        animId = requestAnimationFrame(tick);
        return;
      }

      // [baixas (graves / kicks), médias, agudas]
      const [bass, mid] = getFrequencyBars();

      // Foco estrito nos PICOS MAIS ALTOS (Grave / Bumbo principal da música):
      const peakEnergy = bass * 0.85 + mid * 0.15;

      const now = performance.now();
      const timeSinceLast = now - lastBeatTimeRef.current;

      // Dispara com clareza nos picos altos (impacto do grave) com cooldown natural (>280ms)
      if (peakEnergy > 0.35 && timeSinceLast > 280) {
        lastBeatTimeRef.current = now;
        const punch = 1.28 + Math.min(0.20, peakEnergy * 0.25);
        currentScaleRef.current = punch;
      } else {
        // Retorno elástico suave à base de repouso (1.0x)
        if (currentScaleRef.current > 1.0) {
          currentScaleRef.current = 1.0 + (currentScaleRef.current - 1.0) * 0.82;
          if (currentScaleRef.current < 1.008) {
            currentScaleRef.current = 1.0;
          }
        }
      }

      const scale = currentScaleRef.current;
      const isPeak = scale > 1.15;

      el.style.transform = `scale(${scale.toFixed(3)})`;
      el.style.opacity = isPeak ? '1' : '0.82';
      el.style.filter = isPeak
        ? `drop-shadow(0 0 ${(Math.min(12, (scale - 1) * 28)).toFixed(1)}px rgba(244,167,185,0.95))`
        : 'drop-shadow(0 0 1px rgba(244,167,185,0.20))';

      if (!document.hidden) {
        animId = requestAnimationFrame(tick);
      }
    };

    const handleVisChange = () => {
      if (!document.hidden && active) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(tick);
      }
    };

    document.addEventListener('visibilitychange', handleVisChange);
    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisChange);
      if (heartRef.current) {
        heartRef.current.style.transform = '';
        heartRef.current.style.filter = '';
        heartRef.current.style.opacity = '';
      }
    };
  }, [active, getFrequencyBars]);

  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center shrink-0"
      style={{ width: '20px', height: '20px' }}
    >
      <span
        ref={heartRef}
        className={!active ? 'animate-nua-heart-idle' : ''}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '14px',
          height: '14px',
          color: '#f4a7b9',
          transformOrigin: 'center center',
          userSelect: 'none',
          willChange: 'transform, opacity, filter',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: 'block' }}
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      </span>
    </span>
  );
}


// ─── Barra de progresso ────────────────────────────────────────────────────
function ProgressBar() {
  const { currentTime, duration, seekTo } = useMusicPlayer();
  const barRef = useRef<HTMLDivElement>(null);
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!barRef.current || !duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  }

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Progresso da música"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      className="relative h-[3px] w-full rounded-full bg-white/10 cursor-pointer group"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') seekTo(Math.min(duration, currentTime + 5));
        if (e.key === 'ArrowLeft') seekTo(Math.max(0, currentTime - 5));
      }}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-full bg-[#f4a7b9] transition-[width] duration-100 ease-linear"
        style={{ width: `${pct}%` }}
      />
      {/* Handle visível só no hover */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#f4a7b9] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

// ─── Slider de Volume Customizado (Zero elementos nativos, sem bolinhas azuis) ────
function VolumeSlider() {
  const { volume, isMuted, setVolume } = useMusicPlayer();
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const effVol = isMuted ? 0 : volume;
  const pct = Math.round(effVol * 100);

  const updateFromCoords = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setVolume(ratio);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    updateFromCoords(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      updateFromCoords(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Volume do player"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative flex-1 h-4 flex items-center cursor-pointer group select-none touch-none py-1"
    >
      {/* Trilho base */}
      <div className="relative w-full h-[3px] rounded-full bg-white/10 overflow-hidden">
        {/* Preenchimento rosa */}
        <div
          className="h-full rounded-full bg-[#f4a7b9] transition-[width] duration-75 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Marcador rosa sutil que acompanha o volume (100% estilizado, sem bolinha azul) */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#f4a7b9] shadow-[0_0_8px_rgba(244,167,185,0.7)] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-150 scale-90 group-hover:scale-110 pointer-events-none"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

// ─── Formato de tempo ──────────────────────────────────────────────────────
function fmt(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

// ─── Ícone Musical (nota ♪) ────────────────────────────────────────────────
function NoteIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="14" viewBox="0 0 12 14" fill="currentColor" aria-hidden="true">
      <path d="M4 10.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM11.5 0v9.6A2 2 0 1 0 9.5 11V3.5L4 4.8V11.5A2 2 0 1 0 2 13V4L11.5 0z"/>
    </svg>
  );
}

// ─── Ícone de Volume ────────────────────────────────────────────────────────
function VolumeIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

// ─── Overlay da Playlist ───────────────────────────────────────────────────
function PlaylistOverlay({ embedded = false }: { embedded?: boolean }) {
  const { library, currentIndex, isPlaylistOpen, closePlaylist, setTrack, isPlaying } = useMusicPlayer();
  const activeTracks = library.tracks.filter((t) => t.active);

  if (!isPlaylistOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={embedded ? 'fixed inset-0 z-40' : 'fixed inset-0 z-[99]'}
        onClick={closePlaylist}
        aria-hidden="true"
      />

      {/* Painel da Playlist */}
      <div
        role="dialog"
        aria-label="Playlist"
        className={
          embedded
            ? 'absolute z-50 bottom-full mb-3 left-0 right-0 w-full bg-zinc-950/98 backdrop-blur-2xl border border-white/[0.12] rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.95)] animate-playlist-in'
            : [
                'fixed z-[100] bottom-[72px] sm:bottom-[64px] left-3 sm:left-4',
                'w-[270px] sm:w-[300px]',
                'bg-zinc-950/95 backdrop-blur-2xl',
                'border border-white/[0.08]',
                'rounded-2xl overflow-hidden',
                'shadow-[0_8px_40px_rgba(0,0,0,0.85)]',
                'animate-playlist-in',
              ].join(' ')
        }
      >
        {/* Header */}
        <div className="px-4 pt-3.5 pb-2.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold tracking-[0.3em] uppercase text-[#f4a7b9]">
              Playlist
            </p>
            <p className="text-white font-serif text-sm mt-0.5 tracking-tight truncate">
              {library.config?.playlistTitle || 'Sensual Lounge'}
            </p>
          </div>
          <span className="text-[9px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] shrink-0">
            {activeTracks.length} faixas
          </span>
        </div>

        {/* Tracks */}
        <ul className="py-1.5 max-h-[250px] overflow-y-auto scrollbar-none">
          {activeTracks.length === 0 && (
            <li className="px-4 py-3 text-zinc-500 text-xs">Nenhuma faixa ativa</li>
          )}
          {activeTracks.map((track, i) => {
            const isCurrent = i === currentIndex;

            return (
              <li key={track.id}>
                <button
                  onClick={() => {
                    setTrack(i);
                    closePlaylist();
                  }}
                  className={[
                    'w-full flex items-center gap-3 px-3.5 py-2.5 text-left',
                    'transition-colors duration-150 cursor-pointer',
                    isCurrent
                      ? 'text-[#f4a7b9] bg-white/[0.04]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]',
                  ].join(' ')}
                  aria-label={`Tocar: ${track.title} - ${track.artist}`}
                  aria-current={isCurrent ? 'true' : undefined}
                >
                  <span className="text-[10px] font-mono text-zinc-600 w-4 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium truncate">
                      {track.title}
                    </span>
                    <span className="block text-[10px] text-zinc-500 truncate">{track.artist}</span>
                  </span>
                  {isCurrent && (
                    <HeartBeat active={isPlaying} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

// ─── Player Principal ──────────────────────────────────────────────────────
export function MusicPlayer({ embedded = false }: { embedded?: boolean } = {}) {
  const pathname = usePathname();
  const {
    library,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isPlaylistOpen,
    toggle,
    next,
    prev,
    toggleMute,
    openPlaylist,
    closePlaylist,
  } = useMusicPlayer();

  const activeTracks = library.tracks.filter((t) => t.active);
  const track = activeTracks[currentIndex] || activeTracks[0];
  const [expanded, setExpanded] = useState(embedded ? true : false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Medição da largura do texto para adaptação dinâmica e elástica da cápsula
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const [measuredTextWidth, setMeasuredTextWidth] = useState(80);

  useEffect(() => setMounted(true), []);



  useEffect(() => {
    if (textMeasureRef.current) {
      const w = textMeasureRef.current.getBoundingClientRect().width;
      setMeasuredTextWidth(Math.ceil(w));
    }
  }, [track?.title, track?.artist]);

  // Voltar ao estado compacto ao perder o foco (apenas se não estiver embutido no admin)
  useEffect(() => {
    if (embedded) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (playerRef.current && !playerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [embedded]);

  // Monitora scroll para ativar o modo super compacto
  useEffect(() => {
    if (embedded) return;
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 70);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [embedded]);

  if (!mounted) return null;

  // Ocultar no admin (quando não embedded)
  if (!embedded && (pathname?.startsWith('/admin') || pathname?.startsWith('/admingeral') || pathname?.startsWith('/contrato'))) {
    return null;
  }

  // Se não houver tracks disponíveis
  if (activeTracks.length === 0) return null;

  const trackCount = activeTracks.length;
  const trackNumDisplay = `${currentIndex + 1}/${trackCount}`;

  // Modo Super Compacto: nunca em modo embedded
  const isCompact = !embedded && isScrolled && !isHovered && !isPlaylistOpen && !expanded;

  // Desativa hover em dispositivos touch para evitar "hover preso" no iPhone/Android
  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      setIsHovered(true);
    }
  };
  const handleMouseLeave = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      setIsHovered(false);
    }
  };

  // Gestos de toque (swipe down compacta, swipe up expande)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (diffY < -35) {
      setExpanded(true);
    } else if (diffY > 35) {
      if (!embedded) setExpanded(false);
      if (isPlaylistOpen) closePlaylist();
    }
  };

  // Cálculo da largura dinâmica: adapta-se organicamente ao texto da música
  const dynamicContentWidth = Math.min(300, Math.max(215, 160 + Math.max(40, Math.min(130, measuredTextWidth))));
  const playerShellWidth = embedded ? '100%' : isCompact ? '84px' : expanded ? '280px' : `${dynamicContentWidth}px`;

  return (
    <>
      {/* Container Fixo (site público) ou Relativo Centralizado (admin embutido) */}
      <div
        ref={playerRef}
        role="region"
        aria-label="Player de música"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={
          embedded
            ? {
                position: 'relative',
                zIndex: 20,
                width: '100%',
                maxWidth: '380px',
                margin: '0 auto',
              }
            : {
                position: 'fixed',
                zIndex: 90,
                left: '12px',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
              }
        }
      >
        <PlaylistOverlay embedded={embedded} />

        {/* Span oculto para medir a largura real da tipografia sem layout shift */}
        <span
          ref={textMeasureRef}
          style={{
            position: 'absolute',
            visibility: 'hidden',
            height: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: 'normal',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {track?.title ?? 'Nua Borges'}
        </span>

        {/* Shell do player — anima suavemente de pill a card com largura elástica */}
        <div
          style={{
            position: 'relative',
            background: 'rgba(8,8,10,0.88)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: isPlaying ? '1px solid rgba(244,167,185,0.22)' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isPlaying ? '0 8px 36px rgba(0,0,0,0.85), 0 0 20px rgba(244,167,185,0.08)' : '0 6px 32px rgba(0,0,0,0.8)',
            overflow: 'hidden',
            width: playerShellWidth,
            borderRadius: isCompact ? '999px' : '16px',
            transition: 'width 420ms cubic-bezier(0.16,1,0.3,1), border-radius 420ms cubic-bezier(0.16,1,0.3,1), border-color 300ms ease, box-shadow 300ms ease',
          }}
        >
          {/* ─── MODO COMPACTO (pill perfeitamente simétrica) ─── */}
          <div
            aria-hidden={!isCompact}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              justifyItems: 'center',
              height: '40px',
              padding: '0 2px',
              opacity: isCompact ? 1 : 0,
              pointerEvents: isCompact ? 'auto' : 'none',
              transition: 'opacity 200ms ease',
            }}
          >
            {/* Lado esquerdo: Botão de Playlist / Batimento com Coração */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <button
                type="button"
                onClick={() => { if (isPlaylistOpen) closePlaylist(); else openPlaylist(); }}
                aria-label="Abrir playlist"
                className="transition-transform duration-150 active:scale-90 hover:scale-110"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#f4a7b9',
                  touchAction: 'manipulation',
                }}
              >
                <HeartBeat active={isPlaying} />
              </button>
            </div>

            {/* Divisor vertical perfeitamente centralizado */}
            <span
              style={{
                width: '1px',
                height: '14px',
                background: 'rgba(255,255,255,0.14)',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />

            {/* Lado direito: Botão Play/Pause Rosa com Glow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <button
                type="button"
                onClick={toggle}
                aria-label={isPlaying ? 'Pausar música' : 'Reproduzir música'}
                className="transition-all duration-200 active:scale-95 hover:scale-105"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#f4a7b9',
                  border: 'none',
                  color: '#000',
                  cursor: 'pointer',
                  boxShadow: isPlaying
                    ? '0 1px 12px rgba(244,167,185,0.55)'
                    : '0 1px 6px rgba(0,0,0,0.4)',
                  touchAction: 'manipulation',
                }}
              >
                {isPlaying ? (
                  <svg width="8" height="9" viewBox="0 0 8 10" fill="currentColor" aria-hidden="true" style={{ display: 'block' }}>
                    <rect x="0.5" y="0" width="2.6" height="10" rx="0.8" />
                    <rect x="4.9" y="0" width="2.6" height="10" rx="0.8" />
                  </svg>
                ) : (
                  <svg width="8" height="9" viewBox="0 0 8 10" fill="currentColor" aria-hidden="true" style={{ display: 'block', transform: 'translateX(0.75px)' }}>
                    <path d="M1 0.75L7.5 5 1 9.25V0.75z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ─── MODO COMPLETO (elástico com animações) ─── */}
          <div
            aria-hidden={isCompact}
            style={{
              opacity: isCompact ? 0 : 1,
              pointerEvents: isCompact ? 'none' : 'auto',
              transition: 'opacity 200ms ease',
              minHeight: '44px',
            }}
          >
            <>
              {/* Linha principal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 10px' }}>
                {/* Nota / EQ */}
                <button
                  type="button"
                  onClick={() => { if (isPlaylistOpen) closePlaylist(); else openPlaylist(); }}
                  aria-label="Abrir playlist"
                  aria-expanded={isPlaylistOpen}
                  className="transition-transform duration-150 active:scale-90 hover:scale-110"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                    color: '#f4a7b9', touchAction: 'manipulation',
                  }}
                >
                  <HeartBeat active={isPlaying} />
                </button>

                {/* Info da faixa com transição suave na troca */}
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  aria-label={`${track?.title ?? 'Música'} — expandir controles`}
                  style={{
                    display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%',
                    background: 'none', border: 'none', cursor: 'pointer',
                    flex: '1 1 0', overflow: 'hidden', padding: 0, textAlign: 'left',
                  }}
                >
                  <span
                    key={`title-${track?.id}`}
                    className="animate-fade-in"
                    style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.95)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3, width: '100%' }}
                  >
                    {track?.title ?? 'Nua Borges'}
                  </span>
                  <span
                    key={`artist-${track?.id}`}
                    className="animate-fade-in"
                    style={{ fontSize: '9px', color: '#71717a', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3, marginTop: '2px', width: '100%' }}
                  >
                    {track?.artist ?? ''}
                  </span>
                </button>

                {/* Controles com micro-interações */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                  {trackCount > 1 && (
                    <button
                      type="button"
                      onClick={prev}
                      aria-label="Faixa anterior"
                      className="transition-transform duration-150 active:scale-90 hover:scale-110"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', touchAction: 'manipulation' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 11 11" fill="currentColor" aria-hidden="true">
                        <path d="M0 1h1.5v9H0V1zm10.5 0L3 5.5l7.5 4.5V1z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                    className={[
                      'transition-all duration-200 active:scale-95 hover:scale-105',
                      isPlaying ? 'animate-play-glow' : '',
                    ].join(' ')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: '#f4a7b9', border: 'none', color: '#000',
                      cursor: 'pointer', flexShrink: 0,
                      touchAction: 'manipulation',
                    }}
                  >
                    {isPlaying ? (
                      <svg width="9" height="9" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
                        <rect x="0" y="0" width="3.5" height="12" rx="1" />
                        <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
                      </svg>
                    ) : (
                      <svg width="9" height="9" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true" style={{ transform: 'translateX(0.5px)' }}>
                        <path d="M1 0.5L9.5 6 1 11.5V0.5z" />
                      </svg>
                    )}
                  </button>
                  {trackCount > 1 && (
                    <button
                      type="button"
                      onClick={next}
                      aria-label="Próxima faixa"
                      className="transition-transform duration-150 active:scale-90 hover:scale-110"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', touchAction: 'manipulation' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 11 11" fill="currentColor" aria-hidden="true">
                        <path d="M11 1H9.5v9H11V1zM0.5 1L8 5.5 0.5 10V1z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* ─── Painel Expandido (progresso + volume customizado) ─── */}
              <div style={{
                maxHeight: (embedded || expanded) ? '120px' : '0px',
                overflow: 'hidden',
                transition: 'max-height 380ms cubic-bezier(0.16,1,0.3,1)',
              }}>
                <div style={{ padding: '0 10px 10px', paddingTop: '2px' }}>
                  <ProgressBar />
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '7px', gap: '6px' }}>
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#52525b', flexShrink: 0 }}>
                      {fmt(currentTime)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={toggleMute}
                        aria-label={isMuted ? 'Ativar som' : 'Mute'}
                        className="transition-transform duration-150 active:scale-90 hover:scale-110"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: isMuted ? '#f4a7b9' : '#71717a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'color 150ms',
                          position: 'relative',
                          touchAction: 'manipulation',
                        }}
                      >
                        <VolumeIcon muted={isMuted} />
                        {/* Indicador de som mutado */}
                        {isPlaying && (isMuted || volume === 0) && (
                          <span
                            title="Som mutado"
                            style={{
                              position: 'absolute',
                              top: '-2px',
                              right: '-2px',
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              backgroundColor: '#f59e0b',
                            }}
                          />
                        )}
                      </button>

                      {/* Slider de Volume 100% Customizado (Zero bolinha azul nativa) */}
                      <VolumeSlider />
                    </div>
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#52525b', flexShrink: 0 }}>
                      {fmt(duration)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          </div>
        </div>
      </div>
    </>
  );
}
