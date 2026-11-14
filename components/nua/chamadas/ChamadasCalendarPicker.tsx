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
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono font-medium text-[#f4a7b9]">
          2
        </span>
        <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f4a7b9] font-medium">
          Selecione a Data (Horário de Brasília)
        </h2>
      </div>

      <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300">
        {/* Header do Mês */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.06]">
          <span className="font-serif text-xl sm:text-2xl text-white font-normal">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevMonth}
              aria-label="Mês anterior"
              className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Próximo mês"
              className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center mb-3">
          {WEEKDAYS.map((w, idx) => (
            <span key={idx} className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider py-1">
              {w}
            </span>
          ))}
        </div>

        {/* Grade de Dias */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((item, idx) => {
            if (!item.isCurrentMonth) {
              return <div key={idx} className="w-10 h-10 sm:w-11 sm:h-11 mx-auto" />;
            }

            const isDisabled = item.isPast;

            return (
              <button
                key={idx}
                type="button"
                disabled={isDisabled}
                onClick={() => onSelectDate(item.dateString)}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full text-xs font-mono flex items-center justify-center mx-auto transition-all cursor-pointer ${
                  item.isSelected
                    ? 'bg-[#f4a7b9] text-black font-bold shadow-[0_0_16px_rgba(244,167,185,0.4)]'
                    : isDisabled
                      ? 'text-zinc-700 cursor-not-allowed opacity-25'
                      : 'text-zinc-300 hover:bg-white/[0.08] hover:text-white'
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
