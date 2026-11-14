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
    <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 sm:p-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9] shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h2 className="text-white font-medium text-base tracking-tight">
              Ensaio Fotográfico Exclusivo
            </h2>
            <p className="text-zinc-400 text-xs font-light mt-0.5">
              {formatCurrencyBrl(settings.pricePerPhoto)} por foto • Mínimo de {min} fotos
            </p>
          </div>
        </div>
        <span className="font-mono text-sm font-semibold text-zinc-200 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] self-start sm:self-auto">
          {formatCurrencyBrl(photosPrice)}
        </span>
      </div>

      {/* Controles de Quantidade */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
        <div className="text-left">
          <span className="text-xs text-zinc-300 font-medium block">
            Quantidade de fotos desejadas
          </span>
          <span className="text-[11px] text-zinc-500 font-light">
            Defina o volume de fotos produzidas para você
          </span>
        </div>

        <div className="inline-flex items-center gap-2 h-10 px-2 rounded-xl bg-[#0e1015] border border-white/[0.08] select-none self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPhotoCount((c) => Math.max(min, c - 1))}
            disabled={photoCount <= min}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Diminuir quantidade de fotos"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs font-bold text-white px-2 min-w-[56px] text-center">
            {photoCount} <span className="text-zinc-500 font-normal text-[11px]">fotos</span>
          </span>
          <button
            type="button"
            onClick={() => setPhotoCount((c) => Math.min(max, c + 1))}
            disabled={photoCount >= max}
            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Aumentar quantidade de fotos"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
