'use client';

import Image from 'next/image';
import { Folder, FolderOpen, Heart, Images, Search, X } from 'lucide-react';
import { LibraryImageItem, MediaAlbum } from '@/lib/types';
import { resolveMediaUrl, resolveMediaVariant } from '@/lib/media';

interface Props {
  search: string;
  setSearch: (value: string) => void;
  allowedMediaType: 'all' | 'photos' | 'videos';
  mediaTypeFilter: 'all' | 'photos' | 'videos';
  setMediaTypeFilter: (type: 'all' | 'photos' | 'videos') => void;
  totalPhotosCount: number;
  totalVideosCount: number;
  onlyFavorites: boolean;
  setOnlyFavorites: (value: boolean) => void;
  selectedAlbumId: string;
  setSelectedAlbumId: (id: string) => void;
  albums: MediaAlbum[];
  library: LibraryImageItem[];
}

export function ImagePickerFilterBar(props: Props) {
  const assignedIds = new Set(props.albums.flatMap((album) => album.mediaIds));
  const unassigned = props.library.filter(
    (item) => !assignedIds.has(item.id) && (!item.albumIds || item.albumIds.length === 0)
  );
  const favorites = props.library.filter((item) => item.favorite);

  const thumb = (item?: LibraryImageItem) =>
    item
      ? item.posterUrl || resolveMediaVariant(item, 'thumb') || resolveMediaUrl(item.url, 'thumb')
      : null;

  const albumCover = (album: MediaAlbum) => {
    const media =
      props.library.find((item) => item.id === album.coverMediaId) ||
      props.library.find((item) => item.url === album.coverUrl) ||
      props.library.find((item) => album.mediaIds.includes(item.id));
    return thumb(media) || (album.coverUrl ? resolveMediaUrl(album.coverUrl, 'thumb') : null);
  };

  const chooseAlbum = (id: string) => {
    props.setSelectedAlbumId(id);
    props.setOnlyFavorites(false);
  };

  const isAllActive = props.selectedAlbumId === 'all' && !props.onlyFavorites;
  const isFavoritesActive = props.onlyFavorites;
  const isUnassignedActive = props.selectedAlbumId === 'unassigned' && !props.onlyFavorites;
  const activeAlbum = props.albums.find(
    (a) => a.id === props.selectedAlbumId && !props.onlyFavorites
  );

  return (
    <div className="space-y-2 py-0.5">
      {/* Linha 1: Busca e Tipo de Mídia */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            value={props.search}
            onChange={(event) => props.setSearch(event.target.value)}
            placeholder="Buscar por nome da mídia..."
            className="h-8.5 w-full rounded-lg border border-white/10 bg-[#0c0d12] pl-8.5 pr-8 text-xs text-white outline-none placeholder:text-zinc-500 focus:border-[var(--color-adm-accent)] transition-colors"
          />
          {props.search && (
            <button
              type="button"
              onClick={() => props.setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {props.allowedMediaType === 'all' ? (
          <select
            value={props.mediaTypeFilter}
            onChange={(event) =>
              props.setMediaTypeFilter(event.target.value as 'all' | 'photos' | 'videos')
            }
            className="h-8.5 shrink-0 rounded-lg border border-white/10 bg-[#0c0d12] px-2.5 text-xs text-zinc-200 outline-none focus:border-[var(--color-adm-accent)] cursor-pointer"
          >
            <option value="all">
              Fotos e vídeos ({props.totalPhotosCount + props.totalVideosCount})
            </option>
            <option value="photos">Somente fotos ({props.totalPhotosCount})</option>
            <option value="videos">Somente vídeos ({props.totalVideosCount})</option>
          </select>
        ) : (
          <div className="h-8.5 shrink-0 px-3 inline-flex items-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-xs font-medium text-zinc-400">
            {props.allowedMediaType === 'photos' ? 'Somente fotos' : 'Somente vídeos'}
          </div>
        )}
      </div>

      {/* Linha 2: Filtros de Acervo + Álbuns Compactos em Faixa Horizontal */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/15 max-w-full">
        {/* Filtros Base */}
        <button
          type="button"
          aria-pressed={isAllActive}
          onClick={() => {
            chooseAlbum('all');
            props.setMediaTypeFilter(props.allowedMediaType);
          }}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all cursor-pointer ${
            isAllActive
              ? 'border-[var(--color-adm-accent)] bg-[var(--color-adm-accent)]/20 text-white font-semibold shadow-sm'
              : 'border-white/[0.08] bg-[#0c0d12] text-zinc-400 hover:border-white/20 hover:text-white'
          }`}
        >
          <Images className="h-3.5 w-3.5" />
          <span>Todo o acervo</span>
          <span className="text-[10px] text-zinc-400 font-mono">({props.library.length})</span>
        </button>

        <button
          type="button"
          aria-pressed={isFavoritesActive}
          onClick={() => {
            props.setOnlyFavorites(true);
            props.setSelectedAlbumId('all');
          }}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all cursor-pointer ${
            isFavoritesActive
              ? 'border-[var(--color-adm-accent)] bg-[var(--color-adm-accent)]/20 text-white font-semibold shadow-sm'
              : 'border-white/[0.08] bg-[#0c0d12] text-zinc-400 hover:border-white/20 hover:text-white'
          }`}
        >
          <Heart className="h-3.5 w-3.5" />
          <span>Favoritos</span>
          <span className="text-[10px] text-zinc-400 font-mono">({favorites.length})</span>
        </button>

        <button
          type="button"
          aria-pressed={isUnassignedActive}
          onClick={() => chooseAlbum('unassigned')}
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all cursor-pointer ${
            isUnassignedActive
              ? 'border-[var(--color-adm-accent)] bg-[var(--color-adm-accent)]/20 text-white font-semibold shadow-sm'
              : 'border-white/[0.08] bg-[#0c0d12] text-zinc-400 hover:border-white/20 hover:text-white'
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span>Sem álbum</span>
          <span className="text-[10px] text-zinc-400 font-mono">({unassigned.length})</span>
        </button>

        {/* Separador Visual */}
        {props.albums.length > 0 && (
          <div className="h-5 w-px bg-white/10 shrink-0 mx-0.5" aria-hidden="true" />
        )}

        {/* Cards Compactos dos Álbuns (Foco reduzido, altura 32px) */}
        {props.albums.map((album) => {
          const isSelected = props.selectedAlbumId === album.id && !props.onlyFavorites;
          const cover = albumCover(album);

          return (
            <button
              key={album.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => chooseAlbum(album.id)}
              className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border pl-1 pr-2.5 text-xs transition-all cursor-pointer ${
                isSelected
                  ? 'border-[var(--color-adm-accent)] bg-[var(--color-adm-accent)]/20 text-white font-semibold ring-1 ring-[var(--color-adm-accent)]/50 shadow-sm'
                  : 'border-white/[0.08] bg-[#0c0d12] text-zinc-300 hover:border-white/20 hover:text-white'
              }`}
              title={`${album.name} (${album.mediaIds.length} mídias)`}
            >
              {/* Miniatura quadrada compacta (24x24) */}
              <div className="relative h-6 w-6 rounded-md overflow-hidden bg-black/60 shrink-0 border border-white/10">
                {cover ? (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--color-adm-accent)]">
                    <Folder className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <span className="max-w-[120px] truncate text-xs">{album.name}</span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {album.mediaIds.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Indicador de filtro ativo quando um álbum está selecionado */}
      {activeAlbum && (
        <div className="flex items-center justify-between px-2.5 py-1 rounded-md bg-[var(--color-adm-accent)]/15 border border-[var(--color-adm-accent)]/30 text-xs text-zinc-300">
          <span className="truncate">
            Filtrando pelo álbum: <strong className="text-white font-semibold">{activeAlbum.name}</strong> ({activeAlbum.mediaIds.length} mídias)
          </span>
          <button
            type="button"
            onClick={() => chooseAlbum('all')}
            className="text-[11px] text-[var(--color-adm-accent-hover)] hover:text-white hover:underline cursor-pointer font-medium ml-2 shrink-0 transition-colors"
          >
            Ver todo o acervo
          </button>
        </div>
      )}
    </div>
  );
}
