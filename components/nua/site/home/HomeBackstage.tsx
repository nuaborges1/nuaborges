'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Lock } from 'lucide-react';
import { GalleryItem } from '@/lib/data';
import { resolveMediaUrl } from '@/lib/media';

const EASE = [0.32, 0.72, 0, 1] as const;

interface HomeBackstageProps {
  photos: GalleryItem[];
  onSelectPhoto: (photo: GalleryItem, index: number) => void;
}

/** Faixa horizontal de bastidores — termina em fotos bloqueadas que levam ao acervo. */
export function HomeBackstage({ photos, onSelectPhoto }: HomeBackstageProps) {
  if (photos.length === 0) return null;
  const locked = photos.slice(0, 2);

  return (
    <section id="bastidores" className="relative bg-black py-24 sm:py-32 border-t border-white/[0.05] select-none">
      <div className="max-w-[76rem] mx-auto px-4 sm:px-8 lg:px-12 mb-10 sm:mb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: EASE }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div className="max-w-xl">
            <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-400">
              Galeria autoral
            </span>
            <h2 className="mt-4 font-serif text-[2.3rem] sm:text-5xl text-white tracking-tight leading-[1.04]">
              Bastidores
            </h2>
            <p className="mt-3 text-sm sm:text-[15px] font-light text-zinc-400 leading-relaxed">
              Um recorte do que acontece em cada sessão. O resto fica guardado para quem chega mais
              perto.
            </p>
          </div>
          <span className="hidden md:block text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            Arraste para ver mais
          </span>
        </motion.div>
      </div>

      <div className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory px-4 sm:px-8 lg:px-[max(3rem,calc((100vw-76rem)/2+3rem))] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {photos.map((photo, idx) => (
          <motion.button
            key={photo.id}
            type="button"
            onClick={() => onSelectPhoto(photo, idx)}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.8, delay: idx * 0.06, ease: EASE }}
            className="group relative shrink-0 snap-start w-[72vw] sm:w-[320px] aspect-[3/4] overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-zinc-950 cursor-pointer text-left"
          >
            <Image
              src={resolveMediaUrl(photo.imageUrl, 'mobile')}
              alt={photo.title}
              fill
              sizes="(max-width: 640px) 72vw, 320px"
              className="object-cover object-center transition-transform duration-[1200ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-5">
              <p className="font-serif text-xl text-white">{photo.title}</p>
              {photo.caption && <p className="mt-1 text-xs font-light text-zinc-400 line-clamp-1">{photo.caption}</p>}
            </div>
          </motion.button>
        ))}

        {locked.map((photo, idx) => (
          <Link
            key={`locked-${photo.id}`}
            href="/acervo"
            className="group relative shrink-0 snap-start w-[72vw] sm:w-[320px] aspect-[3/4] overflow-hidden rounded-[1.75rem] border border-[#f4a7b9]/20 bg-zinc-950"
          >
            <Image
              src={resolveMediaUrl(photo.imageUrl, 'mobile')}
              alt=""
              fill
              sizes="(max-width: 640px) 72vw, 320px"
              className="object-cover object-center scale-110 blur-2xl opacity-60"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#f4a7b9]/40 bg-black/50">
                <Lock className="w-4 h-4 text-[#f4a7b9]" />
              </span>
              <p className="mt-4 font-serif text-xl text-white">
                {idx === 0 ? 'Continue no acervo completo' : 'Sem censura, só lá'}
              </p>
              <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f4a7b9]">
                Desbloquear
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
