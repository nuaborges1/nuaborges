'use client';

import React from 'react';
import { Film } from 'lucide-react';
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
    <div className="rounded-[24px] bg-[#09090c] border border-white/[0.08] p-6 sm:p-7 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-white font-medium text-base">Vídeo Exclusivo em Gravação Sob Medida</h2>
            <p className="text-zinc-400 text-xs font-light">
              Escolha a duração ideal para seu momento
            </p>
          </div>
        </div>
        {videoPrice > 0 && (
          <span className="text-[#f4a7b9] font-mono text-sm font-semibold">
            {formatCurrencyBrl(videoPrice)}
          </span>
        )}
      </div>

      {/* Seletor de Opções de Vídeo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
        {settings.videoOptions.map((opt) => {
          const isSelected = selectedVideoId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedVideoId(opt.id)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#f4a7b9]/10 border-[#f4a7b9] text-white shadow-[0_0_15px_rgba(244,167,185,0.15)]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/20'
              }`}
            >
              <span className="text-xs font-medium">{opt.label}</span>
              <span className="text-[11px] font-mono text-[#f4a7b9] mt-1 font-semibold">
                {opt.price === 0 ? 'Sem custo adicional' : formatCurrencyBrl(opt.price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
