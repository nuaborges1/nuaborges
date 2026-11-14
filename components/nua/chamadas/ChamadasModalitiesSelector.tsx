import React from 'react';
import { Clock, Check } from 'lucide-react';
import { AppointmentModality } from '@/lib/appointmentsCanonical';

interface ChamadasModalitiesSelectorProps {
  modalities: AppointmentModality[];
  selectedModality: AppointmentModality;
  onSelectModality: (mod: AppointmentModality) => void;
}

export function ChamadasModalitiesSelector({
  modalities,
  selectedModality,
  onSelectModality,
}: ChamadasModalitiesSelectorProps) {
  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono font-medium text-[#f4a7b9]">
          1
        </span>
        <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f4a7b9] font-medium">
          Escolha a Modalidade do Encontro
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {modalities.map((mod) => {
          const isSelected = selectedModality.id === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onSelectModality(mod)}
              className={`p-5 sm:p-6 rounded-[24px] text-left border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 min-h-[210px] ${
                isSelected
                  ? 'bg-[#f4a7b9]/10 border-[#f4a7b9]/60 text-white shadow-[0_0_30px_rgba(244,167,185,0.15)]'
                  : 'bg-[#08080c] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:bg-[#0c0d13] shadow-[0_8px_30px_rgba(0,0,0,0.6)]'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#f4a7b9]" />
                    {mod.durationMinutes} min
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#f4a7b9] bg-[#f4a7b9] text-black'
                        : 'border-white/25 bg-black/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <h3 className="font-serif text-lg sm:text-xl text-white font-normal leading-snug">
                  {mod.name}
                </h3>
                <p className="text-zinc-400 text-xs font-light line-clamp-2 leading-relaxed">
                  {mod.description}
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.06] font-serif text-xl sm:text-2xl text-[#f4a7b9] font-medium">
                {mod.priceFormatted}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
