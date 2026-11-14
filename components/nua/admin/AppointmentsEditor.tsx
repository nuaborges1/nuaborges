'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  DollarSign,
  CalendarDays,
  Settings,
} from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentModality,
  formatCurrencyBrl,
} from '@/lib/appointmentsCanonical';
import { executeAdminAction } from '@/lib/services/nua/appointmentsService';
import { useAppointmentsData } from './appointments/useAppointmentsData';
import { AppointmentsQueueTab } from './appointments/AppointmentsQueueTab';
import { AppointmentsCalendarTab } from './appointments/AppointmentsCalendarTab';
import { AppointmentsModalitiesTab } from './appointments/AppointmentsModalitiesTab';
import { AppointmentsSettingsTab } from './appointments/AppointmentsSettingsTab';
import {
  MeetingLinkModal,
  CancelBookingModal,
  ModalityEditModal,
} from './appointments/AppointmentsModals';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';

interface AppointmentsEditorProps {
  onOpenBookingDetails?: (booking: AppointmentBooking) => void;
  searchQuery?: string;
}

export function AppointmentsEditor({
  onOpenBookingDetails,
  searchQuery = '',
}: AppointmentsEditorProps = {}) {
  const [subTab, setSubTab] = useState<'queue' | 'calendar' | 'modalities' | 'settings'>('queue');

  // Modal states
  const [cancelModalBooking, setCancelModalBooking] = useState<AppointmentBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [meetingModalBooking, setMeetingModalBooking] = useState<AppointmentBooking | null>(null);
  const [meetingUrlInput, setMeetingUrlInput] = useState('');
  const [meetingInstructionsInput, setMeetingInstructionsInput] = useState('');
  const [editingModality, setEditingModality] = useState<AppointmentModality | null>(null);
  const [isNewModality, setIsNewModality] = useState(false);

  const {
    loading,
    toastMessage,
    showToast,
    settings,
    setSettings,
    modalities,
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
  } = useAppointmentsData(searchQuery);

  const handleOpenMeetingModal = (booking: AppointmentBooking) => {
    setMeetingModalBooking(booking);
    setMeetingUrlInput(booking.meeting?.url || '');
    setMeetingInstructionsInput(booking.meeting?.instructions || '');
  };

  const handleSaveMeetingLink = async () => {
    if (!meetingModalBooking) return;
    const res = await executeAdminAction('updateMeeting', {
      bookingId: meetingModalBooking.id,
      meetingUrl: meetingUrlInput,
      instructions: meetingInstructionsInput,
    });
    if (res.success) {
      showToast('Link da chamada salvo com sucesso!');
      setMeetingModalBooking(null);
      loadData();
    } else {
      showToast(res.error || 'Erro ao salvar link.');
    }
  };

  const handleOpenCancelModal = (booking: AppointmentBooking) => {
    setCancelModalBooking(booking);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    const res = await executeAdminAction('cancel', {
      bookingId: cancelModalBooking.id,
      reason: cancelReason || 'Cancelamento solicitado pela administração',
    });
    if (res.success) {
      showToast('Reserva cancelada e slot liberado.');
      setCancelModalBooking(null);
      loadData();
    } else {
      showToast(res.error || 'Erro ao cancelar reserva.');
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Toast de Notificação */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-[#09090c] border border-[#f4a7b9]/40 text-white text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-xl"
          >
            <CheckCircle2 className="w-4 h-4 text-[#f4a7b9]" />
            <span className="font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cabeçalho Padronizado da Página */}
      <PageHeader
        title="Chamadas VIP"
        subtitle="Gerencie seus atendimentos agendados, calendário de chamadas, preços e horários de trabalho."
        helpId={
          subTab === 'queue'
            ? 'chamadas_fila'
            : subTab === 'calendar'
            ? 'chamadas_calendario'
            : subTab === 'modalities'
            ? 'chamadas_modalidades'
            : 'chamadas_horarios'
        }
        actions={
          <button
            type="button"
            onClick={() => {
              loadData(true);
            }}
            disabled={loading}
            className="h-9 px-3.5 rounded-xl bg-[#14161d] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-200 hover:text-white text-xs font-medium inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#f4a7b9]' : 'text-zinc-400'}`} />
            <span>Atualizar</span>
          </button>
        }
      >
        <AdminTabs
          activeId={subTab}
          onChange={setSubTab}
          ariaLabel="Abas de Chamadas VIP"
          items={[
            {
              id: 'queue',
              label: 'Atendimentos Agendados',
              icon: CalendarDays,
              badge: filteredBookings.length > 0 ? filteredBookings.length : undefined,
            },
            {
              id: 'calendar',
              label: 'Calendário & Folgas',
              icon: Calendar,
            },
            {
              id: 'modalities',
              label: 'Tipos de Chamada & Preços',
              icon: DollarSign,
              badge: modalities.length > 0 ? modalities.length : undefined,
            },
            {
              id: 'settings',
              label: 'Horários de Atendimento',
              icon: Settings,
            },
          ]}
        />
      </PageHeader>

      {/* Cartões de Métricas (Exibidos apenas na Fila de Chamadas) */}
      {subTab === 'queue' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Hoje</span>
            <span className="text-xl sm:text-2xl font-sans font-bold text-white tracking-tight">
              {metrics.todayCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-light block">chamadas hoje</span>
          </div>

          <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Pendentes</span>
            <span className="text-xl sm:text-2xl font-sans font-bold text-white tracking-tight">
              {metrics.pendingPaymentCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-light block">aguardando Pix</span>
          </div>

          <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Confirmadas</span>
            <span className="text-xl sm:text-2xl font-sans font-bold text-emerald-300 tracking-tight">
              {metrics.confirmedCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-light block">pagas / aprovadas</span>
          </div>

          <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] flex flex-col justify-between space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Concluídas</span>
            <span className="text-xl sm:text-2xl font-sans font-bold text-zinc-200 tracking-tight">
              {metrics.completedCount}
            </span>
            <span className="text-[10px] text-zinc-500 font-light block">realizadas</span>
          </div>

          <div className="p-4 rounded-xl bg-[#14161d] border border-[#f4a7b9]/25 flex flex-col justify-between space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-[#f4a7b9] uppercase tracking-wider block font-semibold">Faturamento</span>
            <span className="text-base sm:text-lg font-sans font-bold text-[#f4a7b9] tracking-tight block truncate">
              {formatCurrencyBrl(metrics.totalRevenue)}
            </span>
            <span className="text-[10px] text-zinc-500 font-light block">total confirmado</span>
          </div>
        </div>
      )}

      {/* SubTab 1: Fila de Chamadas */}
      {subTab === 'queue' && (
        <AppointmentsQueueTab
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          modalityFilter={modalityFilter}
          setModalityFilter={setModalityFilter}
          modalities={modalities}
          filteredBookings={filteredBookings}
          onOpenMeetingModal={handleOpenMeetingModal}
          onConfirmPayment={handleConfirmPayment}
          onMarkComplete={handleMarkComplete}
          onMarkAbsent={handleMarkAbsent}
          onOpenCancelModal={handleOpenCancelModal}
          onOpenBookingDetails={onOpenBookingDetails}
        />
      )}

      {/* SubTab 2: Calendário Visual */}
      {subTab === 'calendar' && (
        <AppointmentsCalendarTab
          calendarDateInfo={calendarDateInfo}
          setCalendarMonthOffset={setCalendarMonthOffset}
          selectedCalendarDate={selectedCalendarDate}
          setSelectedCalendarDate={setSelectedCalendarDate}
          settings={settings}
          bookings={bookings}
          selectedDayBookings={selectedDayBookings}
          upcomingBookings={upcomingBookings}
          onToggleBlockDate={handleToggleBlockDate}
          onOpenMeetingModal={handleOpenMeetingModal}
          onOpenBookingDetails={onOpenBookingDetails}
        />
      )}

      {/* SubTab 3: Modalidades & Preços */}
      {subTab === 'modalities' && (
        <AppointmentsModalitiesTab
          modalities={modalities}
          onStartCreateModality={() => {
            setIsNewModality(true);
            setEditingModality({
              id: `chamada-${Date.now()}`,
              name: '',
              description: '',
              durationMinutes: 30,
              price: 200,
              priceFormatted: 'R$ 200,00',
              active: true,
              minNoticeHours: 4,
              rules: ['Pontualidade britânica', 'Ambiente privativo e sem gravações'],
              clientInstructions: 'Acesse pontualmente pelo link do seu voucher.',
              order: modalities.length + 1,
            });
          }}
          onStartEditModality={(mod) => {
            setIsNewModality(false);
            setEditingModality({ ...mod });
          }}
          onDeleteModality={(modId, modName) => {
            if (confirm(`Deseja remover a modalidade "${modName}"?`)) {
              const updated = modalities.filter((m) => m.id !== modId);
              handleSaveModalities(updated);
            }
          }}
        />
      )}

      {/* SubTab 4: Horários & Agenda */}
      {subTab === 'settings' && (
        <AppointmentsSettingsTab
          settings={settings}
          setSettings={setSettings}
          onSaveSettings={() => handleSaveSettings(settings)}
          onOpenVisualCalendar={() => setSubTab('calendar')}
          showToast={showToast}
        />
      )}

      {/* Modals de Ação */}
      <AnimatePresence>
        {meetingModalBooking && (
          <MeetingLinkModal
            booking={meetingModalBooking}
            meetingUrl={meetingUrlInput}
            instructions={meetingInstructionsInput}
            onUrlChange={setMeetingUrlInput}
            onInstructionsChange={setMeetingInstructionsInput}
            onClose={() => setMeetingModalBooking(null)}
            onSave={handleSaveMeetingLink}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancelModalBooking && (
          <CancelBookingModal
            booking={cancelModalBooking}
            cancelReason={cancelReason}
            onReasonChange={setCancelReason}
            onClose={() => setCancelModalBooking(null)}
            onConfirm={handleConfirmCancel}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingModality && (
          <ModalityEditModal
            editingModality={editingModality}
            isNewModality={isNewModality}
            onModalityChange={setEditingModality}
            onClose={() => setEditingModality(null)}
            onSave={() => {
              if (!editingModality.name.trim()) {
                showToast('Preencha o nome da modalidade.');
                return;
              }
              let updated: AppointmentModality[];
              if (isNewModality) {
                updated = [...modalities, editingModality];
              } else {
                updated = modalities.map((m) =>
                  m.id === editingModality.id ? editingModality : m
                );
              }
              handleSaveModalities(updated);
              setEditingModality(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
