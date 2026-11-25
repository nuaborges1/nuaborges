/* Vinho maduro / Nua Borges */
import React from 'react';
import { Video, Clock, Check } from 'lucide-react';
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
  const gridCols =
    modalities.length === 1
      ? 'grid-cols-1 max-w-xl'
      : modalities.length === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : 'grid-cols-1 md:grid-cols-3';

  return (
    <section aria-label="Escolha da modalidade" className="text-left">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 mb-5 border-b border-white/[0.08]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#C97A8D] block">
            Modalidade
          </span>
          <h2 className="font-serif text-xl sm:text-2xl text-[#F5EEE9] font-normal tracking-tight mt-0.5 flex items-center gap-2.5">
            <Video className="w-4 h-4 text-[#C97A8D] shrink-0" aria-hidden="true" />
            <span>Escolha o formato do encontro</span>
          </h2>
        </div>
        <div className="self-start sm:self-auto shrink-0">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-300 whitespace-nowrap tabular-nums">
            <span>{selectedModality.durationMinutes} min</span>
            <span className="text-zinc-600">&bull;</span>
            <strong className="text-[#F5EEE9] font-medium">
              {selectedModality.priceFormatted?.replace(/\s+/g, '\u00A0')}
            </strong>
          </span>
        </div>
      </div>

      <div className={`grid gap-4 sm:gap-5 ${gridCols}`}>
        {modalities.map((mod) => {
          const isSelected = selectedModality.id === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectModality(mod)}
              className={`rounded-[24px] p-5 sm:p-6 border text-left transition-all duration-300 flex flex-col justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C97A8D] ${
                isSelected
                  ? 'bg-[#661C30]/20 border-[#C97A8D]/70 text-white shadow-[0_12px_36px_rgba(67,19,34,0.35)]'
                  : 'bg-[#08080c] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:bg-[#0d0c11]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-serif text-lg text-[#F5EEE9] font-normal leading-snug">
                    {mod.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#C97A8D] bg-[#661C30] text-white'
                        : 'border-white/25 bg-black/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                </div>
                {mod.description && (
                  <p className="text-xs sm:text-[13px] text-zinc-400 font-light leading-relaxed">
                    {mod.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 w-full">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 text-[11px] text-zinc-300 font-mono">
                  <Clock className="w-3 h-3 text-[#C97A8D]" />
                  {mod.durationMinutes} min
                </span>
                <span className="text-base sm:text-lg font-serif text-[#F5EEE9] font-medium whitespace-nowrap tabular-nums">
                  {mod.priceFormatted?.replace(/\s+/g, '\u00A0')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
