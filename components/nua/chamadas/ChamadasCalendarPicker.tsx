/* Vinho maduro / Nua Borges */
import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

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

export interface CalendarDay {
  dateString: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isUnavailable: boolean;
  slotsCount?: number;
  unavailableReason?: string;
  isToday: boolean;
  isSelected: boolean;
}

interface ChamadasCalendarPickerProps {
  currentMonth: number;
  currentYear: number;
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
  loadingMonth?: boolean;
  monthError?: string | null;
  onRetryMonth?: () => void;
  hasAnyAvailableInMonth?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  calendarDays: CalendarDay[];
  onSelectDate: (dateString: string) => void;
  timezoneLabel?: string;
  embedded?: boolean;
}

function getUnavailableTooltip(day: CalendarDay): string {
  if (day.isPast) return 'Data encerrada ou fora da janela de agendamento';
  if (day.unavailableReason === 'weekday') return 'Sem atendimento neste dia da semana';
  if (day.unavailableReason === 'blocked' || day.unavailableReason === 'month') {
    return 'Agenda fechada nesta data';
  }
  if (day.isUnavailable) return 'Nenhum horário livre nesta data';
  if (typeof day.slotsCount === 'number' && day.slotsCount > 0) {
    return `${day.slotsCount} ${day.slotsCount === 1 ? 'horário livre' : 'horários livres'}`;
  }
  return 'Dia disponível';
}

export function ChamadasCalendarPicker({
  currentMonth,
  currentYear,
  canGoPrevMonth,
  canGoNextMonth,
  loadingMonth = false,
  monthError = null,
  onRetryMonth,
  hasAnyAvailableInMonth = true,
  onPrevMonth,
  onNextMonth,
  calendarDays,
  onSelectDate,
  timezoneLabel = 'Fuso da agenda oficial',
  embedded = false,
}: ChamadasCalendarPickerProps) {
  return (
    <div
      className={
        embedded
          ? 'text-left'
          : 'rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-5 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left'
      }
    >
      <div className="flex flex-col gap-4 pb-5 border-b border-white/[0.06]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#661C30]/15 border border-[#7A293D]/30 flex items-center justify-center text-[#F5EEE9] shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#F5EEE9]/80 block">
              Data
            </span>
            <h2 className="font-serif text-xl sm:text-2xl text-[#F5EEE9] font-normal tracking-tight mt-0.5">
              Data da Chamada Privativa
            </h2>
            <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
              Apenas dias com vagas livres ficam habilitados ({timezoneLabel})
            </p>
          </div>
        </div>

        {/* Navegador do Mês */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            {loadingMonth && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#90364B]" />}
            <span className="font-serif text-base sm:text-lg text-[#F5EEE9] font-normal whitespace-nowrap">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onPrevMonth}
              disabled={!canGoPrevMonth}
              aria-label="Mês anterior"
              className="w-11 h-11 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              disabled={!canGoNextMonth}
              aria-label="Próximo mês"
              className="w-11 h-11 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
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
            <span key={idx} className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider py-1">
              {w}
            </span>
          ))}
        </div>

        {/* Grade de Dias */}
        <div
          className={`grid grid-cols-7 gap-1 sm:gap-2 transition-opacity duration-200 ${
            loadingMonth ? 'opacity-55 pointer-events-none' : 'opacity-100'
          }`}
        >
          {calendarDays.map((item, idx) => {
            if (!item.isCurrentMonth) {
              return <div key={idx} className="h-11 w-full max-w-11 mx-auto" />;
            }

            const isBlocked = item.isPast || item.isUnavailable;
            const isAvailable = !isBlocked && !loadingMonth;

            return (
              <button
                key={idx}
                type="button"
                disabled={isBlocked}
                title={getUnavailableTooltip(item)}
                aria-label={`${item.dayNumber} de ${MONTH_NAMES[currentMonth]} — ${getUnavailableTooltip(item)}`}
                aria-pressed={item.isSelected}
                onClick={() => {
                  if (!isBlocked) onSelectDate(item.dateString);
                }}
                className={`relative h-11 w-full min-w-0 max-w-11 rounded-full text-xs font-mono flex flex-col items-center justify-center mx-auto transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B] ${
                  item.isSelected
                    ? 'bg-[#661C30]/45 text-[#F5EEE9] font-bold shadow-[0_0_16px_rgba(102,28,48,0.45)] border border-[#90364B] ring-1 ring-[#90364B]/40 cursor-pointer'
                    : isBlocked
                      ? 'text-zinc-500 bg-white/[0.02] border border-transparent cursor-not-allowed opacity-55 line-through decoration-zinc-500/70'
                      : 'text-[#F5EEE9] border border-transparent hover:bg-[#661C30]/20 hover:border-[#7A293D]/45 hover:text-white cursor-pointer'
                } ${item.isToday && !item.isSelected ? 'ring-1 ring-[#90364B]/55' : ''}`}
              >
                <span className="leading-none">{item.dayNumber}</span>
                {isAvailable && !item.isSelected && (
                  <span
                    aria-hidden="true"
                    className="mt-1 h-1 w-1 rounded-full bg-[#7A293D]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Erro ao carregar disponibilidade (fail-closed) */}
        {!loadingMonth && monthError && (
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-950/25 px-4 py-3 text-xs">
            <span className="text-red-200 font-light">{monthError}</span>
            {onRetryMonth && (
              <button
                type="button"
                onClick={onRetryMonth}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-400/40 bg-red-950/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-red-100 hover:bg-red-900/60 transition-colors shrink-0 cursor-pointer"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {/* Aviso quando o mês inteiro está sem vagas */}
        {!loadingMonth && !monthError && !hasAnyAvailableInMonth && (
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/50 px-4 py-3 text-xs">
            <span className="text-zinc-400 font-light">
              Não há horários livres restantes em {MONTH_NAMES[currentMonth]} para esta modalidade.
            </span>
            {canGoNextMonth && (
              <button
                type="button"
                onClick={onNextMonth}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#7A293D]/50 bg-[#431322]/45 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#F5EEE9] hover:bg-[#661C30] transition-colors shrink-0 cursor-pointer"
              >
                <span>Ver próximo mês</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Legenda discreta */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7A293D]" />
            <span>Com horários livres</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-500 opacity-70" />
            <span>Bloqueado ou lotado</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#661C30]/60 border border-[#90364B]" />
            <span>Dia selecionado</span>
          </span>
        </div>
      </div>
    </div>
  );
}
