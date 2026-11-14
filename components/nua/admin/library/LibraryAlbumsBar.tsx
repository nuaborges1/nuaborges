import React from 'react';
import Image from 'next/image';
import { Plus, Image as ImageIcon, Heart, Folder, FolderOpen } from 'lucide-react';
import { MediaAlbum, LibraryImageItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { MediaFilterType } from './types';

interface LibraryAlbumsBarProps {
  library: LibraryImageItem[];
  albums: MediaAlbum[];
  filterType: MediaFilterType;
  totalFavorites: number;
  totalUnassigned: number;
  onFilterChange: (type: MediaFilterType) => void;
  onSelectAlbum: (albumId: string) => void;
  onOpenCreateAlbum: () => void;
}

export function LibraryAlbumsBar({
  library,
  albums,
  filterType,
  totalFavorites,
  totalUnassigned,
  onFilterChange,
  onSelectAlbum,
  onOpenCreateAlbum,
}: LibraryAlbumsBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-white flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Álbuns e Categorias ({albums.length})</span>
          </h4>
          <p className="text-[11px] text-zinc-400">
            Organize suas mídias em álbuns administrativos para encontrar tudo rapidamente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {/* Create New Album Card (Single Canonical Entry Point) */}
        <button
          type="button"
          onClick={onOpenCreateAlbum}
          className="p-3 rounded-xl border border-dashed border-white/15 hover:border-[#f4a7b9]/50 bg-[#14151c] hover:bg-[#191b24] text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[106px] group"
        >
          <div className="w-8 h-8 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/30 flex items-center justify-center text-[#f4a7b9] group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-[#f4a7b9]">Novo álbum</span>
        </button>

        {/* Custom User Albums with Real Thumbnails */}
        {albums.map((album) => {
          const count = album.mediaIds.length;
          const coverItem =
            library.find((m) => m.id === album.coverMediaId) ||
            library.find((m) => m.url === album.coverUrl) ||
            library.find((m) => album.mediaIds.includes(m.id));
          const coverUrl = coverItem
            ? resolveMediaUrl(coverItem.posterUrl || coverItem.url, 'thumb')
            : album.coverUrl
            ? resolveMediaUrl(album.coverUrl, 'thumb')
            : null;

          return (
            <button
              key={album.id}
              type="button"
              onClick={() => onSelectAlbum(album.id)}
              className="group relative rounded-xl border border-white/[0.07] hover:border-[#f4a7b9]/40 bg-[#14151c] hover:bg-[#191b24] overflow-hidden text-left transition-all cursor-pointer flex flex-col justify-between p-2 min-h-[106px]"
            >
              <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-black mb-2">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={album.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="160px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#101116] text-zinc-600">
                    <Folder className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="px-0.5">
                <span className="text-white text-xs font-semibold block truncate" title={album.name}>
                  {album.name}
                </span>
                <span className="text-zinc-500 text-[10px] font-mono">
                  {count} {count === 1 ? 'mídia' : 'mídias'}
                </span>
              </div>
            </button>
          );
        })}

        {/* Favorites Quick Card */}
        <button
          type="button"
          onClick={() => onFilterChange('favorites')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[106px] ${
            filterType === 'favorites'
              ? 'bg-[#1b1c26] border-[#f4a7b9]/50 shadow-sm'
              : 'bg-[#14151c] border-white/[0.07] hover:bg-[#191b24] hover:border-white/15'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400 mb-1.5">
            <Heart className="w-3.5 h-3.5 fill-rose-400" />
          </div>
          <div>
            <span className="text-white text-xs font-medium block">Favoritos</span>
            <span className="text-zinc-500 text-[10px] font-mono">
              {totalFavorites} {totalFavorites === 1 ? 'mídia' : 'mídias'}
            </span>
          </div>
        </button>

        {/* Unassigned Media Quick Card */}
        <button
          type="button"
          onClick={() => onFilterChange('unassigned')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[106px] ${
            filterType === 'unassigned'
              ? 'bg-[#1b1c26] border-[#f4a7b9]/50 shadow-sm'
              : 'bg-[#14151c] border-white/[0.07] hover:bg-[#191b24] hover:border-white/15'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-zinc-300 mb-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-[#f4a7b9]" />
          </div>
          <div>
            <span className="text-white text-xs font-medium block">Sem Álbum</span>
            <span className="text-zinc-500 text-[10px] font-mono">
              {totalUnassigned} {totalUnassigned === 1 ? 'arquivo' : 'arquivos'}
            </span>
          </div>
        </button>

        {/* All Media Quick Card */}
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[106px] ${
            filterType === 'all'
              ? 'bg-[#1b1c26] border-[#f4a7b9]/50 shadow-sm'
              : 'bg-[#14151c] border-white/[0.07] hover:bg-[#191b24] hover:border-white/15'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-zinc-300 mb-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#f4a7b9]" />
          </div>
          <div>
            <span className="text-white text-xs font-medium block">Todas as Mídias</span>
            <span className="text-zinc-500 text-[10px] font-mono">{library.length} arquivos</span>
          </div>
        </button>
      </div>
    </div>
  );
}
