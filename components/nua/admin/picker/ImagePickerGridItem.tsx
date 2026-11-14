'use client';

import React from 'react';
import Image from 'next/image';
import {
  Check,
  Plus,
  Play,
  Film,
  Image as ImageIcon,
  Volume2,
} from 'lucide-react';
import { LibraryImageItem } from '@/lib/types';
import { resolveMediaUrl, isMediaVideo, resolveVideoPlaySource } from '@/lib/media';

interface ImagePickerGridItemProps {
  item: LibraryImageItem;
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
  const { videoUrl: videoSrc, posterUrl: videoPoster } = isVideo
    ? resolveVideoPlaySource(item)
    : { videoUrl: '', posterUrl: '' };
  const displayThumbUrl = isVideo ? videoPoster || null : resolveMediaUrl(item.url, 'thumb');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggleSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleSelect();
        }
      }}
      className={`group relative rounded-xl border transition-all cursor-pointer text-left select-none bg-[#101116] p-2 flex flex-col justify-between ${
        isSelected
          ? 'border-[#f4a7b9] ring-1 ring-[#f4a7b9]/50 shadow-sm bg-[#f4a7b9]/[0.03]'
          : isVideo
          ? 'border-[#f4a7b9]/30 hover:border-[#f4a7b9]/70 hover:scale-[1.01]'
          : 'border-white/[0.06] hover:border-white/20 hover:scale-[1.01]'
      }`}
    >
      <div
        className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-black mb-2"
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
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-3 text-center border border-[#f4a7b9]/20">
              <Film className="w-8 h-8 text-[#f4a7b9] mb-1.5" />
              <span className="text-[11px] font-mono text-zinc-300 font-medium">Vídeo 4K</span>
              <span className="text-[9px] font-mono text-zinc-500 mt-0.5">MP4 / Vídeo</span>
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

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {/* Center Play Button for full video preview with sound */}
        {isVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewVideo();
            }}
            className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/80 hover:bg-[#f4a7b9] hover:text-zinc-950 text-[#f4a7b9] flex items-center justify-center transition-all duration-200 backdrop-blur-md border border-[#f4a7b9]/40 hover:scale-110 shadow-lg z-20 group/play cursor-pointer opacity-90 group-hover:opacity-100"
            title="Assistir preview do vídeo com áudio"
            aria-label="Assistir preview do vídeo"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        )}

        {/* Top Checkbox / Multi-selection Badge */}
        <div className="absolute top-2 right-2 z-20">
          {isSelected ? (
            <div className="w-6 h-6 rounded-full bg-[#f4a7b9] text-zinc-950 flex items-center justify-center font-bold text-xs shadow-md border border-white/20">
              {showMultiIndex ? selectionIndex : <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-black/60 border border-white/40 text-white flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
              <Plus className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Top Media Type Badge */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          {isVideo ? (
            <div className="px-2 py-0.5 rounded-full bg-black/90 backdrop-blur-md text-[9px] font-mono text-[#f4a7b9] flex items-center gap-1 border border-[#f4a7b9]/40 shadow-sm">
              <Film className="w-3 h-3 text-[#f4a7b9]" />
              <span>Vídeo UHD</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-mono text-zinc-300 flex items-center gap-1 border border-white/10">
              <ImageIcon className="w-3 h-3 text-zinc-400" />
              <span>Foto 4K</span>
            </div>
          )}
        </div>

        {/* Bottom audio/preview tag on video card */}
        {isVideo && (
          <div className="absolute bottom-2 inset-x-2 flex items-center justify-between pointer-events-none z-10">
            <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[9px] font-mono text-zinc-300 flex items-center gap-1 border border-white/10 shadow-sm">
              <Volume2 className="w-2.5 h-2.5 text-[#f4a7b9]" />
              <span>Preview com Som</span>
            </span>
          </div>
        )}
      </div>

      {/* Metadata & Actions */}
      <div className="w-full min-w-0 px-0.5">
        <span className="text-white text-xs font-medium block truncate" title={item.name}>
          {item.name}
        </span>
        <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono mt-0.5">
          <span>{item.uploadedAt || 'Recente'}</span>
          <span>{isVideo ? 'Vídeo' : 'Foto'}</span>
        </div>

        {isVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewVideo();
            }}
            className="mt-2 w-full h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-[#f4a7b9] hover:text-zinc-950 text-[#f4a7b9] border border-white/10 hover:border-transparent text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm group/btn"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Assistir Vídeo</span>
          </button>
        )}
      </div>
    </div>
  );
}
