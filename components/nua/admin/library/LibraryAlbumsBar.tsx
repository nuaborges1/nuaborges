import React from 'react';
import Image from 'next/image';
import { Plus, Image as ImageIcon, Heart, Folder } from 'lucide-react';
import { MediaAlbum, LibraryImageItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { MediaFilterType } from './types';

interface LibraryAlbumsBarProps {
  library: LibraryImageItem[];
  albums: MediaAlbum[];
  filterType: MediaFilterType;
  totalFavorites: number;
  onFilterChange: (type: MediaFilterType) => void;
  onSelectAlbum: (albumId: string) => void;
  onOpenCreateAlbum: () => void;
}

export function LibraryAlbumsBar({
  library,
  albums,
  filterType,
  totalFavorites,
  onFilterChange,
  onSelectAlbum,
  onOpenCreateAlbum,
}: LibraryAlbumsBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
          Álbuns e Pastas ({albums.length})
        </h4>
        <button
          type="button"
          onClick={onOpenCreateAlbum}
          className="text-[#f4a7b9] hover:text-[#ffb8c9] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Criar Álbum</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {/* All Photos Quick Card */}
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[90px] ${
            filterType === 'all'
              ? 'bg-[#1e202c] border-[#f4a7b9]/50 shadow-sm'
              : 'bg-[#171821] border-white/[0.06] hover:bg-[#1c1d27] hover:border-white/15'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 mb-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#f4a7b9]" />
          </div>
          <div>
            <span className="text-white text-xs font-medium block">Todas as Fotos</span>
            <span className="text-zinc-500 text-[10px] font-mono">{library.length} arquivos</span>
          </div>
        </button>

        {/* Favorites Quick Card */}
        <button
          type="button"
          onClick={() => onFilterChange('favorites')}
          className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[90px] ${
            filterType === 'favorites'
              ? 'bg-[#1e202c] border-[#f4a7b9]/50 shadow-sm'
              : 'bg-[#171821] border-white/[0.06] hover:bg-[#1c1d27] hover:border-white/15'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center text-rose-400 mb-1.5">
            <Heart className="w-3.5 h-3.5 fill-rose-400" />
          </div>
          <div>
            <span className="text-white text-xs font-medium block">Favoritos</span>
            <span className="text-zinc-500 text-[10px] font-mono">
              {totalFavorites} {totalFavorites === 1 ? 'favorita' : 'favoritas'}
            </span>
          </div>
        </button>

        {/* Custom User Albums */}
        {albums.map((album) => {
          const count = album.mediaIds.length;
          const coverItem = library.find((m) => m.id === album.coverMediaId) || library.find((m) => m.url === album.coverUrl);
          const coverUrl = coverItem ? resolveMediaUrl(coverItem.url) : (album.coverUrl ? resolveMediaUrl(album.coverUrl) : null);

          return (
            <button
              key={album.id}
              type="button"
              onClick={() => onSelectAlbum(album.id)}
              className="group relative rounded-xl border border-white/[0.06] hover:border-white/15 bg-[#171821] hover:bg-[#1c1d27] overflow-hidden text-left transition-all cursor-pointer flex flex-col justify-between p-2.5 min-h-[110px]"
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
                    <Folder className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div>
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
      </div>
    </div>
  );
}
