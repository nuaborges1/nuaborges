/* Vinho maduro / Nua Borges — Aba de Calendário V9 */
'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Ban,
  Check,
} from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentScheduleSettings,
  AppointmentModality,
  DEFAULT_SCHEDULE_SETTINGS,
  formatDateForDisplay,
  getScheduleNow,
} from '@/lib/appointmentsCanonical';
import { getDayClosureReason } from '@/lib/appointments/availabilityEngine';

interface CalendarTabProps {
  bookings: AppointmentBooking[];
  settings: AppointmentScheduleSettings;
  modalities: AppointmentModality[];
  onOpenBookingDetails: (booking: AppointmentBooking) => void;
  onToggleDayAvailability: (dateStr: string, open: boolean) => Promise<any>;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

function addDaysISO(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getCallChipClass(b: AppointmentBooking): string {
  if (b.status === 'confirmada') return 'bg-emerald-500/20 text-emerald-300';
  if (b.status === 'concluida') return 'bg-white/10 text-zinc-300';
  if (b.status === 'nao_compareceu') return 'bg-rose-500/20 text-rose-300';
  if (b.status === 'reagendamento_pendente' && b.cancellation?.state !== 'requested') {
    return 'bg-[#843C52]/30 text-[#f4a7b9]';
  }
  return 'bg-amber-500/20 text-amber-300';
}

function getSidebarBadge(b: AppointmentBooking): { label: string; className: string } {
  if (b.status === 'confirmada') {
    return {
      label: 'Confirmada',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    };
  }
  if (b.status === 'concluida') {
    return {
      label: 'Concluída',
      className: 'bg-white/[0.06] text-zinc-300 border-white/10',
    };
  }
  if (b.status === 'nao_compareceu') {
    return {
      label: 'Não compareceu',
      className: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    };
  }
  if (b.status === 'reagendamento_pendente') {
    if (b.cancellation?.state === 'requested') {
      return {
        label: 'Pediu cancelamento',
        className: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
      };
    }
    return {
      label: 'Proposta enviada',
      className: 'bg-[#843C52]/15 text-[#f4a7b9] border-[#843C52]/30',
    };
  }
  return {
    label: 'Aguardando PIX',
    className: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  };
}

export function CalendarTab({
  bookings,
  settings,
  onOpenBookingDetails,
  onToggleDayAvailability,
}: CalendarTabProps) {
  const todayStr = useMemo(
    () => getScheduleNow(settings.timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString,
    [settings.timezone]
  );

  const [calMonth, setCalMonth] = useState<string>(() => todayStr.slice(0, 7) + '-01');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Confirmação ao fechar para novas reservas um dia que já possui chamadas ativas
  const [confirmCloseDate, setConfirmCloseDate] = useState<{
    dateStr: string;
    conflicts: number;
  } | null>(null);

  const curMonthDate = useMemo(() => new Date(`${calMonth}T12:00:00Z`), [calMonth]);
  const curYear = curMonthDate.getUTCFullYear();
  const curMonthIndex = curMonthDate.getUTCMonth();

  const handlePrev = () => {
    if (viewMode === 'month') {
      const d = new Date(Date.UTC(curYear, curMonthIndex - 1, 1, 12, 0, 0));
      const nextMonthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      setCalMonth(nextMonthStr);
      setSelectedDate(nextMonthStr);
    } else {
      const nextDate = addDaysISO(selectedDate, -7);
      setSelectedDate(nextDate);
      setCalMonth(`${nextDate.slice(0, 7)}-01`);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      const d = new Date(Date.UTC(curYear, curMonthIndex + 1, 1, 12, 0, 0));
      const nextMonthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      setCalMonth(nextMonthStr);
      setSelectedDate(nextMonthStr);
    } else {
      const nextDate = addDaysISO(selectedDate, 7);
      setSelectedDate(nextDate);
      setCalMonth(`${nextDate.slice(0, 7)}-01`);
    }
  };

  const handleToday = () => {
    setCalMonth(`${todayStr.slice(0, 7)}-01`);
    setSelectedDate(todayStr);
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setCalMonth(`${dateStr.slice(0, 7)}-01`);
  };

  const monthCells = useMemo(() => {
    const firstDay = new Date(Date.UTC(curYear, curMonthIndex, 1, 12, 0, 0)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(curYear, curMonthIndex + 1, 0, 12, 0, 0)).getUTCDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
    }> = [];

    const prevMonthDays = new Date(Date.UTC(curYear, curMonthIndex, 0, 12, 0, 0)).getUTCDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDay = prevMonthDays - i;
      const prevM = curMonthIndex === 0 ? 12 : curMonthIndex;
      const prevY = curMonthIndex === 0 ? curYear - 1 : curYear;
      cells.push({
        dateStr: `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`,
        dayNumber: prevDay,
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        dateStr: `${curYear}-${String(curMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayNumber: day,
        isCurrentMonth: true,
      });
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nextM = curMonthIndex === 11 ? 1 : curMonthIndex + 2;
      const nextY = curMonthIndex === 11 ? curYear + 1 : curYear;
      for (let day = 1; day <= remaining; day++) {
        cells.push({
          dateStr: `${nextY}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          dayNumber: day,
          isCurrentMonth: false,
        });
      }
    }

    return cells;
  }, [curYear, curMonthIndex]);

