/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ChevronDown } from 'lucide-react';
import { HeroPhotoItem } from '@/lib/data';
import { resolveMediaUrl } from '@/lib/media';
import { sanitizeUrl } from '@/lib/security';
import { EditorialRichText } from '@/lib/editorialRichText';
import { HeroTitle } from './HeroTitle';

interface HeroCinematicLayoutProps {
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
  exploreText: string;
  touchHandlers: any;
  onDotClick: (idx: number) => void;
}

export function HeroCinematicLayout({
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
  exploreText,
  touchHandlers,
  onDotClick,
}: HeroCinematicLayoutProps) {
  return (
    <>
      <section
        id="inicio"
        className="relative w-full min-h-[100svh] flex flex-col justify-between items-center bg-black overflow-hidden pt-24 sm:pt-28 pb-6 sm:pb-8 select-none"
        style={{ touchAction: 'pan-y' }}
        {...touchHandlers}
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
              <picture>
                <source media="(max-width: 639px)" srcSet={resolveMediaUrl(photos[safeIndex].imageUrl, 'mobile')} />
                <Image
                  src={resolveMediaUrl(photos[safeIndex].imageUrl, 'full')}
                  alt="Nua Borges"
                  fill
                  loading={safeIndex === 0 ? "eager" : "lazy"} fetchPriority={safeIndex === 0 ? "high" : "auto"}
                  referrerPolicy="no-referrer"
                  className="object-cover object-[center_32%] sm:object-[center_28%] brightness-[0.58] contrast-[1.12]"
                  sizes="100vw"
                />
              </picture>
            </motion.div>
          </AnimatePresence>

          {/* Dark cinematic vignette overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/80" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.25)_0%,_rgba(0,0,0,0.65)_60%,_black_95%)]" />
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black via-black/75 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/85 to-transparent" />

          {/* Center ambient backlight glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(600px,100vw)] h-[min(600px,100vw)] bg-[#661C30]/[0.12] rounded-full blur-[180px]" />
        </div>

        {/* Top subtle spacer */}
        <div className="h-4 sm:h-6" />

        {/* Center Stage Content */}
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 text-center flex flex-col items-center justify-center relative z-20 my-auto py-2">
          {/* Eyebrow */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-[#90364B] text-[10px] sm:text-xs font-semibold tracking-[0.28em] sm:tracking-[0.32em] uppercase mb-1.5 sm:mb-2 block drop-shadow-sm"
          >
            {eyebrow}
          </motion.span>

          {/* Title / Logo */}
          <HeroTitle
            useLogo={useLogo}
            logoUrl={logoUrl}
            title={title}
            isCinematic
          />

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="text-zinc-100 text-base sm:text-xl md:text-2xl font-light tracking-wide mt-1.5 sm:mt-2.5 font-serif italic text-white/95 max-w-2xl drop-shadow-md"
          >
            “<EditorialRichText text={tagline} inline />”
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="text-zinc-300 text-[13px] sm:text-[15px] leading-relaxed mt-1.5 sm:mt-2.5 max-w-xl font-light drop-shadow-sm"
          >
            <EditorialRichText text={description} inline />
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 sm:mt-6"
          >
            {ctaUrl.startsWith('/') ? (
              <Link
                href={ctaUrl}
                className="inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-[14px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#4d1727] hover:via-[#7A293D] hover:to-[#90364B] active:from-[#350f1b] active:via-[#431322] active:to-[#661C30] text-[#F5EEE9] text-[11px] font-semibold tracking-[0.16em] uppercase transition-all duration-300 shadow-[0_4px_24px_rgba(67,19,34,0.35)] hover:shadow-[0_6px_32px_rgba(102,28,48,0.45)] w-full sm:w-auto min-h-[50px] cursor-pointer touch-manipulation border border-white/10 hover:border-white/20 active:scale-[0.985]"
                aria-label={ctaText.toLowerCase().startsWith('acessar') ? ctaText : `Acessar ${ctaText}`}
              >
                <Lock
                  className="w-3.5 h-3.5 fill-white/20 stroke-white"
                  strokeWidth={2.5}
                />
                <span>{ctaText}</span>
                <span className="font-sans">→</span>
              </Link>
            ) : (
              <a
                href={sanitizeUrl(ctaUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-[14px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#4d1727] hover:via-[#7A293D] hover:to-[#90364B] active:from-[#350f1b] active:via-[#431322] active:to-[#661C30] text-[#F5EEE9] text-[11px] font-semibold tracking-[0.16em] uppercase transition-all duration-300 shadow-[0_4px_24px_rgba(67,19,34,0.35)] hover:shadow-[0_6px_32px_rgba(102,28,48,0.45)] w-full sm:w-auto min-h-[50px] cursor-pointer touch-manipulation border border-white/10 hover:border-white/20 active:scale-[0.985]"
                aria-label={ctaText.toLowerCase().startsWith('acessar') ? ctaText : `Acessar ${ctaText}`}
              >
                <Lock
                  className="w-3.5 h-3.5 fill-white/20 stroke-white"
                  strokeWidth={2.5}
                />
                <span>{ctaText}</span>
                <span className="font-sans">→</span>
              </a>
            )}
          </motion.div>
        </div>

        {/* Slide Indicator Dots */}
        {photos.length > 1 && (
          <div className="relative z-20 flex max-w-full flex-wrap items-center justify-center mt-2 sm:mt-3 mb-1">
            {photos.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onDotClick(idx)}
                className="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-full focus-visible:outline focus-visible:outline-2"
                aria-label={`Ir para foto ${idx + 1}`}
                aria-pressed={idx === safeIndex}
              >
                <span aria-hidden="true" className={idx === safeIndex ? "h-1.5 w-7 rounded-full bg-[#90364B]" : "h-1.5 w-2 rounded-full bg-white/40"} />
              </button>
            ))}
          </div>
        )}

        {/* Bottom Explore Anchor */}
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
            href="#lançamentos"
            onClick={(e) => {
              e.preventDefault();
              const el =
                document.querySelector('#lançamentos') ||
                document.querySelector('#sobre') ||
                document.querySelector('#bastidores') ||
                document.querySelector('#caminhos');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            aria-label="Explorar acervo de fotos"
            className="w-9 h-9 rounded-full border border-white/15 hover:border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </a>
        </motion.div>
      </section>

      {/* Gradient bridge */}
      <div
        aria-hidden="true"
        className="relative z-10 w-full pointer-events-none"
        style={{
          marginTop: '-120px',
          height: '160px',
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.88) 62%, #000 100%)',
        }}
      />
    </>
  );
}
