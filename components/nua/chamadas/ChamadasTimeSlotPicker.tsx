import React from 'react';
import { Clock, Loader2 } from 'lucide-react';

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
    <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f4a7b9] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
              Horários Disponíveis
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1">
              Escolha o melhor horário para sua sessão (Horário de Brasília)
            </p>
          </div>
        </div>

        {selectedTime && (
          <div className="self-start sm:self-auto shrink-0 whitespace-nowrap">
            <span className="font-mono text-xs text-[#f4a7b9] px-3.5 py-1.5 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/30 font-medium whitespace-nowrap">
              {selectedTime} selecionado
            </span>
          </div>
        )}
      </div>

      <div className="pt-6">
        {loadingSlots ? (
          <div className="py-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center gap-3 text-zinc-400 text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-[#f4a7b9]" />
            <span>Consultando agenda oficial em tempo real...</span>
          </div>
        ) : slotsError || slots.length === 0 ? (
          <div className="py-8 px-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
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
    </div>
  );
}
