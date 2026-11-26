/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, ArrowRight, Camera } from 'lucide-react';
import { GalleryItem } from '@/lib/data';
import { resolveMediaUrl } from '@/lib/media';

interface HomeBastidoresGalleryProps {
  photos?: GalleryItem[];
  onSelectPhoto?: (photo: GalleryItem, index: number) => void;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export function HomeBastidoresGallery({
  photos,
  onSelectPhoto,
  eyebrow,
  title,
  subtitle,
}: HomeBastidoresGalleryProps) {
  const displayPhotos = photos || [];

  if (displayPhotos.length === 0) {
    return null;
  }

  return (
    <section id="bastidores" className="py-12 sm:py-16 bg-black relative select-none border-t border-white/[0.05] overflow-hidden">
      {/* Cabeçalho Limpo Sem Setas de Navegação */}
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[#90364B] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-2 inline-flex items-center gap-2">
            <Camera className="w-3.5 h-3.5 text-[#90364B]" />
            <span>{eyebrow || 'BASTIDORES & REGISTROS'}</span>
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
            {title || 'Fragmentos da intimidade'}
          </h2>
          {subtitle && (
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-2 max-w-xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        <Link
          href="/acervo"
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#90364B] hover:text-[#F5EEE9] transition-colors cursor-pointer"
        >
          <span>Acervo Completo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div role="region" aria-label="Prévias do acervo" className="relative w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-4 pb-3 sm:px-8">
        <div className="mx-auto flex w-max max-w-none gap-4 sm:gap-5">
          {displayPhotos.map((photo, idx) => {
            const isBlurred = Boolean((photo as any).blurred);

            return (
              <button type="button"
                aria-label={isBlurred ? "Abrir acervo" : (photo.title || "Abrir prévia")}
                key={`${photo.id || 'photo'}-${idx}`}
                className="shrink-0 snap-center text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-64 sm:w-72 aspect-[3/4] relative rounded-2xl overflow-hidden border border-white/10 group/card cursor-pointer bg-zinc-950 shadow-[0_12px_36px_rgba(0,0,0,0.8)]"
                onClick={() => {
                  if (isBlurred) {
                    window.location.href = '/acervo';
                  } else if (onSelectPhoto) {
                    onSelectPhoto(photo, idx);
                  }
                }}
              >
                <Image
                  src={resolveMediaUrl(photo.imageUrl, 'mobile')}
                  alt=""
                  loading="lazy"
                  fill
                  sizes="288px"
                  className={`object-cover object-center group-hover/card:scale-105 transition-transform duration-500 ${
                    isBlurred ? 'blur-md opacity-60 scale-105' : ''
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                {isBlurred ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/50 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-full bg-[#661C30]/30 border border-[#7A293D]/50 flex items-center justify-center mb-2 shadow-[0_0_16px_rgba(102,28,48,0.4)]">
                      <Lock className="w-4 h-4 text-[#90364B]" />
                    </div>
                    <span className="text-white text-xs font-serif font-medium">Continue no acervo completo</span>
                    <span className="text-[#90364B] text-[10px] font-mono tracking-wider mt-1 uppercase">Acessar Clube VIP ➔</span>
                  </div>
                ) : (
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-xs font-medium text-white truncate">{photo.title}</p>
                    {photo.caption && (
                      <p className="text-[11px] text-zinc-300/80 font-light truncate mt-0.5">{photo.caption}</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
