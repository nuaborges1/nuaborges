'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Film, Camera, Lock, Flame } from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

const EASE = [0.32, 0.72, 0, 1] as const;

interface HomeLaunchesProps {
  items: AvulsoProductItem[];
  /** Foto usada no teaser quando ainda não há obras publicadas. */
  teaserImage: string;
  onOpenVip: () => void;
}

function isVideo(item: AvulsoProductItem) {
  return (
    (item.videos && item.videos.length > 0) ||
    !!item.technicalDetails?.format?.toLowerCase().includes('vídeo') ||
    !!item.duration?.toLowerCase().includes('vídeo')
  );
}

function SectionHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-14">
      <div className="max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#f4a7b9]/25 bg-[#f4a7b9]/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f4a7b9]">
          <Flame className="w-3 h-3" />
          Lançamentos
        </span>
        <h2 className="mt-4 font-serif text-[2.3rem] sm:text-5xl text-white tracking-tight leading-[1.04]">
          Obras recém-reveladas
        </h2>
        <p className="mt-3 text-zinc-400 text-sm sm:text-[15px] font-light leading-relaxed">
          Ensaios e vídeos autorais que acabaram de sair do estúdio. Cada obra pode ser sua, sem
          assinatura.
        </p>
      </div>
      <Link
        href="/avulsos"
        className="group self-start md:self-auto inline-flex items-center gap-3 rounded-full border border-white/12 pl-5 pr-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200 hover:border-[#f4a7b9]/50 hover:text-white transition-colors duration-300"
      >
        Explorar o catálogo
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:bg-[#f4a7b9] group-hover:text-black">
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>
    </div>
  );
}

function LaunchCard({ item, featured, index }: { item: AvulsoProductItem; featured: boolean; index: number }) {
  const video = isVideo(item);
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, delay: index * 0.08, ease: EASE }}
      className={featured ? 'md:col-span-7 md:row-span-2' : 'md:col-span-5'}
    >
      <Link
        href={`/avulsos/${item.slug || item.id}`}
        className="group block h-full rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-1.5 transition-colors duration-500 hover:border-[#f4a7b9]/40"
      >
        <div
          className={`relative h-full overflow-hidden rounded-[calc(2rem-0.375rem)] bg-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] ${
            featured ? 'aspect-[4/5] md:aspect-auto md:min-h-[560px]' : 'aspect-[16/11]'
          }`}
        >
          <Image
            src={resolveMediaUrl(item.imageUrl, 'mobile')}
            alt={item.title}
            fill
            sizes={featured ? '(max-width: 768px) 100vw, 58vw' : '(max-width: 768px) 100vw, 42vw'}
            className="object-cover object-center transition-transform duration-[1200ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30" />

          <div className="absolute top-4 inset-x-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-200">
              {video ? <Film className="w-3 h-3 text-[#f4a7b9]" /> : <Camera className="w-3 h-3 text-[#f4a7b9]" />}
              {video ? 'Vídeo' : 'Ensaio'}
            </span>
            {item.badge && (
              <span className="rounded-full bg-[#f4a7b9] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black">
                {item.badge}
              </span>
            )}
          </div>

          <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7">
            <h3
              className={`font-serif text-white leading-[1.08] tracking-tight ${
                featured ? 'text-3xl sm:text-[2.6rem]' : 'text-2xl'
              }`}
            >
              {item.title}
            </h3>
            {featured && (
              <p className="mt-2 max-w-md text-sm font-light text-zinc-300/90 line-clamp-2">{item.description}</p>
            )}
            <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f4a7b9]">
              <Lock className="w-3 h-3" />
              Ver obra
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function ComingSoon({ teaserImage, onOpenVip }: { teaserImage: string; onOpenVip: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, ease: EASE }}
      className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-1.5"
    >
      <div className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] min-h-[420px] flex items-end">
        <Image
          src={resolveMediaUrl(teaserImage, 'mobile')}
          alt="Próximo lançamento"
          fill
          sizes="100vw"
          className="object-cover object-center scale-110 blur-xl opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        <div className="relative p-7 sm:p-12 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-300">
            <Lock className="w-3 h-3 text-[#f4a7b9]" />
            Em edição
          </span>
          <h3 className="mt-4 font-serif text-3xl sm:text-[2.6rem] text-white leading-[1.08] tracking-tight">
            O próximo ensaio está quase pronto.
          </h3>
          <p className="mt-3 text-sm sm:text-[15px] font-light text-zinc-300/90 leading-relaxed">
            Entre na lista VIP e seja a primeira pessoa a saber quando ele for revelado.
          </p>
          <button
            type="button"
            onClick={onOpenVip}
            className="group mt-6 inline-flex items-center gap-3 rounded-full bg-[#f4a7b9] pl-6 pr-1.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-black cursor-pointer transition-transform duration-300 active:scale-[0.98]"
          >
            Quero ser avisado
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-transform duration-500 group-hover:translate-x-0.5">
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/** Vitrine visual de lançamentos — sem preços; leva para a página de cada obra. */
export function HomeLaunches({ items, teaserImage, onOpenVip }: HomeLaunchesProps) {
  const launches = items.filter((i) => i.active !== false).slice(0, 3);

  return (
    <section id="lancamentos" className="relative bg-black py-24 sm:py-32 select-none">
      <div className="pointer-events-none absolute top-0 right-0 w-[32rem] h-[32rem] rounded-full bg-[#f4a7b9]/[0.03] blur-[200px]" />
      <div className="relative max-w-[76rem] mx-auto px-4 sm:px-8 lg:px-12">
        <SectionHeader />
        {launches.length === 0 ? (
          <ComingSoon teaserImage={teaserImage} onOpenVip={onOpenVip} />
        ) : (
          <div className={`grid grid-cols-1 gap-5 sm:gap-6 ${launches.length > 1 ? 'md:grid-cols-12' : ''}`}>
            {launches.map((item, idx) => (
              <LaunchCard key={item.id} item={item} featured={idx === 0 && launches.length > 1} index={idx} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
