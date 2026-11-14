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
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono font-medium text-[#f4a7b9]">
          3
        </span>
        <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f4a7b9] font-medium">
          Escolha o Horário Disponível
        </h2>
      </div>

      {loadingSlots ? (
        <div className="py-8 rounded-[28px] bg-[#08080c] border border-white/[0.08] flex items-center justify-center gap-3 text-zinc-400 text-xs font-mono shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
          <Loader2 className="w-4 h-4 animate-spin text-[#f4a7b9]" />
          <span>Consultando agenda oficial em tempo real...</span>
        </div>
      ) : slotsError || slots.length === 0 ? (
        <div className="py-8 px-6 rounded-[28px] bg-[#08080c] border border-white/[0.08] text-center shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
          <p className="text-zinc-400 text-xs font-light">
            {slotsError || 'Nenhum horário livre nesta data. Por favor, selecione outro dia no calendário.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {slots.map((time) => {
            const isSelected = selectedTime === time;
            return (
              <button
                key={time}
                type="button"
                onClick={() => onSelectTime(time)}
                className={`py-3 px-3.5 rounded-xl text-xs font-mono transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#f4a7b9] border-[#f4a7b9] text-black font-bold shadow-[0_0_16px_rgba(244,167,185,0.35)]'
                    : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:text-white hover:bg-white/[0.06]'
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
