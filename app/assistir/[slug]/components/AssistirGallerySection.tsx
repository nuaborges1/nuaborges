/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { downloadSingleFile } from '@/lib/downloads';

interface AssistirGallerySectionProps {
  product: AvulsoProductItem;
  photosList: string[];
  lightboxPhotoIndex: number | null;
  setLightboxPhotoIndex: React.Dispatch<React.SetStateAction<number | null>>;
  watermarkText: string;
}

export function AssistirGallerySection({
  product,
  photosList,
  lightboxPhotoIndex,
  setLightboxPhotoIndex,
  watermarkText,
}: AssistirGallerySectionProps) {
  if (photosList.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#90364B]" />
          <h2 className="font-serif text-xl sm:text-2xl text-white font-medium">
            Galeria Fotográfica Autoral ({photosList.length} {photosList.length === 1 ? 'Foto' : 'Fotos'})
          </h2>
        </div>
        <span className="text-zinc-500 text-xs font-mono hidden sm:inline">Clique para ampliar em 4K</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {photosList.map((photoUrl, idx) => (
          <div
            key={idx}
            onClick={() => setLightboxPhotoIndex(idx)}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            className="relative aspect-[4/5] rounded-[24px] overflow-hidden bg-zinc-950 border border-white/[0.08] shadow-lg group select-none cursor-pointer hover:border-[#661C30]/50 transition-all duration-300"
          >
            <Image
              src={resolveMediaUrl(photoUrl, 'full')}
              alt={`${product.title} — Foto ${idx + 1}`}
              fill
              onDragStart={(e) => e.preventDefault()}
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

            {/* Watermark Overlay na imagem */}
            <div className="absolute inset-0 z-10 pointer-events-none select-none flex items-center justify-center opacity-30">
              <span className="font-mono text-[9px] text-white/50 uppercase tracking-widest rotate-[-20deg]">
                NUA BORGES 4K
              </span>
            </div>

            <div className="absolute bottom-3.5 inset-x-4 z-10 flex items-center justify-between text-[10px] font-mono text-zinc-300">
              <span>0{idx + 1} &thinsp;/&thinsp; 0{photosList.length}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSingleFile(
                      resolveMediaUrl(photoUrl, 'full'),
                      `foto_${String(idx + 1).padStart(2, '0')}.jpg`
                    );
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/70 hover:bg-[#661C30] hover:text-white text-zinc-200 cursor-pointer border border-white/10"
                  title="Baixar Foto 4K"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <span className="text-[#90364B] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-sans font-semibold uppercase">
                  Ampliar 4K ↗
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal de Fotos */}
      <AnimatePresence>
        {lightboxPhotoIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none">
            <div className="absolute top-5 left-5 z-50 flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  downloadSingleFile(
                    resolveMediaUrl(photosList[lightboxPhotoIndex], 'full'),
                    `foto_${String(lightboxPhotoIndex + 1).padStart(2, '0')}.jpg`
                  )
                }
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_20px_rgba(67,19,34,0.45)] border border-white/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Foto (4K)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLightboxPhotoIndex(null)}
              className="absolute top-5 right-5 z-50 text-zinc-400 hover:text-white bg-black/60 p-3 rounded-full border border-white/10 cursor-pointer"
              aria-label="Fechar galeria"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setLightboxPhotoIndex((prev) =>
                  prev !== null ? (prev - 1 + photosList.length) % photosList.length : 0
                )
              }
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white bg-black/60 hover:bg-black/80 p-3 rounded-full border border-white/10 cursor-pointer"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() =>
                setLightboxPhotoIndex((prev) =>
                  prev !== null ? (prev + 1) % photosList.length : 0
                )
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white bg-black/60 hover:bg-black/80 p-3 rounded-full border border-white/10 cursor-pointer"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div
              className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center overflow-hidden"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              <Image
                src={resolveMediaUrl(photosList[lightboxPhotoIndex], 'full')}
                alt={`Foto ${lightboxPhotoIndex + 1}`}
                fill
                className="object-contain"
                onDragStart={(e) => e.preventDefault()}
              />

              {/* Watermark na visão ampliada */}
              <div className="absolute inset-0 z-20 pointer-events-none select-none flex items-center justify-center opacity-30">
                <span className="font-mono text-xs sm:text-sm text-white/50 uppercase tracking-[0.15em] rotate-[-15deg] bg-black/40 px-6 py-3 rounded-xl backdrop-blur-sm border border-white/10 text-center">
                  {watermarkText}
                </span>
              </div>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono text-zinc-400 bg-black/70 px-4 py-1.5 rounded-full border border-white/10">
              Foto {lightboxPhotoIndex + 1} de {photosList.length} — {product.title}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
