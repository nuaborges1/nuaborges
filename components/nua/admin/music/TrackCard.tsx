/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import type { MusicTrack } from '@/lib/music';
import { fmtBytes, fmtDuration } from './musicUtils';

interface TrackCardProps {
  track: MusicTrack;
  isCurrent: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onPlay: () => void;
}

export function TrackCard({
  track,
  isCurrent,
  onEdit,
  onToggleActive,
  onDelete,
  onPlay,
}: TrackCardProps) {
  const getBadge = () => {
    switch (track.type) {
      case 'spotify_track':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Spotify</span>;
      case 'youtube_video':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">YouTube</span>;
      case 'yt_music':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">YT Music</span>;
      case 'apple_music':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-pink-500/10 text-pink-300 border border-pink-500/20">Apple Music</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-zinc-800 text-zinc-400 border border-white/10">Áudio</span>;
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isCurrent
          ? 'border-[#843C52]/30 bg-[#843C52]/5'
          : 'border-white/[0.06] bg-[#101116] hover:bg-white/[0.04]'
      } ${!track.active ? 'opacity-50' : ''}`}
    >
      {/* Cover / Thumbnail or Play Button */}
      {track.coverUrl ? (
        <div className="relative shrink-0 w-8 h-8 rounded-md overflow-hidden bg-zinc-800 group cursor-pointer" onClick={onPlay}>
          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/35 lg:bg-black/40 flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs">▶</span>
          </div>
        </div>
      ) : (
        <button
          onClick={onPlay}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition-colors cursor-pointer"
          aria-label={`Tocar ${track.title}`}
        >
          {isCurrent ? (
            <span className="text-[#843C52] text-xs">•</span>
          ) : (
            <svg
              width="9"
              height="9"
              viewBox="0 0 10 12"
              fill="currentColor"
              className="text-zinc-400 translate-x-[0.5px]"
            >
              <path d="M1 0.5L9.5 6 1 11.5V0.5z" />
            </svg>
          )}
        </button>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-xs font-medium truncate ${isCurrent ? 'text-[#843C52]' : 'text-white'}`}>
            {track.title}
          </p>
          {getBadge()}
        </div>
        <p className="text-[10px] text-zinc-500 truncate mt-0.5">
          {track.artist}
          {track.duration ? ` · ${fmtDuration(track.duration)}` : ''}
          {track.sizeBytes ? ` · ${fmtBytes(track.sizeBytes)}` : ''}
        </p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Ativo / Inativo */}
        <button
          onClick={onToggleActive}
          title={track.active ? 'Desativar' : 'Ativar'}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer ${
            track.active
              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08]'
          }`}
        >
          {track.active ? 'Ativo' : 'Inativo'}
        </button>

        {/* Editar */}
        <button
          onClick={onEdit}
          title="Editar"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          Ed
        </button>

        {/* Deletar */}
        <button
          onClick={onDelete}
          title="Remover"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-rose-400/70 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer"
        >
          ×
        </button>
      </div>
    </div>
  );
}
