/* Vinho maduro / Nua Borges — Painel Administrativo de Chamadas V9 Unificado */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Video,
  Calendar as CalendarIcon,
  Layers,
  CheckCircle2,
  Sliders,
  RefreshCw,
  ExternalLink,
  Plus,
  AlertTriangle,
  Info,
  List,
  AlertCircle,
} from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentModality,
  DEFAULT_SCHEDULE_SETTINGS,
  formatCurrencyBrl,
  formatDateForDisplay,
  getScheduleNow,
} from '@/lib/appointmentsCanonical';
import { getDayClosureReason } from '@/lib/appointments/availabilityEngine';
import { executeAdminAction } from '@/lib/services/nua/appointmentsService';
import { CHAMADAS_PUBLIC_ENABLED } from '@/lib/featureFlags';
import { ConfirmModal } from '@/components/nua/admin/ConfirmModal';
import { ManualRefundModal } from '@/components/nua/admin/ManualRefundModal';
import { HelpTriggerButton } from '@/components/nua/admin/help/HelpTriggerButton';
import type { HelpId } from '@/components/nua/admin/help/types';
import { PageHeader, AdminTabs } from '@/components/nua/admin/ui/AdminPrimitives';

import { useAppointmentsData } from './useAppointmentsData';
import { BookingsTab } from './BookingsTab';
import { CalendarTab } from './CalendarTab';
import { AvailabilityTab } from './AvailabilityTab';
import { AppointmentsModalitiesTab } from './AppointmentsModalitiesTab';
import { ModalityEditModal, CreateManualBookingModal } from './AppointmentsModals';
import {
  BookingDetailModal,
  ProposalModal,
  CancellationAnalysisModal,
  BlockPeriodModal,
} from './AppointmentsV9Modals';

export interface AppointmentsEditorProps {
  searchQuery?: string;
  selectedBookingId?: string | null;
  onSelectBookingId?: (id: string | null) => void;
  onClearSelectedBooking?: () => void;
}

type PrimaryTabId = 'agenda' | 'availability' | 'modalities';
type AgendaViewMode = 'list' | 'calendar';

