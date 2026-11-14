'use client';

import React from 'react';
import Image from 'next/image';
import { Film, CheckCircle2, ExternalLink } from 'lucide-react';
import { LibraryImageItem } from '@/lib/types';

interface MediaViewerPreviewPaneProps {
  item: LibraryImageItem;
  isVideo: boolean;
  displayUrl: string;
  playablePosterUrl?: string;
  videoError: boolean;
  setVideoError: (v: boolean) => void;
  imageError: boolean;
  setImageError: (v: boolean) => void;
}

export function MediaViewerPreviewPane({
  item,
  isVideo,
  displayUrl,
  playablePosterUrl,
  videoError,
  setVideoError,
  imageError,
  setImageError,
}: MediaViewerPreviewPaneProps) {
  return (
    <div className="relative flex-1 bg-black/95 flex items-center justify-center min-h-[280px] sm:min-h-[420px] lg:min-h-[580px] overflow-hidden p-4">
      {/* Quick Open Original Link */}
      <a
        href={displayUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 left-4 z-20 h-7 px-2.5 rounded-lg bg-black/70 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs transition-colors cursor-pointer border border-white/10"
        title="Abrir arquivo original em nova aba"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Abrir Original</span>
      </a>

      {isVideo ? (
        videoError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md bg-[#101116] border border-white/[0.06] rounded-xl shadow-xl">
            <Film className="w-9 h-9 text-[#f4a7b9] mb-3" />
            <h4 className="text-white text-sm font-semibold mb-1">
              Vídeo em Carregamento ou Formato Específico
            </h4>
            <p className="text-zinc-400 text-xs mb-4">
              O streaming de vídeo está ativo. Você pode tentar recarregar ou abrir
              diretamente no reprodutor nativo.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVideoError(false)}
                className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white border border-white/10 transition-colors cursor-pointer"
              >
                Tentar Novamente
              </button>
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Vídeo Direto</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              key={displayUrl}
              src={displayUrl}
              poster={playablePosterUrl || undefined}
              controls
              autoPlay
              playsInline
              preload="auto"
              onError={() => setVideoError(true)}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
          </div>
        )
      ) : imageError ? (
        <div className="flex flex-col items-center justify-center p-4 text-center max-w-md">
          <img
            src={displayUrl}
            alt={item.name}
            className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      ) : (
        <div className="relative w-full h-full min-h-[300px] sm:min-h-[460px] flex items-center justify-center">
          <Image
            src={displayUrl}
            alt={item.name}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 65vw"
            priority
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {/* Floating Quick Badges */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        {isVideo && (
          <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono text-white flex items-center gap-1.5 border border-white/10">
            <Film className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Vídeo UHD</span>
          </span>
        )}
        <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono text-emerald-400 flex items-center gap-1 border border-white/10">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Qualidade Original</span>
        </span>
      </div>
    </div>
  );
}
