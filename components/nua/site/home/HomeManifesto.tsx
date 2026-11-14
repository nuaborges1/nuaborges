'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

const EASE = [0.32, 0.72, 0, 1] as const;

interface HomeManifestoProps {
  about: SiteContent['about'];
  instagramUrl?: string;
}

/** Manifesto curto: foto + frase. Cria conexão antes de qualquer pedido de compra. */
export function HomeManifesto({ about, instagramUrl }: HomeManifestoProps) {
  return (
    <section id="manifesto" className="relative bg-[#050506] py-24 sm:py-32 border-t border-white/[0.05] select-none">
      <div className="max-w-[76rem] mx-auto px-4 sm:px-8 lg:px-12 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1, ease: EASE }}
          className="md:col-span-5"
        >
          <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-1.5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(2rem-0.375rem)]">
              <Image
                src={resolveMediaUrl(about.photoUrl, 'mobile')}
                alt="Nua Borges"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1, delay: 0.1, ease: EASE }}
          className="md:col-span-7"
        >
          <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-400">
            {about.role}
          </span>
          <h2 className="mt-5 font-serif text-[2.4rem] sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.02]">
            {about.headline}
          </h2>
          <p className="mt-6 max-w-[52ch] font-serif italic text-lg sm:text-xl text-zinc-300/90 leading-relaxed">
            “{about.pullQuote}”
          </p>
          <p className="mt-5 max-w-[60ch] text-sm sm:text-[15px] font-light text-zinc-400 leading-relaxed">
            {about.paragraph1}
          </p>
          <p className="mt-6 font-serif text-xl text-[#f4a7b9]">{about.signature}</p>

          {instagramUrl && (
            <Link
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300 hover:text-white transition-colors"
            >
              Acompanhe o dia a dia no Instagram
              <ArrowRight className="w-3.5 h-3.5 text-[#f4a7b9] transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}
