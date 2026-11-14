'use client';

import React from 'react';
import { HeartBeat } from './HeartBeat';
import type { MusicTrack } from '@/lib/music/types';
import { isVideoTrack } from '@/lib/music/mediaHelpers';
import { Film, ChevronUp } from 'lucide-react';

interface MusicPillCompactProps {
  isCompact: boolean;
  isPlaying: boolean;
  track?: MusicTrack;
  isPlaylistOpen: boolean;
  onOpenPlaylist: () => void;
  onClosePlaylist: () => void;
  onTogglePlay: () => void;
  onExpand: () => void;
}

export function MusicPillCompact({
  isCompact,
  isPlaying,
  track,
  isPlaylistOpen,
  onOpenPlaylist,
  onClosePlaylist,
  onTogglePlay,
  onExpand,
}: MusicPillCompactProps) {
  if (!isCompact) return null;

  const isVideo = isVideoTrack(track);

  return (
    <div
      role="region"
      aria-label="Controle compacto de música"
      className="flex items-center gap-2.5 px-3 h-11 w-full select-none"
    >
      {/* Botão Capa / Ícone / HeartBeat */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isPlaylistOpen) onClosePlaylist();
          else onOpenPlaylist();
        }}
        className="shrink-0 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 transition cursor-pointer relative group"
        aria-label="Abrir playlist"
        title="Ver playlist"
      >
        {track?.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            className={`w-full h-full object-cover rounded-full ${isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''}`}
          />
        ) : isVideo ? (
          <Film className="w-3.5 h-3.5 text-[#f4a7b9]" />
        ) : (
          <HeartBeat active={isPlaying} />
        )}
      </button>

      {/* Título e Artista (clicar na pílula expande o player) */}
      <button
        type="button"
        onClick={onExpand}
        className="flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer outline-none group py-0.5"
        aria-label="Expandir detalhes do player"
      >
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-medium text-white/95 truncate group-hover:text-[#f4a7b9] transition-colors leading-tight">
            {track?.title || 'Nua Borges'}
          </p>
          {isVideo && (
            <span className="shrink-0 px-1 py-[1px] rounded text-[8px] font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Vídeo
            </span>
          )}
        </div>
        <p className="text-[9px] uppercase tracking-wider text-zinc-400 truncate leading-tight mt-0.5 font-sans">
          {track?.artist || 'Nua Borges'}
        </p>
      </button>

      {/* Ações da Direita: Chevron de expansão + Botão Play/Pause */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onExpand}
          aria-label="Expandir player"
          className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
          title="Expandir"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePlay();
          }}
          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          className={`w-7 h-7 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-medium flex items-center justify-center transition shadow-sm cursor-pointer ${
            isPlaying ? 'shadow-[0_0_12px_rgba(244,167,185,0.45)]' : ''
          }`}
          title={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? (
            <svg width="7" height="9" viewBox="0 0 8 10" fill="currentColor">
              <rect x="0.5" y="0" width="2.6" height="10" rx="0.8" />
              <rect x="4.9" y="0" width="2.6" height="10" rx="0.8" />
            </svg>
          ) : (
            <svg width="7" height="9" viewBox="0 0 8 10" fill="currentColor" className="translate-x-[0.5px]">
              <path d="M1 0.75L7.5 5 1 9.25V0.75z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
