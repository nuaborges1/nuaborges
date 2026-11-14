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
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f4a7b9] mb-4 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-[#f4a7b9]/20 flex items-center justify-center text-[10px]">
          1
        </span>
        <span>Escolha a Modalidade</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {modalities.map((mod) => {
          const isSelected = selectedModality.id === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onSelectModality(mod)}
              className={`p-4 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-zinc-900/90 border-[#f4a7b9] ring-1 ring-[#f4a7b9]/50 shadow-[0_0_24px_rgba(244,167,185,0.12)]'
                  : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    <Clock className="w-3 h-3 text-[#f4a7b9]" />
                    {mod.durationMinutes} min
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-[#f4a7b9] flex items-center justify-center text-black">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-base text-white font-medium leading-snug mb-1">
                  {mod.name}
                </h3>
                <p className="text-zinc-500 text-[11px] line-clamp-2 leading-relaxed">
                  {mod.description}
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-zinc-800/60 font-semibold text-sm text-[#f4a7b9]">
                {mod.priceFormatted}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
