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
    <div className="space-y-3.5">
      <div className="flex items-center gap-2.5 text-left">
        <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono font-semibold text-[#f4a7b9]">
          1
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Escolha a Modalidade do Encontro
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {modalities.map((mod) => {
          const isSelected = selectedModality.id === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onSelectModality(mod)}
              className={`p-4 rounded-2xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-[#18151c] border-[#f4a7b9]/50'
                  : 'bg-[#14161d] border-white/[0.06] hover:border-white/15'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    <Clock className="w-3 h-3 text-[#f4a7b9]" />
                    {mod.durationMinutes} min
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#f4a7b9] bg-[#f4a7b9] text-zinc-950'
                        : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
                <h3 className="font-serif text-base text-white font-medium leading-snug">
                  {mod.name}
                </h3>
                <p className="text-zinc-400 text-xs font-light line-clamp-2 leading-relaxed">
                  {mod.description}
                </p>
              </div>
              <div className="pt-2.5 border-t border-white/[0.05] font-mono font-semibold text-sm text-[#f4a7b9]">
                {mod.priceFormatted}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
