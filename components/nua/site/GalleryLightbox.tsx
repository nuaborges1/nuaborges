/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { GalleryItem } from '@/lib/data';
import { resolveMediaUrl } from '@/lib/media';
import { useScrollLock } from '@/hooks/useScrollLock';
import { sanitizeUrl } from '@/lib/security';

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
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setZoomed(false);
  }, [photo?.id]);

  useScrollLock(!!photo);

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md px-3 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:p-6 md:p-8 select-none touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={onClose}
        >
          {/* Top bar — Com respiro seguro para notch/Dynamic Island no celular */}
          <div className="absolute top-3 sm:top-6 left-4 sm:left-6 right-4 sm:right-6 pt-[env(safe-area-inset-top,0px)] z-50 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto px-3.5 py-2 rounded-full bg-zinc-900/90 border border-white/[0.08] text-zinc-300 text-xs font-mono tracking-wider shadow-lg">
              {String(currentIndex + 1).padStart(2, '0')}&thinsp;/&thinsp;{String(allPhotos.length).padStart(2, '0')}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="pointer-events-auto text-zinc-200 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 active:bg-zinc-700 w-11 h-11 rounded-full border border-white/[0.1] transition-all duration-200 cursor-pointer flex items-center justify-center touch-manipulation active:scale-95 shadow-lg"
              aria-label="Fechar visualizador (Esc)"
            >
              <X className="w-5 h-5" />
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
            <div
              onClick={() => {
                const now = Date.now();
                if (now - lastTapRef.current < 280) {
                  setZoomed((z) => !z);
                }
                lastTapRef.current = now;
              }}
              onDoubleClick={() => setZoomed((z) => !z)}
              className="relative w-full h-[64dvh] sm:h-[72dvh] max-h-[680px] rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.95)] bg-zinc-950/95"
            >
              <Image
                src={resolveMediaUrl(photo.imageUrl, 'full')}
                alt={`Nua Borges — ${photo.title}`}
                fill
                priority
                referrerPolicy="no-referrer"
                className={`object-contain object-center transition-transform duration-300 ${zoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'}`}
                sizes="(max-width: 640px) 95vw, 760px"
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
                href={sanitizeUrl(photo.linkUrl || 'https://onlyfans.com/nuaborges', 'https://onlyfans.com/nuaborges')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-[11px] font-bold tracking-[0.14em] uppercase transition-all duration-200 shadow-[0_4px_20px_rgba(67,19,34,0.45)] hover:scale-[1.02] active:scale-[0.97] cursor-pointer touch-manipulation w-full sm:w-auto min-h-[44px] border border-white/10"
                aria-label="Ver ensaio completo"
              >
                <Lock className="w-3 h-3 fill-white/20 stroke-white" />
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

