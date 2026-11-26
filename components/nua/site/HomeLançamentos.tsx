/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Film, ArrowRight, Lock, ImageIcon, PlayCircle } from 'lucide-react';
import { SiteContent, AvulsoProductItem } from '@/lib/types';
import { isPublicPack, packMediaCounts } from '@/lib/publicCatalog';
import { resolveMediaUrl } from '@/lib/media';

interface HomeLançamentosProps {
  customAvulsosData?: SiteContent['avulsos'];
}

function mediaSummary(item: AvulsoProductItem): string {
  const { photos, videos } = packMediaCounts(item);
  const parts: string[] = [];
  if (photos > 0) parts.push(`${photos} foto${photos === 1 ? '' : 's'}`);
  if (videos > 0) parts.push(`${videos} vídeo${videos === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(' · ') : 'Acesso no Cofre';
}

function FeaturedLancamentoCard({ item }: { item: AvulsoProductItem }) {
  const videos = item.videos?.length || 0;
  const href = `/avulsos/${(item.slug || item.id || '').replace(/^\/avulsos\//, '').replace(/^\/+/, '')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={href}
        className="group grid grid-cols-1 md:grid-cols-12 rounded-[28px] overflow-hidden bg-[#08080c] ring-1 ring-white/[0.08] hover:ring-[#702638]/75 transition-[box-shadow,transform] duration-300 active:scale-[0.994] hover:shadow-[0_24px_60px_-16px_rgba(67,19,34,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
      >
        <div className="relative md:col-span-6 aspect-[4/5] md:aspect-[5/4] overflow-hidden bg-zinc-950">
          {item.imageUrl ? (
            <Image
              src={resolveMediaUrl(item.imageUrl, 'full')}
              alt={item.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:[@media(hover:hover)]:group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
              <ImageIcon className="w-10 h-10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
          <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2 pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-[#431322]/85 backdrop-blur-sm border border-[#702638]/75 text-[#F5EEE9] text-[10px] font-semibold tracking-[0.18em] uppercase">
              {item.badge || 'Lançamento'}
            </span>
            <span className="w-8 h-8 rounded-full bg-black/65 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              {videos > 0 ? (
                <PlayCircle className="w-4 h-4 text-[#F5EEE9]/85" />
              ) : (
                <Lock className="w-4 h-4 text-[#F5EEE9]/85" />
              )}
            </span>
          </div>
        </div>

        <div className="md:col-span-6 p-7 sm:p-10 flex flex-col justify-between text-left gap-6">
          <div className="space-y-3">
            <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-[0.2em]">
              {mediaSummary(item)}
            </p>
            <h3 className="font-serif text-2xl sm:text-3xl lg:text-[2.15rem] text-[#F5EEE9] leading-tight">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-zinc-300 text-sm sm:text-[15px] font-light leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          <div className="pt-5 border-t border-white/[0.08] flex items-center justify-between gap-4">
            <span className="text-zinc-400 text-xs font-light tracking-wide">
              Acervo Autoral &bull; Acesso Privado
            </span>
            <span className="inline-flex items-center gap-2 text-[#F5EEE9]/85 group-hover:text-[#F5EEE9] text-xs font-semibold tracking-[0.16em] uppercase transition-colors duration-200">
              <span>Conhecer Obra</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#90364B] transition-transform duration-200 [@media(hover:hover)]:group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function AcervoCard({ item, index }: { item: AvulsoProductItem; index: number }) {
  const videos = item.videos?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/avulsos/${(item.slug || item.id || '').replace(/^\/avulsos\//, '').replace(/^\/+/, '')}`}
        className="group block relative rounded-2xl overflow-hidden bg-zinc-950 ring-1 ring-white/[0.07] hover:ring-[#702638]/70 transition-[box-shadow,transform] duration-300 active:scale-[0.992] hover:shadow-[0_20px_48px_-16px_rgba(67,19,34,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
      >
        <div className="relative aspect-[4/5] w-full">
          {item.imageUrl ? (
            <Image
              src={resolveMediaUrl(item.imageUrl, 'full')}
              alt={item.title}
              fill
              priority={index === 0}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:[@media(hover:hover)]:group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
              <ImageIcon className="w-10 h-10" />
            </div>
          )}

          {/* Gradiente de leitura */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

          {/* Topo: selo + privado */}
          <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between gap-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-full bg-[#431322]/85 backdrop-blur-sm border border-[#702638]/75 text-[#F5EEE9] text-[10px] font-semibold tracking-[0.18em] uppercase truncate max-w-[70%]">
              {item.badge || 'Lançamento'}
            </span>
            <span className="w-7 h-7 shrink-0 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              {videos > 0 ? (
                <PlayCircle className="w-3.5 h-3.5 text-[#F5EEE9]/85" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#F5EEE9]/85" />
              )}
            </span>
          </div>

          {/* Base: título e resumo canônico */}
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-[10px] text-zinc-300 uppercase tracking-[0.2em] mb-1.5">
              {mediaSummary(item)}
            </p>
            <h3 className="font-serif text-2xl text-white leading-tight line-clamp-2">
              {item.title}
            </h3>
            {item.description && (
              <p className="text-zinc-300 text-[13px] font-light leading-relaxed mt-1.5 line-clamp-2">
                {item.description}
              </p>
            )}

            <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between">
              <span className="text-zinc-400 text-xs font-light tracking-wide">
                Acervo Autoral
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#F5EEE9]/90 group-hover:text-[#F5EEE9] text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors duration-200">
                <span>Conhecer Obra</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#90364B] transition-transform duration-200 [@media(hover:hover)]:group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function HomeLançamentos({ customAvulsosData }: HomeLançamentosProps) {
  if (customAvulsosData?.active === false) {
    return null;
  }

  const items: AvulsoProductItem[] = (customAvulsosData?.items || []).filter(
    isPublicPack
  );

  // Sem itens publicados pelo admin, a seção fica oculta (zero dados mockados)
  if (items.length === 0) {
    return null;
  }

  const visible = items.slice(0, 6);
  const gridCols =
    visible.length === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl'
      : visible.length === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section
      id="lançamentos"
      className="py-12 sm:py-16 lg:py-20 bg-black relative overflow-hidden border-t border-white/[0.05]"
    >
      <div className="absolute top-1/3 left-1/2 w-[30rem] h-[30rem] rounded-full bg-[radial-gradient(circle,rgba(84,26,44,0.09)_0%,transparent_70%)] pointer-events-none -translate-x-1/2" />

      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <span className="text-[#F5EEE9]/70 text-[11px] font-semibold tracking-[0.28em] uppercase mb-3 inline-flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-[#90364B]" />
              <span>{customAvulsosData?.eyebrow || 'OBRAS & LANÇAMENTOS RECENTES'}</span>
            </span>
            <h2 className="font-serif text-[2.2rem] sm:text-4xl lg:text-[2.8rem] text-white tracking-tight leading-[1.08]">
              {customAvulsosData?.title || 'Acervo sob demanda'}
            </h2>
            <p className="text-zinc-400 text-sm sm:text-[15px] font-light mt-2.5 leading-relaxed">
              {customAvulsosData?.subtitle ||
                'Produções autorais e obras exclusivas liberadas individualmente com acesso privado no seu cofre.'}
            </p>
          </motion.div>

          <Link
            href="/avulsos"
            className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#F5EEE9]/85 hover:text-[#F5EEE9] border-b border-[#702638]/55 hover:border-[#90364B] pb-0.5 transition-colors duration-200 cursor-pointer self-start md:self-auto"
          >
            <span>Explorar todo o catálogo</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#90364B] transition-transform duration-200 [@media(hover:hover)]:group-hover:translate-x-0.5" />
          </Link>
        </div>

        {visible.length === 1 ? (
          <FeaturedLancamentoCard item={visible[0]} />
        ) : (
          <div className={`grid gap-5 sm:gap-6 ${gridCols}`}>
            {visible.map((item, idx) => (
              <AcervoCard key={item.id} item={item} index={idx} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
