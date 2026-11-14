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
    <div className="space-y-3.5 text-left">
      <div className="flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-mono font-semibold text-[#f4a7b9]">
          2
        </span>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          Selecione a Data (Horário de Brasília)
        </h2>
      </div>

      <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 sm:p-6 transition-colors">
        {/* Header do Mês */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.05]">
          <span className="font-serif text-base sm:text-lg text-white font-medium">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrevMonth}
              aria-label="Mês anterior"
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Próximo mês"
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEKDAYS.map((w, idx) => (
            <span key={idx} className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
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
                    ? 'bg-[#f4a7b9] text-zinc-950 font-bold shadow-sm'
                    : isDisabled
                    ? 'text-zinc-700 cursor-not-allowed opacity-30'
                    : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
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
