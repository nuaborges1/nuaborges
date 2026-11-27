/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { Camera, Minus, Plus } from 'lucide-react';
import {
  PersonalizadosSettings,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';
import { useCopy } from '@/lib/copy';

interface PersonalizadosPhotoCardProps {
  settings: PersonalizadosSettings;
  photoCount: number;
  setPhotoCount: React.Dispatch<React.SetStateAction<number>>;
  photosPrice: number;
  embedded?: boolean;
}

export function PersonalizadosPhotoCard({
  settings,
  photoCount,
  setPhotoCount,
  photosPrice,
  embedded = false,
}: PersonalizadosPhotoCardProps) {
  const { copy } = useCopy();
  const p = copy.personalizados.photoCard;
  const min = settings.minPhotos || 3;
  const max = settings.maxPhotos || 50;

  return (
    <div
      className={
        embedded
          ? 'text-left flex flex-col justify-between h-full gap-6'
          : 'rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left'
      }
    >
      <div className="flex flex-col gap-3.5 pb-5 border-b border-white/[0.06]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#661C30]/15 border border-[#7A293D]/30 flex items-center justify-center text-[#F5EEE9] shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#F5EEE9]/80 block">
              {p.stepLabel}
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
              {p.title}
            </h3>
            <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
              {p.unitPriceLabel(formatCurrencyBrl(settings.pricePerPhoto))} &bull; {p.minHint(min)}
            </p>
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            Subtotal fotos
          </span>
          <span className="font-serif text-2xl sm:text-3xl text-[#F5EEE9] font-medium whitespace-nowrap tabular-nums">
            {formatCurrencyBrl(photosPrice)}
          </span>
        </div>
      </div>

      {/* Controles de Quantidade */}
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-sm text-zinc-200 font-medium block">
            Quantidade de fotos desejadas
          </span>
          <span className="text-xs text-zinc-400 font-light mt-0.5 block leading-relaxed">
            {p.subtitle}
          </span>
        </div>

        <div className="inline-flex items-center justify-between gap-2.5 p-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] select-none self-start shrink-0">
          <button
            type="button"
            onClick={() => setPhotoCount((c) => Math.max(min, c - 1))}
            disabled={photoCount <= min}
            className="w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
            aria-label="Diminuir quantidade de fotos"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex items-center justify-center gap-1.5 px-4 min-w-[96px] whitespace-nowrap text-center">
            <span className="font-serif text-xl sm:text-2xl font-normal text-white tabular-nums">{photoCount}</span>
            <span className="font-sans text-xs text-zinc-400 font-light">fotos</span>
          </div>
          <button
            type="button"
            onClick={() => setPhotoCount((c) => Math.min(max, c + 1))}
            disabled={photoCount >= max}
            className="w-11 h-11 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
            aria-label="Aumentar quantidade de fotos"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
