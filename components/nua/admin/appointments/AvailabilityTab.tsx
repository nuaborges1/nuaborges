/* Vinho maduro / Nua Borges — Aba de Disponibilidade Integrada com Regras de Proteção */
'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  Plus,
  Ban,
  AlertCircle,
  Sliders,
  ChevronDown,
  RotateCcw,
  Video,
  ArrowRight,
  ShieldAlert,
  Info,
  Clock,
  Lock,
} from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentScheduleSettings,
  AppointmentModality,
  SUPPORTED_TIMEZONES,
  DEFAULT_SCHEDULE_SETTINGS,
  formatDateForDisplay,
  getScheduleNow,
} from '@/lib/appointmentsCanonical';
import {
  getMonthsForYear,
  getExplicitDayOverride,
  getDayClosureReason,
} from '@/lib/appointments/availabilityEngine';

interface AvailabilityTabProps {
  bookings: AppointmentBooking[];
  settings: AppointmentScheduleSettings;
  modalities: AppointmentModality[];
  onOpenBookingDetails: (booking: AppointmentBooking) => void;
  onNavigateTab: (tab: 'overview' | 'bookings' | 'calendar' | 'availability' | 'modalities') => void;
  onSetMonthAvailability: (year: number, monthIndex: number, open: boolean, applyAllDays?: boolean) => Promise<any>;
  onWriteDayAvailability: (dates: string[], open: boolean) => Promise<any>;
  onSaveSettings: (customSettings?: AppointmentScheduleSettings) => Promise<any>;
  onOpenBlockPeriodModal?: () => void;
  showToast?: (msg: string) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

/**
 * Regra Canônica: Qualquer reserva não cancelada (e não ausente) em uma data ocupa a agenda daquele dia.
 */
function isScheduledBookingOnDay(b: AppointmentBooking): boolean {
  return b.status !== 'cancelada' && b.status !== 'nao_compareceu';
}

function timeToMinutes(t: string): number {
  if (!/^\d{2}:\d{2}$/.test(t || '')) return NaN;
  const [h, m] = t.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? h * 60 + m : NaN;
}

export function AvailabilityTab({
  bookings,
  settings,
  onOpenBookingDetails,
  onNavigateTab,
  onSetMonthAvailability,
  onWriteDayAvailability,
  onSaveSettings,
  onOpenBlockPeriodModal,
  showToast,
}: AvailabilityTabProps) {
  const todayStr = useMemo(
    () => getScheduleNow(settings.timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString,
    [settings.timezone]
  );
  const thisYear = useMemo(() => Number(todayStr.slice(0, 4)), [todayStr]);
  const thisMonthIndex = useMemo(() => Number(todayStr.slice(5, 7)) - 1, [todayStr]);

  const [availYear, setAvailYear] = useState<number>(thisYear);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(thisMonthIndex);
  const [daySelectionMode, setDaySelectionMode] = useState<boolean>(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  // Estado local para os horários semanais para evitar conflitos de renderização e requisições prematuras
  const [localWeeklyHours, setLocalWeeklyHours] = useState(() => settings.weeklyHours || DEFAULT_SCHEDULE_SETTINGS.weeklyHours);

  React.useEffect(() => {
    if (settings.weeklyHours) {
      setLocalWeeklyHours(settings.weeklyHours);
    }
  }, [settings.weeklyHours]);

  // Se o ano for o atual e o mês selecionado estiver no passado (encerrado), avança para o mês atual
  React.useEffect(() => {
    if (availYear === thisYear && selectedMonthIndex < thisMonthIndex) {
      setSelectedMonthIndex(thisMonthIndex);
    }
  }, [availYear, thisYear, selectedMonthIndex, thisMonthIndex]);

  // Modal de Regra quando o usuário clica em um dia que possui horário marcado ou já passou
  const [protectedDayModal, setProtectedDayModal] = useState<{
    dateStr: string;
    dayBookings: AppointmentBooking[];
    isPast: boolean;
  } | null>(null);

  // Modal de confirmação quando houver impacto em meses ou rotina
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    warning?: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const yearMonths = useMemo(() => {
    return getMonthsForYear(settings, availYear);
  }, [settings, availYear]);

  // Estatísticas dos 12 meses do ano — datas e meses passados NUNCA contam como livres
  const monthStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const daysInMonth = new Date(availYear, m + 1, 0).getDate();
      const dates = Array.from({ length: daysInMonth }, (_, i) => {
        return `${availYear}-${String(m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      });

      const isPastMonth = availYear < thisYear || (availYear === thisYear && m < thisMonthIndex);
      const isCurrentMonth = availYear === thisYear && m === thisMonthIndex;
      const remainingDates = dates.filter((d) => d >= todayStr);

      const openDays = isPastMonth
        ? 0
        : remainingDates.filter((d) => getDayClosureReason(settings, d, todayStr) === null).length;

      const changes = isPastMonth
        ? 0
        : remainingDates.filter((d) => getExplicitDayOverride(settings, d) !== null).length;

      const monthBookings = bookings.filter((b) => {
        const [by, bm] = b.date.split('-').map(Number);
        return by === availYear && bm === m + 1 && isScheduledBookingOnDay(b);
      });
      const futureBookings = monthBookings.filter((b) => b.date >= todayStr);

      const totalMeasurable = isCurrentMonth ? remainingDates.length : daysInMonth;
      const closedDays = isPastMonth ? daysInMonth : Math.max(0, totalMeasurable - openDays);

      return {
        monthIndex: m,
        monthName: MONTH_NAMES[m],
        total: daysInMonth,
        remaining: remainingDates.length,
        open: openDays,
        closed: closedDays,
        changes,
        isPastMonth,
        isCurrentMonth,
        bookings: isPastMonth ? monthBookings.length : futureBookings.length,
        bookingsList: monthBookings,
        baseline: yearMonths[m],
      };
    });
  }, [settings, availYear, yearMonths, bookings, todayStr, thisYear, thisMonthIndex]);

  // Contadores inteligentes de meses futuros/restantes
  const remainingMonths = useMemo(() => monthStats.filter((s) => !s.isPastMonth), [monthStats]);
  const openRemainingMonths = useMemo(() => remainingMonths.filter((s) => s.open > 0).length, [remainingMonths]);

  // Células completas do mês selecionado
  const monthCells = useMemo(() => {
    const firstDay = new Date(availYear, selectedMonthIndex, 1).getDay();
    const daysInMonth = new Date(availYear, selectedMonthIndex + 1, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
    }> = [];

    const prevMonthDays = new Date(availYear, selectedMonthIndex, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDay = prevMonthDays - i;
      const prevM = selectedMonthIndex === 0 ? 12 : selectedMonthIndex;
      const prevY = selectedMonthIndex === 0 ? availYear - 1 : availYear;
      cells.push({
        dateStr: `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`,
        dayNumber: prevDay,
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        dateStr: `${availYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayNumber: day,
        isCurrentMonth: true,
      });
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nextM = selectedMonthIndex === 11 ? 1 : selectedMonthIndex + 2;
      const nextY = selectedMonthIndex === 11 ? availYear + 1 : availYear;
      for (let day = 1; day <= remaining; day++) {
        cells.push({
          dateStr: `${nextY}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          dayNumber: day,
          isCurrentMonth: false,
        });
      }
    }

    return cells;
  }, [availYear, selectedMonthIndex]);

  const currentMonthStat = monthStats[selectedMonthIndex];

  const handlePrevYear = () => {
    if (availYear <= thisYear) return;
    setAvailYear((y) => y - 1);
    setSelectedDays(new Set());
  };

  const handlePrevMonth = () => {
    // Bloqueia voltar para meses encerrados
    if (availYear === thisYear && selectedMonthIndex <= thisMonthIndex) {
      return;
    }
    if (selectedMonthIndex === 0) {
      if (availYear - 1 < thisYear) return;
      setAvailYear((y) => y - 1);
      setSelectedMonthIndex(11);
    } else {
      setSelectedMonthIndex((m) => m - 1);
    }
    setSelectedDays(new Set());
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setAvailYear((y) => y + 1);
      setSelectedMonthIndex(0);
    } else {
      setSelectedMonthIndex((m) => m + 1);
    }
    setSelectedDays(new Set());
  };

  // Regra para fechar/abrir mês inteiro:
  // Se o mês possui chamadas agendadas, NÃO cancela e NÃO fecha os dias com chamadas!
  const requestMonthSet = (mIndex: number, on: boolean) => {
    const current = monthStats[mIndex];
    if (current.isPastMonth) {
      if (showToast) showToast(`${MONTH_NAMES[mIndex]} de ${availYear} já foi encerrado e não pode ser alterado.`);
      return;
    }
    const futureCallsInMonth = current.bookingsList.filter((b) => b.date >= todayStr);

    if (!on && futureCallsInMonth.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: `Fechar ${MONTH_NAMES[mIndex]} de ${availYear}?`,
        message: `Todos os dias de ${MONTH_NAMES[mIndex]} serão fechados para novas reservas no site.`,
        warning: `Existe(m) ${futureCallsInMonth.length} chamada(s) já agendada(s) neste mês. Elas permanecerão confirmadas normalmente na sua agenda, mas nenhum novo cliente poderá agendar neste mês.`,
        confirmLabel: 'Fechar para novas reservas',
        danger: true,
        onConfirm: async () => {
          setSelectedMonthIndex(mIndex);
          setSelectedDays(new Set());
          await onSetMonthAvailability(availYear, mIndex, false);
          setConfirmDialog(null);
        },
      });
      return;
    }

    if (current.changes > 0) {
      setConfirmDialog({
        isOpen: true,
        title: `${on ? 'Aplicar rotina em ' : 'Fechar '}${MONTH_NAMES[mIndex]}?`,
        message: on
          ? `Todos os dias de ${MONTH_NAMES[mIndex]} voltarão a seguir os horários padrão da sua semana.`
          : `Novas reservas ficarão indisponíveis em ${MONTH_NAMES[mIndex]} de ${availYear}.`,
        warning: `${current.changes} dia(s) ajustado(s) manualmente serão redefinidos.`,
        confirmLabel: on ? 'Aplicar rotina' : 'Fechar mês',
        danger: !on,
        onConfirm: () => {
          setSelectedMonthIndex(mIndex);
          setSelectedDays(new Set());
          onSetMonthAvailability(availYear, mIndex, on);
          setConfirmDialog(null);
        },
      });
      return;
    }

    setSelectedMonthIndex(mIndex);
    setSelectedDays(new Set());
    onSetMonthAvailability(availYear, mIndex, on);
  };

  /**
   * REGRA DE CLIQUE NO DIA DA AGENDA:
   * 1. Se pertence a outro mês da borda, navega para aquele mês.
   * 2. Se o dia já passou (dateStr < todayStr):
   *    - Se tiver chamada, abre para consulta histórica.
   *    - Se não tiver, avisa que data passada está encerrada. NUNCA reabre data passada!
   * 3. Se o dia tem chamada agendada (dayBookings.length > 0):
   *    - NUNCA desabilita o dia silenciosamente! Abre o diálogo de proteção.
   * 4. Se for dia livre futuro: alterna entre Livre e Fechado (ou seleciona em lote).
   */
  const handleDayClick = (dateStr: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      const [y, m] = dateStr.split('-').map(Number);
      setAvailYear(y);
      setSelectedMonthIndex(m - 1);
      setSelectedDays(new Set());
      return;
    }

    const isPast = dateStr < todayStr;
    const dayBookings = bookings
      .filter((b) => b.date === dateStr && isScheduledBookingOnDay(b))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Data passada: bloqueada para edição
    if (isPast) {
      if (dayBookings.length > 0) {
        onOpenBookingDetails(dayBookings[0]);
        return;
      }
      if (showToast) {
        showToast('Datas passadas já foram encerradas e não recebem agendamentos.');
      }
      return;
    }

    // REGRA DE PROTEÇÃO: Dia com chamada marcada abre o modal de gerenciamento (ver chamadas ou fechar o restante do dia para novas reservas)
    if (dayBookings.length > 0) {
      if (daySelectionMode) {
        const next = new Set(selectedDays);
        if (next.has(dateStr)) next.delete(dateStr);
        else next.add(dateStr);
        setSelectedDays(next);
        return;
      }
      setProtectedDayModal({ dateStr, dayBookings, isPast: false });
      return;
    }

    if (daySelectionMode) {
      const next = new Set(selectedDays);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      setSelectedDays(next);
      return;
    }

    const isClosed = getDayClosureReason(settings, dateStr, todayStr) !== null;
    onWriteDayAvailability([dateStr], isClosed);
  };

  // Aplicação em lote para dias selecionados
  const handleApplySelectedDays = (open: boolean) => {
    const rawDates = [...selectedDays].sort();
    if (rawDates.length === 0) return;

    const validFutureDates = rawDates.filter((d) => d >= todayStr);
    if (validFutureDates.length === 0) {
      if (showToast) {
        showToast('Selecione datas de hoje em diante para alterar.');
      }
      return;
    }

    onWriteDayAvailability(validFutureDates, open);
    setSelectedDays(new Set());
  };

  // Horários da semana: Alternar dia
  const handleToggleWeeklyDay = (dayIndex: number) => {
    const current = localWeeklyHours[dayIndex] || settings.weeklyHours?.[dayIndex];
    const willEnable = !current?.enabled;

    const newWeeklyHours = {
      ...localWeeklyHours,
      [dayIndex]: {
        enabled: willEnable,
        ranges:
          willEnable && (!current?.ranges || current.ranges.length === 0)
            ? [{ start: '14:00', end: '20:00' }]
            : current?.ranges || [{ start: '14:00', end: '20:00' }],
      },
    };

    setLocalWeeklyHours(newWeeklyHours);

    onSaveSettings({
      ...settings,
      weeklyHours: newWeeklyHours,
    });
  };

  // Horários da semana: Alteração local imediata preservando eventuais turnos adicionais
  const handleLocalTimeChange = (dayIndex: number, field: 'start' | 'end', val: string) => {
    setLocalWeeklyHours((prev) => {
      const current = prev[dayIndex] || settings.weeklyHours?.[dayIndex] || { enabled: true, ranges: [{ start: '14:00', end: '20:00' }] };
      const currentRange = current.ranges?.[0] || { start: '14:00', end: '20:00' };
      const extraRanges = (current.ranges || []).slice(1);
      return {
        ...prev,
        [dayIndex]: {
          ...current,
          enabled: true,
          ranges: [
            {
              start: field === 'start' ? val : currentRange.start,
              end: field === 'end' ? val : currentRange.end,
            },
            ...extraRanges,
          ],
        },
      };
    });
  };

  // Persiste horário da semana somente ao sair do campo (onBlur) e se estiver válido
  const handleTimeCommit = (dayIndex: number) => {
    const daySched = localWeeklyHours[dayIndex];
    const range = daySched?.ranges?.[0] || { start: '14:00', end: '20:00' };
    const extraRanges = (daySched?.ranges || []).slice(1);
    const startMin = timeToMinutes(range.start);
    const endMin = timeToMinutes(range.end);

    if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin - startMin < 10) {
      if (showToast) {
        showToast('O horário final precisa ser pelo menos 10 minutos após o horário inicial.');
      }
      const fallback = settings.weeklyHours?.[dayIndex]?.ranges?.[0] || { start: '14:00', end: '20:00' };
      const fallbackExtras = (settings.weeklyHours?.[dayIndex]?.ranges || []).slice(1);
      setLocalWeeklyHours((prev) => ({
        ...prev,
        [dayIndex]: {
          ...(prev[dayIndex] || { enabled: true }),
          ranges: [fallback, ...fallbackExtras],
        },
      }));
      return;
    }

    const existingRange = settings.weeklyHours?.[dayIndex]?.ranges?.[0];
    if (existingRange?.start === range.start && existingRange?.end === range.end) {
      return;
    }

    const updatedWeeklyHours = {
      ...settings.weeklyHours,
      ...localWeeklyHours,
      [dayIndex]: {
        enabled: true,
        ranges: [{ start: range.start, end: range.end }, ...extraRanges],
      },
    };

    onSaveSettings({
      ...settings,
      weeklyHours: updatedWeeklyHours,
    });
  };

  // Repetir horários de segunda nos dias úteis (Seg a Sex)
  const handleCopyMondayToWeekdays = () => {
    const monday = localWeeklyHours[1] || settings.weeklyHours?.[1] || {
      enabled: true,
      ranges: [{ start: '14:00', end: '20:00' }],
    };
    const firstRange = monday.ranges?.[0] || { start: '14:00', end: '20:00' };
    const startMin = timeToMinutes(firstRange.start);
    const endMin = timeToMinutes(firstRange.end);
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || endMin - startMin < 10) {
      if (showToast) {
        showToast('Ajuste um horário válido na segunda-feira antes de repetir para a semana.');
      }
      return;
    }
    const copiedRanges = monday.ranges?.length
      ? monday.ranges.map((r) => ({ ...r }))
      : [{ start: '14:00', end: '20:00' }];

    const newWeeklyHours = { ...localWeeklyHours };
    for (let d = 2; d <= 5; d++) {
      newWeeklyHours[d] = {
        enabled: monday.enabled,
        ranges: copiedRanges.map((r) => ({ ...r })),
      };
    }

    setLocalWeeklyHours(newWeeklyHours);
    onSaveSettings({ ...settings, weeklyHours: newWeeklyHours });
    if (showToast) {
      showToast(
        monday.enabled
          ? `Horário de segunda (${firstRange.start} às ${firstRange.end}) aplicado de segunda a sexta.`
          : 'Segunda a sexta marcadas como folga semanal.'
      );
    }
  };

  const activeWeeklyDaysCount = useMemo(() => {
    return Object.values(localWeeklyHours || {}).filter(
      (w) => w?.enabled && w?.ranges?.length > 0
    ).length;
  }, [localWeeklyHours]);

  const currentAdvanceDays = settings.advanceDays ?? settings.maxFutureDays ?? 120;

  return (
    <div className="space-y-6 text-left">
      {/* SEÇÃO 1: WORKSPACE PRINCIPAL (Meses + Calendário de Dias + Resumo do Mês V9) */}
      <section className="p-5 sm:p-6 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-6">
        {/* Topo: Título + Ações Rápidas + Ano */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              Disponibilidade ({availYear})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Escolha o mês, defina os dias abertos para novas reservas e acompanhe seus atendimentos agendados.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenBlockPeriodModal && (
              <button
                type="button"
                onClick={onOpenBlockPeriodModal}
                className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition cursor-pointer flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>Marcar Folga / Férias</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateTab('calendar')}
              className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition cursor-pointer flex items-center gap-1.5"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#843C52]" />
              <span>Ver no Calendário</span>
            </button>

            <div className="flex items-center gap-1 bg-[#0e0f14] border border-white/10 p-1 rounded-lg">
              <button
                type="button"
                disabled={availYear <= thisYear}
                onClick={handlePrevYear}
                className="h-6 w-6 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                title="Ano anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-xs font-bold text-white px-3">{availYear}</span>
              <button
                type="button"
                onClick={() => {
                  setAvailYear((y) => y + 1);
                  setSelectedDays(new Set());
                }}
                className="h-6 w-6 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer"
                title="Próximo ano"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Meses: 12 Cartões Compactos com Inteligência de Bloqueio Passado */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2.5">
            <span className="uppercase tracking-wider font-semibold">MESES DO ANO</span>
            <span className="text-zinc-400">
              {remainingMonths.length === 0
                ? 'Ano encerrado'
                : `${openRemainingMonths} de ${remainingMonths.length} ${
                    remainingMonths.length === 1 ? 'mês restante aberto' : 'meses restantes abertos'
                  }`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {monthStats.map((s) => {
              const isSelected = s.monthIndex === selectedMonthIndex;
              const isPast = s.isPastMonth;
              const isOpen = !isPast && s.open > 0;

              return (
                <div
                  key={s.monthIndex}
                  onClick={
                    isPast
                      ? undefined
                      : () => {
                          setSelectedMonthIndex(s.monthIndex);
                          setSelectedDays(new Set());
                        }
                  }
                  title={
                    isPast
                      ? `${s.monthName} encerrado`
                      : isOpen
                      ? `${s.monthName} (${s.open} dias livres)`
                      : `${s.monthName} (fechado)`
                  }
                  className={`p-3 rounded-lg border transition-all text-left flex items-center justify-between gap-2 ${
                    isPast
                      ? 'bg-[#0e0f14]/30 border-white/[0.02] opacity-35 cursor-not-allowed select-none'
                      : isSelected
                      ? 'bg-[#843C52]/20 border-[#843C52] shadow-sm cursor-pointer'
                      : isOpen
                      ? 'bg-[#101116] border-white/[0.05] hover:border-white/20 cursor-pointer'
                      : 'bg-[#0e0f14]/50 border-white/[0.03] text-zinc-600 hover:border-white/10 cursor-pointer'
                  }`}
                >
                  <div className="min-w-0">
                    <b
                      className={`text-xs block font-semibold truncate ${
                        isPast
                          ? 'text-zinc-500'
                          : isSelected
                          ? 'text-white'
                          : isOpen
                          ? 'text-zinc-200'
                          : 'text-zinc-500'
                      }`}
                    >
                      {s.monthName}
                      {s.isCurrentMonth && (
                        <span className="ml-1.5 text-[9px] font-mono text-[#f4a7b9] align-middle">atual</span>
                      )}
                    </b>
                    <span className="text-[10px] text-zinc-500 font-mono block mt-0.5 truncate">
                      {isPast
                        ? 'Encerrado'
                        : isOpen
                        ? `${s.open} ${s.open === 1 ? 'dia livre' : 'dias livres'}`
                        : 'Fechado'}
                      {s.bookings > 0 ? ` · ${s.bookings} cham.` : ''}
                    </span>
                  </div>

                  {isPast ? (
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-zinc-600 border border-white/[0.04]"
                      title="Mês encerrado"
                    >
                      <Lock className="w-3 h-3 text-zinc-600" />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestMonthSet(s.monthIndex, !isOpen);
                      }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                        isOpen
                          ? 'bg-white/[0.05] text-zinc-300 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10'
                          : 'bg-white/[0.03] text-zinc-500 hover:bg-emerald-500/20 hover:text-emerald-300 border border-white/[0.06]'
                      }`}
                      title={isOpen ? `Fechar ${s.monthName} para novas reservas` : `Abrir ${s.monthName} com rotina semanal`}
                    >
                      {isOpen ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendário de Dias do Mês (Visão Completa) */}
        <div className="border-t border-white/[0.06] pt-5 space-y-3.5">
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.04]">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white tracking-tight">
                    {MONTH_NAMES[selectedMonthIndex]} de {availYear}
                  </h4>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {currentMonthStat.isPastMonth
                      ? '(mês encerrado)'
                      : currentMonthStat.isCurrentMonth
                      ? `(${currentMonthStat.open} de ${currentMonthStat.remaining} dias restantes livres)`
                      : `(${currentMonthStat.open} de ${currentMonthStat.total} livres)`}
                  </span>
                </div>
                <span className="text-xs text-zinc-400 font-light block mt-0.5">
                  {currentMonthStat.isPastMonth
                    ? 'Mês encerrado: apenas consulta histórica. Clique em uma chamada para ver detalhes.'
                    : daySelectionMode
                    ? 'Clique nos dias livres que deseja abrir ou fechar em lote.'
                    : 'Clique em um dia livre para abrir/fechar, ou em um dia com chamada para gerenciar.'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {currentMonthStat.changes > 0 && !daySelectionMode && !currentMonthStat.isPastMonth && (
                  <button
                    type="button"
                    onClick={() => requestMonthSet(selectedMonthIndex, true)}
                    className="h-7 px-2.5 rounded-lg text-xs text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition cursor-pointer flex items-center gap-1"
                    title="Voltar todos os dias deste mês para a rotina semanal padrão"
                  >
                    <RotateCcw className="w-3 h-3 text-[#843C52]" />
                    <span>Voltar à rotina</span>
                  </button>
                )}

                {!currentMonthStat.isPastMonth && !daySelectionMode && (
                  <button
                    type="button"
                    onClick={() => requestMonthSet(selectedMonthIndex, currentMonthStat.open === 0)}
                    className="h-7 px-2.5 rounded-lg text-xs text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                    title={currentMonthStat.open > 0 ? `Fechar todos os dias de ${MONTH_NAMES[selectedMonthIndex]}` : `Abrir ${MONTH_NAMES[selectedMonthIndex]} com minha rotina`}
                  >
                    {currentMonthStat.open > 0 ? (
                      <>
                        <Ban className="w-3 h-3 text-rose-400" />
                        <span>Fechar mês</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Usar minha rotina</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  disabled={availYear < thisYear || (availYear === thisYear && selectedMonthIndex <= thisMonthIndex)}
                  onClick={handlePrevMonth}
                  className="h-7 w-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/10 flex items-center justify-center transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="h-7 w-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/10 flex items-center justify-center transition cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentMonthStat.isPastMonth}
                  onClick={() => {
                    setDaySelectionMode(!daySelectionMode);
                    setSelectedDays(new Set());
                  }}
                  className={`h-7 px-3 rounded-lg text-xs font-mono font-medium transition cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed ${
                    daySelectionMode
                      ? 'bg-[#843C52] text-white border-[#843C52] shadow-xs'
                      : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {daySelectionMode ? 'Concluir' : 'Selecionar vários'}
                </button>
              </div>
            </div>

            {/* Grade de Dias */}
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
                  const isPast = cell.dateStr < todayStr;
                  const reason = getDayClosureReason(settings, cell.dateStr, todayStr);
                  const isClosed = reason !== null;
                  const isCustom = !isPast && getExplicitDayOverride(settings, cell.dateStr) !== null;
                  const isToday = cell.dateStr === todayStr;
                  const isPicked = selectedDays.has(cell.dateStr);
                  const isHighlighted = isPicked || isToday;
                  const dayBookings = bookings
                    .filter((b) => b.date === cell.dateStr && isScheduledBookingOnDay(b))
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <div
                      key={cell.dateStr}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleDayClick(cell.dateStr, cell.isCurrentMonth)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleDayClick(cell.dateStr, cell.isCurrentMonth);
                        }
                      }}
                      title={
                        isPast
                          ? `Data passada (${formatDateForDisplay(cell.dateStr)})`
                          : dayBookings.length > 0
                          ? `Dia com ${dayBookings.length} chamada(s) agendada(s). Clique para gerenciar.`
                          : isClosed
                          ? `Dia fechado (${reason === 'weekday' ? 'Folga semanal' : 'Fechado'})`
                          : 'Dia livre para agendamentos'
                      }
                      className={`min-h-[64px] sm:min-h-[72px] p-1.5 rounded-lg border transition-all text-left flex flex-col justify-between relative ${
                        !cell.isCurrentMonth
                          ? 'opacity-25 cursor-pointer'
                          : isPast && dayBookings.length === 0
                          ? 'opacity-40 cursor-not-allowed bg-[#0e0f14]/40 border-white/[0.02]'
                          : 'cursor-pointer'
                      } ${
                        isHighlighted
                          ? 'bg-[#843C52]/20 border-[#843C52] shadow-sm'
                          : isPast && dayBookings.length > 0
                          ? 'bg-[#101116] border-white/[0.08] hover:border-white/20'
                          : isClosed && dayBookings.length === 0
                          ? 'bg-[#0e0f14]/50 border-white/[0.03] text-zinc-600 hover:border-white/10'
                          : 'bg-[#101116] border-white/[0.05] text-zinc-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-medium ${
                            isHighlighted ? 'text-[#f4a7b9] font-bold' : isPast ? 'text-zinc-600' : ''
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {(isToday || isCustom || isPicked) && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#843C52]"
                            title={
                              isToday
                                ? 'Hoje'
                                : isCustom
                                ? 'Ajustado manualmente'
                                : 'Selecionado'
                            }
                          />
                        )}
                      </div>

                      <div className="space-y-0.5 mt-1">
                        {/* Chips das chamadas marcadas com clique direto no atendimento */}
                        {dayBookings.slice(0, 2).map((b) => (
                          <div
                            key={b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenBookingDetails(b);
                            }}
                            title={`${b.startTime} · ${b.clientName} (Clique para gerenciar)`}
                            className={`px-1 py-0.5 rounded text-[9px] font-mono leading-none truncate hover:brightness-125 transition ${
                              b.status === 'confirmada'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {b.startTime}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <span className="text-[9px] text-zinc-500 font-mono block">
                            +{dayBookings.length - 2} mais
                          </span>
                        )}
                        {dayBookings.length === 0 && isPast && cell.isCurrentMonth && (
                          <span className="text-[9px] text-zinc-700 font-mono block">Encerrado</span>
                        )}
                        {dayBookings.length === 0 && !isPast && !isClosed && (
                          <span className="text-[9px] text-zinc-600 font-mono block">
                            {daySelectionMode && isPicked ? 'Marcado' : 'Livre'}
                          </span>
                        )}
                        {dayBookings.length === 0 && !isPast && isClosed && (
                          <span className="text-[9px] text-zinc-700 font-mono block">
                            {reason === 'weekday' ? 'Folga' : 'Fechado'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Barra de Seleção em Lote */}
            {daySelectionMode && (
              <div className="p-3 rounded-lg bg-[#101116] border border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-zinc-300">
                  <b>{selectedDays.size}</b>{' '}
                  {selectedDays.size === 1 ? 'dia selecionado' : 'dias selecionados'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectedDays.size === 0}
                    onClick={() => handleApplySelectedDays(true)}
                    className="h-7 px-3 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/25 text-xs font-medium disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Abrir</span>
                  </button>
                  <button
                    type="button"
                    disabled={selectedDays.size === 0}
                    onClick={() => handleApplySelectedDays(false)}
                    className="h-7 px-3 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/25 text-xs font-medium disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Fechar</span>
                  </button>
                  <button
                    type="button"
                    disabled={selectedDays.size === 0}
                    onClick={() => setSelectedDays(new Set())}
                    className="h-7 px-2.5 rounded-lg text-zinc-400 hover:text-white text-xs transition cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}

            {/* Legenda Simples */}
            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Confirmada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Pendência</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#843C52]" />
                <span>Hoje / Ajustado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-600" />
                <span>Fechado / Folga</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-600" />
                <span>Encerrado</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: HORÁRIOS HABITUAIS (Rotina Semanal Dedicada) */}
      <section className="p-5 sm:p-6 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#843C52]" />
              <span>Horários Habituais (Sua Rotina Semanal)</span>
            </h4>
            <p className="text-xs text-zinc-400 font-light mt-0.5">
              Esses são seus horários padrão de atendimento. O cliente escolhe a hora desejada no site dentro desses períodos. Para folgas em dias específicos, clique diretamente no calendário acima.
            </p>
          </div>
          <span className="text-xs font-mono text-[#f4a7b9] bg-[#843C52]/15 border border-[#843C52]/30 px-3 py-1 rounded-full font-semibold shrink-0">
            {activeWeeklyDaysCount} de 7 dias ativos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 divide-y md:divide-y-0 divide-white/[0.04]">
          {WEEKDAY_NAMES.map((name, i) => {
            const daySched = localWeeklyHours[i] || settings.weeklyHours?.[i];
            const isEnabled = Boolean(daySched?.enabled);
            const range = daySched?.ranges?.[0] || { start: '14:00', end: '20:00' };

            return (
              <div
                key={i}
                className="p-3 rounded-lg bg-[#101116] border border-white/[0.04] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleWeeklyDay(i)}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 border ${
                      isEnabled ? 'bg-[#843C52] border-[#843C52]' : 'bg-white/10 border-white/10'
                    }`}
                    aria-label={`Alternar ${name}`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${
                        isEnabled ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs font-medium truncate ${
                      isEnabled ? 'text-white' : 'text-zinc-500'
                    }`}
                  >
                    {name}
                  </span>
                </div>

                {isEnabled ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="time"
                      value={range.start}
                      onChange={(e) =>
                        handleLocalTimeChange(i, 'start', e.target.value)
                      }
                      onBlur={() => handleTimeCommit(i)}
                      className="px-2 py-1 rounded-lg bg-[#0e0f14] border border-white/10 text-white text-xs font-mono focus:border-[#843C52] focus:outline-none"
                    />
                    <span className="text-[11px] text-zinc-500 font-mono">às</span>
                    <input
                      type="time"
                      value={range.end}
                      onChange={(e) =>
                        handleLocalTimeChange(i, 'end', e.target.value)
                      }
                      onBlur={() => handleTimeCommit(i)}
                      className="px-2 py-1 rounded-lg bg-[#0e0f14] border border-white/10 text-white text-xs font-mono focus:border-[#843C52] focus:outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-600 shrink-0">
                    Folga na semana
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-zinc-400 font-light flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#843C52] shrink-0" />
            <span>Dica: Você pode padronizar o expediente comercial em 1 clique.</span>
          </p>
          <button
            type="button"
            onClick={handleCopyMondayToWeekdays}
            className="h-8 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition cursor-pointer"
          >
            Repetir horário de segunda nos dias úteis (Seg a Sex)
          </button>
        </div>
      </section>

      {/* SEÇÃO 3: REGRAS DE RESERVA E FUSO (Opcional e Recolhido) */}
      <details className="group rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm overflow-hidden">
        <summary className="cursor-pointer p-4 sm:p-5 flex items-center justify-between gap-3 list-none select-none hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-[#843C52]" />
            <span className="text-sm font-semibold text-white">Regras de reserva e fuso horário</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-normal">Opcional</span>
            <ChevronDown className="w-4 h-4 text-zinc-400 transition-transform group-open:rotate-180" />
          </div>
        </summary>

        <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-white/[0.06] space-y-4">
          <p className="text-xs text-zinc-400 font-light">
            Regras aplicadas automaticamente quando o cliente escolhe a hora desejada na página de agendamento.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">
                Pausa entre chamadas
              </label>
              <select
                value={settings.bufferMinutes ?? 15}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onSaveSettings({ ...settings, bufferMinutes: val, gapMinutes: val });
                }}
                className="w-full h-9 px-3 rounded-lg bg-[#0e0f14] border border-white/10 text-white text-xs cursor-pointer focus:border-[#843C52] focus:outline-none"
              >
                {[0, 5, 10, 15, 30].map((v) => (
                  <option key={v} value={v} className="bg-[#14151c]">
                    {v} minutos
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">
                Antecedência mínima
              </label>
              <select
                value={settings.minNoticeHours ?? 4}
                onChange={(e) =>
                  onSaveSettings({ ...settings, minNoticeHours: Number(e.target.value) })
                }
                className="w-full h-9 px-3 rounded-lg bg-[#0e0f14] border border-white/10 text-white text-xs cursor-pointer focus:border-[#843C52] focus:outline-none"
              >
                {[0, 1, 2, 4, 12, 24].map((v) => (
                  <option key={v} value={v} className="bg-[#14151c]">
                    {v} hora(s)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">
                Reservar com até
              </label>
              <select
                value={[30, 60, 90, 120, 180, 365].includes(currentAdvanceDays) ? currentAdvanceDays : 90}
                onChange={(e) => {
                  const days = Number(e.target.value);
                  onSaveSettings({
                    ...settings,
                    advanceDays: days,
                    maxFutureDays: days,
                    maxAdvanceMonths: Math.max(1, Math.round(days / 30)),
                  });
                }}
                className="w-full h-9 px-3 rounded-lg bg-[#0e0f14] border border-white/10 text-white text-xs cursor-pointer focus:border-[#843C52] focus:outline-none"
              >
                {[30, 60, 90, 120, 180, 365].map((v) => (
                  <option key={v} value={v} className="bg-[#14151c]">
                    {v} dias
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">
                Fuso horário da agenda
              </label>
              <select
                value={settings.timezone || 'Europe/Dublin'}
                onChange={(e) => onSaveSettings({ ...settings, timezone: e.target.value })}
                className="w-full h-9 px-3 rounded-lg bg-[#0e0f14] border border-white/10 text-white text-xs cursor-pointer focus:border-[#843C52] focus:outline-none"
              >
                {SUPPORTED_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value} className="bg-[#14151c]">
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </details>

      {/* MODAL INTELIGENTE DE PROTEÇÃO: CLIQUE EM DIA COM CHAMADA OU DATA PASSADA */}
      {protectedDayModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#14151c] border border-white/10 rounded-xl shadow-2xl p-6 text-left space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                  protectedDayModal.isPast
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                }`}
              >
                {protectedDayModal.isPast ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm tracking-tight">
                  {protectedDayModal.isPast
                    ? `Atendimento Realizado (${formatDateForDisplay(protectedDayModal.dateStr)})`
                    : `Dia com chamada agendada (${formatDateForDisplay(protectedDayModal.dateStr)})`}
                </h3>
                <span className="text-[11px] text-zinc-400">
                  {protectedDayModal.isPast
                    ? 'Histórico da agenda'
                    : 'Regra de proteção da agenda'}
                </span>
              </div>
            </div>

            <p className="text-zinc-300 text-xs font-light leading-relaxed">
              {protectedDayModal.isPast
                ? 'Esta data já passou. Você pode abrir os detalhes da chamada realizada para consulta:'
                : 'Este dia possui atendimento marcado e não pode ser desativado por engano. Para gerenciar a chamada ou bloquear novas reservas mantendo o atendimento ativo, use as opções abaixo:'}
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
              {protectedDayModal.dayBookings.map((b) => {
                const isConfirmed = b.status === 'confirmada';
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setProtectedDayModal(null);
                      onOpenBookingDetails(b);
                    }}
                    className="w-full p-3 rounded-lg bg-[#101116] border border-white/[0.08] hover:border-[#843C52] flex items-center justify-between gap-3 text-left transition cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">
                          {b.startTime}
                        </span>
                        <span className="text-xs font-semibold text-white truncate group-hover:text-[#f4a7b9] transition-colors">
                          {b.clientName}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 block truncate mt-0.5">
                        {b.modalityName} ({b.durationMinutes} min)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          isConfirmed
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                        }`}
                      >
                        {isConfirmed ? 'Confirmada' : 'Agendada'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.08] flex-wrap">
              {!protectedDayModal.isPast && (
                <button
                  type="button"
                  onClick={() => {
                    const targetDate = protectedDayModal.dateStr;
                    const currentlyClosed = getDayClosureReason(settings, targetDate, todayStr) !== null;
                    setProtectedDayModal(null);
                    onWriteDayAvailability([targetDate], currentlyClosed);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    getDayClosureReason(settings, protectedDayModal.dateStr, todayStr) !== null
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {getDayClosureReason(settings, protectedDayModal.dateStr, todayStr) !== null
                    ? 'Reabrir dia para novas reservas'
                    : 'Fechar dia para novas reservas'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setProtectedDayModal(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition cursor-pointer ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação com Impacto */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#14151c] border border-white/10 rounded-xl shadow-2xl p-6 text-left relative overflow-hidden space-y-4">
            <h3 className="font-semibold text-white text-base tracking-tight">
              {confirmDialog.title}
            </h3>
            <p className="text-zinc-300 text-xs font-light leading-relaxed">
              {confirmDialog.message}
            </p>

            {confirmDialog.warning && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>{confirmDialog.warning}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition shadow-sm cursor-pointer ${
                  confirmDialog.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#843C52] hover:bg-[#992b4a]'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
