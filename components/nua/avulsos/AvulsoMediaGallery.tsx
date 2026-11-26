/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Lock, ChevronLeft, ChevronRight, Camera, Film } from 'lucide-react';
import { AvulsoProductItem, AvulsoVideoItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface AvulsoMediaGalleryProps {
  product: AvulsoProductItem;
  activeImage: string;
  activePreviewIndex: number;
  setActivePreviewIndex: React.Dispatch<React.SetStateAction<number>>;
  allPreviewImages: string[];
  effectiveVideos: AvulsoVideoItem[];
  effectivePhotos?: string[];
}

export function AvulsoMediaGallery({
  product,
  activeImage,
  activePreviewIndex,
  setActivePreviewIndex,
  allPreviewImages,
  effectiveVideos,
}: AvulsoMediaGalleryProps) {
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const isAvulso = product.modality === 'avulso';
  const isVideoAvulso =
    effectiveVideos.length > 0 ||
    product.technicalDetails?.format?.toLowerCase().includes('vídeo') ||
    product.duration?.toLowerCase().includes('minuto');

  // RENDERIZAÇÃO 1: CONTEÚDO AVULSO (BLINDAGEM ESTREITA COM PRÉVIA FORTEMENTE BORRADA E SEM MÍDIA ORIGINAL NO DOM)
  if (isAvulso) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-5 lg:col-span-7 lg:col-start-1 lg:row-start-1"
      >
        <div className="relative w-full aspect-[4/3] lg:aspect-[5/4] rounded-[28px] sm:rounded-[32px] overflow-hidden bg-zinc-950 border border-white/[0.12] shadow-[0_24px_70px_rgba(0,0,0,0.95)] group flex items-center justify-center">
          <Image
            src={resolveMediaUrl(activeImage, 'thumb')}
            alt="Mídia Privativa Protegida"
            fill
            priority
            className="object-cover object-center filter blur-[36px] scale-125 opacity-30 select-none pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60 pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center pointer-events-none opacity-20 mix-blend-overlay">
            <span className="font-serif text-3xl sm:text-5xl text-white tracking-[0.35em] uppercase select-none font-bold">
              NUA BORGES ♡ PROTEGIDO
            </span>
          </div>

          <div className="relative z-10 p-6 sm:p-8 max-w-md text-center space-y-3.5 select-none">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-black/80 border border-[#661C30]/60 flex items-center justify-center text-[#90364B] mx-auto shadow-[0_0_30px_rgba(102,28,48,0.35)]">
              <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-[#90364B] font-semibold block mb-1">
                {isVideoAvulso ? 'PRODUÇÃO AUDIOVISUAL PRIVADA' : 'PRODUÇÃO FOTOGRÁFICA PRIVADA'}
              </span>
              <h3 className="font-serif text-lg sm:text-xl text-white font-medium">
                {isVideoAvulso ? 'Vídeo Exclusivo Protegido' : 'Fotografia Exclusiva Protegida'}
              </h3>
            </div>
            <p className="text-zinc-400 text-xs sm:text-[13px] font-light leading-relaxed">
              Esta obra autoral não possui prévia aberta no navegador. O acesso completo é liberado no seu acervo privado após a confirmação do pagamento via Pix.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#09090c] border border-white/[0.08] flex items-center gap-3 text-xs">
          <div className="w-9 h-9 rounded-xl bg-[#431322]/40 border border-[#661C30]/40 flex items-center justify-center text-[#F5EEE9] shrink-0">
            {isVideoAvulso ? <Film className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          </div>
          <div>
            <span className="text-white font-medium block">
              {isVideoAvulso ? 'Produção audiovisual exclusiva' : 'Fotografia digital exclusiva'}
            </span>
            <span className="text-zinc-500 text-[11px]">
              Entrega privada pós-pagamento no Cofre do seu acervo.
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  const hasMultiplePreviews = allPreviewImages.length > 1;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasMultiplePreviews || e.touches.length !== 1) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || !hasMultiplePreviews || e.changedTouches.length !== 1) return;
    const diffX = start.x - e.changedTouches[0].clientX;
    const diffY = start.y - e.changedTouches[0].clientY;
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
      setActivePreviewIndex((prev) =>
        diffX > 0
          ? prev < allPreviewImages.length - 1 ? prev + 1 : 0
          : prev > 0 ? prev - 1 : allPreviewImages.length - 1
      );
    }
  };

  // RENDERIZAÇÃO 2: PACKS / COLEÇÕES — GALERIA PRINCIPAL COMO ÚNICO AMBIENTE DE PRÉ-VISUALIZAÇÃO
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="lg:col-span-7 lg:col-start-1 lg:row-start-1 flex flex-col"
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
        className="relative w-full aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto lg:flex-1 lg:min-h-[520px] rounded-[28px] sm:rounded-[32px] overflow-hidden bg-zinc-950 border border-white/[0.12] shadow-[0_24px_70px_rgba(0,0,0,0.95)] group"
      >
        {activeImage ? (
          <>
            <Image
              src={resolveMediaUrl(activeImage, 'mobile')}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover object-center filter brightness-[0.94] contrast-[1.03] transition-opacity duration-300 select-none pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 pointer-events-none" />
            <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10 pointer-events-none">
              <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white/80 text-[10px] font-mono tracking-[0.2em] uppercase select-none">
                NUA BORGES &bull; PRÉVIA
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#12090d] via-[#09090c] to-black p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#661C30]/40 bg-black/70 text-[#F5EEE9]/80">
              <Lock className="h-5 w-5" />
            </div>
            <p className="font-serif text-lg text-[#F5EEE9]">Prévia reservada para esta coleção</p>
            <p className="mt-1 max-w-xs text-xs font-light text-zinc-400">
              As mídias originais permanecem protegidas e disponíveis no seu acervo privado após a aquisição.
            </p>
          </div>
        )}

        {/* Indicador de posição discreto somente quando houver múltiplas prévias */}
        {hasMultiplePreviews && (
          <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10 pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-zinc-200 text-[11px] font-mono tracking-wider">
              {activePreviewIndex + 1} / {allPreviewImages.length}
            </span>
          </div>
        )}

        {/* Controles de navegação apenas quando houver múltiplas prévias */}
        {hasMultiplePreviews && (
          <>
            <div className="absolute inset-y-0 inset-x-2 sm:inset-x-4 flex items-center justify-between pointer-events-none z-20">
              <button
                type="button"
                onClick={() =>
                  setActivePreviewIndex((prev) => (prev > 0 ? prev - 1 : allPreviewImages.length - 1))
                }
                className="w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 border border-white/15 hover:border-white/30 text-white flex items-center justify-center backdrop-blur-md transition-colors pointer-events-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
                aria-label="Prévia anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActivePreviewIndex((prev) => (prev < allPreviewImages.length - 1 ? prev + 1 : 0))
                }
                className="w-11 h-11 rounded-full bg-black/70 hover:bg-black/90 border border-white/15 hover:border-white/30 text-white flex items-center justify-center backdrop-blur-md transition-colors pointer-events-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
                aria-label="Próxima prévia"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute bottom-1.5 inset-x-0 flex items-center justify-center z-20 px-4">
              {allPreviewImages.map((_, idx) => {
                const isActive = idx === activePreviewIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePreviewIndex(idx)}
                    aria-label={`Ver prévia ${idx + 1}`}
                    aria-current={isActive ? 'true' : undefined}
                    className="grid min-h-11 min-w-10 place-items-center rounded-full cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        isActive ? 'w-5 bg-[#90364B]' : 'w-1.5 bg-white/35'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
