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
    <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 sm:p-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9] shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h2 className="text-white font-medium text-base tracking-tight">
              Gravação de Vídeo Exclusivo
            </h2>
            <p className="text-zinc-400 text-xs font-light mt-0.5">
              Escolha a duração ideal para sua produção sob medida
            </p>
          </div>
        </div>
        {videoPrice > 0 && (
          <span className="font-mono text-sm font-semibold text-zinc-200 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] self-start sm:self-auto">
            {formatCurrencyBrl(videoPrice)}
          </span>
        )}
      </div>

      {/* Seletor de Opções de Vídeo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4">
        {settings.videoOptions.map((opt) => {
          const isSelected = selectedVideoId === opt.id;
          const isBase = opt.durationMinutes === 0;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedVideoId(opt.id)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                isSelected
                  ? 'bg-[#18151c] border-[#f4a7b9]/50 text-white'
                  : 'bg-[#0e1015] border-white/[0.06] text-zinc-300 hover:border-white/15'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white block truncate">
                    {opt.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    <Clock className="w-3 h-3 text-[#f4a7b9]" />
                    {isBase ? 'Apenas fotos' : `${opt.durationMinutes} min`}
                  </span>
                  <span className="text-[11px] text-zinc-500">•</span>
                  <span className="text-[11px] font-mono text-[#f4a7b9] font-medium">
                    {opt.price === 0 ? 'Incluso' : `+${formatCurrencyBrl(opt.price)}`}
                  </span>
                </div>
              </div>

              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'border-[#f4a7b9] bg-[#f4a7b9] text-zinc-950'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
