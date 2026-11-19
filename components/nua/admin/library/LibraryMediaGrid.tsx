import React, { useMemo } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Film,
  Play,
  Heart,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
} from 'lucide-react';
import { SiteContent, LibraryImageItem, MediaAlbum } from '@/lib/types';
import { resolveMediaUrl, resolveMediaVariant, isMediaVideo, resolveVideoPlaySource } from '@/lib/media';
import { getMediaUsage } from '@/lib/mediaUsage';
import { ViewMode } from './types';

interface LibraryMediaGridProps {
  displayedMedia: LibraryImageItem[];
  content: SiteContent;
  currentAlbum: MediaAlbum | null;
  searchTerm: string;
  viewMode: ViewMode;
  hoveredVideoId: string | null;
  setHoveredVideoId: (id: string | null) => void;
  selectedMediaIds: string[];
  onToggleSelectMedia: (id: string, e?: React.MouseEvent) => void;
  onSelectMedia: (item: LibraryImageItem) => void;
  onToggleFavorite: (e: React.MouseEvent, item: LibraryImageItem) => void;
  onMoveMediaInAlbum?: (index: number, direction: 'prev' | 'next') => void;
  onSetAlbumCover?: (mediaId: string, mediaUrl: string) => void;
  onRemoveFromAlbum?: (e: React.MouseEvent, mediaId: string) => void;
  onOpenUpload: () => void;
}

