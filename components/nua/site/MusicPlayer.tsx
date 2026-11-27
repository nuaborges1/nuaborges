'use client';

/**
 * MusicPlayer — Player de áudio e vídeo editorial de alta costura da Nua Borges.
 * - Suporte híbrido a faixas de áudio Backblaze B2, MP3, YouTube e vídeos diretos HD.
 * - Modo pílula compacto com altura precisa de 44px (zero espaços vazios).
 * - Modo expandido editorial completo com mini-player de vídeo integrado e controles.
 * - Persistência ininterrupta de áudio/vídeo mesmo ao alternar entre minimizado e expandido.
 */

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMusicPlayer } from '@/lib/music';
import { isVideoTrack } from '@/lib/music/mediaHelpers';
import { PlaylistOverlay } from './music/PlaylistOverlay';
import { MusicPillCompact } from './music/MusicPillCompact';
import { MusicExpandedControls } from './music/MusicExpandedControls';
import { MiniVideoPlayer } from './music/MiniVideoPlayer';
import { useCopy } from '@/lib/copy';

export { HeartBeat } from './music/HeartBeat';
export { ProgressBar } from './music/ProgressBar';
export { VolumeSlider } from './music/VolumeSlider';

export function MusicPlayer({ embedded = false }: { embedded?: boolean } = {}) {
  const { copy } = useCopy();
  const pathname = usePathname();
  const {
    library,
    currentIndex,
    currentTrack,
    isPlaying,
    isPlaylistOpen,
    toggle,
    openPlaylist,
    closePlaylist,
  } = useMusicPlayer();

  const activeTracks = library.tracks.filter((t) => t.active);
  const track = currentTrack || activeTracks[currentIndex] || activeTracks[0];
  const isVideo = isVideoTrack(track);

  const [expanded, setExpanded] = useState(embedded ? true : false);
  const [mounted, setMounted] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Medição da largura do texto para adaptação dinâmica refinada da cápsula
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const [measuredTextWidth, setMeasuredTextWidth] = useState(90);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (textMeasureRef.current) {
      const w = textMeasureRef.current.getBoundingClientRect().width;
      setMeasuredTextWidth(Math.ceil(w));
    }
  }, [track?.title, track?.artist]);

  // Minimizar ao clicar fora (apenas quando flutuante no site público)
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

  if (!mounted) return null;

  // Ocultar se o player estiver desativado nas configurações do admin
  if (!embedded && library?.config?.enabled === false) {
    return null;
  }

  // Ocultar no painel administrativo, contrato e área privada da conta (evita conflito com players/dock/barras móveis)
  const isAdminHost =
    typeof window !== 'undefined' &&
    (window.location.hostname.startsWith('admin.') || window.location.hostname.startsWith('admingeral.'));
  const isAccountOrFlowRoute =
    pathname?.startsWith('/conta') ||
    pathname?.startsWith('/minha-nua') ||
    pathname?.startsWith('/cofre') ||
    pathname?.startsWith('/chamadas/reserva') ||
    pathname?.startsWith('/personalizados/pedido');
  const isProductDetailRoute = Boolean(pathname && /^\/avulsos\/[^/]+/.test(pathname));
  if (
    !embedded &&
    (isAdminHost ||
      pathname?.startsWith('/admin') ||
      pathname?.startsWith('/admingeral') ||
      pathname?.startsWith('/contrato') ||
      isAccountOrFlowRoute)
  ) {
    return null;
  }

  // Se não houver faixas ativas
  if (activeTracks.length === 0) return null;

  // Estado Compacto: sempre que não estiver explicitamente expandido (ou embedded)
  const isCompact = !embedded && !expanded;

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

  // Cálculo da largura da casca do player (sempre contida em telas 320px+)
  const dynamicPillWidth = Math.min(276, Math.max(208, 136 + Math.min(120, measuredTextWidth)));
  const playerShellWidth = embedded
    ? '100%'
    : isCompact
    ? `min(${dynamicPillWidth}px, calc(100vw - 32px))`
    : 'min(340px, calc(100vw - 32px))';

  return (
    <>
      <div
        ref={playerRef}
        role="region"
        aria-label={copy.musicPlayer.regionAria}
        data-music-player="true"
        className={!embedded && isProductDetailRoute ? 'hidden lg:block' : undefined}
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
                zIndex: 45,
                left: 'max(16px, env(safe-area-inset-left, 0px))',
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
              }
        }
      >
        {/* Modal suspenso de Playlist */}
        <PlaylistOverlay embedded={embedded} />

        {/* Elemento oculto para medição precisa de tipografia */}
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

        {/* Casca do Player com Glassmorphism Editorial Profundo */}
        <div
          style={{
            position: 'relative',
            background: 'rgba(10, 10, 14, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: isPlaying
              ? '1px solid rgba(122,41,61,0.45)'
              : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isPlaying
              ? '0 16px 48px rgba(0,0,0,0.92), 0 0 28px rgba(102,28,48,0.25)'
              : '0 10px 36px rgba(0,0,0,0.85)',
            width: playerShellWidth,
            borderRadius: isCompact ? '9999px' : '20px',
            overflow: 'hidden',
            transition: 'width 350ms cubic-bezier(0.16,1,0.3,1), border-radius 350ms cubic-bezier(0.16,1,0.3,1), border-color 300ms ease, box-shadow 300ms ease',
          }}
        >
          {/* Modo Compacto: Pílula de 44px */}
          {isCompact && (
            <MusicPillCompact
              isCompact={true}
              isPlaying={isPlaying}
              track={track}
              isPlaylistOpen={isPlaylistOpen}
              onOpenPlaylist={openPlaylist}
              onClosePlaylist={closePlaylist}
              onTogglePlay={toggle}
              onExpand={() => setExpanded(true)}
            />
          )}

          {/* Mini-Player de Vídeo: Permanece sempre montado se for vídeo, oculto off-screen no modo pílula */}
          {isVideo && (
            <div className={isCompact ? 'fixed -top-[9999px] -left-[9999px] w-[1px] h-[1px] opacity-0 pointer-events-none' : 'p-3.5 pb-0'}>
              <MiniVideoPlayer track={track} isCompact={isCompact} />
            </div>
          )}

          {/* Modo Expandido: Controles completos e metadados */}
          {!isCompact && (
            <MusicExpandedControls
              isCompact={false}
              embedded={embedded}
              expanded={expanded}
              setExpanded={setExpanded}
              hasVideo={isVideo}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default MusicPlayer;
