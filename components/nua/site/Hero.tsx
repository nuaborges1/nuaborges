'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { HeartOutlineIcon } from './Icons';
import { SITE_DATA, HeroPhotoItem } from '@/lib/data';
import { SiteContent } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { sanitizeUrl } from '@/lib/security';

interface HeroProps {
  onOpenExclusive?: () => void;
  customHeroPhoto?: string;
  customHeroData?: SiteContent['hero'];
}

export function Hero({ customHeroPhoto, customHeroData }: HeroProps) {
  const photos: HeroPhotoItem[] = React.useMemo(() => {
    let list: Array<{ id?: string; title?: string; session?: string; imageUrl: string }> = [];
    if (customHeroData?.photos && customHeroData.photos.length > 0) {
      list = [...customHeroData.photos];
    } else {
      list = [...SITE_DATA.photos.heroPhotos];
    }

    if (customHeroPhoto && customHeroPhoto !== SITE_DATA.photos.hero) {
      list[0] = {
        id: 'hero-custom',
        title: 'Nua Borges',
        session: '01',
        imageUrl: customHeroPhoto,
      };
    }

    // Only if the list is completely empty, fallback to the single main photo
    if (list.length === 0) {
      list = [{ id: 'def-1', title: 'Nua Borges', session: '01', imageUrl: '/images/nua/hero/hero-1.jpg' }];
    }

    return list.map((item, idx) => ({
      id: item.id || `hero-${idx}`,
      title: item.title || 'Nua Borges',
      session: item.session || `0${idx + 1}`,
      imageUrl: item.imageUrl,
    }));
  }, [customHeroPhoto, customHeroData]);

  const eyebrow = customHeroData?.eyebrow || SITE_DATA.creator.eyebrow;
  const title = customHeroData?.title || 'Nua Borges';
  const tagline = customHeroData?.tagline || SITE_DATA.creator.tagline;
  const description = customHeroData?.description || SITE_DATA.creator.heroDescription;
  const ctaText = customHeroData?.ctaText || 'Acessar Acervo Exclusivo';
  const ctaUrl = customHeroData?.ctaUrl || 'https://onlyfans.com/nuaborges';
  const exploreText = customHeroData?.exploreText || 'EXPLORE O MUNDO DA NUA ♥️';
  const fullVerticalPhoto = customHeroData?.fullVerticalPhoto !== false;
  const cinematicCoverLayout = customHeroData?.cinematicCoverLayout !== false;
  const useLogo = customHeroData?.useLogo === true;
  const logoUrl = customHeroData?.logoUrl || null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);

  const SLIDE_DURATION = 4200;

  const pauseTemporarily = useCallback((ms = 2500) => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, ms);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Autoplay — advances automatically on both mobile and desktop
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      if (!isPaused) {
        nextSlide();
      }
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, photos.length]);

  // Hover handlers: ONLY pause if it is a real desktop mouse pointer
  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setIsPaused(false);
    }
  };

  // Touch handlers: DO NOT pause on vertical page scroll! ONLY pause on deliberate horizontal swipe!
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && touchStartY.current !== null) {
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
      touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null) {
      const isHorizontalSwipe =
        Math.abs(touchDeltaX.current) > 35 &&
        Math.abs(touchDeltaX.current) > Math.abs(touchDeltaY.current) * 1.2;
      if (isHorizontalSwipe) {
        pauseTemporarily(2800);
        if (touchDeltaX.current < -35) nextSlide();
        else if (touchDeltaX.current > 35) prevSlide();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
  };

  const safeIndex = currentIndex < photos.length ? currentIndex : 0;

  /* =========================================================================
   * MODE 1: CINEMATIC FULL-COVER LAYOUT (Print 3 Style — Center Stage)
   * ========================================================================= */
  if (cinematicCoverLayout) {
    return (
      <>
      <section
        id="inicio"
        className="relative w-full min-h-[100svh] flex flex-col justify-between items-center bg-black overflow-hidden pt-24 sm:pt-28 pb-6 sm:pb-8 select-none"
        style={{ touchAction: 'pan-y' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Full-bleed background photo with studio depth and cinematic vignette */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={`${photos[safeIndex].imageUrl}-${safeIndex}`}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full hero-initial-frame"
            >
              <Image
                src={resolveMediaUrl(photos[safeIndex].imageUrl, 'full')}
                alt="Nua Borges"
                fill
                priority
                referrerPolicy="no-referrer"
                className="object-cover object-[center_32%] sm:object-[center_28%] brightness-[0.58] contrast-[1.12]"
                sizes="100vw"
              />
            </motion.div>
          </AnimatePresence>

          {/* Dark cinematic vignette overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.25)_0%,_rgba(0,0,0,0.65)_60%,_black_95%)]" />
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black via-black/75 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/85 to-transparent" />

          {/* Center ambient backlight glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#f4a7b9]/[0.10] rounded-full blur-[180px]" />
        </div>

        {/* Top subtle spacer */}
        <div className="h-4 sm:h-6" />

        {/* Center Stage Content — Harmoniously positioned below the navbar */}
        <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center flex flex-col items-center justify-center relative z-20 my-auto py-2">
          {/* Eyebrow */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-[#f4a7b9] text-[10px] sm:text-xs font-semibold tracking-[0.28em] sm:tracking-[0.32em] uppercase mb-1.5 sm:mb-2 block drop-shadow-sm"
          >
            {eyebrow}
          </motion.span>

          {/* Title / Logo — Cinematic Mode 1 */}
          {useLogo && logoUrl ? (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[340px] xs:max-w-[400px] sm:max-w-[520px] md:max-w-[620px] lg:max-w-[720px] my-0 select-none"
            >
              <h1 className="sr-only">{title}</h1>
              <Image
                src={logoUrl}
                alt={title}
                width={720}
                height={240}
                priority
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain drop-shadow-[0_8px_48px_rgba(0,0,0,0.9)]"
                style={{ maxHeight: '240px' }}
              />
            </motion.div>
          ) : (
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif italic font-normal text-[2.75rem] xs:text-[3.2rem] sm:text-[4.6rem] md:text-[5.8rem] lg:text-[6.8rem] leading-[1.14] sm:leading-[1.16] select-none my-0 inline-flex items-center justify-center overflow-visible drop-shadow-[0_8px_40px_rgba(0,0,0,0.85)]"
            >
              <span className="whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-[#fce4ec] py-2.5 sm:py-4 px-2 sm:px-3 inline-block">
                {title}
              </span>
              <span className="inline-flex items-center ml-1 sm:ml-2 shrink-0 pr-3 sm:pr-4 translate-y-[-2px] sm:translate-y-[-4px]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f4a7b9"
                  strokeWidth="1.7"
                  className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 lg:w-9 lg:h-9 inline-block drop-shadow-[0_0_8px_rgba(244,167,185,0.5)]"
                  style={{ overflow: 'visible' }}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
              </span>
            </motion.h1>
          )}

          {/* Tagline — Editorial italic accent */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="text-zinc-100 text-base sm:text-xl md:text-2xl font-light tracking-wide mt-1.5 sm:mt-2.5 font-serif italic text-white/95 max-w-2xl drop-shadow-md"
          >
            “{tagline}”
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="text-zinc-300 text-[13px] sm:text-[15px] leading-relaxed mt-1.5 sm:mt-2.5 max-w-xl font-light drop-shadow-sm"
          >
            {description}
          </motion.p>

          {/* CTA com hover discreto e refinado */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 sm:mt-6"
          >
            <a
              href={sanitizeUrl(ctaUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-[14px] rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 font-bold text-[11px] tracking-[0.16em] uppercase transition-colors duration-200 shadow-[0_2px_16px_rgba(244,167,185,0.25)] w-full sm:w-auto min-h-[50px] cursor-pointer touch-manipulation"
              aria-label={`Acessar ${ctaText}`}
            >
              <Lock
                className="w-3.5 h-3.5 fill-zinc-950 stroke-zinc-950"
                strokeWidth={2.5}
              />
              <span>{ctaText}</span>
              <span>→</span>
            </a>
          </motion.div>
        </div>

        {/* Slide Indicator Dots */}
        {photos.length > 1 && (
          <div className="relative z-20 flex items-center justify-center gap-2 mt-2 sm:mt-3 mb-1">
            {photos.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  pauseTemporarily(3000);
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? 'w-7 bg-[#f4a7b9]'
                    : 'w-2 bg-white/25 hover:bg-white/50'
                }`}
                aria-label={`Ir para foto 0${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Bottom Explore Anchor com hover sutil */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-20 flex flex-col items-center justify-center mt-2 sm:mt-3"
        >
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-400 mb-1.5">
            {exploreText}
          </span>
          <a
            href="#galeria"
            onClick={(e) => {
              e.preventDefault();
              const el = document.querySelector('#galeria');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            aria-label="Explorar acervo de fotos"
            className="w-9 h-9 rounded-full border border-white/15 hover:border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </a>
        </motion.div>
      </section>
      {/* Gradient bridge: blends hero black seamlessly into the next section */}
      <div
        aria-hidden="true"
        className="relative z-10 w-full pointer-events-none"
        style={{
          marginTop: '-120px',
          height: '160px',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.88) 62%, #000 100%)',
        }}
      />
      </>
    );
  }

  /* =========================================================================
   * MODE 2: SPLIT EDITORIAL LAYOUT (Traditional 2-Column with Photo Stage)
   * ========================================================================= */
  return (
    <section
      id="inicio"
      className="relative w-full min-h-[100svh] flex items-center bg-black overflow-hidden pt-[72px] pb-10 sm:pb-14 lg:py-0 select-none"
    >
      {/* Atmospheric ambient glow */}
      <div className="absolute top-1/2 right-1/4 w-[640px] h-[640px] bg-[#f4a7b9]/[0.08] rounded-full blur-[180px] pointer-events-none -translate-y-1/2" />
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
              className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase mb-2 sm:mb-3 block"
            >
              {eyebrow}
            </motion.span>

            {/* Title / Logo — Split Mode 2 */}
            {useLogo && logoUrl ? (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-[340px] sm:max-w-[460px] lg:max-w-[540px] my-0 select-none"
              >
                <h1 className="sr-only">{title}</h1>
                <Image
                  src={logoUrl}
                  alt={title}
                  width={540}
                  height={180}
                  priority
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-contain drop-shadow-[0_8px_48px_rgba(0,0,0,0.9)]"
                  style={{ maxHeight: '200px' }}
                />
              </motion.div>
            ) : (
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="font-serif italic font-normal text-[2.75rem] xs:text-[3.2rem] sm:text-[4.2rem] md:text-[5rem] lg:text-[5.6rem] xl:text-[6.4rem] leading-[1.14] sm:leading-[1.16] select-none my-0 inline-flex items-center gap-1.5 sm:gap-2 flex-wrap overflow-visible drop-shadow-[0_8px_40px_rgba(0,0,0,0.85)]"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-[#fce4ec] py-2.5 sm:py-4 px-1 sm:px-2 inline-block">
                  {title}
                </span>
                <span className="inline-flex items-center shrink-0 pr-3 sm:pr-4 translate-y-[-2px] sm:translate-y-[-4px]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f4a7b9"
                    strokeWidth="1.7"
                    className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 inline-block drop-shadow-[0_0_8px_rgba(244,167,185,0.5)]"
                    style={{ overflow: 'visible' }}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                    />
                  </svg>
                </span>
              </motion.h1>
            )}

            {/* Tagline — Editorial italic accent */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="text-zinc-200 text-[1.05rem] sm:text-lg font-light tracking-wide mt-2 sm:mt-3 font-serif italic text-[#f4a7b9]/90"
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
              <a
                href={sanitizeUrl(ctaUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-[15px] rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 font-bold text-[11px] tracking-[0.16em] uppercase transition-all duration-300 shadow-[0_4px_28px_rgba(244,167,185,0.25)] hover:shadow-[0_8px_40px_rgba(244,167,185,0.45)] hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto min-h-[52px] cursor-pointer touch-manipulation"
                aria-label={`Acessar ${ctaText}`}
              >
                <Lock
                  className="w-3.5 h-3.5 fill-zinc-950 stroke-zinc-950 transition-transform duration-200 group-hover:scale-110"
                  strokeWidth={2.5}
                />
                <span>{ctaText}</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </a>
            </motion.div>
          </div>

          {/* Right — Organic Spotlight Stage */}
          <div
            className={`lg:col-span-7 order-1 lg:order-2 flex items-center justify-center lg:justify-end w-full ${fullVerticalPhoto ? 'relative lg:static' : 'relative lg:-mr-10 xl:-mr-16'
              }`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Ambient backlight halo behind Nua */}
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[380px] sm:w-[500px] lg:w-[680px] h-[380px] sm:h-[500px] lg:h-[680px] bg-[#f4a7b9]/[0.10] rounded-full blur-[150px] pointer-events-none" />

            {/* Spotlight Portrait — full-vertical or contained */}
            <div
              className={`relative overflow-hidden group/carousel touch-pan-y ${fullVerticalPhoto
                ? 'w-full h-[54svh] min-h-[380px] max-h-[500px] sm:h-[58vh] sm:max-h-[540px] md:h-[62vh] md:max-h-[600px] lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-[58vw] xl:w-[54vw] lg:h-full lg:min-h-[100svh] lg:max-h-none z-10'
                : 'w-full max-w-[560px] lg:max-w-none h-[52svh] min-h-[360px] max-h-[480px] sm:h-[58vh] sm:max-h-[540px] md:h-[62vh] md:max-h-[600px] lg:h-[84vh] lg:min-h-[620px] lg:max-h-[780px]'
                }`}
              style={{
                maskImage:
                  'radial-gradient(ellipse 74% 70% at 52% 48%, black 28%, rgba(0,0,0,0.92) 50%, rgba(0,0,0,0.3) 70%, transparent 88%)',
                WebkitMaskImage:
                  'radial-gradient(ellipse 74% 70% at 52% 48%, black 28%, rgba(0,0,0,0.92) 50%, rgba(0,0,0,0.3) 70%, transparent 88%)',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
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

              {/* Navigation arrows & counter - only when multiple photos */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white/90 hover:text-white bg-black/50 hover:bg-black/80 active:bg-black/95 backdrop-blur-md w-10 h-10 rounded-full border border-white/10 opacity-100 lg:opacity-0 lg:group-hover/carousel:opacity-100 transition-all duration-300 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 touch-manipulation"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextSlide(); }}
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
                    <span className="text-[10px] text-[#f4a7b9] font-medium tracking-widest uppercase hidden sm:inline">
                      Sessão Autoral
                    </span>
                    <div className="flex items-center gap-1.5 ml-1">
                      {photos.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer touch-manipulation ${idx === safeIndex
                            ? 'w-5 bg-[#f4a7b9]'
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
