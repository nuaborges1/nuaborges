/* Vinho maduro / Nua Borges */
import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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
  timezoneLabel?: string;
}

export function ChamadasCalendarPicker({
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  calendarDays,
  onSelectDate,
  timezoneLabel = 'Fuso da agenda oficial',
}: ChamadasCalendarPickerProps) {
  return (
    <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#90364B] shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
              Data da Chamada Privativa
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1">
              Selecione no calendário o dia de sua preferência ({timezoneLabel})
            </p>
          </div>
        </div>

        {/* Navegador do Mês */}
        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0 whitespace-nowrap">
          <span className="font-serif text-base sm:text-lg text-white font-normal whitespace-nowrap">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrevMonth}
              aria-label="Mês anterior"
              className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              aria-label="Próximo mês"
              className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grade de Dias do Calendário */}
      <div className="pt-6">
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
                    ? 'bg-gradient-to-br from-[#661C30] to-[#90364B] text-white font-bold shadow-[0_0_16px_rgba(102,28,48,0.55)] border border-white/20'
                    : isDisabled
                      ? 'text-zinc-700 cursor-not-allowed opacity-25'
                      : 'text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                } ${item.isToday && !item.isSelected ? 'border border-[#7A293D]/50 text-[#90364B]' : ''}`}
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
