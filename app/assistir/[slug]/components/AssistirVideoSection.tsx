'use client';

import React from 'react';
import Image from 'next/image';
import { Film, Play, Download } from 'lucide-react';
import { AvulsoProductItem, AvulsoVideoItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { getPlayableVideoUrl } from './helpers';
import { downloadSingleFile } from '@/lib/downloads';

interface AssistirVideoSectionProps {
  product: AvulsoProductItem;
  videosList: AvulsoVideoItem[];
  activeVideoIndex: number | null;
  setActiveVideoIndex: (index: number | null) => void;
  watermarkText: string;
}

export function AssistirVideoSection({
  product,
  videosList,
  activeVideoIndex,
  setActiveVideoIndex,
  watermarkText,
}: AssistirVideoSectionProps) {
  if (videosList.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <Film className="w-4 h-4 text-[#f4a7b9]" />
        <h2 className="font-serif text-xl sm:text-2xl text-white font-medium">
          Vídeos da Produção ({videosList.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {videosList.map((video, vIdx) => {
          const isThisVideoPlaying = activeVideoIndex === vIdx;
          return (
            <div
              key={video.id || vIdx}
              className="space-y-3 bg-[#08080b] border border-white/[0.08] rounded-[28px] p-4 sm:p-6"
            >
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span className="font-serif text-base font-medium text-white">{video.title}</span>
                {video.duration && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono text-[11px]">
                    {video.duration}
                  </span>
                )}
              </div>

              <div
                className="relative w-full aspect-video rounded-[20px] overflow-hidden bg-zinc-950 border border-white/[0.1] shadow-2xl group"
                onContextMenu={(e) => e.preventDefault()}
              >
                {/* Marca d'água Dinâmica Forense */}
                <div className="absolute inset-0 z-20 pointer-events-none select-none flex items-center justify-center opacity-25 hover:opacity-35 transition-opacity">
                  <span className="font-mono text-[10px] sm:text-xs text-white/40 uppercase tracking-[0.2em] rotate-[-12deg] bg-black/40 px-4 py-2 rounded-lg backdrop-blur-[1px] border border-white/5 text-center">
                    {watermarkText}
                  </span>
                </div>

                {isThisVideoPlaying ? (
                  <div className="w-full h-full relative bg-black flex items-center justify-center">
                    <video
                      src={getPlayableVideoUrl(video.url)}
                      poster={resolveMediaUrl(video.posterUrl || product.imageUrl, 'full')}
                      controls
                      disablePictureInPicture
                      onContextMenu={(e) => e.preventDefault()}
                      className="w-full h-full object-contain"
                      autoPlay
                    />
                  </div>
                ) : (
                  <>
                    <Image
                      src={resolveMediaUrl(video.posterUrl || product.imageUrl, 'full')}
                      alt={video.title}
                      fill
                      onDragStart={(e) => e.preventDefault()}
                      className="object-cover brightness-75 group-hover:scale-[1.02] transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    <button
                      type="button"
                      onClick={() => setActiveVideoIndex(vIdx)}
                      className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black flex items-center justify-center shadow-[0_0_50px_rgba(244,167,185,0.4)] transition-transform hover:scale-110 active:scale-95 cursor-pointer z-30"
                      aria-label="Reproduzir vídeo"
                    >
                      <Play className="w-8 h-8 fill-black translate-x-0.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Botão de Download Individual do Vídeo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
                <span className="text-[11px] text-zinc-400 font-light">
                  Arquivo original em alta definição (UHD 4K)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    downloadSingleFile(
                      getPlayableVideoUrl(video.url),
                      `${(video.title || 'video').toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.mp4`
                    )
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-[#f4a7b9] hover:text-black text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto border border-white/10"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Vídeo</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
