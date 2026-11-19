/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { HeartBeat } from './HeartBeat';
import { ProgressBar } from './ProgressBar';
import { VolumeSlider, VolumeIcon, fmt } from './VolumeSlider';
import { MiniVideoPlayer } from './MiniVideoPlayer';
import { isVideoTrack } from '@/lib/music/mediaHelpers';
import { useMusicPlayer } from '@/lib/music';
import {
  ListMusic,
  ChevronDown,
  Shuffle,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface MusicExpandedControlsProps {
  isCompact: boolean;
  embedded: boolean;
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  hasVideo?: boolean;
}

export function MusicExpandedControls({
  isCompact,
  embedded,
  expanded,
  setExpanded,
  hasVideo = false,
}: MusicExpandedControlsProps) {
  const {
    library,
    currentIndex,
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isMuted,
    repeatMode,
    shuffleMode,
    isPlaylistOpen,
    openPlaylist,
    closePlaylist,
    toggle,
    prev,
    next,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
  } = useMusicPlayer();

  if (isCompact) return null;

  const activeTracks = library.tracks.filter((t) => t.active);
  const track = currentTrack || activeTracks[currentIndex] || activeTracks[0];
  const isVideo = hasVideo || isVideoTrack(track);

  return (
    <div
      role="region"
      aria-label="Controles expandidos do player de música"
      className="w-full flex flex-col p-3.5 space-y-3 select-none"
    >
      {/* 1. Header Superior Editorial */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#90364B]" />
          <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-[#90364B] font-medium">
            {isVideo ? 'Vídeo Editorial' : library.config?.playlistTitle || 'Sensual Lounge'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Botão de Playlist com contador de faixas */}
          <button
            type="button"
            onClick={() => {
              if (isPlaylistOpen) closePlaylist();
              else openPlaylist();
            }}
            aria-label="Alternar lista de reprodução"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer border ${
              isPlaylistOpen
                ? 'bg-[#661C30]/25 text-[#90364B] border-[#7A293D]/40'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.06] hover:bg-white/[0.08]'
            }`}
            title="Ver playlist"
          >
            <ListMusic className="w-3 h-3" />
            <span className="font-mono text-[9px]">{activeTracks.length}</span>
          </button>

          {/* Botão Recolher / Minimizar para modo pílula */}
          {!embedded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Minimizar player"
              className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer ml-0.5"
              title="Minimizar"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Área de Mídia: Capa, Título e Ondas Sonoras (se não for faixa de vídeo) */}
      {!hasVideo && (
        <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-br from-zinc-900/90 to-zinc-950/95 border border-white/[0.08] shadow-inner p-3 flex items-center gap-3">
          {/* Capa com Glow Suave ou HeartBeat */}
          <div className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center group shadow-md">
            {track?.coverUrl ? (
              <img
                src={track.coverUrl}
                alt={track.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950">
                <HeartBeat active={isPlaying} />
              </div>
            )}
          </div>

          {/* Título, Artista e Ondas Sonoras Sutis */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h4 className="text-[13px] font-serif font-medium text-white tracking-tight leading-snug truncate">
              {track?.title || 'Nua Borges'}
            </h4>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-sans font-medium truncate mt-0.5">
              {track?.artist || 'Nua Borges'}
            </p>

            {/* Ondas Sonoras Dinâmicas e Minimalistas */}
            <div className="flex items-end gap-1 h-3 mt-2">
              {[35, 70, 50, 95, 60, 85, 45, 80].map((h, i) => (
                <span
                  key={i}
                  className={`w-[2.5px] rounded-full transition-all duration-300 ${
                    isPlaying ? 'bg-[#90364B]' : 'bg-white/20'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(25, Math.min(100, h * (0.6 + (i % 3) * 0.2)))}%` : '25%',
                    opacity: isPlaying ? 0.9 : 0.35,
                    animation: isPlaying
                      ? `pulse ${0.7 + (i % 4) * 0.22}s ease-in-out infinite alternate`
                      : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Título e Artista para Faixas de Vídeo (onde o vídeo ocupa o topo) */}
      {hasVideo && (
        <div className="pt-0.5">
          <h4 className="text-[14px] font-serif font-medium text-white tracking-tight leading-snug truncate">
            {track?.title || 'Nua Borges'}
          </h4>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-sans font-medium truncate mt-0.5">
            {track?.artist || 'Nua Borges'}
          </p>
        </div>
      )}

      {/* 4. Barra de Progresso e Marcadores de Tempo */}
      <div className="space-y-1.5 pt-1">
        <ProgressBar />
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span>{fmt(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* 5. Controles de Reprodução Principais e Volume */}
      <div className="flex items-center justify-between pt-1">
        {/* Controles Secundários: Shuffle e Repeat */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-label={`Modo aleatório: ${shuffleMode ? 'ativado' : 'desativado'}`}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer relative ${
              shuffleMode
                ? 'text-[#90364B] bg-[#661C30]/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
            title={shuffleMode ? 'Aleatório ativo' : 'Ativar aleatório'}
          >
            <Shuffle className="w-3.5 h-3.5" />
            {shuffleMode && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#90364B]" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleRepeat}
            aria-label={`Modo repetição: ${repeatMode}`}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer relative ${
              repeatMode !== 'none'
                ? 'text-[#90364B] bg-[#661C30]/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
            title={`Repetição: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
            {repeatMode !== 'none' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#90364B]" />
            )}
          </button>
        </div>

        {/* Controles de Faixa Centrais: Anterior, Play/Pause, Próximo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            aria-label="Faixa anterior"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition cursor-pointer"
            title="Anterior"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-semibold flex items-center justify-center transition shadow-md active:scale-95 cursor-pointer border border-white/10 ${
              isPlaying
                ? 'shadow-[0_0_20px_rgba(102,28,48,0.6)]'
                : 'hover:shadow-[0_0_16px_rgba(102,28,48,0.4)]'
            }`}
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
                <rect x="0" y="0" width="3.5" height="12" rx="1" />
                <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" className="translate-x-[0.5px]">
                <path d="M1 0.5L9.5 6 1 11.5V0.5z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={next}
            aria-label="Próxima faixa"
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] active:scale-95 transition cursor-pointer"
            title="Próxima"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Volume e Mudo */}
        <div className="flex items-center gap-1.5 w-24">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Ativar som' : 'Silenciar'}
            className="text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
            title={isMuted ? 'Ativar som' : 'Silenciar'}
          >
            <VolumeIcon muted={isMuted} />
          </button>
          <VolumeSlider />
        </div>
      </div>
    </div>
  );
}
