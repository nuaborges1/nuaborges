/* Vinho maduro / Nua Borges — Painel Administrativo de Chamadas V9 Unificado */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Video,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Layers,
  CheckCircle2,
  Sliders,
  RefreshCw,
  ExternalLink,
  Plus,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { AppointmentBooking, AppointmentModality } from '@/lib/appointmentsCanonical';
import { executeAdminAction } from '@/lib/services/nua/appointmentsService';
import { CHAMADAS_PUBLIC_ENABLED } from '@/lib/featureFlags';
import { ConfirmModal } from '@/components/nua/admin/ConfirmModal';

import { useAppointmentsData } from './useAppointmentsData';
import { OverviewTab } from './OverviewTab';
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

type V9TabId = 'overview' | 'bookings' | 'calendar' | 'availability' | 'modalities';

export function AppointmentsEditor({
  searchQuery = '',
  selectedBookingId,
  onSelectBookingId,
  onClearSelectedBooking,
}: AppointmentsEditorProps) {
  const [activeTab, setActiveTab] = useState<V9TabId>('overview');

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
    handleConfirmPayment,
    handleMarkComplete,
    handleMarkAbsent,
    handleRetryRefund,
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

  // Deep-link via notificação, Spotlight ou Briefing
  useEffect(() => {
    if (!selectedBookingId) return;
    if (selectedBookingId === 'agenda' || selectedBookingId === 'availability') {
      setActiveTab('availability');
      clearSelectedBooking();
      return;
    }
    if (selectedBookingId === 'calendar') {
      setActiveTab('calendar');
      clearSelectedBooking();
      return;
    }
    if (selectedBookingId === 'bookings') {
      setActiveTab('bookings');
      clearSelectedBooking();
      return;
    }
    if (bookings.length > 0) {
      const target = bookings.find(
        (b) => b.id === selectedBookingId || b.id === selectedBookingId.replace(/^apt_/, 'app_')
      );
      if (target) {
        setDetailBooking(target);
        clearSelectedBooking();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookingId, bookings]);

  // Contadores de Pendências para Badges
  const pendingAlertsCount = useMemo(() => {
    return activeBookings.filter(
      (b) =>
        b.status === 'aguardando_pagamento' ||
        (b.status === 'reagendamento_pendente' && b.cancellation?.state === 'requested') ||
        (b.status === 'cancelada' && ['pending', 'failed'].includes(b.refundStatus || ''))
    ).length;
  }, [activeBookings]);

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
      showToast(res.error || 'Erro ao cancelar chamada.');
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
      showToast(res.error || 'Erro ao restaurar chamada.');
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
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 text-zinc-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#161821] border border-[#843C52]/50 text-white text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-4">
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
              <strong>Vitrine pública em modo informativo (&ldquo;Em breve&rdquo;):</strong> A página pública <code className="font-mono text-amber-100">/chamadas</code> está exibindo a apresentação editorial da experiência, sem receber novos agendamentos públicos no momento.
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

      {/* Cabeçalho Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#843C52]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#843C52] font-semibold">
              ATENDIMENTOS EM VÍDEO
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mt-0.5">
            Chamadas por Vídeo
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-0.5">
            Controle seus horários livres, acompanhe reservas e configure os tipos de chamada em um só lugar.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="h-8 px-3.5 rounded-lg bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Chamada</span>
          </button>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="h-8 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium flex items-center gap-1.5 border border-white/[0.06] transition-all cursor-pointer"
            title="Sincronizar dados com o servidor"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
          <a
            href="/chamadas"
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Ver site (/chamadas)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Navegação de 5 Abas (V9 Unificada) */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
          {
            id: 'bookings',
            label: 'Reservas',
            icon: Video,
            badge: pendingAlertsCount > 0 ? pendingAlertsCount : activeBookings.length,
            badgeAlert: pendingAlertsCount > 0,
          },
          { id: 'calendar', label: 'Calendário', icon: CalendarIcon },
          { id: 'availability', label: 'Disponibilidade', icon: Sliders },
          { id: 'modalities', label: 'Tipos e Preços', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as V9TabId)}
              className={`h-9 px-3.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#843C52] text-white shadow-sm'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-200 border border-white/[0.05]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? 'bg-black/30 text-white'
                      : tab.badgeAlert
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-[#843C52]/20 text-[#f4a7b9]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <OverviewTab
          bookings={bookings}
          settings={settings}
          modalities={modalities}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenBookingDetails={handleOpenBookingDetails}
          onOpenMeetingModal={handleOpenMeetingModal}
          onOpenCancellationModal={handleOpenCancellationModal}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {/* ABA 2: RESERVAS */}
      {activeTab === 'bookings' && (
        <BookingsTab
          bookings={activeBookings}
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
      )}

      {/* ABA 3: CALENDÁRIO */}
      {activeTab === 'calendar' && (
        <CalendarTab
          bookings={bookings}
          settings={settings}
          modalities={modalities}
          onOpenBookingDetails={handleOpenBookingDetails}
          onToggleDayAvailability={(dateStr, open) => handleWriteDayAvailability([dateStr], open)}
        />
      )}

      {/* ABA 4: DISPONIBILIDADE UNIFICADA (Meses + Dias + Rotina + Regras) */}
      {activeTab === 'availability' && (
        <AvailabilityTab
          bookings={bookings}
          settings={settings}
          modalities={modalities}
          onOpenBookingDetails={handleOpenBookingDetails}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onSetMonthAvailability={handleSetMonthAvailability}
          onWriteDayAvailability={handleWriteDayAvailability}
          onSaveSettings={handleSaveSettings}
          onOpenBlockPeriodModal={() => setIsBlockPeriodOpen(true)}
          showToast={showToast}
        />
      )}

      {/* ABA 5: TIPOS DE CHAMADA E PREÇOS (MODALIDADES) */}
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
        onRetryRefund={async (id) => {
          await handleRetryRefund(id);
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
        timezone={settings.timezone}
        onCreateBooking={handleCreateManualBooking}
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
