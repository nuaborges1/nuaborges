'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { GalleryItem } from '@/lib/data';
import { resolveMediaUrl } from '@/lib/media';

interface GalleryLightboxProps {
  photo: GalleryItem | null;
  allPhotos: GalleryItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onOpenExclusive?: () => void;
}

export function GalleryLightbox({
  photo,
  allPhotos,
  currentIndex,
  onClose,
  onNavigate,
}: GalleryLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePrev = useCallback(() => {
    const prev = currentIndex === 0 ? allPhotos.length - 1 : currentIndex - 1;
    onNavigate(prev);
  }, [currentIndex, allPhotos.length, onNavigate]);

  const handleNext = useCallback(() => {
    const next = currentIndex === allPhotos.length - 1 ? 0 : currentIndex + 1;
    onNavigate(next);
  }, [currentIndex, allPhotos.length, onNavigate]);

  useEffect(() => {
    if (!photo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, onClose, handlePrev, handleNext]);

  // Body scroll lock
  useEffect(() => {
    if (photo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [photo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && touchStartY.current !== null) {
      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      const diffY = touchStartY.current - e.changedTouches[0].clientY;

      // Swipe down to close
      if (diffY < -65 && Math.abs(diffY) > Math.abs(diffX) * 1.4) {
        onClose();
      } else if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) handleNext();
        else handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {photo && (
        <motion.div
          key="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualizando: ${photo.title}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-3 sm:p-6 md:p-8 select-none touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={onClose}
        >
          {/* Top bar */}
          <div className="absolute top-3 sm:top-5 left-3 sm:left-6 right-3 sm:right-6 z-50 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-white/[0.08] text-zinc-400 text-[11px] font-mono tracking-wider shadow-lg">
              {String(currentIndex + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(allPhotos.length).padStart(2, '0')}
            </div>
            <button
              onClick={onClose}
              className="pointer-events-auto text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 active:bg-zinc-700 w-10 h-10 rounded-full border border-white/[0.08] transition-all duration-200 cursor-pointer flex items-center justify-center touch-manipulation hover:scale-105 active:scale-95 shadow-lg"
              aria-label="Fechar visualizador (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Prev button */}
          {allPhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-40 text-zinc-300 hover:text-white bg-black/60 hover:bg-zinc-900/90 active:bg-zinc-800 w-11 h-11 rounded-full border border-white/[0.1] transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 touch-manipulation shadow-xl"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next button */}
          {allPhotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-40 text-zinc-300 hover:text-white bg-black/60 hover:bg-zinc-900/90 active:bg-zinc-800 w-11 h-11 rounded-full border border-white/[0.1] transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 touch-manipulation shadow-xl"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Image container & Card */}
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-2xl w-full flex flex-col items-center my-auto pt-10 sm:pt-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] max-h-[62svh] sm:max-h-[70vh] rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.95)] bg-zinc-950">
              <Image
                src={resolveMediaUrl(photo.imageUrl, 'full')}
                alt={`Nua Borges — ${photo.title}`}
                fill
                priority
                referrerPolicy="no-referrer"
                className="object-contain sm:object-cover object-center"
                sizes="(max-width: 640px) 95vw, 680px"
              />
            </div>

            {/* Footer */}
            <div className="w-full mt-3.5 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
              <div className="text-center sm:text-left">
                <span className="text-white font-serif text-base sm:text-lg tracking-wide block">
                  {photo.title}
                </span>
                <span className="text-zinc-400 text-[12px] font-light mt-0.5 block">
                  {photo.caption || 'Ensaio Autoral — Nua Borges'}
                </span>
              </div>

              <a
                href={photo.linkUrl || 'https://onlyfans.com/nuaborges'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 text-[11px] font-bold tracking-[0.14em] uppercase transition-all duration-200 shadow-[0_4px_20px_rgba(244,167,185,0.25)] hover:scale-[1.02] active:scale-[0.97] cursor-pointer touch-manipulation w-full sm:w-auto min-h-[44px]"
                aria-label="Ver ensaio completo"
              >
                <Lock className="w-3 h-3 fill-zinc-950 stroke-zinc-950" />
                <span>Ver acervo completo</span>
                <span>→</span>
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

