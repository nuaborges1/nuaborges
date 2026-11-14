'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Film, ArrowRight, Flame, Lock } from 'lucide-react';
import { SiteContent, AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface HomeLançamentosProps {
  customAvulsosData?: SiteContent['avulsos'];
}

export function HomeLançamentos({ customAvulsosData }: HomeLançamentosProps) {
  if (customAvulsosData?.active === false) {
    return null;
  }

  const items: AvulsoProductItem[] = (customAvulsosData?.items || []).filter(
    (item) => item.active !== false
  );

  // Se não houver nenhum item publicado pelo admin, oculta a seção completamente (ZERO dados mockados)
  if (items.length === 0) {
    return null;
  }

  const featuredItem = items[0];
  const secondaryItems = items.slice(1, 4);

  return (
    <section id="lançamentos" className="py-16 sm:py-24 bg-[#030304] relative select-none border-t border-white/[0.05]">
      {/* Luz difusa ambiente */}
      <div className="absolute top-1/3 left-1/2 w-[30rem] h-[30rem] bg-[#f4a7b9]/[0.025] rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />

      <div className="max-w-[76rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 relative z-10">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-3 inline-flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>{customAvulsosData?.eyebrow || 'OBRAS & LANÇAMENTOS RECENTES'}</span>
            </span>
            <h2 className="font-serif text-[2.2rem] sm:text-4xl lg:text-[2.8rem] text-white tracking-tight leading-[1.08]">
              {customAvulsosData?.title || 'Acervo sob demanda'}
            </h2>
            <p className="text-zinc-400 text-sm sm:text-[15px] font-light mt-2.5 leading-relaxed">
              {customAvulsosData?.subtitle || 'Produções autorais e obras exclusivas liberadas individualmente com acesso vitalício no seu cofre.'}
            </p>
          </motion.div>

          <Link
            href="/avulsos"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#f4a7b9] hover:text-[#ffb8c9] transition cursor-pointer self-start md:self-auto"
          >
            <span>Explorar todo o catálogo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Bento Grid: 1 Destaque Principal + 2/3 Secundários */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7">
          {/* CARD DESTAQUE PRINCIPAL (Bento Left - 7 Cols) */}
          {featuredItem && (
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 group relative rounded-[32px] p-2 sm:p-2.5 bg-[#090a0f] border border-white/[0.08] hover:border-[#f4a7b9]/40 transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
            >
              <Link href={`/avulsos/${featuredItem.slug || featuredItem.id}`} className="block h-full cursor-pointer">
                <div className="rounded-[26px] bg-[#050507] overflow-hidden flex flex-col justify-between h-full border border-white/[0.03] relative">
                  {/* Imagem de Capa Destaque */}
                  <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-zinc-950">
                    <Image
                      src={resolveMediaUrl(featuredItem.imageUrl, 'full')}
                      alt={featuredItem.title}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-cover object-center group-hover:scale-[1.04] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-black/50 pointer-events-none" />

                    {/* Badges Flutuantes */}
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#f4a7b9]/40 text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase">
                        <Flame className="w-3 h-3 text-[#f4a7b9]" />
                        <span>{featuredItem.badge || 'Destaque Principal'}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-zinc-300 text-[10px] font-mono">
                        <Film className="w-2.5 h-2.5 text-[#f4a7b9]" />
                        <span>Produção 4K</span>
                      </span>
                    </div>

                    {/* Tag de Entrada */}
                    <div className="absolute bottom-3 left-4 pointer-events-none">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-light">
                        <Lock className="w-3 h-3 text-[#f4a7b9]" />
                        <span>Conteúdo Privado</span>
                      </span>
                    </div>
                  </div>

                  {/* Sinopse e Botão de Acesso */}
                  <div className="p-6 sm:p-7 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-serif text-2xl sm:text-3xl text-white group-hover:text-[#f4a7b9] transition-colors leading-snug">
                        {featuredItem.title}
                      </h3>
                      <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed mt-2.5 line-clamp-2">
                        {featuredItem.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-zinc-400 text-xs font-light">
                        {(() => {
                          const featPhotoCount = (featuredItem.exclusivePhotos?.length || featuredItem.previewImages?.length) || 0;
                          const featVideoCount = featuredItem.videos?.length || 0;
                          return featuredItem.duration && !featuredItem.duration.includes('35 Fotos') && !(featPhotoCount !== 15 && featuredItem.duration.includes('15 Fotos'))
                            ? featuredItem.duration
                            : featVideoCount > 0 && featPhotoCount > 0
                            ? `${featPhotoCount} Foto${featPhotoCount === 1 ? '' : 's'} 4K • ${featVideoCount} Vídeo${featVideoCount === 1 ? '' : 's'} UHD`
                            : featVideoCount > 0
                            ? `${featVideoCount} Vídeo${featVideoCount === 1 ? '' : 's'} 4K UHD`
                            : featPhotoCount > 0
                            ? `${featPhotoCount} Foto${featPhotoCount === 1 ? '' : 's'} 4K`
                            : 'Fotos e Vídeos em Alta Definição';
                        })()}
                      </span>
                      <div className="inline-flex items-center gap-2 text-[#f4a7b9] text-xs font-semibold tracking-wider uppercase group-hover:translate-x-1 transition-transform">
                        <span>Ver Obra</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* CARDS SECUNDÁRIOS (Bento Right - 5 Cols) */}
          {secondaryItems.length > 0 && (
            <div className="lg:col-span-5 flex flex-col gap-6 sm:gap-7 justify-between">
              {secondaryItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: (idx + 1) * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative rounded-[28px] p-2 bg-[#090a0f] border border-white/[0.08] hover:border-[#f4a7b9]/40 transition-all duration-300 shadow-lg flex-1"
                >
                  <Link href={`/avulsos/${item.slug || item.id}`} className="block h-full cursor-pointer">
                    <div className="rounded-[22px] bg-[#050507] overflow-hidden flex items-center gap-4 p-3.5 sm:p-4 border border-white/[0.03] h-full">
                      {/* Mini Capa */}
                      <div className="relative w-24 sm:w-28 aspect-square shrink-0 rounded-xl overflow-hidden bg-zinc-950">
                        <Image
                          src={resolveMediaUrl(item.imageUrl, 'thumb')}
                          alt={item.title}
                          fill
                          sizes="112px"
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Info Resumida */}
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-[10px] font-mono text-[#f4a7b9] uppercase tracking-wider block mb-1">
                          {item.badge || 'Lançamento'}
                        </span>
                        <h4 className="font-serif text-base sm:text-lg text-white group-hover:text-[#f4a7b9] transition-colors truncate">
                          {item.title}
                        </h4>
                        <p className="text-zinc-400 text-xs font-light line-clamp-1 mt-1">
                          {item.description}
                        </p>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-[#f4a7b9] font-medium tracking-wide">
                          <span>Acessar</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
