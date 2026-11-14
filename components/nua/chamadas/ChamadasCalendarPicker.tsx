import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

interface CalendarDay {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  isSelected: boolean;
}

interface ChamadasCalendarPickerProps {
  currentMonth: number;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  calendarDays: CalendarDay[];
  onSelectDate: (dateString: string) => void;
}

export function ChamadasCalendarPicker({
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  calendarDays,
  onSelectDate,
}: ChamadasCalendarPickerProps) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f4a7b9] mb-4 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-[#f4a7b9]/20 flex items-center justify-center text-[10px]">
          2
        </span>
        <span>Selecione a Data (Horário de Brasília)</span>
      </h2>

      <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-5">
        {/* Header do Mês */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-serif text-lg text-white font-medium">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrevMonth}
              aria-label="Mês anterior"
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Próximo mês"
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEKDAYS.map((w, idx) => (
            <span key={idx} className="text-[11px] font-mono text-zinc-500 uppercase">
              {w}
            </span>
          ))}
        </div>

        {/* Grade de Dias */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((item, idx) => {
            if (!item.isCurrentMonth) {
              return <div key={idx} className="h-9 sm:h-10" />;
            }

            const isDisabled = item.isPast;

            return (
              <button
                key={idx}
                type="button"
                disabled={isDisabled}
                onClick={() => onSelectDate(item.dateString)}
                className={`h-9 sm:h-10 rounded-xl text-xs font-mono flex items-center justify-center transition-all cursor-pointer ${
                  item.isSelected
                    ? 'bg-[#f4a7b9] text-zinc-950 font-bold shadow-[0_0_16px_rgba(244,167,185,0.4)]'
                    : isDisabled
                    ? 'text-zinc-700 cursor-not-allowed opacity-40'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                } ${item.isToday && !item.isSelected ? 'border border-[#f4a7b9]/40 text-[#f4a7b9]' : ''}`}
              >
                {item.dayNumber}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
