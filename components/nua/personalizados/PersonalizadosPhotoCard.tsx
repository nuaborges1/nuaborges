'use client';

import React from 'react';
import { Camera, Minus, Plus } from 'lucide-react';
import {
  PersonalizadosSettings,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';

interface PersonalizadosPhotoCardProps {
  settings: PersonalizadosSettings;
  photoCount: number;
  setPhotoCount: React.Dispatch<React.SetStateAction<number>>;
  photosPrice: number;
}

export function PersonalizadosPhotoCard({
  settings,
  photoCount,
  setPhotoCount,
  photosPrice,
}: PersonalizadosPhotoCardProps) {
  const min = settings.minPhotos || 3;
  const max = settings.maxPhotos || 50;

  return (
    <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f4a7b9] shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
              Ensaio Fotográfico Exclusivo
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1">
              {formatCurrencyBrl(settings.pricePerPhoto)} por foto &bull; Mínimo de {min} fotos
            </p>
          </div>
        </div>
        <div className="self-start sm:self-auto">
          <span className="font-serif text-2xl sm:text-3xl text-[#f4a7b9] font-medium">
            {formatCurrencyBrl(photosPrice)}
          </span>
        </div>
      </div>

      {/* Controles de Quantidade */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
        <div>
          <span className="text-sm text-zinc-300 font-medium block">
            Quantidade de fotos desejadas
          </span>
          <span className="text-xs text-zinc-500 font-light mt-0.5 block">
            Defina o volume de fotos produzidas especialmente para você
          </span>
        </div>

        <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] select-none self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPhotoCount((c) => Math.max(min, c - 1))}
            disabled={photoCount <= min}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            aria-label="Diminuir quantidade de fotos"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="font-serif text-xl sm:text-2xl font-normal text-white px-2 min-w-[72px] text-center">
            {photoCount} <span className="font-sans text-xs text-zinc-400 font-light">fotos</span>
          </div>
          <button
            type="button"
            onClick={() => setPhotoCount((c) => Math.min(max, c + 1))}
            disabled={photoCount >= max}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            aria-label="Aumentar quantidade de fotos"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
