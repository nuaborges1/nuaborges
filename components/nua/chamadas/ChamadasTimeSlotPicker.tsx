/* Vinho maduro / Nua Borges */
import React, { useState } from 'react';
import { Clock, Loader2, Edit3 } from 'lucide-react';

interface ChamadasTimeSlotPickerProps {
  loadingSlots: boolean;
  slotsError: string | null;
  availableSlots: string[] | null | undefined;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  timezoneLabel?: string;
}

export function ChamadasTimeSlotPicker({
  loadingSlots,
  slotsError,
  availableSlots,
  selectedTime,
  onSelectTime,
  timezoneLabel = 'Fuso da agenda oficial',
}: ChamadasTimeSlotPickerProps) {
  const slots = availableSlots || [];
  const [isTypingManual, setIsTypingManual] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const handleApplyManualTime = (val: string) => {
    setManualInput(val);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(val)) {
      onSelectTime(val);
    }
  };

  return (
    <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#90364B] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
              Horário do Atendimento
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1">
              Informe ou selecione o horário desejado ({timezoneLabel})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedTime && (
            <div className="self-start sm:self-auto shrink-0 whitespace-nowrap">
              <span className="font-mono text-xs text-[#90364B] px-3.5 py-1.5 rounded-full bg-[#661C30]/20 border border-[#7A293D]/40 font-medium whitespace-nowrap">
                {selectedTime} selecionado
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsTypingManual(!isTypingManual)}
            className="text-[11px] font-mono text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3 h-3 text-[#90364B]" />
            <span>{isTypingManual ? 'Ver sugestões' : 'Digitar horário'}</span>
          </button>
        </div>
      </div>

      <div className="pt-6">
        {/* Campo de digitação de horário livre */}
        {isTypingManual && (
          <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-medium">Informe a hora exata desejada:</span>
              <span className="text-[11px] text-zinc-500 font-mono">Exemplo: 15:30 ou 20:00</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={selectedTime || manualInput}
                onChange={(e) => handleApplyManualTime(e.target.value)}
                className="w-full sm:w-48 px-4 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white font-mono text-sm focus:border-[#90364B] focus:outline-none"
              />
              <span className="text-xs text-zinc-400 font-light">
                O sistema valida automaticamente no servidor se este horário cabe no expediente e não colide com outras chamadas.
              </span>
            </div>
          </div>
        )}

        {loadingSlots ? (
          <div className="py-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center gap-3 text-zinc-400 text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-[#90364B]" />
            <span>Consultando agenda oficial em tempo real...</span>
          </div>
        ) : slotsError || slots.length === 0 ? (
          <div className="py-8 px-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <p className="text-zinc-400 text-xs font-light">
              {slotsError || 'Nenhum horário livre nesta data. Por favor, selecione outro dia no calendário.'}
            </p>
          </div>
        ) : (
          <div>
            {!isTypingManual && (
              <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-3">
                Horários sugeridos com base no expediente:
              </p>
            )}
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
                        ? 'bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] border-[#7A293D] text-[#F5EEE9] font-bold shadow-[0_0_16px_rgba(102,28,48,0.5)]'
                        : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-white/20 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
