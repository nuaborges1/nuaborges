import { Plus, Images, Heart, FolderOpen, Folder } from 'lucide-react';
import { MediaAlbum, LibraryImageItem } from '@/lib/types';
import { resolveMediaUrl, resolveMediaVariant } from '@/lib/media';
import { MediaFilterType } from './types';
import { AlbumVisualCard } from './AlbumVisualCard';

interface Props {
  library: LibraryImageItem[];
  albums: MediaAlbum[];
  filterType: MediaFilterType;
  activeAlbumId: string | null;
  totalAll: number;
  totalFavorites: number;
  totalUnassigned: number;
  onFilterChange: (type: MediaFilterType) => void;
  onSelectAlbum: (id: string | null) => void;
  onOpenCreateAlbum: () => void;
}

export function LibraryAlbumsBar(props: Props) {
  const chooseFilter = (type: MediaFilterType) => {
    props.onSelectAlbum(null);
    props.onFilterChange(type);
  };

  const assignedIds = new Set(props.albums.flatMap((album) => album.mediaIds));
  const unassignedCover = props.library.find(
    (item) => !assignedIds.has(item.id) && (!item.albumIds || item.albumIds.length === 0)
  );
  const favoriteCover = props.library.find((item) => item.favorite);
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

  const isQuickFilterSelected = (filter: MediaFilterType) =>
    !props.activeAlbumId && props.filterType === filter;
  const quickFilterClass = (selected: boolean) =>
    `inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-adm-accent)] ${
      selected
        ? 'border-[var(--color-adm-accent)]/45 bg-[var(--color-adm-accent)]/10 text-white'
        : 'border-white/[0.08] bg-[#101116] text-zinc-300 hover:border-white/20 hover:text-white'
    }`;

  return (
    <section aria-label="Álbuns e filtros da biblioteca" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" aria-label="Filtros rápidos">
        <button
          type="button"
          aria-pressed={isQuickFilterSelected('all')}
          onClick={() => chooseFilter('all')}
          className={quickFilterClass(isQuickFilterSelected('all'))}
        >
          <Images className="h-4 w-4" aria-hidden="true" />
          Todas as mídias <span className="text-zinc-500">{props.totalAll}</span>
        </button>
        <button
          type="button"
          aria-pressed={isQuickFilterSelected('favorites')}
          onClick={() => chooseFilter('favorites')}
          className={quickFilterClass(isQuickFilterSelected('favorites'))}
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
          Favoritos <span className="text-zinc-500">{props.totalFavorites}</span>
        </button>
        <button
          type="button"
          aria-pressed={isQuickFilterSelected('unassigned')}
          onClick={() => chooseFilter('unassigned')}
          className={quickFilterClass(isQuickFilterSelected('unassigned'))}
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          Sem álbum <span className="text-zinc-500">{props.totalUnassigned}</span>
        </button>
      </div>

      <section
        aria-labelledby="library-albums-heading"
        className="rounded-xl border border-white/[0.06] bg-[#14161d] p-3 sm:p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="library-albums-heading" className="text-sm font-semibold text-white">
              Seus álbuns
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Abra uma capa para ver as mídias organizadas naquele álbum.
            </p>
          </div>
          <span className="text-xs text-zinc-500">
            {props.albums.length} {props.albums.length === 1 ? 'álbum' : 'álbuns'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {props.albums.map((album) => (
            <AlbumVisualCard
              key={album.id}
              title={album.name}
              countLabel={`${album.mediaIds.length} ${album.mediaIds.length === 1 ? 'mídia' : 'mídias'}`}
              coverUrl={albumCover(album)}
              icon={Folder}
              selected={props.activeAlbumId === album.id}
              onClick={() => {
                props.onFilterChange('albums');
                props.onSelectAlbum(album.id);
              }}
            />
          ))}
          <AlbumVisualCard
            title="Criar álbum"
            countLabel="Organize suas mídias"
            icon={Plus}
            selected={false}
            onClick={props.onOpenCreateAlbum}
            create
          />
        </div>
        {props.albums.length === 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            Ainda não há álbuns. Crie um para agrupar fotos e vídeos por ensaio.
          </p>
        )}
      </section>
    </section>
  );
}
