'use client';

import React from 'react';
import { useMusicPlayer } from '@/lib/music';
import { HeartBeat } from './HeartBeat';
import { isVideoTrack } from '@/lib/music/mediaHelpers';

interface PlaylistOverlayProps {
  embedded?: boolean;
}

export function PlaylistOverlay({ embedded = false }: PlaylistOverlayProps) {
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
        <ul className="py-1.5 max-h-[250px] overflow-y-auto overscroll-contain scrollbar-none">
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
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-medium truncate">
                        {track.title}
                      </span>
                      {isVideoTrack(track) && (
                        <span className="shrink-0 px-1 py-[1px] rounded text-[8px] font-mono uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          Vídeo
                        </span>
                      )}
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
