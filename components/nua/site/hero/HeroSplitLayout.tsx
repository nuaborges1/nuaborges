/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { HeroPhotoItem } from '@/lib/data';
import { resolveMediaUrl } from '@/lib/media';
import { sanitizeUrl } from '@/lib/security';
import { HeroTitle } from './HeroTitle';

interface HeroSplitLayoutProps {
  photos: HeroPhotoItem[];
  safeIndex: number;
  eyebrow: string;
  title: string;
  useLogo: boolean;
  logoUrl?: string;
  tagline: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  fullVerticalPhoto: boolean;
  touchHandlers: any;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onDotClick: (idx: number) => void;
}

export function HeroSplitLayout({
  photos,
  safeIndex,
  eyebrow,
  title,
  useLogo,
  logoUrl,
  tagline,
  description,
  ctaText,
  ctaUrl,
  fullVerticalPhoto,
  touchHandlers,
  onPrevSlide,
  onNextSlide,
  onDotClick,
}: HeroSplitLayoutProps) {
  return (
    <section
      id="inicio"
      className="relative w-full min-h-[100svh] flex items-center bg-black overflow-hidden pt-[72px] pb-10 sm:pb-14 lg:py-0 select-none"
    >
      {/* Atmospheric ambient glow */}
      <div className="absolute top-1/2 right-1/4 w-[640px] h-[640px] bg-[#661C30]/[0.10] rounded-full blur-[180px] pointer-events-none -translate-y-1/2" />
      <div className="absolute top-1/3 right-1/3 w-[460px] h-[460px] bg-white/[0.035] rounded-full blur-[150px] pointer-events-none -translate-y-1/2" />

      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 w-full relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center min-h-[calc(100svh-72px)] lg:min-h-[85vh]">
          {/* Left — Editorial content */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left order-2 lg:order-1 pb-4 lg:pb-0 z-20">
            {/* Eyebrow */}
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="text-[#90364B] text-[11px] font-semibold tracking-[0.28em] uppercase mb-2 sm:mb-3 block"
            >
              {eyebrow}
            </motion.span>

            {/* Title / Logo */}
            <HeroTitle
              useLogo={useLogo}
              logoUrl={logoUrl}
              title={title}
              isCinematic={false}
            />

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="text-zinc-200 text-[1.05rem] sm:text-lg font-light tracking-wide mt-2 sm:mt-3 font-serif italic text-[#A65B6C]"
            >
              “{tagline}”
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="text-zinc-300 text-[14px] sm:text-[15px] leading-relaxed mt-3 sm:mt-4 max-w-[24rem] sm:max-w-md font-light"
            >
              {description}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 sm:mt-9"
            >
              {ctaUrl.startsWith('/') ? (
                <Link
                  href={ctaUrl}
                  className="group inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-[15px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-medium text-[11px] tracking-[0.16em] uppercase transition-all duration-300 shadow-[0_4px_24px_rgba(67,19,34,0.45)] hover:shadow-[0_8px_32px_rgba(102,28,48,0.55)] hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-white/20 w-full sm:w-auto min-h-[52px] cursor-pointer touch-manipulation"
                  aria-label={ctaText.toLowerCase().startsWith('acessar') ? ctaText : `Acessar ${ctaText}`}
                >
                  <Lock
                    className="w-3.5 h-3.5 fill-white/20 stroke-white transition-transform duration-200 group-hover:scale-110"
                    strokeWidth={2.2}
                  />
                  <span>{ctaText}</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>
              ) : (
                <a
                  href={sanitizeUrl(ctaUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-[15px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-medium text-[11px] tracking-[0.16em] uppercase transition-all duration-300 shadow-[0_4px_24px_rgba(67,19,34,0.45)] hover:shadow-[0_8px_32px_rgba(102,28,48,0.55)] hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-white/20 w-full sm:w-auto min-h-[52px] cursor-pointer touch-manipulation"
                  aria-label={ctaText.toLowerCase().startsWith('acessar') ? ctaText : `Acessar ${ctaText}`}
                >
                  <Lock
                    className="w-3.5 h-3.5 fill-white/20 stroke-white transition-transform duration-200 group-hover:scale-110"
                    strokeWidth={2.2}
                  />
                  <span>{ctaText}</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </a>
              )}
            </motion.div>
          </div>

          {/* Right — Organic Spotlight Stage */}
          <div
            className={`lg:col-span-7 order-1 lg:order-2 flex items-center justify-center lg:justify-end w-full ${
              fullVerticalPhoto ? 'relative lg:static' : 'relative lg:-mr-10 xl:-mr-16'
            }`}
            onMouseEnter={touchHandlers.onMouseEnter}
            onMouseLeave={touchHandlers.onMouseLeave}
          >
            {/* Ambient backlight halo */}
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[380px] sm:w-[500px] lg:w-[680px] h-[380px] sm:h-[500px] lg:h-[680px] bg-[#661C30]/[0.12] rounded-full blur-[150px] pointer-events-none" />

            <div
              className={`relative overflow-hidden group/carousel touch-pan-y ${
                fullVerticalPhoto
                  ? 'w-full h-[54svh] min-h-[380px] max-h-[500px] sm:h-[58vh] sm:max-h-[540px] md:h-[62vh] md:max-h-[600px] lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-[58vw] xl:w-[54vw] lg:h-full lg:min-h-[100svh] lg:max-h-none z-10'
                  : 'w-full max-w-[560px] lg:max-w-none h-[52svh] min-h-[360px] max-h-[480px] sm:h-[58vh] sm:max-h-[540px] md:h-[62vh] md:max-h-[600px] lg:h-[84vh] lg:min-h-[620px] lg:max-h-[780px]'
              }`}
              style={{
                maskImage:
                  'radial-gradient(ellipse 74% 70% at 52% 48%, black 28%, rgba(0,0,0,0.92) 50%, rgba(0,0,0,0.3) 70%, transparent 88%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 74% 70% at 52% 48%, black 28%, rgba(0,0,0,0.92) 50%, rgba(0,0,0,0.3) 70%, transparent 88%)',
              }}
              onTouchStart={touchHandlers.onTouchStart}
              onTouchMove={touchHandlers.onTouchMove}
              onTouchEnd={touchHandlers.onTouchEnd}
              onTouchCancel={touchHandlers.onTouchCancel}
            >
              {/* Slides */}
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={`${photos[safeIndex].imageUrl}-${safeIndex}`}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 w-full h-full hero-initial-frame"
                >
                  <Image
                    src={resolveMediaUrl(photos[safeIndex].imageUrl, 'full')}
                    alt="Nua Borges"
                    fill
                    priority
                    referrerPolicy="no-referrer"
                    className="object-cover object-[center_28%] sm:object-[center_30%] lg:object-[center_30%] brightness-[0.95] contrast-[1.10]"
                    sizes="(max-width: 1024px) 100vw, 58vw"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Seamless feathering gradients */}
              <div className="absolute inset-y-0 left-0 w-36 sm:w-52 lg:w-80 bg-gradient-to-r from-black via-black/90 via-black/40 to-transparent pointer-events-none z-10" />
              <div className="absolute inset-x-0 bottom-0 h-32 sm:h-44 bg-gradient-to-t from-black via-black/90 via-black/30 to-transparent pointer-events-none z-10" />
              <div className="absolute inset-x-0 top-0 h-24 sm:h-32 bg-gradient-to-b from-black via-black/70 to-transparent pointer-events-none z-10" />
              <div className="absolute inset-y-0 right-0 w-24 sm:w-36 bg-gradient-to-l from-black via-black/70 to-transparent pointer-events-none z-10" />

              {/* Navigation arrows & counter */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrevSlide();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white/90 hover:text-white bg-black/50 hover:bg-black/80 active:bg-black/95 backdrop-blur-md w-10 h-10 rounded-full border border-white/10 opacity-100 lg:opacity-0 lg:group-hover/carousel:opacity-100 transition-all duration-300 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 touch-manipulation"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNextSlide();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white/90 hover:text-white bg-black/50 hover:bg-black/80 active:bg-black/95 backdrop-blur-md w-10 h-10 rounded-full border border-white/10 opacity-100 lg:opacity-0 lg:group-hover/carousel:opacity-100 transition-all duration-300 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 touch-manipulation"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Minimal editorial counter */}
                  <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 lg:bottom-10 lg:right-12 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/[0.08]">
                    <span className="text-[10px] text-zinc-300 font-mono tracking-widest uppercase">
                      0{safeIndex + 1}&thinsp;/&thinsp;0{photos.length}
                    </span>
                    <span className="text-zinc-600 text-[10px]">•</span>
                    <span className="text-[10px] text-[#90364B] font-medium tracking-widest uppercase hidden sm:inline">
                      Sessão Autoral
                    </span>
                    <div className="flex items-center gap-1.5 ml-1">
                      {photos.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDotClick(idx);
                          }}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer touch-manipulation ${
                            idx === safeIndex
                              ? 'w-5 bg-[#661C30]'
                              : 'w-1.5 bg-white/30 hover:bg-white/55'
                          }`}
                          aria-label={`Foto ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