  const weekDays = useMemo(() => {
    const sel = new Date(`${selectedDate}T12:00:00Z`);
    const dayOfWeek = sel.getUTCDay();
    const startOfWeekStr = addDaysISO(selectedDate, -dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => addDaysISO(startOfWeekStr, i));
  }, [selectedDate]);

  const selectedDayClosureReason = useMemo(() => {
    return getDayClosureReason(settings, selectedDate, todayStr);
  }, [settings, selectedDate, todayStr]);

  const isPastSelectedDate = selectedDate < todayStr;
  const isSelectedDayOpen = selectedDayClosureReason === null && !isPastSelectedDate;

  const selectedDayCalls = useMemo(() => {
    return bookings
      .filter((b) => b.date === selectedDate && b.status !== 'cancelada')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [bookings, selectedDate]);

  const selectedDayActiveCalls = useMemo(() => {
    return selectedDayCalls.filter((b) => b.status !== 'nao_compareceu' && b.status !== 'concluida');
  }, [selectedDayCalls]);

  const selectedDayOfWeek = useMemo(() => {
    return new Date(`${selectedDate}T12:00:00Z`).getUTCDay();
  }, [selectedDate]);

  const weeklySchedule = settings.weeklyHours[selectedDayOfWeek];

  const closureReasonText = useMemo(() => {
    if (isPastSelectedDate) {
      return 'Data encerrada. Não recebe novas reservas.';
    }
    if (isSelectedDayOpen) {
      if (weeklySchedule?.enabled && weeklySchedule.ranges?.length > 0) {
        const rangesStr = weeklySchedule.ranges.map((r) => `${r.start} às ${r.end}`).join(', ');
        return `Atendimento habitual aberto: ${rangesStr}`;
      }
      return 'Dia liberado para novas reservas.';
    }
    if (selectedDayClosureReason === 'blocked') {
      return 'Fechado manualmente para novas reservas.';
    }
    if (selectedDayClosureReason === 'month') {
      return 'O mês inteiro está fechado no planejamento.';
    }
    if (selectedDayClosureReason === 'weekday') {
      return 'Dia de folga na sua rotina semanal habitual.';
    }
    return 'Dia indisponível para novas reservas.';
  }, [isSelectedDayOpen, selectedDayClosureReason, weeklySchedule, isPastSelectedDate]);

  const handleRequestToggleDay = () => {
    if (isPastSelectedDate) return;
    if (!isSelectedDayOpen) {
      onToggleDayAvailability(selectedDate, true);
      return;
    }
    if (selectedDayActiveCalls.length > 0) {
      setConfirmCloseDate({
        dateStr: selectedDate,
        conflicts: selectedDayActiveCalls.length,
      });
      return;
    }
    onToggleDayAvailability(selectedDate, false);
  };

  return (
    <div className="space-y-5 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Painel do Calendário (7 cols) */}
        <section className="lg:col-span-7 rounded-xl bg-[#14151c] border border-white/[0.07] p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                {MONTH_NAMES[curMonthIndex]} de {curYear}
              </h3>
              <span className="text-xs text-zinc-400 font-light block mt-0.5">
                {viewMode === 'month' ? 'Visão do mês inteiro' : 'Visão de uma semana'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-0.5 rounded-lg bg-[#0e0f14] border border-white/10 flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    viewMode === 'month'
                      ? 'bg-[#843C52] text-white font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Mês
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    viewMode === 'week'
                      ? 'bg-[#843C52] text-white font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Semana
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="h-7 w-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/10 flex items-center justify-center transition cursor-pointer"
                  title="Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="h-7 px-2.5 rounded-lg text-xs font-mono font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="h-7 w-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/10 flex items-center justify-center transition cursor-pointer"
                  title="Próximo"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'month' ? (
            <div>
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-zinc-400 uppercase tracking-wider mb-2">
                <span>DOM</span>
                <span>SEG</span>
                <span>TER</span>
                <span>QUA</span>
                <span>QUI</span>
                <span>SEX</span>
                <span>SÁB</span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthCells.map((cell) => {
                  const isSel = cell.dateStr === selectedDate;
                  const reason = getDayClosureReason(settings, cell.dateStr, todayStr);
                  const isClosed = reason !== null;
                  const dayBookings = bookings
                    .filter((b) => b.date === cell.dateStr && b.status !== 'cancelada')
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <div
                      key={cell.dateStr}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectDate(cell.dateStr)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectDate(cell.dateStr);
                        }
                      }}
                      className={`min-h-[64px] sm:min-h-[72px] p-1.5 rounded-lg border transition-all text-left flex flex-col justify-between relative cursor-pointer ${
                        isSel
                          ? 'bg-[#843C52]/20 border-[#843C52] shadow-sm'
                          : isClosed
                          ? 'bg-[#0e0f14]/50 border-white/[0.03] text-zinc-600 hover:border-white/10'
                          : 'bg-[#101116] border-white/[0.05] text-zinc-300 hover:border-white/20'
                      } ${!cell.isCurrentMonth ? 'opacity-30' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-medium ${
                            isSel ? 'text-[#843C52] font-bold' : ''
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {cell.dateStr === todayStr && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#843C52]"
                            title="Hoje"
                          />
                        )}
                      </div>

                      <div className="space-y-0.5 mt-1">
                        {dayBookings.slice(0, 2).map((b) => (
                          <div
                            key={b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenBookingDetails(b);
                            }}
                            title={`Clique para ver detalhes de ${b.clientName}`}
                            className={`px-1 py-0.5 rounded text-[9px] font-mono leading-none truncate hover:brightness-125 cursor-pointer transition ${getCallChipClass(b)}`}
                          >
                            {b.startTime}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <span className="text-[9px] text-zinc-500 font-mono block">
                            +{dayBookings.length - 2} mais
                          </span>
                        )}
                        {dayBookings.length === 0 && cell.dateStr < todayStr && (
                          <span className="text-[9px] text-zinc-700 font-mono block">Encerrado</span>
                        )}
                        {dayBookings.length === 0 && cell.dateStr >= todayStr && !isClosed && (
                          <span className="text-[9px] text-zinc-600 font-mono block">Livre</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((dStr) => {
                const dateObj = new Date(`${dStr}T12:00:00Z`);
                const isSel = dStr === selectedDate;
                const reason = getDayClosureReason(settings, dStr, todayStr);
                const isClosed = reason !== null;
                const dayBookings = bookings
                  .filter((b) => b.date === dStr && b.status !== 'cancelada')
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <div
                    key={dStr}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectDate(dStr)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectDate(dStr);
                      }
                    }}
                    className={`min-h-[140px] p-2 rounded-lg border transition-all text-left flex flex-col justify-between cursor-pointer ${
                      isSel
                        ? 'bg-[#843C52]/20 border-[#843C52] shadow-sm'
                        : isClosed
                        ? 'bg-[#0e0f14]/50 border-white/[0.03] text-zinc-600 hover:border-white/10'
                        : 'bg-[#101116] border-white/[0.05] text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block">
                        {WEEKDAY_NAMES[dateObj.getUTCDay()].slice(0, 3)}
                      </span>
                      <span className="text-sm font-mono font-semibold text-white block mt-0.5">
                        {dateObj.getUTCDate()}
                      </span>
                    </div>

                    <div className="space-y-1 my-2">
                      {dayBookings.map((b) => (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBookingDetails(b);
                          }}
                          title={`Clique para ver detalhes de ${b.clientName}`}
                          className={`p-1 rounded text-[10px] font-mono leading-tight hover:brightness-125 cursor-pointer transition ${getCallChipClass(b)}`}
                        >
                          <span className="font-bold block">{b.startTime}</span>
                          <span className="truncate block">{(b.clientName || '').split(' ')[0]}</span>
                        </div>
                      ))}
                      {dayBookings.length === 0 && dStr < todayStr && (
                        <span className="text-[10px] text-zinc-700 block pt-4">Encerrado</span>
                      )}
                      {dayBookings.length === 0 && dStr >= todayStr && !isClosed && (
                        <span className="text-[10px] text-zinc-600 block pt-4">Livre</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legenda Padronizada */}
          <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Confirmada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Aguardando PIX / Análise</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#843C52]" />
              <span>Proposta enviada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span>Concluída</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span>Dia fechado</span>
            </div>
          </div>
        </section>

        {/* Painel Lateral: Detalhes do Dia Selecionado (5 cols) */}
        <aside className="lg:col-span-5 rounded-xl bg-[#14151c] border border-white/[0.07] p-5 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                DIA SELECIONADO
              </span>
              <span className="text-xs font-mono text-[#f4a7b9] bg-[#843C52]/15 border border-[#843C52]/30 px-2.5 py-0.5 rounded-full font-semibold">
                {WEEKDAY_NAMES[selectedDayOfWeek]}
              </span>
            </div>

            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                {formatDateForDisplay(selectedDate)}
              </h3>
              <div
                className={`mt-2.5 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  isSelectedDayOpen
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-[#101116] border-white/[0.06] text-zinc-400'
                }`}
              >
                {isSelectedDayOpen ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <Ban className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{closureReasonText}</span>
              </div>
            </div>

            {/* Chamadas do Dia */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-white">Chamadas agendadas</span>
                <span className="text-zinc-400 font-mono text-[11px]">
                  {selectedDayCalls.length} marcada(s)
                </span>
              </div>

              <div className="divide-y divide-white/[0.05] max-h-52 overflow-y-auto overflow-x-hidden pr-0.5">
                {selectedDayCalls.length === 0 ? (
                  <div className="py-6 text-center text-zinc-500 text-xs">
                    Nenhuma chamada agendada para esta data.
                  </div>
                ) : (
                  selectedDayCalls.map((b) => {
                    const badge = getSidebarBadge(b);
                    return (
                      <div
                        key={b.id}
                        onClick={() => onOpenBookingDetails(b)}
                        className="py-2.5 px-2 flex items-center justify-between hover:bg-white/[0.03] rounded-lg cursor-pointer transition-colors"
                      >
                        <div>
                          <span className="text-xs font-medium text-white block">
                            {b.clientName}
                          </span>
                          <span className="text-[11px] text-zinc-400 font-mono block mt-0.5">
                            {b.startTime} · {b.modalityName}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedDayActiveCalls.length > 0 && !isSelectedDayOpen && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    O dia está fechado para novas reservas, mas as chamadas já agendadas permanecem confirmadas.
                  </span>
                </div>
              )}
            </div>

            {/* Ação de Alternar Disponibilidade do Dia */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Receber novas reservas neste dia
                </span>
                <span className="text-[11px] text-zinc-400 font-light block">
                  {isPastSelectedDate
                    ? 'Datas passadas não podem ser alteradas.'
                    : selectedDayActiveCalls.length > 0 && isSelectedDayOpen
                    ? 'Fechar o dia bloqueia apenas novos agendamentos.'
                    : 'Altera se novos agendamentos são permitidos no site.'}
                </span>
              </div>
              {!isPastSelectedDate ? (
                <button
                  type="button"
                  onClick={handleRequestToggleDay}
                  className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 shadow-sm ${
                    isSelectedDayOpen
                      ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isSelectedDayOpen ? 'Fechar dia' : 'Abrir dia'}
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-500 font-mono shrink-0">
                  Encerrado
                </span>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modal ao fechar um dia que já possui chamadas marcadas */}
      {confirmCloseDate && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setConfirmCloseDate(null)}
        >
          <div
            className="w-full max-w-md bg-[#14151c] border border-white/10 rounded-xl shadow-2xl p-6 text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-white text-base tracking-tight">
              Fechar dia para novas reservas ({formatDateForDisplay(confirmCloseDate.dateStr)})?
            </h3>
            <p className="text-zinc-300 text-xs font-light leading-relaxed">
              Esta data já possui <strong>{confirmCloseDate.conflicts} chamada(s) agendada(s)</strong>. Ao fechar o dia, <strong>nenhum novo cliente</strong> poderá reservar horários nesta data, mas os atendimentos já marcados continuarão confirmados.
            </p>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Se você também não puder atender a chamada existente, clique em &ldquo;Gerenciar chamada&rdquo; para propor outro horário ao cliente.
              </span>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08] flex-wrap">
              <button
                type="button"
                onClick={() => setConfirmCloseDate(null)}
                className="px-3.5 py-2 rounded-lg text-xs text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              {selectedDayCalls[0] && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedDayCalls[0];
                    setConfirmCloseDate(null);
                    onOpenBookingDetails(target);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition cursor-pointer"
                >
                  Gerenciar chamada
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const targetDate = confirmCloseDate.dateStr;
                  setConfirmCloseDate(null);
                  onToggleDayAvailability(targetDate, false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition shadow-sm cursor-pointer"
              >
                Fechar para novas reservas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
