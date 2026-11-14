'use client';

import React from 'react';
import { Camera } from 'lucide-react';
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
  return (
    <div className="rounded-[24px] bg-[#09090c] border border-white/[0.08] p-6 sm:p-7 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9]">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white font-medium text-base">Ensaio Fotográfico</h2>
            <p className="text-zinc-400 text-xs font-light">
              {formatCurrencyBrl(settings.pricePerPhoto)} por foto • Mínimo de {settings.minPhotos} fotos
            </p>
          </div>
        </div>
        <span className="text-[#f4a7b9] font-mono text-sm font-semibold">
          {formatCurrencyBrl(photosPrice)}
        </span>
      </div>

      {/* Controles de Quantidade */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
        <div className="text-xs text-zinc-400">Quantidade de fotos desejadas:</div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPhotoCount((c) => Math.max(0, c - 1))}
            className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-200 hover:text-white transition-all active:scale-95 text-lg"
            aria-label="Diminuir fotos"
          >
            -
          </button>
          <span className="w-12 text-center font-mono font-bold text-lg text-white">
            {photoCount}
          </span>
          <button
            type="button"
            onClick={() => setPhotoCount((c) => Math.min(settings.maxPhotos || 50, c + 1))}
            className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-200 hover:text-white transition-all active:scale-95 text-lg"
            aria-label="Aumentar fotos"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
