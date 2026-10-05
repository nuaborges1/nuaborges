'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { SITE_DATA } from '@/lib/data';
import { SiteContent } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { buildAltText } from '@/lib/seo';

interface AboutSectionProps {
  customAboutPhoto?: string;
  customAboutData?: SiteContent['about'];
}

export function AboutSection({ customAboutPhoto, customAboutData }: AboutSectionProps) {
  const rawPhoto = customAboutData?.photoUrl || customAboutPhoto || SITE_DATA.photos.about;
  const photoSrc = resolveMediaUrl(rawPhoto, 'full');
  const eyebrow = customAboutData?.eyebrow || 'MANIFESTO & BIOGRAFIA';
  const headline = customAboutData?.headline || 'A coragem de despir a vergonha.';
  const role = customAboutData?.role || SITE_DATA.creator.role;
  const pullQuote = customAboutData?.pullQuote || SITE_DATA.creator.aboutPullQuote;
  const paragraph1 = customAboutData?.paragraph1 || SITE_DATA.creator.aboutParagraph1;
  const paragraph2 = customAboutData?.paragraph2 || SITE_DATA.creator.aboutParagraph2;
  const signature = customAboutData?.signature || SITE_DATA.creator.aboutSignature;

  const photoAlt = buildAltText('about');

  return (
    <section
      id="sobre-mim"
      aria-label="Sobre Nua Borges"
      className="py-14 sm:py-20 lg:py-28 bg-black relative select-none overflow-hidden border-t border-white/[0.04]"
    >
      {/* Ambient glow com micro-pulso */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-[#f4a7b9]/[0.04] rounded-full blur-[160px] pointer-events-none -translate-y-1/2 animate-glow-slow" />

      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 xl:gap-20 items-center">

          {/* Retrato — Estável e elegante */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative w-full h-[400px] sm:h-[480px] lg:h-[540px] rounded-[24px] sm:rounded-[32px] overflow-hidden bg-zinc-950 border border-white/[0.08] hover:border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.8)] transition-colors duration-300"
          >
            <Image
              src={photoSrc}
              alt={photoAlt}
              fill
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 42vw"
              referrerPolicy="no-referrer"
              className="object-cover object-[center_28%] brightness-[0.96] contrast-[1.04]"
            />
            {/* Vinheta inferior suave */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/25 hidden lg:block pointer-events-none" />
          </motion.div>

          {/* Conteúdo com entradas escalonadas e micro-animações */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3 sm:mb-4"
            >
              {eyebrow}
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif text-[2.2rem] sm:text-4xl lg:text-[3rem] text-white tracking-tight leading-[1.08] mb-2.5"
            >
              {headline}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="text-[#f4a7b9]/90 text-sm sm:text-[15px] font-medium tracking-wider uppercase mb-5"
            >
              {role}
            </motion.p>

            {/* Editorial pull-quote com entrada suave pela esquerda */}
            <motion.blockquote
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.85, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="border-l-2 border-[#f4a7b9] pl-5 sm:pl-6 py-1.5 my-5 text-zinc-200 font-serif italic text-lg sm:text-xl lg:text-[1.35rem] leading-snug"
            >
              “{pullQuote}”
            </motion.blockquote>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.8, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-4 text-zinc-300 font-light leading-relaxed max-w-xl text-[14px] sm:text-[15px]"
            >
              <p>{paragraph1}</p>
              <p className="text-zinc-400">{paragraph2}</p>
            </motion.div>

            {/* Assinatura com micro-interação no hover */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.85, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="pt-6 sm:pt-8"
            >
              <span className="font-script text-[2.8rem] sm:text-[3.2rem] text-transparent bg-clip-text bg-gradient-to-r from-[#f4a7b9] via-[#fce4ec] to-white tracking-wide inline-flex items-baseline gap-2 select-none drop-shadow-[0_2px_18px_rgba(244,167,185,0.2)]">
                <span>{signature}</span>
                <span className="text-[#f4a7b9] font-sans font-light not-italic text-lg sm:text-xl opacity-80 inline-block">
                  ♡
                </span>
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
