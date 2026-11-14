'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
  Lock,
  ChevronLeft,
  ChevronRight,
  Camera,
  Film,
  PlayCircle,
} from 'lucide-react';
import { AvulsoProductItem, AvulsoVideoItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface AvulsoMediaGalleryProps {
  product: AvulsoProductItem;
  activeImage: string;
  activePreviewIndex: number;
  setActivePreviewIndex: React.Dispatch<React.SetStateAction<number>>;
  allPreviewImages: string[];
  effectiveVideos: AvulsoVideoItem[];
  effectivePhotos: string[];
}

export function AvulsoMediaGallery({
  product,
  activeImage,
  activePreviewIndex,
  setActivePreviewIndex,
  allPreviewImages,
  effectiveVideos,
  effectivePhotos,
}: AvulsoMediaGalleryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="lg:col-span-7 space-y-5"
    >
      {/* Moldura de Prévia Sensorial de Alta Fidelidade com Proteção Comercial */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] rounded-[28px] sm:rounded-[32px] overflow-hidden bg-zinc-950 border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.95)] group">
        {/* Imagem de Prévia com Resolução Otimizada e Tratamento Editorial */}
        <Image
          src={resolveMediaUrl(activeImage, 'full')}
          alt={product.title}
          fill
          priority
          className="object-cover object-center filter brightness-[0.92] contrast-[1.04] transition-all duration-500 select-none pointer-events-none"
        />

        {/* Vinheta protetora e gradiente de profundidade suave */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none" />

        {/* Marca d'água editorial sofisticada centralizada */}
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center pointer-events-none opacity-40 mix-blend-overlay">
          <span className="font-serif text-2xl sm:text-4xl text-white tracking-[0.3em] uppercase select-none font-semibold">
            NUA BORGES ♡ PRÉVIA
          </span>
        </div>

        {/* Badges e Controles Flutuantes Superiores */}
        <div className="absolute top-4 inset-x-4 sm:top-5 sm:inset-x-5 flex items-center justify-between gap-2 z-10 pointer-events-auto">
          <div className="flex items-center gap-2">
            {product.badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#f4a7b9]/30 text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase">
                <span>{product.badge}</span>
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-mono tracking-wider">
              AMOSTRA {activePreviewIndex + 1} DE {allPreviewImages.length}
            </span>
          </div>

          {product.duration && (
            <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-zinc-300 text-[11px] font-mono tracking-wider">
              {product.duration}
            </span>
          )}
        </div>

        {/* Botões de Navegação Anterior/Próxima Amostra */}
        {allPreviewImages.length > 1 && (
          <div className="absolute inset-y-0 inset-x-2 sm:inset-x-4 flex items-center justify-between pointer-events-none z-20">
            <button
              type="button"
              onClick={() =>
                setActivePreviewIndex((prev) => (prev > 0 ? prev - 1 : allPreviewImages.length - 1))
              }
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all pointer-events-auto cursor-pointer shadow-lg hover:scale-105 active:scale-95"
              aria-label="Foto anterior da prévia"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setActivePreviewIndex((prev) => (prev < allPreviewImages.length - 1 ? prev + 1 : 0))
              }
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all pointer-events-auto cursor-pointer shadow-lg hover:scale-105 active:scale-95"
              aria-label="Próxima foto da prévia"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Rodapé da Moldura: Aviso de Proteção e Qualidade Original */}
        <div className="absolute bottom-4 inset-x-4 sm:bottom-5 sm:inset-x-5 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-black/75 border border-[#f4a7b9]/40 flex items-center justify-center text-[#f4a7b9]">
              <Lock className="w-3 h-3 stroke-[2.5]" />
            </div>
            <span className="text-[11px] text-zinc-300 font-light drop-shadow">
              Arquivos originais 4K liberados sem marcas d'água pós-compra
            </span>
          </div>
          <span className="text-[9px] font-mono text-[#f4a7b9]/90 tracking-widest uppercase hidden sm:inline-block">
            PRODUTO ORIGINAL PROTEGIDO
          </span>
        </div>
      </div>

      {/* Miniaturas Navegáveis da Galeria de Prévias */}
      {allPreviewImages.length > 1 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>Galeria de Demonstração ({allPreviewImages.length} Prévias)</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-sans">
              Clique para inspecionar
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {allPreviewImages.map((img, idx) => (
              <button
                key={`thumb-preview-${idx}`}
                type="button"
                onClick={() => setActivePreviewIndex(idx)}
                className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-900 border transition-all cursor-pointer ${
                  activePreviewIndex === idx
                    ? 'border-[#f4a7b9] ring-2 ring-[#f4a7b9]/40 scale-[1.02]'
                    : 'border-white/[0.08] hover:border-white/20 opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  src={resolveMediaUrl(img, 'thumb')}
                  alt={`Amostra ${idx + 1}`}
                  fill
                  className="object-cover"
                />
                {activePreviewIndex === idx && (
                  <div className="absolute inset-0 bg-[#f4a7b9]/10 pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO DEDICADA 1: VÍDEOS DA PRODUÇÃO */}
      {effectiveVideos.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center gap-2 text-xs text-[#f4a7b9] font-mono uppercase tracking-wider">
            <Film className="w-3.5 h-3.5" />
            <span>
              Produção Audiovisual ({effectiveVideos.length}{' '}
              {effectiveVideos.length === 1 ? 'Vídeo UHD' : 'Vídeos UHD'})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {effectiveVideos.map((vid, idx) => (
              <div
                key={vid.id || `video-${idx}`}
                className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-zinc-900 border border-[#f4a7b9]/30 group"
              >
                {vid.posterUrl ? (
                  <Image
                    src={resolveMediaUrl(vid.posterUrl, 'thumb')}
                    alt={vid.title}
                    fill
                    className="object-cover opacity-85"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                    <Film className="w-6 h-6 text-[#f4a7b9]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center p-2 text-center">
                  <PlayCircle className="w-6 h-6 text-[#f4a7b9] mb-1" />
                  <span className="text-[10px] font-medium text-white line-clamp-1">
                    {vid.title}
                  </span>
                  <span className="text-[9px] font-mono text-[#f4a7b9]/90 mt-0.5">
                    {vid.duration || 'Vídeo 4K'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO DEDICADA 2: FOTOS DO ENSAIO FOTOGRÁFICO */}
      {effectivePhotos.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono uppercase tracking-wider">
            <Camera className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              Ensaio Fotográfico ({effectivePhotos.length}{' '}
              {effectivePhotos.length === 1 ? 'Foto 4K' : 'Fotos 4K'})
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {effectivePhotos.map((img, idx) => (
              <div
                key={`photo-${idx}`}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.08]"
              >
                <Image
                  src={resolveMediaUrl(img, 'thumb')}
                  alt={`Foto ${idx + 1}`}
                  fill
                  className="object-cover filter blur-[20px] scale-110 opacity-70"
                />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
