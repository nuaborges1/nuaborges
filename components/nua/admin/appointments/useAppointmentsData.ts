import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AppointmentBooking,
  AppointmentModality,
  AppointmentSchedulePatch,
  AppointmentScheduleSettings,
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  normalizeScheduleSettings,
  mergeScheduleSettings,
  getMonthsForYear,
  getScheduleNow,
} from '@/lib/appointmentsCanonical';
import {
  fetchAdminAppointments,
  getCachedAdminAppointments,
  executeAdminAction,
} from '@/lib/services/nua/appointmentsService';
import { audioNotification } from '@/lib/audioNotification';

function getTodayInScheduleTz(timezone?: string): string {
  return getScheduleNow(timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString;
}

export function useAppointmentsData(searchQuery: string = '') {
  const [loading, setLoading] = useState<boolean>(() => !getCachedAdminAppointments());
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppointmentScheduleSettings>(
    () =>
      getCachedAdminAppointments()?.settings
        ? normalizeScheduleSettings(getCachedAdminAppointments()!.settings)
        : DEFAULT_SCHEDULE_SETTINGS
  );
  const [modalities, setModalities] = useState<AppointmentModality[]>(
    () =>
      getCachedAdminAppointments()?.modalities?.length
        ? getCachedAdminAppointments()!.modalities
        : DEFAULT_MODALITIES
  );
  const [bookings, setBookings] = useState<AppointmentBooking[]>(
    () => getCachedAdminAppointments()?.bookings || []
  );

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() =>
    getTodayInScheduleTz(getCachedAdminAppointments()?.settings?.timezone)
  );
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');

  // V9 Disponibilidade Unificada
  const [availYear, setAvailYear] = useState<number>(() => {
    const todayStr = getTodayInScheduleTz(getCachedAdminAppointments()?.settings?.timezone);
    return Number(todayStr.slice(0, 4)) || new Date().getFullYear();
  });
  const [availMonth, setAvailMonth] = useState<string>(() => {
    const todayStr = getTodayInScheduleTz(getCachedAdminAppointments()?.settings?.timezone);
    return todayStr.slice(0, 7);
  });
  const [daySelectionMode, setDaySelectionMode] = useState<boolean>(false);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());

  const prevBookingsCountRef = useRef<number | null>(null);
  const loadingRef = useRef(false);
  const isSavingSettingsRef = useRef(false);
  const initialSettingsRef = useRef<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('nua_module_dirty', {
            detail: { moduleId: 'chamadas', isDirty: false },
          })
        );
      }
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 4500);
  }, []);

  const loadData = useCallback(async (forceOrSilent = false) => {
    if (loadingRef.current) return;
    if (!forceOrSilent && getCachedAdminAppointments()) {
      const cached = getCachedAdminAppointments()!;
      const norm = normalizeScheduleSettings(cached.settings);
      setSettings(norm);
      initialSettingsRef.current = JSON.stringify(norm);
      setModalities(cached.modalities?.length ? cached.modalities : DEFAULT_MODALITIES);
      setBookings(cached.bookings || []);
      setLoading(false);
      return;
    }

    loadingRef.current = true;
    if (!forceOrSilent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchAdminAppointments({ force: forceOrSilent });
      if (data.success) {
        setError(null);
        // Não sobrescreve `settings` enquanto houver um salvamento otimista em voo ou se nada mudou no servidor
        if (!isSavingSettingsRef.current) {
          const norm = normalizeScheduleSettings(data.settings);
          const serializedNorm = JSON.stringify(norm);
          if (serializedNorm !== initialSettingsRef.current) {
            setSettings(norm);
            initialSettingsRef.current = serializedNorm;
          }
        }
        const nextModalities = data.modalities?.length ? data.modalities : DEFAULT_MODALITIES;
        setModalities((prev) =>
          JSON.stringify(prev) === JSON.stringify(nextModalities) ? prev : nextModalities
        );
        const incoming = data.bookings || [];
        const confirmedCount = incoming.filter(
          (b: any) => b.status === 'confirmada' || b.status === 'reagendamento_pendente'
        ).length;
        if (prevBookingsCountRef.current !== null && confirmedCount > prevBookingsCountRef.current) {
          let soundAllowed = true;
          try {
            const saved = localStorage.getItem('nua_admin_notification_settings');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed?.soundEnabled === false) soundAllowed = false;
            }
          } catch {}
          if (soundAllowed) {
            audioNotification.playOrderChime(0.85);
          }
          showToast('Nova chamada por vídeo confirmada!');
        }
        prevBookingsCountRef.current = confirmedCount;
        setBookings(incoming);
      } else {
        setError('Não foi possível carregar os agendamentos. Tente novamente em instantes.');
      }
    } catch (err: any) {
      setError('Não foi possível carregar os agendamentos. Tente novamente em instantes.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData(false);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadData(true);
    }, 5000);

    const handleVisibleSync = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadData(true);
    };

    let syncTimeout: any = null;
    const handleSyncEvent = (event?: Event) => {
      const detail = (event as CustomEvent | undefined)?.detail;
      if (detail?.scope && detail.scope !== 'appointments') return;
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        loadData(true);
      }, 400);
    };

    window.addEventListener('nua-appointments-updated', handleSyncEvent);
    window.addEventListener('nua-admin-updated', handleSyncEvent);
    window.addEventListener('focus', handleVisibleSync);
    document.addEventListener('visibilitychange', handleVisibleSync);

    return () => {
      clearInterval(interval);
      clearTimeout(syncTimeout);
      window.removeEventListener('nua-appointments-updated', handleSyncEvent);
      window.removeEventListener('nua-admin-updated', handleSyncEvent);
      window.removeEventListener('focus', handleVisibleSync);
      document.removeEventListener('visibilitychange', handleVisibleSync);
    };
  }, [loadData]);

  const metrics = useMemo(() => {
    const todayStr = getTodayInScheduleTz(settings.timezone);
    const todayBookings = bookings.filter((b) => b.date === todayStr && b.status !== 'cancelada');
    const pendingPayment = bookings.filter((b) => b.status === 'aguardando_pagamento');
    const confirmed = bookings.filter((b) => b.status === 'confirmada');
    const completed = bookings.filter((b) => b.status === 'concluida');

    const totalRevenue = bookings
      .filter((b) => b.payment?.status === 'approved' || b.payment?.status === 'manual_confirmed')
      .reduce((acc, curr) => acc + (curr.price || 0), 0);

    return {
      todayCount: todayBookings.length,
      pendingPaymentCount: pendingPayment.length,
      confirmedCount: confirmed.length,
      completedCount: completed.length,
      totalRevenue,
    };
  }, [bookings, settings.timezone]);

  // Apenas agendamentos ativos na fila de Chamadas VIP (pendentes de pagamento, confirmados ou com estorno pendente)
  const activeBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        (b.status !== 'concluida' && b.status !== 'cancelada' && b.status !== 'nao_compareceu') ||
        (b.status === 'cancelada' && ['pending', 'failed', 'manual_required'].includes(b.refundStatus || ''))
    );
  }, [bookings]);

  // Agendamentos finalizados (concluídos/realizados, cancelados ou ausentes)
  const finalizedBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.status === 'concluida' || b.status === 'cancelada' || b.status === 'nao_compareceu'
    );
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const effectiveSearch = (searchFilter || searchQuery).toLowerCase().trim();
    return activeBookings.filter((b) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'proposal') {
          if (!b.proposal) return false;
        } else if (statusFilter === 'cancel_requested') {
          if (b.cancellation?.state !== 'requested') return false;
        } else if (b.status !== statusFilter) {
          return false;
        }
      }
      if (modalityFilter !== 'all' && b.modalityId !== modalityFilter) return false;
      if (effectiveSearch) {
        const matchName = (b.clientName || '').toLowerCase().includes(effectiveSearch);
        const matchEmail = (b.clientEmail || '').toLowerCase().includes(effectiveSearch);
        const matchPhone = (b.clientPhone || '').toLowerCase().includes(effectiveSearch);
        const matchDate = (b.date || '').includes(effectiveSearch);
        if (!matchName && !matchEmail && !matchPhone && !matchDate) return false;
      }
      return true;
    });
  }, [activeBookings, statusFilter, modalityFilter, searchFilter, searchQuery]);

  const calendarDateInfo = useMemo(() => {
    const todayStr = getTodayInScheduleTz(settings.timezone);
    const [baseY, baseM] = todayStr.split('-').map(Number);
    const targetMonth = new Date(baseY, (baseM - 1) + calendarMonthOffset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNumber: number; dateStr: string } | null> = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr });
    }

    return {
      title: `${monthNames[month]} ${year}`,
      days,
      year,
      month,
    };
  }, [calendarMonthOffset, settings.timezone]);

  const selectedDayBookings = useMemo(() => {
    return bookings.filter((b) => b.date === selectedCalendarDate && b.status !== 'cancelada');
  }, [bookings, selectedCalendarDate]);

  const upcomingBookings = useMemo(() => {
    const todayStr = getTodayInScheduleTz(settings.timezone);
    return bookings
      .filter((b) => b.date >= todayStr && b.status === 'confirmada')
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, 8);
  }, [bookings, settings.timezone]);

  const handleToggleBlockDate = async (dateStr: string) => {
    const isBlocked = settings.blockedDates.includes(dateStr);
    const updatedBlockedDates = isBlocked
      ? settings.blockedDates.filter((d) => d !== dateStr)
      : [...settings.blockedDates, dateStr].sort();
    return persistSettings(
      { blockedDates: updatedBlockedDates },
      isBlocked ? `Data ${dateStr} desbloqueada na agenda.` : `Data ${dateStr} bloqueada com sucesso.`,
      'Não foi possível atualizar a data. Tente novamente em instantes.'
    );
  };

  const handleAddBlockedSlot = async (dateStr: string, start: string, end: string, reason?: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) {
      showToast('Informe um intervalo válido, com o fim depois do início.');
      return false;
    }
    if (settings.blockedDates.includes(dateStr)) {
      showToast('Esta data já está bloqueada por completo.');
      return false;
    }
    const collidingBooking = bookings.find(
      (booking) =>
        booking.date === dateStr &&
        (booking.status === 'confirmada' ||
          booking.status === 'aguardando_pagamento' ||
          booking.status === 'reagendamento_pendente') &&
        start < booking.endTime &&
        end > booking.startTime
    );
    if (collidingBooking) {
      showToast(
        `Esse intervalo cruza a chamada de ${collidingBooking.clientName} (${collidingBooking.startTime}–${collidingBooking.endTime}).`
      );
      return false;
    }
    const existing = settings.blockedSlots ?? [];
    const collidingBlock = existing.find((slot) => slot.date === dateStr && start < slot.end && end > slot.start);
    if (collidingBlock) {
      showToast(`Esse intervalo cruza o bloqueio ${collidingBlock.start}–${collidingBlock.end}.`);
      return false;
    }
    const patch = {
      blockedSlots: [
        ...existing,
        { date: dateStr, start, end, ...(reason?.trim() ? { reason: reason.trim() } : {}) },
      ].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
    };
    const result = await persistSettings(patch, `Horário ${start}–${end} bloqueado com sucesso.`, 'Não foi possível bloquear esse horário.');
    return result.success;
  };

  const handleRemoveBlockedSlot = async (dateStr: string, start: string, end: string) => {
    const patch = {
      blockedSlots: (settings.blockedSlots ?? []).filter(
        (slot) => !(slot.date === dateStr && slot.start === start && slot.end === end)
      ),
    };
    const result = await persistSettings(patch, `Horário ${start}–${end} liberado novamente.`, 'Não foi possível liberar esse horário.');
    return result.success;
  };

  const handleConfirmPayment = async (bookingId: string) => {
    const res = await executeAdminAction('confirm', { bookingId });
    if (res.success) {
      showToast('Pagamento confirmado e sala privativa liberada com sucesso!');
      await loadData(true);
    } else {
      showToast(res.error || 'Não foi possível confirmar o pagamento. Tente novamente em instantes.');
    }
  };

  const handleMarkComplete = async (bookingId: string) => {
    const res = await executeAdminAction('complete', { bookingId });
    if (res.success) {
      showToast('Chamada marcada como concluída.');
      await loadData(true);
    } else {
      showToast(res.error || 'Não foi possível concluir a chamada. Tente novamente em instantes.');
    }
  };

  const handleMarkAbsent = async (bookingId: string) => {
    const res = await executeAdminAction('absent', { bookingId });
    if (res.success) {
      showToast('Reserva marcada como ausência (cliente não compareceu).');
      await loadData(true);
    } else {
      showToast(res.error || 'Não foi possível registrar a ausência. Tente novamente em instantes.');
    }
  };

  const handleSaveSettings = (patch: AppointmentSchedulePatch, successMessage = 'Configurações salvas com sucesso!') =>
    persistSettings(patch, successMessage, 'Não foi possível salvar as configurações. Tente novamente em instantes.');

  const handleSaveModalities = async (updatedList: AppointmentModality[]) => {
    const res = await executeAdminAction('updateModalities', { modalities: updatedList });
    if (res.success) {
      await loadData(true);
      showToast('Modalidades atualizadas com sucesso!');
      return { success: true };
    } else {
      showToast(res.error || 'Não foi possível salvar as modalidades. Tente novamente em instantes.');
      return { success: false, error: res.error };
    }
  };

  async function persistSettings(patch: AppointmentSchedulePatch, okMsg: string, errMsg: string) {
    if (isSavingSettingsRef.current) {
      const error = 'Aguarde a alteração anterior ser salva e tente novamente.';
      showToast(error);
      return { success: false, error };
    }
    isSavingSettingsRef.current = true;
    try {
      const res = await executeAdminAction('updateSettings', { settings: patch });
      if (res.success) {
        const synced = res.settings ? normalizeScheduleSettings(res.settings) : mergeScheduleSettings(settings, patch);
        initialSettingsRef.current = JSON.stringify(synced);
        setSettings(synced);
        showToast(okMsg);
        return { success: true };
      } else {
        showToast(res.error || errMsg);
        return { success: false, error: res.error };
      }
    } finally {
      isSavingSettingsRef.current = false;
    }
  }

  // V9: Abertura / Fechamento de Mês — fecha todos os dias para novas reservas sem afetar chamadas já agendadas
  const handleSetMonthAvailability = async (
    year: number,
    monthIndex: number,
    open: boolean,
    applyAllDays = false
  ) => {
    const todayStr = getTodayInScheduleTz(settings.timezone);
    const [curY, curM] = todayStr.split('-').map(Number);
    if (year < curY || (year === curY && monthIndex < curM - 1)) {
      showToast('Este mês já foi encerrado e não pode ser alterado.');
      return;
    }

    const yearMonths = [...getMonthsForYear(settings, year)];
    yearMonths[monthIndex] = open;

    const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
    const newDayOverrides = { ...(settings.dayOverrides || {}) };
    for (const d of Object.keys(newDayOverrides)) {
      if (d.startsWith(monthPrefix)) delete newDayOverrides[d];
    }
    const newBlockedDates = (settings.blockedDates || []).filter((d) => !d.startsWith(monthPrefix));

    if (open && applyAllDays) {
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${monthPrefix}${String(day).padStart(2, '0')}`;
        if (dStr < todayStr) continue;
        const dayOfWeek = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0)).getUTCDay();
        if (!settings.weeklyHours[dayOfWeek]?.enabled) newDayOverrides[dStr] = true;
      }
    }

    const result = await persistSettings(
      {
        monthAvailability: { [year]: yearMonths },
        dayOverrides: newDayOverrides,
        blockedDates: newBlockedDates,
      },
      open
        ? 'Mês aberto seguindo seus horários habituais.'
        : 'Mês fechado para novas reservas. Chamadas já agendadas permanecem confirmadas.',
      'Não foi possível atualizar a disponibilidade do mês. Tente novamente em instantes.'
    );
    if (result.success) setSelectedDays(new Set());
    return result;
  };

  // V9: Disponibilidade por dia — permite fechar qualquer dia futuro para novas reservas sem apagar chamadas existentes
  const handleWriteDayAvailability = async (dates: string[], open: boolean) => {
    const todayStr = getTodayInScheduleTz(settings.timezone);
    const futureDates = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= todayStr);
    if (!futureDates.length) {
      showToast('Datas que já passaram estão encerradas e não podem ser alteradas.');
      return;
    }

    const newDayOverrides = { ...(settings.dayOverrides || {}) };
    let newBlockedDates = [...(settings.blockedDates || [])];

    for (const dateStr of futureDates) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const monthOpen = !!getMonthsForYear(settings, y)[m - 1];
      const weekly = settings.weeklyHours[new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()];
      const naturalOpen = monthOpen && !!weekly?.enabled && !!weekly?.ranges?.length;
      newBlockedDates = newBlockedDates.filter((x) => x !== dateStr);
      if (open === naturalOpen) delete newDayOverrides[dateStr];
      else newDayOverrides[dateStr] = open;
    }

    const result = await persistSettings(
      { dayOverrides: newDayOverrides, blockedDates: newBlockedDates },
      `${futureDates.length} dia(s) ${open ? 'aberto(s)' : 'fechado(s) para novas reservas'} na agenda.`,
      'Não foi possível atualizar os dias. Tente novamente em instantes.'
    );
    if (result.success) setSelectedDays(new Set());
    return result;
  };

  const handleToggleDaySelection = (dateStr: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const handleProposeReschedule = async (bookingId: string, newDate: string, newStartTime: string, note?: string) => {
    const res = await executeAdminAction('proposeReschedule', { bookingId, newDate, newStartTime, note });
    if (res.success) {
      showToast('Proposta de novo horário enviada! Aguardando aceite do cliente.');
      await loadData(true);
      return { success: true };
    } else {
      showToast(res.error || 'Não foi possível enviar a proposta de horário. Tente novamente em instantes.');
      return { success: false, error: res.error };
    }
  };

  const handleWithdrawProposal = async (bookingId: string) => {
    const res = await executeAdminAction('withdrawProposal', { bookingId });
    if (res.success) {
      showToast('Proposta de reagendamento retirada; horário original mantido.');
      await loadData(true);
      return { success: true };
    } else {
      showToast(res.error || 'Não foi possível retirar a proposta. Tente novamente em instantes.');
      return { success: false, error: res.error };
    }
  };

  const handleResolveCancellationRequest = async (
    bookingId: string,
    decision: 'approve' | 'deny',
    decisionNote?: string,
    refundPercent = 0
  ) => {
    const res = await executeAdminAction('resolveCancellationRequest', {
      bookingId,
      decision,
      decisionNote,
      refundPercent,
    });
    if (res.success) {
      showToast(
        decision === 'deny'
          ? 'Solicitação de cancelamento recusada; reserva mantida.'
          : 'Cancelamento aprovado e registrado.'
      );
      await loadData(true);
      return { success: true };
    } else {
      showToast(res.error || 'Não foi possível responder à solicitação. Tente novamente em instantes.');
      return { success: false, error: res.error };
    }
  };

  const handleCreateManualBooking = async (bookingData: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientNotes?: string;
    modalityId: string;
    date: string;
    startTime: string;
    paymentStatus: 'manual_confirmed' | 'pending';
    meetingUrl?: string;
  }) => {
    const res = await executeAdminAction('createManualBooking', bookingData);
    if (res.success) {
      await loadData(true);
      showToast('Chamada VIP criada com sucesso!');
      return { success: true };
    } else {
      return { success: false, error: res.error || 'Não foi possível criar a chamada. Tente novamente em instantes.' };
    }
  };

  return {
    calendarView,
    setCalendarView,
    availYear,
    setAvailYear,
    availMonth,
    setAvailMonth,
    daySelectionMode,
    setDaySelectionMode,
    selectedDays,
    setSelectedDays,
    handleSetMonthAvailability,
    handleWriteDayAvailability,
    handleToggleDaySelection,
    handleProposeReschedule,
    handleWithdrawProposal,
    handleResolveCancellationRequest,
    loading,
    error,
    toastMessage,
    showToast,
    settings,
    setSettings,
    modalities,
    setModalities,
    bookings,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    modalityFilter,
    setModalityFilter,
    selectedCalendarDate,
    setSelectedCalendarDate,
    calendarMonthOffset,
    setCalendarMonthOffset,
    metrics,
    activeBookings,
    finalizedBookings,
    filteredBookings,
    calendarDateInfo,
    selectedDayBookings,
    upcomingBookings,
    loadData,
    handleToggleBlockDate,
    handleAddBlockedSlot,
    handleRemoveBlockedSlot,
    handleConfirmPayment,
    handleMarkComplete,
    handleMarkAbsent,
    handleSaveSettings,
    handleSaveModalities,
    handleCreateManualBooking,
  };
}
