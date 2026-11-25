/* Vinho maduro / Nua Borges */
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
  embedded?: boolean;
}

export function PersonalizadosVideoCard({
  settings,
  selectedVideoId,
  setSelectedVideoId,
  videoPrice,
  embedded = false,
}: PersonalizadosVideoCardProps) {
  if (!settings.videoEnabled) return null;

  const hasOddOptions = settings.videoOptions.length % 2 === 1;

  return (
    <div
      className={
        embedded
          ? 'text-left'
          : 'rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left'
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#661C30]/15 border border-[#7A293D]/30 flex items-center justify-center text-[#C97A8D] shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#C97A8D] block">
              Audiovisual
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
              Gravação de Vídeo Exclusivo
            </h3>
            <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
              Escolha a duração ideal para sua produção sob medida
            </p>
          </div>
        </div>
        {videoPrice > 0 && (
          <div className="self-start sm:self-auto shrink-0 whitespace-nowrap">
            <span className="font-serif text-2xl sm:text-3xl text-[#F5EEE9] font-medium whitespace-nowrap tabular-nums">
              +{formatCurrencyBrl(videoPrice)}
            </span>
          </div>
        )}
      </div>

      {/* Seletor de Opções de Vídeo (com rótulo completo e destaque de largura cheia para opção base em contagem ímpar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5">
        {settings.videoOptions.map((opt) => {
          const isSelected = selectedVideoId === opt.id;
          const isBase = opt.durationMinutes === 0;
          const spanFull = hasOddOptions && isBase;

          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedVideoId(opt.id)}
              className={`p-4 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C97A8D] ${
                spanFull ? 'sm:col-span-2' : ''
              } ${
                isSelected
                  ? 'bg-[#661C30]/25 border-[#C97A8D]/70 text-white shadow-[0_0_24px_rgba(67,19,34,0.35)]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className="space-y-1.5 min-w-0">
                <span className="font-serif text-base text-[#F5EEE9] font-normal block leading-snug">
                  {opt.label}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#C97A8D]" />
                    {isBase ? 'Apenas fotos' : `${opt.durationMinutes} min`}
                  </span>
                  <span className="text-xs text-zinc-600">&bull;</span>
                  <span className="text-xs font-mono text-[#C97A8D] font-medium">
                    {opt.price === 0 ? 'Incluso' : `+${formatCurrencyBrl(opt.price)}`}
                  </span>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'border-[#C97A8D] bg-[#661C30] text-white'
                    : 'border-white/25 bg-black/40'
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
