/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface HomeManifestoProps {
  customAboutData?: SiteContent['about'];
}

export function HomeManifesto({ customAboutData }: HomeManifestoProps) {
  const quote = customAboutData?.headline || customAboutData?.pullQuote || 'A coragem de despir a vergonha.';
  const bio =
    customAboutData?.paragraph1 ||
    'Uma exploração artística sobre liberdade, toque e sensualidade autêntica. Cada registro é uma convite para encarar o desejo sem máscaras.';
  const imageUrl =
    customAboutData?.photoUrl ||
    'https://shscwlmavashmtvhzfdf.supabase.co/storage/v1/object/public/nuaborges-media/photos/nua-manifesto.jpg';

  return (
    <section id="sobre" className="py-12 sm:py-16 lg:py-20 bg-black relative overflow-x-clip select-none border-t border-white/[0.05]">
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 items-center">
          {/* Lado Esquerdo: Foto Vertical Autoral */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[3/4] rounded-[28px] overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.9)] bg-zinc-950">
              <Image
                src={resolveMediaUrl(imageUrl, 'mobile')}
                alt="Nua Borges"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              <div className="absolute bottom-5 left-5 right-5 text-center">
                <span className="font-serif italic text-sm text-[#90364B] tracking-wider block">
                  Deixa de vergonha ♡
                </span>
              </div>
            </div>
          </motion.div>

          {/* Lado Direito: Frase de Impacto & Texto de Conexão */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 flex flex-col justify-center"
          >
            <span className="text-[#90364B] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3">
              MANIFESTO AUTORAL
            </span>

            <h3 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] text-white tracking-tight leading-[1.15]">
              "{quote}"
            </h3>

            <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed mt-5 max-w-xl">
              {bio}
            </p>

            <div className="mt-8">
              <Link
                href="/sobre"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/[0.05] hover:bg-[#661C30]/20 border border-white/12 hover:border-[#7A293D]/50 text-xs font-semibold tracking-widest uppercase text-[#F5EEE9] transition-all duration-200 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
              >
                <span>Conheça a Nua</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#90364B]" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
