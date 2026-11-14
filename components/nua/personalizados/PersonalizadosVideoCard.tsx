'use client';

import React from 'react';
import { Film, Clock, Check } from 'lucide-react';
import {
  PersonalizadosSettings,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';

interface PersonalizadosVideoCardProps {
  settings: PersonalizadosSettings;
  selectedVideoId: string;
  setSelectedVideoId: (id: string) => void;
  videoPrice: number;
}

export function PersonalizadosVideoCard({
  settings,
  selectedVideoId,
  setSelectedVideoId,
  videoPrice,
}: PersonalizadosVideoCardProps) {
  if (!settings.videoEnabled) return null;

  return (
    <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f4a7b9] shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
              Gravação de Vídeo Exclusivo
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1">
              Escolha a duração ideal para sua produção sob medida
            </p>
          </div>
        </div>
        {videoPrice > 0 && (
          <div className="self-start sm:self-auto">
            <span className="font-serif text-2xl sm:text-3xl text-[#f4a7b9] font-medium">
              +{formatCurrencyBrl(videoPrice)}
            </span>
          </div>
        )}
      </div>

      {/* Seletor de Opções de Vídeo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-6">
        {settings.videoOptions.map((opt) => {
          const isSelected = selectedVideoId === opt.id;
          const isBase = opt.durationMinutes === 0;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedVideoId(opt.id)}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer ${
                isSelected
                  ? 'bg-[#f4a7b9]/10 border-[#f4a7b9]/60 text-white shadow-[0_0_24px_rgba(244,167,185,0.12)]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <span className="font-serif text-base text-white font-normal block truncate">
                  {opt.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#f4a7b9]" />
                    {isBase ? 'Apenas fotos' : `${opt.durationMinutes} min`}
                  </span>
                  <span className="text-xs text-zinc-600">&bull;</span>
                  <span className="text-xs font-mono text-[#f4a7b9] font-medium">
                    {opt.price === 0 ? 'Incluso' : `+${formatCurrencyBrl(opt.price)}`}
                  </span>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'border-[#f4a7b9] bg-[#f4a7b9] text-black'
                    : 'border-white/20 bg-black/40'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