export function LibraryMediaGrid({
  displayedMedia,
  content,
  currentAlbum,
  searchTerm,
  viewMode,
  hoveredVideoId,
  setHoveredVideoId,
  selectedMediaIds,
  onToggleSelectMedia,
  onSelectMedia,
  onToggleFavorite,
  onMoveMediaInAlbum,
  onSetAlbumCover,
  onRemoveFromAlbum,
  onOpenUpload,
}: LibraryMediaGridProps) {
  const usagesByItemId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getMediaUsage>>();
    for (const item of displayedMedia) {
      map.set(item.id, getMediaUsage(item, content));
    }
    return map;
  }, [displayedMedia, content]);
  if (displayedMedia.length === 0) {
    return (
      <div className="bg-[#14151c] border border-white/[0.07] rounded-xl p-12 text-center shadow-sm">
        <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <h4 className="font-serif text-lg text-white font-medium mb-1">
          {searchTerm
            ? 'Nenhuma mídia encontrada para sua busca'
            : currentAlbum
              ? 'Este álbum ainda não possui mídias'
              : 'Nenhuma mídia neste filtro'}
        </h4>
        <p className="text-zinc-400 text-xs font-light max-w-sm mx-auto mb-5 leading-relaxed">
          {searchTerm
            ? `Não encontramos nenhum arquivo com o nome "${searchTerm}". Tente buscar por outro termo.`
            : currentAlbum
              ? 'Adicione fotos do seu acervo a este álbum ou envie novos arquivos do celular ou computador.'
              : 'Adicione suas fotos ou vídeos para gerenciar e publicar no site.'}
        </p>
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--color-adm-accent)] hover:bg-[var(--color-adm-accent-hover)] text-zinc-950 font-semibold text-xs transition-all cursor-pointer shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Enviar Fotos e Vídeos</span>
        </button>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {displayedMedia.map((item, index) => {
          const isVideo = isMediaVideo(item);
          const { videoUrl: videoSrc, posterUrl: videoPoster } = isVideo
            ? resolveVideoPlaySource(item)
            : { videoUrl: '', posterUrl: '' };
          const displayThumb = isVideo
            ? (videoPoster || null)
            : resolveMediaVariant(item, 'thumb');
          const usages = usagesByItemId.get(item.id) || [];
          const isHovered = hoveredVideoId === item.id;
          const isSelected = selectedMediaIds.includes(item.id);

          return (
            <div
              key={item.id}
              onClick={() => onSelectMedia(item)}
              className={`group relative rounded-xl bg-[#14151c] border transition-all cursor-pointer overflow-hidden flex flex-col justify-between p-2.5 shadow-sm ${isSelected
                  ? 'border-[var(--color-adm-accent)] ring-1 ring-[var(--color-adm-accent)]/50 bg-[var(--color-adm-accent)]/[0.03]'
                  : isVideo
                    ? 'border-[var(--color-adm-accent)]/30 hover:border-[var(--color-adm-accent)]/70'
                    : 'border-white/[0.07] hover:border-white/15'
                }`}
            >
              {/* Visual Thumbnail */}
              <div
                className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black mb-2"
                onMouseEnter={() => isVideo && setHoveredVideoId(item.id)}
                onMouseLeave={() => isVideo && setHoveredVideoId(null)}
              >
                {isVideo && isHovered && videoSrc ? (
                  <video
                    src={videoSrc}
                    poster={videoPoster || undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : isVideo ? (
                  videoPoster ? (
                    <img
                      src={videoPoster}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        if (videoSrc) {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector('video.video-thumb-fallback')) {
                            const fallbackVideo = document.createElement('video');
                            fallbackVideo.src = `${videoSrc}#t=0.001`;
                            fallbackVideo.muted = true;
                            fallbackVideo.playsInline = true;
                            fallbackVideo.preload = 'metadata';
                            fallbackVideo.className = 'video-thumb-fallback absolute inset-0 w-full h-full object-cover pointer-events-none';
                            parent.appendChild(fallbackVideo);
                          }
                        }
                      }}
                    />
                  ) : videoSrc ? (
                    <video
                      src={`${videoSrc}#t=0.001`}
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-2 text-center border border-[var(--color-adm-accent)]/20">
                      <Film className="w-7 h-7 text-[var(--color-adm-accent)] mb-1" />
                      <span className="text-[10px] font-mono text-zinc-300 font-medium">Vídeo UHD</span>
                    </div>
                  )
                ) : displayThumb ? (
                  <img
                    src={displayThumb}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#101116] text-zinc-600">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                {/* Selection Checkbox (Top Left) */}
                <button
                  type="button"
                  onClick={(e) => onToggleSelectMedia(item.id, e)}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer z-20 ${isSelected
                      ? 'bg-[var(--color-adm-accent)] text-zinc-950 shadow-md border border-[var(--color-adm-accent)]'
                      : 'bg-black/65 hover:bg-black/85 border border-white/25 text-transparent opacity-80 group-hover:opacity-100'
                    }`}
                  title={isSelected ? 'Desmarcar mídia' : 'Selecionar mídia'}
                  aria-label={isSelected ? 'Desmarcar mídia' : 'Selecionar mídia'}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {/* Video Badge & Center Play Indicator */}
                {isVideo && (
                  <>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[9px] font-mono text-[var(--color-adm-accent)] flex items-center gap-1 border border-[var(--color-adm-accent)]/40 shadow-sm z-10">
                      <Film className="w-3 h-3 text-[var(--color-adm-accent)]" />
                      <span>
                        {item.duration ||
                          (item.durationSeconds
                            ? `${Math.floor(item.durationSeconds / 60)}:${String(
                              Math.floor(item.durationSeconds % 60)
                            ).padStart(2, '0')}`
                            : 'Vídeo')}
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="w-9 h-9 rounded-full bg-black/70 backdrop-blur-md border border-[var(--color-adm-accent)]/40 flex items-center justify-center text-white group-hover:bg-[var(--color-adm-accent)] group-hover:text-zinc-950 group-hover:scale-110 transition-all shadow-xl">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </>
                )}

                {/* Favorite Toggle Button (Top Right) */}
                <button
                  type="button"
                  onClick={(e) => onToggleFavorite(e, item)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-20"
                  title={item.favorite ? 'Remover dos favoritos' : 'Favoritar'}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${item.favorite
                        ? 'fill-rose-400 text-rose-400'
                        : 'text-zinc-300 hover:text-white'
                      }`}
                  />
                </button>

                {/* Site Presence Badge */}
                {usages.length > 0 && (
                  <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 z-10">
                    <span className="px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[9px] font-semibold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{usages.length === 1 ? usages[0].label : `Em ${usages.length} locais`}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Friendly Title & Meta */}
              <div className="px-1">
                <span
                  className="text-white text-xs font-medium block truncate"
                  title={item.customName || item.name}
                >
                  {item.customName || item.name}
                </span>
                <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono mt-0.5">
                  <span>{item.uploadedAt || 'Recente'}</span>
                  <span className="flex items-center gap-1.5">
                    {item.savingsPercentage ? (
                      <span
                        className="text-emerald-400 font-semibold"
                        title={`Super-otimizado: redução de ${item.savingsPercentage}% sem perda visual`}
                      >
                        -{item.savingsPercentage}%
                      </span>
                    ) : null}
                    <span>
                      {item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : 'Otimizado'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Album Reorder Controls (if inside an album) */}
              {currentAlbum && onMoveMediaInAlbum && onSetAlbumCover && onRemoveFromAlbum && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/80"
                >
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMoveMediaInAlbum(index, 'prev')}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer"
                    title="Mover para a esquerda"
                  >
                    <ArrowUp className="w-3.5 h-3.5 -rotate-90" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSetAlbumCover(item.id, item.url)}
                    className={`text-[10px] font-semibold transition-colors cursor-pointer ${currentAlbum.coverMediaId === item.id
                        ? 'text-[var(--color-adm-accent)]'
                        : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    title="Definir foto como capa deste álbum"
                  >
                    {currentAlbum.coverMediaId === item.id ? 'Capa do Álbum' : 'Tornar Capa'}
                  </button>

                  <button
                    type="button"
                    disabled={index === displayedMedia.length - 1}
                    onClick={() => onMoveMediaInAlbum(index, 'next')}
                    className="p-1 rounded-lg text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer"
                    title="Mover para a direita"
                  >
                    <ArrowDown className="w-3.5 h-3.5 -rotate-90" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => onRemoveFromAlbum(e, item.id)}
                    className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 cursor-pointer"
                    title="Remover deste álbum (não apaga a foto do acervo)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="bg-[#14151c] border border-white/[0.07] rounded-xl overflow-hidden divide-y divide-white/[0.06] shadow-sm">
      {displayedMedia.map((item) => {
        const isVideo = isMediaVideo(item);
        const { videoUrl: videoSrc, posterUrl: videoPoster } = isVideo
          ? resolveVideoPlaySource(item)
          : { videoUrl: '', posterUrl: '' };
        const displayThumb = isVideo
          ? (videoPoster || null)
          : resolveMediaVariant(item, 'thumb');
        const usages = usagesByItemId.get(item.id) || [];
        const isSelected = selectedMediaIds.includes(item.id);

        return (
          <div
            key={item.id}
            onClick={() => onSelectMedia(item)}
            className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${isSelected ? 'bg-[var(--color-adm-accent)]/[0.05]' : 'hover:bg-white/[0.03]'
              }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={(e) => onToggleSelectMedia(item.id, e)}
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition cursor-pointer ${isSelected
                    ? 'bg-[var(--color-adm-accent)] text-zinc-950 border border-[var(--color-adm-accent)]'
                    : 'bg-[#0e0f14] border border-white/20 text-transparent hover:border-white/40'
                  }`}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </button>

              <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                {isVideo ? (
                  videoPoster ? (
                    <img
                      src={videoPoster}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        if (videoSrc) {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector('video.video-thumb-fallback')) {
                            const fallbackVideo = document.createElement('video');
                            fallbackVideo.src = `${videoSrc}#t=0.001`;
                            fallbackVideo.muted = true;
                            fallbackVideo.playsInline = true;
                            fallbackVideo.preload = 'metadata';
                            fallbackVideo.className = 'video-thumb-fallback absolute inset-0 w-full h-full object-cover pointer-events-none';
                            parent.appendChild(fallbackVideo);
                          }
                        }
                      }}
                    />
                  ) : videoSrc ? (
                    <video
                      src={`${videoSrc}#t=0.001`}
                      muted
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-[var(--color-adm-accent)]">
                      <Film className="w-5 h-5" />
                    </div>
                  )
                ) : displayThumb ? (
                  <img
                    src={displayThumb}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#101116] text-zinc-600">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs sm:text-sm font-semibold truncate block">
                    {item.customName || item.name}
                  </span>
                  {isVideo && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-adm-accent)]/15 border border-[var(--color-adm-accent)]/30 text-[9px] text-[var(--color-adm-accent)] font-mono shrink-0 font-medium">
                      {item.duration ||
                        (item.durationSeconds
                          ? `${Math.floor(item.durationSeconds / 60)}:${String(
                            Math.floor(item.durationSeconds % 60)
                          ).padStart(2, '0')}`
                          : 'Vídeo')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500 text-[11px] font-mono mt-0.5">
                  <span>{item.uploadedAt || 'Recente'}</span>
                  <span className="flex items-center gap-1.5">
                    {item.savingsPercentage ? (
                      <span
                        className="text-emerald-400 font-semibold"
                        title={`Super-otimizado: redução de ${item.savingsPercentage}% sem perda visual`}
                      >
                        -{item.savingsPercentage}%
                      </span>
                    ) : null}
                    <span>
                      {item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : 'Otimizado'}
                    </span>
                  </span>
                  {usages.length > 0 && (
                    <span className="text-emerald-400 font-sans font-medium">
                      Em uso: {usages.map((u: any) => u.label).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => onToggleFavorite(e, item)}
                className="p-1.5 rounded-lg bg-[#0e0f14] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${item.favorite ? 'fill-rose-400 text-rose-400' : 'text-zinc-500'
                    }`}
                />
              </button>
              <button
                type="button"
                onClick={() => onSelectMedia(item)}
                className="px-2.5 py-1 rounded-lg bg-[#0e0f14] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-300 font-medium cursor-pointer"
              >
                Detalhes
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
