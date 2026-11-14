import React from 'react';
import {
  Search,
  Grid,
  List,
  CheckSquare,
  Heart,
  Trash2,
  X,
} from 'lucide-react';
import { MediaAlbum } from '@/lib/types';
import { MediaFilterType, ViewMode, SortOrder } from './types';

interface LibraryToolbarProps {
  isInsideAlbum?: boolean;
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
  totalUnassigned?: number;
  selectedMediaIds: string[];
  displayedCount: number;
  albums?: MediaAlbum[];
  onToggleSelectAllDisplayed: () => void;
  onClearSelection: () => void;
  onBatchFavorite: () => void;
  onBatchAddToAlbum?: (albumId: string) => void;
  onOpenBatchDelete: () => void;
}

export function LibraryToolbar({
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
  selectedMediaIds,
  displayedCount,
  onToggleSelectAllDisplayed,
  onClearSelection,
  onBatchFavorite,
  onOpenBatchDelete,
}: LibraryToolbarProps) {
  return (
    <div className="bg-[#14161d] border border-white/[0.06] rounded-xl p-3 sm:p-3.5 space-y-2.5">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Todas ({totalAll})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('photos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              filterType === 'photos'
                ? 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30 font-semibold'
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
                ? 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30 font-semibold'
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
                ? 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Favoritas ({totalFavorites})
          </button>
        </div>

        {/* Search, Sort & Layout Controls */}
        <div className="flex items-center gap-2 flex-1 md:justify-end">
          <div className="relative flex-1 md:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 bg-[#0e0f14] border border-white/[0.08] rounded-lg pl-8 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value as SortOrder)}
            aria-label="Ordenar mídias"
            className="h-9 bg-[#0e0f14] border border-white/[0.08] rounded-lg px-2.5 text-xs text-zinc-300 outline-none cursor-pointer focus:border-[#f4a7b9]"
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
            <option value="name">Nome (A–Z)</option>
          </select>

          {displayedCount > 0 && (
            <button
              type="button"
              onClick={onToggleSelectAllDisplayed}
              className="h-9 px-2.5 rounded-lg bg-[#0e0f14] hover:bg-white/[0.06] border border-white/[0.08] text-xs text-zinc-300 hover:text-white transition cursor-pointer inline-flex items-center gap-1.5 shrink-0"
              title="Selecionar ou desmarcar mídias visíveis"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span className="hidden sm:inline">Selecionar</span>
            </button>
          )}

          {/* Grid / List View Toggle */}
          <div className="flex items-center h-9 rounded-lg bg-[#0e0f14] border border-white/[0.08] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Exibição em Grade"
              aria-label="Exibição em Grade"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Exibição em Lista"
              aria-label="Exibição em Lista"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedMediaIds.length > 0 && (
        <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 text-[#f4a7b9] text-xs font-semibold">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>
                {selectedMediaIds.length}{' '}
                {selectedMediaIds.length === 1 ? 'selecionada' : 'selecionadas'}
              </span>
            </span>

            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/[0.05] cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Desmarcar</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBatchFavorite}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e0f14] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-200 font-medium transition cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Favoritar</span>
            </button>

            <button
              type="button"
              onClick={onOpenBatchDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs text-rose-300 font-medium transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir selecionadas</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
