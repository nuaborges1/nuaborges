'use client';

import React from 'react';
import {
  Upload,
  Search,
  CheckSquare,
  Image as ImageIcon,
  Film,
  Heart,
  Folder,
} from 'lucide-react';
import { LibraryImageItem, MediaAlbum } from '@/lib/types';

interface ImagePickerFilterBarProps {
  uploading: boolean;
  uploadProgressText: string;
  onUploadClick: () => void;
  search: string;
  setSearch: (s: string) => void;
  filteredLibrary: LibraryImageItem[];
  selectedUrls: string[];
  onSelectAllFiltered: () => void;
  allowedMediaType: 'all' | 'photos' | 'videos';
  mediaTypeFilter: 'all' | 'photos' | 'videos';
  setMediaTypeFilter: (type: 'all' | 'photos' | 'videos') => void;
  libraryLength: number;
  totalPhotosCount: number;
  totalVideosCount: number;
  onlyFavorites: boolean;
  setOnlyFavorites: (v: boolean) => void;
  selectedAlbumId: string;
  setSelectedAlbumId: (id: string) => void;
  albums: MediaAlbum[];
}

export function ImagePickerFilterBar({
  uploading,
  uploadProgressText,
  onUploadClick,
  search,
  setSearch,
  filteredLibrary,
  selectedUrls,
  onSelectAllFiltered,
  allowedMediaType,
  mediaTypeFilter,
  setMediaTypeFilter,
  libraryLength,
  totalPhotosCount,
  totalVideosCount,
  onlyFavorites,
  setOnlyFavorites,
  selectedAlbumId,
  setSelectedAlbumId,
  albums,
}: ImagePickerFilterBarProps) {
  return (
    <div className="py-3 space-y-2.5">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={onUploadClick}
          className="inline-flex items-center justify-center gap-2 h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition-all cursor-pointer shadow-sm shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>
            {uploading
              ? uploadProgressText || 'Enviando mídias...'
              : '+ Enviar Mídias (Fotos e Vídeos)'}
          </span>
        </button>

        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Procurar foto ou vídeo pelo nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
          />
        </div>

        {filteredLibrary.length > 0 && (
          <button
            type="button"
            onClick={onSelectAllFiltered}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors shrink-0 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>
              {filteredLibrary.every((i) => selectedUrls.includes(i.url))
                ? 'Desmarcar Todas'
                : 'Selecionar Todas do Filtro'}
            </span>
          </button>
        )}
      </div>

      {/* Quick Filter Pills (Type, Albums & Favorites) */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
        {/* Type Pills */}
        {allowedMediaType === 'all' && (
          <button
            type="button"
            onClick={() => setMediaTypeFilter('all')}
            className={`h-7 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mediaTypeFilter === 'all'
                ? 'bg-white/[0.12] text-white font-medium border border-white/[0.08]'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.04]'
            }`}
          >
            Todas ({libraryLength})
          </button>
        )}

        {allowedMediaType !== 'videos' && (
          <button
            type="button"
            onClick={() => setMediaTypeFilter('photos')}
            className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mediaTypeFilter === 'photos'
                ? 'bg-white/[0.12] text-white font-medium border border-white/[0.08]'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.04]'
            }`}
          >
            <ImageIcon className="w-3 h-3 text-zinc-400" />
            <span>Fotos ({totalPhotosCount})</span>
          </button>
        )}

        {allowedMediaType !== 'photos' && (
          <button
            type="button"
            onClick={() => setMediaTypeFilter('videos')}
            className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mediaTypeFilter === 'videos'
                ? 'bg-[#f4a7b9] text-zinc-950 font-semibold shadow-sm'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.04]'
            }`}
          >
            <Film className="w-3 h-3 text-[#f4a7b9]" />
            <span>Vídeos ({totalVideosCount})</span>
          </button>
        )}

        <div className="w-[1px] h-4 bg-white/10 shrink-0 mx-1" />

        <button
          type="button"
          onClick={() => {
            setOnlyFavorites(!onlyFavorites);
            setSelectedAlbumId('all');
          }}
          className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
            onlyFavorites
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.04]'
          }`}
        >
          <Heart className={`w-3 h-3 ${onlyFavorites ? 'fill-rose-400 text-rose-400' : ''}`} />
          <span>Favoritos</span>
        </button>

        {albums.map((alb) => (
          <button
            key={alb.id}
            type="button"
            onClick={() => {
              setSelectedAlbumId(alb.id);
              setOnlyFavorites(false);
            }}
            className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              selectedAlbumId === alb.id
                ? 'bg-white/[0.12] text-white font-medium border border-white/[0.08]'
                : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.04]'
            }`}
          >
            <Folder className="w-3 h-3 text-[#f4a7b9]" />
            <span>
              {alb.name} ({alb.mediaIds.length})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
