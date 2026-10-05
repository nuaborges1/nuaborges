'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { GalleryItem, SITE_DATA } from '@/lib/data';
import { SiteContent } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface GallerySectionProps {
  onSelectPhoto: (photo: GalleryItem, index: number) => void;
  onOpenExclusive?: () => void;
  isLightboxOpen?: boolean;
  customGalleryData?: SiteContent['gallery'];
}

export function GallerySection({
  onSelectPhoto,
  isLightboxOpen,
  customGalleryData,
}: GallerySectionProps) {
  const items: GalleryItem[] = useMemo(() => {
    if (customGalleryData?.photos && customGalleryData.photos.length > 0) {
      return customGalleryData.photos
        .filter((p) => p.active !== false)
        .map((p, idx) => ({
          id: p.id || `gallery-${idx}`,
          title: p.title,
          session: '01',
          imageUrl: p.imageUrl,
          caption: p.caption,
          linkUrl: p.linkUrl,
          exclusive: false,
          orientation: 'vertical' as const,
        }));
    }
    return SITE_DATA.photos.gallery;
  }, [customGalleryData]);

  const total = items.length;
  const eyebrow = customGalleryData?.eyebrow || 'GALERIA DE ENSAIOS';
  const title = customGalleryData?.title || 'Acervo Autoral';
  const subtitle =
    customGalleryData?.subtitle ||
    'Produ\u00e7\u00f5es independentes sob luz natural, revelando a est\u00e9tica e a verdade do corpo.';

  // Garante ao menos ~10 cards por trilho para qualquer resolucao
  const trackItems = useMemo(() => {
    if (total === 0) return [];
    const minCards = 10;
    const repeatsNeeded = Math.ceil(minCards / total);
    const repeated: { item: GalleryItem; originalIndex: number }[] = [];
    for (let r = 0; r < repeatsNeeded; r++) {
      items.forEach((item, idx) => {
        repeated.push({ item, originalIndex: idx });
      });
    }
    return repeated;
  }, [items, total]);

  // ~7s por card, minimo 60s
  const animationDuration = useMemo(() => {
    return Math.max(60, total * 7);
  }, [total]);

  const [isHovered, setIsHovered] = useState(false);
  const playState = isLightboxOpen || isHovered ? 'paused' : 'running';

  const trackStyle: React.CSSProperties = {
    animationDuration: `${animationDuration}s`,
    animationPlayState: playState,
  };

  const renderCard = (
    entry: { item: GalleryItem; originalIndex: number },
    key: string
  ) => (
    <div
      key={key}
      role="button"
      tabIndex={0}
      aria-label={`Ver foto ${entry.originalIndex + 1} de ${total}: ${entry.item.title || 'Ensaio autoral'}`}
      onClick={() => onSelectPhoto(entry.item, entry.originalIndex)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectPhoto(entry.item, entry.originalIndex);
        }
      }}
      className="relative shrink-0 w-[270px] sm:w-[320px] md:w-[350px] lg:w-[370px] xl:w-[390px] aspect-[3/4.2] rounded-[22px] sm:rounded-[28px] overflow-hidden border border-white/[0.08] hover:border-white/25 focus-visible:border-[#f4a7b9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4a7b9]/40 bg-zinc-950 shadow-[0_8px_32px_rgba(0,0,0,0.75)] cursor-pointer transition-colors duration-300 select-none"
    >
      <Image
        src={resolveMediaUrl(entry.item.imageUrl, 'mobile')}
        alt={entry.item.title || `Foto ${entry.originalIndex + 1} — Nua Borges`}
        fill
        draggable={false}
        loading="lazy"
        sizes="(max-width: 640px) 280px, (max-width: 1024px) 350px, 390px"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
    </div>
  );

  return (
    <section
      id="galeria"
      className="relative w-full bg-black pt-14 sm:pt-20 pb-14 sm:pb-20 overflow-hidden select-none border-t border-white/[0.04]"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#f4a7b9]/[0.025] rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center sm:text-left"
          >
            <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-2 sm:mb-2.5">
              {eyebrow}
            </span>
            <h2 className="font-serif text-[2.2rem] sm:text-4xl lg:text-[2.85rem] text-white tracking-tight leading-[1.08]">
              {title}
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-2 max-w-xl leading-relaxed mx-auto sm:mx-0">
              {subtitle}
            </p>
          </motion.div>

          <div className="hidden sm:flex items-center gap-2.5 self-end pb-1 text-zinc-500 font-mono text-xs tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9]" />
            <span>{String(total).padStart(2, '0')} ENSAIOS AUTORAIS</span>
          </div>
        </div>
      </div>

      <div
        className="group/marquee relative w-full overflow-hidden py-2"
        data-marquee-container="true"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-14 sm:w-28 md:w-40 lg:w-52 bg-gradient-to-r from-black via-black/85 to-transparent z-20" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 sm:w-28 md:w-40 lg:w-52 bg-gradient-to-l from-black via-black/85 to-transparent z-20" />

        <div className="flex">
          <div
            className="flex shrink-0 gap-5 sm:gap-7 pr-5 sm:pr-7 animate-gallery-marquee group-hover/marquee:[animation-play-state:paused]"
            style={trackStyle}
          >
            {trackItems.map((entry, idx) =>
              renderCard(entry, `t1-${idx}-${entry.item.id}`)
            )}
          </div>

          <div
            aria-hidden="true"
            className="flex shrink-0 gap-5 sm:gap-7 pr-5 sm:pr-7 animate-gallery-marquee group-hover/marquee:[animation-play-state:paused]"
            style={trackStyle}
          >
            {trackItems.map((entry, idx) =>
              renderCard(entry, `t2-${idx}-${entry.item.id}`)
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
