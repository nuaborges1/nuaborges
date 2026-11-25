/* Vinho maduro / Nua Borges */
import React from 'react';
import { Clock, Loader2 } from 'lucide-react';

interface ChamadasTimeSlotPickerProps {
  loadingSlots: boolean;
  slotsError: string | null;
  availableSlots: string[] | null | undefined;
  selectedDate: string;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  timezoneLabel?: string;
  formatSlot?: (time: string) => string;
  embedded?: boolean;
}

export function ChamadasTimeSlotPicker({
  loadingSlots,
  slotsError,
  availableSlots,
  selectedDate,
  selectedTime,
  onSelectTime,
  timezoneLabel = 'Fuso da agenda oficial',
  formatSlot,
  embedded = false,
}: ChamadasTimeSlotPickerProps) {
  const slots = React.useMemo(
    () =>
      (Array.isArray(availableSlots) ? availableSlots : [])
        .map((entry: unknown) =>
          typeof entry === 'string'
            ? entry.trim()
            : entry && typeof entry === 'object' && typeof (entry as { startTime?: unknown }).startTime === 'string'
              ? String((entry as { startTime: string }).startTime).trim()
              : ''
        )
        .filter((s) => /^\d{2}:\d{2}$/.test(s)),
    [availableSlots]
  );

  const slotGroups = React.useMemo(() => {
    const groups: Array<{ label: string; items: string[] }> = [
      { label: 'Manhã', items: [] },
      { label: 'Tarde', items: [] },
      { label: 'Noite', items: [] },
    ];
    for (const time of slots) {
      const hour = Number.parseInt(time.split(':')[0] || '0', 10);
      if (hour < 12) groups[0].items.push(time);
      else if (hour < 18) groups[1].items.push(time);
      else groups[2].items.push(time);
    }
    const nonEmpty = groups.filter((g) => g.items.length > 0);
    return slots.length > 8 && nonEmpty.length > 1 ? nonEmpty : null;
  }, [slots]);

  const renderSlotButton = (time: string) => {
    const isSelected = selectedTime === time;
    const brasilia = formatSlot?.(time);
    return (
      <button
        key={time}
        type="button"
        aria-pressed={isSelected}
        onClick={() => onSelectTime(time)}
        className={`min-h-[44px] py-2 px-1.5 rounded-xl text-xs font-mono transition-all duration-200 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C97A8D] ${
          isSelected
            ? 'bg-[#661C30]/35 border-[#C97A8D] text-[#F5EEE9] font-semibold ring-1 ring-[#C97A8D]/40 shadow-[0_0_14px_rgba(102,28,48,0.35)]'
            : 'bg-white/[0.03] border-white/[0.08] text-zinc-200 hover:border-[#C97A8D]/55 hover:text-white hover:bg-[#661C30]/15'
        }`}
      >
        <span className="block">{time}</span>
        {brasilia && <span className="mt-1 block font-sans text-[11px] font-normal text-zinc-300">{brasilia} BRT</span>}
      </button>
    );
  };

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
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#C97A8D] block">
              Horário
            </span>
            <h2 className="font-serif text-xl sm:text-2xl text-[#F5EEE9] font-normal tracking-tight mt-0.5">
              Horários Disponíveis
            </h2>
            <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
              Escolha o horário na agenda ({timezoneLabel}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {selectedTime ? (
            <span className="font-mono text-xs text-[#F5EEE9] px-3.5 py-1.5 rounded-full bg-[#661C30]/35 border border-[#C97A8D]/55 font-medium whitespace-nowrap">
              {selectedTime} selecionado
            </span>
          ) : !loadingSlots && slots.length > 0 ? (
            <span className="font-mono text-[11px] text-zinc-300 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] whitespace-nowrap">
              {slots.length} {slots.length === 1 ? 'horário livre' : 'horários livres'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="pt-5">
        {!selectedDate ? (
          <div className="py-8 px-6 rounded-2xl bg-black/45 border border-white/[0.06] text-center">
            <p className="text-zinc-400 text-xs font-light">
              Selecione um dia habilitado no calendário para ver os horários livres.
            </p>
          </div>
        ) : loadingSlots ? (
          <div className="py-8 rounded-2xl bg-black/45 border border-white/[0.06] flex items-center justify-center gap-3 text-zinc-300 text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-[#C97A8D]" />
            <span>Consultando horários livres em tempo real...</span>
          </div>
        ) : slotsError || slots.length === 0 ? (
          <div className="py-8 px-6 rounded-2xl bg-black/45 border border-white/[0.06] text-center">
            <p className="text-zinc-400 text-xs font-light">
              {slotsError || 'Nenhum horário livre nesta data. Selecione outro dia habilitado no calendário.'}
            </p>
          </div>
        ) : slotGroups ? (
          <div className="space-y-4">
            {slotGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                    {group.label}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {group.items.length} {group.items.length === 1 ? 'opção' : 'opções'}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {group.items.map(renderSlotButton)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {slots.map(renderSlotButton)}
          </div>
        )}
      </div>
    </div>
  );
}
