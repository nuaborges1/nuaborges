/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { EditorialRichText } from '@/lib/editorialRichText';

interface HomeManifestoProps {
  customAboutData?: SiteContent['about'];
}

export function HomeManifesto({ customAboutData }: HomeManifestoProps) {
  const quote = customAboutData?.headline || customAboutData?.pullQuote || 'A coragem de despir a vergonha.';
  const bio =
    customAboutData?.paragraph1 ||
    'Uma exploração artística sobre liberdade, toque e sensualidade autêntica. Cada registro é um convite para encarar o desejo sem máscaras.';
  const imageUrl =
    customAboutData?.photoUrl ||
    'https://shscwlmavashmtvhzfdf.supabase.co/storage/v1/object/public/nuaborges-media/photos/nua-manifesto.jpg';
  const tags = Array.isArray(customAboutData?.tags) ? customAboutData.tags.filter(Boolean).slice(0, 5) : [];
  const photoStyle = customAboutData?.photoStyle || 'portrait';

  return (
    <section id="sobre" className="py-12 sm:py-16 lg:py-20 bg-black relative overflow-x-clip border-t border-white/[0.05]">
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-14 items-center">
          {/* Lado Esquerdo: Foto Autoral */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 relative"
          >
            <div
              className={`relative overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.9)] bg-zinc-950 ${
                photoStyle === 'square'
                  ? 'aspect-square rounded-[28px]'
                  : photoStyle === 'classic'
                  ? 'aspect-[3/4] rounded-xl'
                  : 'aspect-[3/4] rounded-[28px]'
              }`}
            >
              <Image
                src={resolveMediaUrl(imageUrl, 'mobile')}
                alt="Nua Borges"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover object-center"
              />
              {customAboutData?.showSignatureOnPhoto !== false && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  <div className="absolute bottom-5 left-5 right-5 text-center">
                    <span className="font-script text-xl sm:text-2xl text-[#F5EEE9] tracking-wide block">
                      {customAboutData?.signature || 'Deixa de vergonha ♡'}
                    </span>
                  </div>
                </>
              )}
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
            <span className="text-[#F5EEE9]/80 text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3">
              {customAboutData?.eyebrow || 'MANIFESTO AUTORAL'}
            </span>

            <h3 className="font-serif text-3xl sm:text-4xl lg:text-[2.6rem] text-white tracking-tight leading-[1.15]">
              &ldquo;<EditorialRichText text={quote} inline />&rdquo;
            </h3>

            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-4">
                {tags.map((tag, idx) => (
                  <span
                    key={`${tag}-${idx}`}
                    className="px-3 py-0.5 rounded-full bg-[#661C30]/20 border border-[#90364B]/35 text-[11px] text-[#F5EEE9]/90"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <EditorialRichText
              text={bio}
              className="text-zinc-300 text-sm sm:text-base font-light leading-relaxed mt-5 max-w-xl"
            />

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
