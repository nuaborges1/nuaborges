'use client';

import React from 'react';
import Image from 'next/image';
import {
  Check,
  Plus,
  Lock,
  Play,
  Film,
  Image as ImageIcon,
  Volume2,
} from 'lucide-react';
import { LibraryImageItem } from '@/lib/types';
import { resolveMediaVariant, isMediaVideo, resolveVideoPlaySource } from '@/lib/media';

interface ImagePickerGridItemProps {
  item: LibraryImageItem;
  restriction?: string;
  isSelected: boolean;
  selectionIndex: number;
  showMultiIndex: boolean;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onToggleSelect: () => void;
  onPreviewVideo: () => void;
}

export function ImagePickerGridItem({
  item,
  restriction,
  isSelected,
  selectionIndex,
  showMultiIndex,
  isHovered,
  onHoverStart,
  onHoverEnd,
  onToggleSelect,
  onPreviewVideo,
}: ImagePickerGridItemProps) {
  const isVideo = isMediaVideo(item);
  const mediaLabel = isVideo
    ? 'Vídeo'
    : item.width && item.height
      ? `${item.width} × ${item.height}`
      : 'Foto';
  const { videoUrl: videoSrc, posterUrl: videoPoster } = isVideo
    ? resolveVideoPlaySource(item)
    : { videoUrl: '', posterUrl: '' };
  const displayThumbUrl = isVideo ? videoPoster || null : resolveMediaVariant(item, 'thumb');

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={Boolean(restriction)}
      onClick={restriction ? undefined : onToggleSelect}
      onKeyDown={(e) => {
        if (!restriction && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggleSelect();
        }
      }}
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer text-left select-none bg-[#101116] ${
        isSelected
          ? 'border-[var(--color-adm-accent)] ring-2 ring-[var(--color-adm-accent)]/60 shadow-lg shadow-[var(--color-adm-accent)]/20 scale-[0.99]'
          : isVideo
          ? 'border-white/[0.08] hover:border-[var(--color-adm-accent)]/60 hover:scale-[1.01]'
          : 'border-white/[0.08] hover:border-white/30 hover:scale-[1.01]'
      }`}
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden bg-black"
        onMouseEnter={() => isVideo && onHoverStart()}
        onMouseLeave={() => isVideo && onHoverEnd()}
      >
        {/* Hover auto-preview (silent loop) */}
        {isVideo && isHovered && videoSrc ? (
          <video
            src={videoSrc}
            poster={displayThumbUrl || undefined}
            muted
            autoPlay
            loop
            playsInline
            className="w-full h-full object-cover transition-opacity duration-300"
          />
        ) : isVideo ? (
          videoPoster ? (
            <Image
              src={videoPoster}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 180px, 240px"
              onError={(e) => {
                if (videoSrc) {
                  const target = e.currentTarget as HTMLElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('video.video-thumb-fallback')) {
                    const fallbackVideo = document.createElement('video');
                    fallbackVideo.src = `${videoSrc}#t=0.001`;
                    fallbackVideo.muted = true;
                    fallbackVideo.playsInline = true;
                    fallbackVideo.preload = 'metadata';
                    fallbackVideo.className =
                      'video-thumb-fallback absolute inset-0 w-full h-full object-cover pointer-events-none';
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
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-3 text-center border border-[var(--color-adm-accent)]/20">
              <Film className="w-8 h-8 text-[var(--color-adm-accent)] mb-1.5" />
              <span className="text-[11px] font-mono text-zinc-300 font-medium">Vídeo</span>
              <span className="text-[9px] font-mono text-zinc-500 mt-0.5">Arquivo de vídeo</span>
            </div>
          )
        ) : displayThumbUrl ? (
          <Image
            src={displayThumbUrl}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 180px, 240px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#101116] text-zinc-600">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}

        {/* Selected Overlay Tint */}
        {isSelected && (
          <div className="absolute inset-0 bg-[var(--color-adm-accent)]/20 pointer-events-none transition-opacity" />
        )}

        {/* Center Play Button for full video preview with sound */}
        {isVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewVideo();
            }}
            className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/80 hover:bg-[var(--color-adm-accent)] hover:text-white text-[var(--color-adm-accent)] flex items-center justify-center transition-all duration-200 backdrop-blur-md border border-[var(--color-adm-accent)]/40 hover:scale-110 shadow-lg z-20 group/play cursor-pointer opacity-90 group-hover:opacity-100"
            title="Assistir prévia do vídeo com som"
            aria-label="Assistir prévia do vídeo"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        )}

        {/* Top Checkbox / Multi-selection Badge */}
        <div className="absolute top-2 right-2 z-20">
          {isSelected ? (
            <div className="w-6 h-6 rounded-full bg-[var(--color-adm-accent)] text-white flex items-center justify-center font-bold text-xs shadow-md border border-white/20 scale-105 transition-transform">
              {showMultiIndex ? selectionIndex : <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          ) : (
            <div className="min-h-6 min-w-6 rounded-full bg-black/70 px-1.5 border border-white/20 text-white flex items-center justify-center gap-1">
              {restriction ? (
                <>
                  <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                  <span className="text-[10px] font-medium">{restriction}</span>
                </>
              ) : <Plus className="w-3.5 h-3.5" />}
            </div>
          )}
        </div>

        {/* Top Media Type Badge */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          {isVideo ? (
            <div className="px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[9px] font-mono text-[var(--color-adm-accent)] flex items-center gap-1 border border-[var(--color-adm-accent)]/40 shadow-sm">
              <Film className="w-2.5 h-2.5 text-[var(--color-adm-accent)]" />
              <span>{mediaLabel}</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-mono text-zinc-300 flex items-center gap-1 border border-white/10">
              <ImageIcon className="w-2.5 h-2.5 text-zinc-400" />
              <span>{mediaLabel}</span>
            </div>
          )}
        </div>

        {/* Bottom Tag on video card */}
        {isVideo && (
          <div className="absolute bottom-11 inset-x-2 flex items-center justify-between pointer-events-none z-10">
            <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[9px] font-mono text-zinc-300 flex items-center gap-1 border border-white/10 shadow-sm">
              <Volume2 className="w-2.5 h-2.5 text-[var(--color-adm-accent)]" />
              <span>Prévia com som</span>
            </span>
          </div>
        )}

        {/* Bottom Gradient with Name & Date */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-2.5 pt-7 flex flex-col justify-end pointer-events-none z-10">
          <span
            className="text-white text-xs font-medium block truncate drop-shadow-sm leading-tight"
            title={item.customName || item.name}
          >
            {item.customName || item.name}
          </span>
          <div className="flex items-center justify-between text-zinc-400 text-[10px] font-mono mt-0.5 leading-none">
            <span>{item.uploadedAt || 'Recente'}</span>
            <span>{isVideo ? 'Vídeo' : 'Foto'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
