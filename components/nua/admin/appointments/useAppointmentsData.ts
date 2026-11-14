import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  normalizeScheduleSettings,
} from '@/lib/appointmentsCanonical';
import {
  fetchAdminAppointments,
  executeAdminAction,
} from '@/lib/services/nua/appointmentsService';
import { audioNotification } from '@/lib/audioNotification';

export function useAppointmentsData(searchQuery: string = '') {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppointmentScheduleSettings>(DEFAULT_SCHEDULE_SETTINGS);
  const [modalities, setModalities] = useState<AppointmentModality[]>(DEFAULT_MODALITIES);
  const [bookings, setBookings] = useState<AppointmentBooking[]>([]);

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalityFilter, setModalityFilter] = useState<string>('all');

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);

  const prevBookingsCountRef = useRef<number | null>(null);
  const loadingRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async (silent = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchAdminAppointments();
      if (data.success) {
        setSettings(normalizeScheduleSettings(data.settings));
        setModalities(data.modalities?.length ? data.modalities : DEFAULT_MODALITIES);
        const incoming = data.bookings || [];
        if (prevBookingsCountRef.current !== null && incoming.length > prevBookingsCountRef.current) {
          audioNotification.playOrderChime(0.85);
          showToast('🔔 Nova solicitação de chamada por vídeo recebida!');
        }
        prevBookingsCountRef.current = incoming.length;
        setBookings(incoming);
      } else if (!silent) {
        setError(data.error || 'Erro ao carregar agendamentos.');
      }
    } catch (err: any) {
      if (!silent) {
        setError(err?.message || 'Falha de comunicação.');
      }
    } finally {
      loadingRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(false);

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadData(true);
    }, 45000);

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

    return () => {
      clearInterval(interval);
      clearTimeout(syncTimeout);
      window.removeEventListener('nua-appointments-updated', handleSyncEvent);
      window.removeEventListener('nua-admin-updated', handleSyncEvent);
    };
  }, [loadData]);

  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter((b) => b.date === todayStr && b.status !== 'cancelada');
    const pendingPayment = bookings.filter((b) => b.status === 'aguardando_pagamento');
    const confirmed = bookings.filter((b) => b.status === 'confirmada');
    const completed = bookings.filter((b) => b.status === 'concluida');

    const totalRevenue = bookings
      .filter((b) => b.payment.status === 'approved' || b.payment.status === 'manual_confirmed')
      .reduce((acc, curr) => acc + (curr.price || 0), 0);

    return {
      todayCount: todayBookings.length,
      pendingPaymentCount: pendingPayment.length,
      confirmedCount: confirmed.length,
      completedCount: completed.length,
      totalRevenue,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const effectiveSearch = (searchFilter || searchQuery).toLowerCase().trim();
    return bookings.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (modalityFilter !== 'all' && b.modalityId !== modalityFilter) return false;
      if (effectiveSearch) {
        const matchName = b.clientName.toLowerCase().includes(effectiveSearch);
        const matchEmail = b.clientEmail.toLowerCase().includes(effectiveSearch);
        const matchPhone = b.clientPhone.includes(effectiveSearch);
        const matchDate = b.date.includes(effectiveSearch);
        if (!matchName && !matchEmail && !matchPhone && !matchDate) return false;
      }
      return true;
    });
  }, [bookings, statusFilter, modalityFilter, searchFilter, searchQuery]);

  const calendarDateInfo = useMemo(() => {
    const now = new Date();
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
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
  }, [calendarMonthOffset]);

  const selectedDayBookings = useMemo(() => {
    return bookings.filter((b) => b.date === selectedCalendarDate && b.status !== 'cancelada');
  }, [bookings, selectedCalendarDate]);

  const upcomingBookings = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return bookings
      .filter((b) => b.date >= todayStr && b.status !== 'cancelada')
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, 6);
  }, [bookings]);

  const handleToggleBlockDate = async (dateStr: string) => {
    const isBlocked = settings.blockedDates.includes(dateStr);
    const updatedBlockedDates = isBlocked
      ? settings.blockedDates.filter((d) => d !== dateStr)
      : [...settings.blockedDates, dateStr].sort();
    const newSettings = { ...settings, blockedDates: updatedBlockedDates };
    setSettings(newSettings);
    const res = await executeAdminAction('updateSettings', { settings: newSettings });
    if (res.success) {
      showToast(isBlocked ? `Data ${dateStr} desbloqueada na agenda.` : `Data ${dateStr} bloqueada com sucesso.`);
    } else {
      showToast(res.error || 'Erro ao atualizar data.');
    }
  };

  const handleConfirmPayment = async (bookingId: string) => {
    const res = await executeAdminAction('confirm', { bookingId });
    if (res.success) {
      showToast('Pagamento confirmado e sala privativa liberada com sucesso!');
      loadData();
    } else {
      showToast(res.error || 'Erro ao confirmar pagamento.');
    }
  };

  const handleMarkComplete = async (bookingId: string) => {
    const res = await executeAdminAction('complete', { bookingId });
    if (res.success) {
      showToast('Chamada marcada como concluída.');
      loadData();
    } else {
      showToast(res.error || 'Erro ao concluir chamada.');
    }
  };

  const handleMarkAbsent = async (bookingId: string) => {
    const res = await executeAdminAction('absent', { bookingId });
    if (res.success) {
      showToast('Reserva marcada como ausência (cliente não compareceu).');
      loadData();
    } else {
      showToast(res.error || 'Erro ao atualizar ausência.');
    }
  };

  const handleSaveSettings = async (customSettings?: AppointmentScheduleSettings) => {
    const toSave = customSettings || settings;
    const res = await executeAdminAction('updateSettings', { settings: toSave });
    if (res.success) {
      // Só confirma depois de reler o servidor: garante que o que a tela mostra
      // é exatamente o que ficou gravado.
      await loadData(true);
      showToast('Configurações de horários e atendimento salvas com sucesso!');
    } else {
      showToast(res.error || 'Erro ao salvar configurações.');
    }
  };

  const handleSaveModalities = async (updatedList: AppointmentModality[]) => {
    const res = await executeAdminAction('updateModalities', { modalities: updatedList });
    if (res.success) {
      await loadData(true);
      showToast('Modalidades atualizadas com sucesso!');
    } else {
      showToast(res.error || 'Erro ao salvar modalidades.');
    }
  };

  return {
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
    filteredBookings,
    calendarDateInfo,
    selectedDayBookings,
    upcomingBookings,
    loadData,
    handleToggleBlockDate,
    handleConfirmPayment,
    handleMarkComplete,
    handleMarkAbsent,
    handleSaveSettings,
    handleSaveModalities,
  };
}