export function AppointmentsEditor({
  searchQuery = '',
  selectedBookingId,
  onSelectBookingId,
  onClearSelectedBooking,
}: AppointmentsEditorProps) {
  const [activeTab, setActiveTab] = useState<PrimaryTabId>('agenda');
  const [agendaView, setAgendaView] = useState<AgendaViewMode>('list');

  const {
    loading,
    error,
    toastMessage,
    showToast,
    settings,
    modalities,
    bookings,
    activeBookings,
    finalizedBookings,
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    loadData,
    handleAddBlockedSlot,
    handleRemoveBlockedSlot,
    handleConfirmPayment,
    handleMarkComplete,
    handleMarkAbsent,
    handleSaveSettings,
    handleSaveModalities,
    handleCreateManualBooking,
    handleSetMonthAvailability,
    handleWriteDayAvailability,
    handleProposeReschedule,
    handleWithdrawProposal,
    handleResolveCancellationRequest,
  } = useAppointmentsData(searchQuery);

  // Modais V9
  const [detailBooking, setDetailBooking] = useState<AppointmentBooking | null>(null);
  const [proposalBooking, setProposalBooking] = useState<AppointmentBooking | null>(null);
  const [cancellationBooking, setCancellationBooking] = useState<AppointmentBooking | null>(null);
  const [refundBookingId, setRefundBookingId] = useState<string | null>(null);
  const [isBlockPeriodOpen, setIsBlockPeriodOpen] = useState(false);

  // Mantém o detailBooking sincronizado com a lista mais recente após ações
  const liveDetailBooking = useMemo(() => {
    if (!detailBooking) return null;
    return bookings.find((b) => b.id === detailBooking.id) || detailBooking;
  }, [bookings, detailBooking]);

  // Modais de Modalidade e Reserva Manual
  const [editingModality, setEditingModality] = useState<AppointmentModality | null>(null);
  const [isNewModality, setIsNewModality] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Modal de confirmação padronizado (sem window.confirm nativo)
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const clearSelectedBooking = () => {
    if (onClearSelectedBooking) onClearSelectedBooking();
    if (onSelectBookingId) onSelectBookingId(null);
  };

  // Deep-link via notificação, Spotlight, Briefing ou Central de Clientes
  useEffect(() => {
    if (!selectedBookingId) return;
    if (selectedBookingId === 'agenda' || selectedBookingId === 'availability') {
      setActiveTab('availability');
      clearSelectedBooking();
      return;
    }
    if (selectedBookingId === 'calendar') {
      setActiveTab('agenda');
      setAgendaView('calendar');
      clearSelectedBooking();
      return;
    }
    if (selectedBookingId === 'bookings') {
      setActiveTab('agenda');
      setAgendaView('list');
      clearSelectedBooking();
      return;
    }
    if (selectedBookingId === 'modalities') {
      setActiveTab('modalities');
      clearSelectedBooking();
      return;
    }
    if (bookings.length > 0) {
      const target = bookings.find(
        (b) => b.id === selectedBookingId || b.id === selectedBookingId.replace(/^apt_/, 'app_')
      );
      if (target) {
        setActiveTab('agenda');
        setDetailBooking(target);
        clearSelectedBooking();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookingId, bookings]);

  const handleNavigateLegacyTab = (
    tab: 'agenda' | 'overview' | 'bookings' | 'calendar' | 'availability' | 'modalities'
  ) => {
    if (tab === 'calendar') {
      setActiveTab('agenda');
      setAgendaView('calendar');
      return;
    }
    if (tab === 'overview' || tab === 'bookings' || tab === 'agenda') {
      setActiveTab('agenda');
      setAgendaView('list');
      return;
    }
    setActiveTab(tab);
  };

  // Resumo operacional compacto para o topo de "Agenda & Reservas"
  const todayStr = useMemo(
    () => getScheduleNow(settings.timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString,
    [settings.timezone]
  );

  const upcomingBookings = useMemo(() => {
    return activeBookings
      .filter((b) => b.date >= todayStr)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }, [activeBookings, todayStr]);

  const nextCall = upcomingBookings[0] || null;

  const pendingAttentionBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status === 'aguardando_pagamento' ||
        (b.status === 'reagendamento_pendente' && b.cancellation?.state === 'requested') ||
        (b.status === 'reagendamento_pendente' && !b.proposal && b.cancellation?.state !== 'requested') ||
        (b.status === 'cancelada' && ['pending', 'failed', 'manual_required'].includes(b.refundStatus || ''))
    );
  }, [bookings]);

  const pendingAlertsCount = pendingAttentionBookings.length;

  const monthOpenStats = useMemo(() => {
    const y = Number(todayStr.slice(0, 4));
    const m = Number(todayStr.slice(5, 7)) - 1;
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0, 12, 0, 0)).getUTCDate();
    let total = 0;
    let open = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dStr < todayStr) continue;
      total += 1;
      if (getDayClosureReason(settings, dStr, todayStr) === null) open += 1;
    }
    return { open, total };
  }, [settings, todayStr]);

  const confirmedRevenue = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          b.status !== 'cancelada' &&
          b.refundStatus !== 'refunded' &&
          (b.payment?.status === 'approved' || b.payment?.status === 'manual_confirmed')
      )
      .reduce((sum, b) => sum + Number(b.price || b.payment?.amount || 0), 0);
  }, [bookings]);

  const currentHelpId: HelpId =
    activeTab === 'availability'
      ? 'chamadas_horarios'
      : activeTab === 'modalities'
      ? 'chamadas_modalidades'
      : agendaView === 'calendar'
      ? 'chamadas_calendario'
      : 'chamadas_fila';

  const handleOpenBookingDetails = (booking: AppointmentBooking) => {
    setDetailBooking(booking);
  };

  const handleOpenMeetingModal = (booking: AppointmentBooking) => {
    setDetailBooking(booking);
  };

  const handleOpenProposalModal = (booking: AppointmentBooking) => {
    setDetailBooking(null);
    setProposalBooking(booking);
  };

  const handleOpenCancellationModal = (booking: AppointmentBooking) => {
    setDetailBooking(null);
    setCancellationBooking(booking);
  };

  const handleAdminCancel = async (bookingId: string, reason: string, refundPercent = 100) => {
    const res = await executeAdminAction('cancel', { bookingId, reason, refundPercent });
    if (res.success) {
      showToast('Chamada cancelada e horário liberado na agenda.');
      await loadData(true);
      setDetailBooking(null);
      return { success: true };
    } else {
      showToast(res.error || 'Não foi possível cancelar a chamada. Tente novamente em instantes.');
      return { success: false, error: res.error };
    }
  };

  const handleRestoreConfirmed = async (bookingId: string) => {
    const res = await executeAdminAction('update_status', {
      bookingId,
      status: 'confirmada',
    });
    if (res.success) {
      showToast('Chamada restaurada para Confirmada com sucesso!');
      await loadData(true);
      setDetailBooking(null);
      return { success: true };
    } else {
      showToast(res.error || 'Não foi possível restaurar a chamada. Tente novamente em instantes.');
      return { success: false, error: res.error };
    }
  };

  const handleStartCreateModality = () => {
    setEditingModality({
      id: `mod_${Date.now()}`,
      name: 'Nova Chamada VIP',
      durationMinutes: 30,
      price: 200,
      priceFormatted: 'R$ 200,00',
      description: 'Atendimento individual ao vivo por vídeo.',
      active: true,
      minNoticeHours: 4,
      order: modalities.length + 1,
      clientInstructions: 'O link de acesso será liberado 15 minutos antes do horário agendado.',
      rules: [
        'Vídeo em tempo real em sala privativa',
        'Tolerância de 10 minutos',
        'Proibido gravar ou capturar tela',
      ],
    });
    setIsNewModality(true);
  };

  const handleStartEditModality = (mod: AppointmentModality) => {
    setEditingModality({ ...mod });
    setIsNewModality(false);
  };

  const handleDeleteModality = (modId: string, modName: string) => {
    if (modalities.length <= 1) {
      showToast('Mantenha pelo menos um tipo de chamada cadastrado.');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Remover tipo de chamada?',
      description: `Deseja remover "${modName}" da lista de modalidades? As chamadas já agendadas com esta modalidade não serão afetadas.`,
      confirmText: 'Remover',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState(null);
        const updated = modalities.filter((m) => m.id !== modId);
        await handleSaveModalities(updated);
      },
    });
  };

  if (loading) {
    return (
      <div className="w-full py-24 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <div className="w-6 h-6 rounded-full border-2 border-[#843C52] border-t-transparent animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest">
          Carregando Central de Chamadas...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 text-zinc-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#161821] border border-[#843C52]/50 text-white text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-[#843C52] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Aviso quando a vitrine pública /chamadas está em modo informativo ('Em breve') */}
      {!CHAMADAS_PUBLIC_ENABLED && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start sm:items-center gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Vitrine pública em modo informativo (&ldquo;Em breve&rdquo;):</strong> A página pública de chamadas está exibindo a apresentação da experiência, sem receber novos agendamentos no momento.
            </span>
          </div>
          <a
            href="/chamadas"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-amber-300 hover:text-white underline shrink-0 inline-flex items-center gap-1"
          >
            <span>Ver página pública</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Banner de Erro de Sincronização (caso a API falhe) */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="h-7 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-white text-xs font-semibold transition cursor-pointer shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Cabeçalho Principal Padronizado */}
      <PageHeader
        title="Chamadas VIP"
        subtitle="Controle seus horários livres, acompanhe reservas e configure os tipos de chamada em um só lugar."
        helpId={currentHelpId}
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-[#843C52] hover:bg-[#99455E] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Chamada</span>
            </button>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 text-xs font-medium flex items-center gap-1.5 border border-white/[0.08] transition-all cursor-pointer"
              title="Atualizar lista de chamadas"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>
            <a
              href="/chamadas"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Ver página</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </>
        }
      >
        <AdminTabs
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Abas de Chamadas VIP"
          items={[
            {
              id: 'agenda',
              label: 'Agenda & Reservas',
              icon: Video,
              badge:
                pendingAlertsCount > 0
                  ? pendingAlertsCount
                  : activeBookings.length > 0
                  ? activeBookings.length
                  : undefined,
            },
            {
              id: 'availability',
              label: 'Horários & Disponibilidade',
              icon: Sliders,
            },
            {
              id: 'modalities',
              label: 'Modalidades & Preços',
              icon: Layers,
            },
          ]}
        />
      </PageHeader>

      {/* Aviso proativo caso dailyBookingLimit esteja travado em 1 */}
      {settings.dailyBookingLimit === 1 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Limite de 1 chamada por dia ativo:</strong> Atualmente a agenda fecha o dia inteiro após a primeira reserva. Clique ao lado para liberar múltiplas chamadas no mesmo dia.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSaveSettings({ dailyBookingLimit: null })}
            className="h-8 px-3.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 text-xs font-semibold transition cursor-pointer shrink-0"
          >
            Liberar várias chamadas/dia
          </button>
        </div>
      )}

      {/* ABA 1: AGENDA & RESERVAS (Resumo + Lista / Calendário unificados) */}
      {activeTab === 'agenda' && (
        <div className="space-y-5">
          {/* Strip compacto com 4 indicadores essenciais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
            <div
              onClick={() => nextCall && handleOpenBookingDetails(nextCall)}
              className={`p-3.5 rounded-xl bg-[#14151c] border border-white/[0.07] ${
                nextCall ? 'hover:border-[#843C52]/60 cursor-pointer transition' : ''
              }`}
            >
              <span className="text-[11px] text-zinc-400 font-medium block">Próxima chamada</span>
              <div className="text-base font-semibold text-white mt-0.5 tracking-tight">
                {nextCall ? `${formatDateForDisplay(nextCall.date)} · ${nextCall.startTime}` : 'Nenhuma'}
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5 block truncate">
                {nextCall
                  ? `${nextCall.clientName} · ${nextCall.modalityName}`
                  : 'Agenda livre nos próximos dias'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#14151c] border border-white/[0.07]">
              <span className="text-[11px] text-zinc-400 font-medium block">Precisa da sua atenção</span>
              <div
                className={`text-base font-semibold mt-0.5 tracking-tight ${
                  pendingAlertsCount > 0 ? 'text-amber-300' : 'text-white'
                }`}
              >
                {pendingAlertsCount}
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                {pendingAlertsCount > 0
                  ? 'Pagamento, cancelamento ou reagendamento'
                  : 'Tudo em dia no momento'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('availability')}
              className="p-3.5 rounded-xl bg-[#14151c] border border-white/[0.07] hover:border-[#843C52]/60 text-left transition cursor-pointer"
            >
              <span className="text-[11px] text-zinc-400 font-medium block">Dias abertos neste mês</span>
              <div className="text-base font-semibold text-white mt-0.5 tracking-tight">
                {monthOpenStats.open} de {monthOpenStats.total}
              </div>
              <span className="text-[11px] text-zinc-300 mt-0.5 block">
                Ajustar em Horários & Disponibilidade →
              </span>
            </button>

            <div className="p-3.5 rounded-xl bg-[#14151c] border border-white/[0.07]">
              <span className="text-[11px] text-zinc-400 font-medium block">Receita confirmada</span>
              <div className="text-base font-semibold text-emerald-400 mt-0.5 tracking-tight">
                {formatCurrencyBrl(confirmedRevenue)}
              </div>
              <span className="text-[11px] text-zinc-500 mt-0.5 block">
                Somente pagamentos aprovados
              </span>
            </div>
          </div>

          {/* Barra de ações pendentes imediatas (só aparece quando há algo aguardando decisão) */}
          {pendingAttentionBookings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/25 space-y-2.5 text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Ações pendentes ({pendingAttentionBookings.length})</span>
                </span>
                <span className="text-[11px] text-amber-200/70">
                  Clique para resolver diretamente
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingAttentionBookings.slice(0, 6).map((b) => {
                  const isCancelReq =
                    b.status === 'reagendamento_pendente' && b.cancellation?.state === 'requested';
                  const isRescheduleReq =
                    b.status === 'reagendamento_pendente' &&
                    !b.proposal &&
                    b.cancellation?.state !== 'requested';
                  const isRefundPending =
                    b.status === 'cancelada' &&
                    ['pending', 'failed', 'manual_required'].includes(b.refundStatus || '');
                  const badgeText = isCancelReq
                    ? 'Pediu cancelamento'
                    : isRescheduleReq
                    ? 'Pediu reagendamento'
                    : isRefundPending
                    ? 'Estorno pendente'
                    : 'Aguardando Pix';
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        isCancelReq
                          ? handleOpenCancellationModal(b)
                          : isRescheduleReq
                          ? handleOpenProposalModal(b)
                          : handleOpenBookingDetails(b)
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#14151c] hover:bg-[#1c1d27] border border-amber-500/30 text-xs text-white flex items-center gap-2 transition cursor-pointer"
                    >
                      <span className="font-semibold">{b.clientName}</span>
                      <span className="text-zinc-400 font-mono text-[11px]">
                        {formatDateForDisplay(b.date)} {b.startTime}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                        {badgeText}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alternador Limpo: Lista | Calendário Visual */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex p-1 rounded-xl bg-[#14151c] border border-white/[0.08] self-start">
              <button
                type="button"
                onClick={() => setAgendaView('list')}
                className={`h-8 px-3.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  agendaView === 'list'
                    ? 'bg-[#843C52] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista de Reservas ({activeBookings.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setAgendaView('calendar')}
                className={`h-8 px-3.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  agendaView === 'calendar'
                    ? 'bg-[#843C52] text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendário Visual</span>
              </button>
            </div>

            <span className="text-[11px] text-zinc-400 font-light">
              {agendaView === 'list'
                ? 'Clique em qualquer reserva para colar o link da sala, reagendar ou concluir.'
                : 'Veja quantas vagas restam em cada dia e bloqueie horários individuais no painel ao lado.'}
            </span>
          </div>

          {agendaView === 'list' ? (
            <BookingsTab
              bookings={activeBookings}
              timezone={settings.timezone}
              finalizedCount={finalizedBookings.length}
              searchFilter={searchFilter}
              onSearchChange={setSearchFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onOpenBookingDetails={handleOpenBookingDetails}
              onOpenMeetingModal={handleOpenMeetingModal}
              onOpenProposalModal={handleOpenProposalModal}
              onOpenCancellationModal={handleOpenCancellationModal}
              onConfirmPayment={handleConfirmPayment}
              onMarkComplete={(id) => {
                setConfirmState({
                  isOpen: true,
                  title: 'Marcar chamada como realizada?',
                  description:
                    'Confirma que esta chamada foi realizada? Ela será arquivada automaticamente no Histórico de Pedidos.',
                  confirmText: 'Confirmar realização',
                  variant: 'info',
                  onConfirm: async () => {
                    setConfirmState(null);
                    await handleMarkComplete(id);
                  },
                });
              }}
            />
          ) : (
            <CalendarTab
              bookings={bookings}
              settings={settings}
              modalities={modalities}
              onOpenBookingDetails={handleOpenBookingDetails}
              onToggleDayAvailability={(dateStr, open) => handleWriteDayAvailability([dateStr], open)}
              onAddBlockedSlot={handleAddBlockedSlot}
              onRemoveBlockedSlot={handleRemoveBlockedSlot}
            />
          )}
        </div>
      )}

      {/* ABA 2: HORÁRIOS & DISPONIBILIDADE */}
      {activeTab === 'availability' && (
        <AvailabilityTab
          bookings={bookings}
          settings={settings}
          modalities={modalities}
          onOpenBookingDetails={handleOpenBookingDetails}
          onNavigateTab={handleNavigateLegacyTab}
          onSetMonthAvailability={handleSetMonthAvailability}
          onWriteDayAvailability={handleWriteDayAvailability}
          onSaveSettings={handleSaveSettings}
          onAddBlockedSlot={handleAddBlockedSlot}
          onRemoveBlockedSlot={handleRemoveBlockedSlot}
          onOpenBlockPeriodModal={() => setIsBlockPeriodOpen(true)}
          showToast={showToast}
        />
      )}

      {/* ABA 3: MODALIDADES & PREÇOS */}
      {activeTab === 'modalities' && (
        <AppointmentsModalitiesTab
          modalities={modalities}
          onStartCreateModality={handleStartCreateModality}
          onStartEditModality={handleStartEditModality}
          onDeleteModality={handleDeleteModality}
          onSaveModalities={handleSaveModalities}
        />
      )}

      {/* MODAL V9: Detalhes da Chamada (Drawer Lateral com edição inline do link de vídeo) */}
      <BookingDetailModal
        isOpen={Boolean(liveDetailBooking)}
        booking={liveDetailBooking}
        timezone={settings.timezone}
        onClose={() => setDetailBooking(null)}
        onOpenMeetingModal={handleOpenMeetingModal}
        onOpenProposalModal={handleOpenProposalModal}
        onOpenCancellationModal={handleOpenCancellationModal}
        onConfirmPayment={async (id) => {
          await handleConfirmPayment(id);
        }}
        onMarkComplete={async (id) => {
          await handleMarkComplete(id);
          setDetailBooking(null);
        }}
        onMarkAbsent={async (id) => {
          await handleMarkAbsent(id);
          setDetailBooking(null);
        }}
        onOpenRefund={(bookingId) => {
          setDetailBooking(null);
          setRefundBookingId(bookingId);
        }}
        onWithdrawProposal={async (id) => {
          await handleWithdrawProposal(id);
        }}
        onRestoreConfirmed={handleRestoreConfirmed}
        onReloadData={() => loadData(true)}
        showToast={showToast}
      />

      {/* MODAL V9: Propor Novo Horário */}
      <ProposalModal
        isOpen={Boolean(proposalBooking)}
        booking={proposalBooking}
        modalities={modalities}
        settings={settings}
        bookings={bookings}
        onClose={() => setProposalBooking(null)}
        onSubmit={handleProposeReschedule}
      />

      {/* MODAL V9: Analisar Solicitação de Cancelamento / Cancelar Atendimento */}
      <CancellationAnalysisModal
        isOpen={Boolean(cancellationBooking)}
        booking={cancellationBooking}
        onClose={() => setCancellationBooking(null)}
        onResolveRequest={handleResolveCancellationRequest}
        onAdminCancel={handleAdminCancel}
      />

      {/* MODAL V9: Fechar Período (Férias / Folga por intervalo de datas) */}
      <BlockPeriodModal
        isOpen={isBlockPeriodOpen}
        timezone={settings.timezone}
        onClose={() => setIsBlockPeriodOpen(false)}
        onSubmit={(dates) => handleWriteDayAvailability(dates, false)}
      />

      {/* MODAL: Editar / Criar Modalidade */}
      <ModalityEditModal
        editingModality={editingModality}
        isNewModality={isNewModality}
        onModalityChange={setEditingModality}
        onClose={() => setEditingModality(null)}
        onSave={async () => {
          if (!editingModality) return;
          const updated = isNewModality
            ? [...modalities, editingModality]
            : modalities.map((m) => (m.id === editingModality.id ? editingModality : m));
          const res = await handleSaveModalities(updated);
          if (res?.success !== false) {
            setEditingModality(null);
          }
        }}
      />

      {/* MODAL: Criar Chamada Manual */}
      <CreateManualBookingModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        modalities={modalities}
        settings={settings}
        bookings={bookings}
        timezone={settings.timezone}
        onCreateBooking={handleCreateManualBooking}
      />

      {/* MODAL: Estorno Manual Real via Mercado Pago */}
      <ManualRefundModal
        isOpen={Boolean(refundBookingId)}
        orderId={refundBookingId}
        modality="vip"
        onClose={() => setRefundBookingId(null)}
        onRefundCompleted={() => {
          showToast('Estorno confirmado no Mercado Pago e reserva atualizada.');
          void loadData(true);
        }}
      />

      {/* MODAL: Confirmação Padronizada da Marca */}
      <ConfirmModal
        isOpen={Boolean(confirmState?.isOpen)}
        title={confirmState?.title || ''}
        description={confirmState?.description || ''}
        confirmText={confirmState?.confirmText || 'Confirmar'}
        variant={confirmState?.variant || 'danger'}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
