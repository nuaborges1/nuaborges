import React from 'react';
import { Search, Grid, List } from 'lucide-react';
import { MediaFilterType, ViewMode, SortOrder } from './types';

interface LibraryToolbarProps {
  isInsideAlbum: boolean;
  filterType: MediaFilterType;
  onFilterChange: (type: MediaFilterType) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  sortOrder: SortOrder;
  onSortChange: (val: SortOrder) => void;
  viewMode: ViewMode;
  onViewModeChange: (val: ViewMode) => void;
  totalAll: number;
  totalPhotos: number;
  totalVideos: number;
  totalFavorites: number;
}

export function LibraryToolbar({
  isInsideAlbum,
  filterType,
  onFilterChange,
  searchTerm,
  onSearchChange,
  sortOrder,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalAll,
  totalPhotos,
  totalVideos,
  totalFavorites,
}: LibraryToolbarProps) {
  return (
    <div className="bg-[#171821] border border-white/[0.06] rounded-xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Filter Pills */}
      {!isInsideAlbum && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Todos ({totalAll})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('photos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              filterType === 'photos'
                ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Fotos ({totalPhotos})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('videos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              filterType === 'videos'
                ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Vídeos ({totalVideos})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('favorites')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              filterType === 'favorites'
                ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Favoritos ({totalFavorites})
          </button>
        </div>
      )}

      {/* Search & Layout Toggles */}
      <div className="flex items-center gap-2.5 flex-1 md:justify-end">
        <div className="relative flex-1 md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Buscar mídia por nome..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
          />
        </div>

        {/* Sort Dropdown */}
        {!isInsideAlbum && (
          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as SortOrder)}
            className="bg-[#0e0f14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none cursor-pointer focus:border-[#f4a7b9]"
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
            <option value="name">Nome (A-Z)</option>
          </select>
        )}

        {/* Grid / List View Toggle */}
        <div className="flex items-center rounded-lg bg-[#0e0f14] border border-white/10 p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Exibição em Grade"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Exibição em Lista"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
