import React from 'react';
import { Loader2 } from 'lucide-react';

interface ChamadasTimeSlotPickerProps {
  loadingSlots: boolean;
  slotsError: string | null;
  availableSlots: string[] | null | undefined;
  selectedTime: string;
  onSelectTime: (time: string) => void;
}

export function ChamadasTimeSlotPicker({
  loadingSlots,
  slotsError,
  availableSlots,
  selectedTime,
  onSelectTime,
}: ChamadasTimeSlotPickerProps) {
  const slots = availableSlots || [];

  return (
    <div className="space-y-3.5 text-left">
      <div className="flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono font-semibold text-[#f4a7b9]">
          3
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Escolha o Horário Disponível
        </h2>
      </div>

      {loadingSlots ? (
        <div className="py-8 rounded-2xl bg-[#14161d] border border-white/[0.06] flex items-center justify-center gap-2.5 text-zinc-400 text-xs font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-[#f4a7b9]" />
          <span>Consultando agenda oficial em tempo real...</span>
        </div>
      ) : slotsError || slots.length === 0 ? (
        <div className="py-8 px-4 rounded-2xl bg-[#14161d] border border-white/[0.06] text-center">
          <p className="text-zinc-400 text-xs font-light">
            {slotsError || 'Nenhum horário livre nesta data. Por favor, selecione outro dia no calendário.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {slots.map((time) => {
            const isSelected = selectedTime === time;
            return (
              <button
                key={time}
                type="button"
                onClick={() => onSelectTime(time)}
                className={`py-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#f4a7b9] border-[#f4a7b9] text-zinc-950 font-bold shadow-sm'
                    : 'bg-[#14161d] border-white/[0.06] text-zinc-300 hover:border-white/15 hover:text-white'
                }`}
              >
                {time}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
