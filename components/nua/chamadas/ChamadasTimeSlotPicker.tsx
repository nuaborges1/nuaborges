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
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f4a7b9] mb-4 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-[#f4a7b9]/20 flex items-center justify-center text-[10px]">
          3
        </span>
        <span>Escolha o Horário</span>
      </h2>

      {loadingSlots ? (
        <div className="py-8 rounded-2xl bg-zinc-950/50 border border-zinc-900 flex items-center justify-center gap-2.5 text-zinc-400 text-xs font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-[#f4a7b9]" />
          <span>Consultando agenda em tempo real...</span>
        </div>
      ) : slotsError || slots.length === 0 ? (
        <div className="py-8 px-4 rounded-2xl bg-zinc-950/50 border border-zinc-900 text-center">
          <p className="text-zinc-400 text-xs font-light">
            {slotsError || 'Nenhum horário livre nesta data. Por favor, escolha outro dia.'}
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
                className={`py-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#f4a7b9] border-[#f4a7b9] text-zinc-950 font-bold shadow-[0_0_16px_rgba(244,167,185,0.3)]'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
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
