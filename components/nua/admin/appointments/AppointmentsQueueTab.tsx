'use client';

import React from 'react';
import {
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Check,
  AlertCircle,
  MessageCircle,
  Plus,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentModality,
  formatCurrencyBrl,
  generateWhatsAppMessage,
} from '@/lib/appointmentsCanonical';

interface AppointmentsQueueTabProps {
  searchFilter: string;
  setSearchFilter: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  modalityFilter: string;
  setModalityFilter: (s: string) => void;
  modalities: AppointmentModality[];
  filteredBookings: AppointmentBooking[];
  onOpenMeetingModal: (booking: AppointmentBooking) => void;
  onConfirmPayment: (bookingId: string) => void;
  onMarkComplete: (bookingId: string) => void;
  onMarkAbsent: (bookingId: string) => void;
  onOpenCancelModal: (booking: AppointmentBooking) => void;
  onOpenBookingDetails?: (booking: AppointmentBooking) => void;
}

export function AppointmentsQueueTab({
  searchFilter,
  setSearchFilter,
  statusFilter,
  setStatusFilter,
  modalityFilter,
  setModalityFilter,
  modalities,
  filteredBookings,
  onOpenMeetingModal,
  onConfirmPayment,
  onMarkComplete,
  onMarkAbsent,
  onOpenCancelModal,
  onOpenBookingDetails,
}: AppointmentsQueueTabProps) {
  return (
    <div className="space-y-5">
      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#171821] p-3 rounded-xl border border-white/[0.06]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone ou data..."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#f4a7b9] cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="aguardando_pagamento">Aguardando Pagamento</option>
            <option value="confirmada">Confirmada</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
            <option value="nao_compareceu">Não Compareceu</option>
          </select>

          <select
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value)}
            className="bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-[#f4a7b9] cursor-pointer"
          >
            <option value="all">Todas Modalidades</option>
            {modalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Reservas */}
      {filteredBookings.length === 0 ? (
        <div className="py-14 text-center rounded-xl bg-[#171821] border border-white/[0.06]">
          <Calendar className="w-9 h-9 text-zinc-600 mx-auto mb-2.5" />
          <h3 className="text-sm font-semibold text-white mb-1">Nenhum agendamento encontrado</h3>
          <p className="text-zinc-500 text-xs font-light">
            Quando novos clientes reservarem chamadas, elas aparecerão aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const isConfirmed = booking.status === 'confirmada';
            const isPending = booking.status === 'aguardando_pagamento';
            const isCompleted = booking.status === 'concluida';
            const isCancelled = booking.status === 'cancelada';

            return (
              <div
                key={booking.id}
                className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] hover:border-white/[0.12] transition-colors space-y-3.5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-semibold text-white">{booking.clientName}</h4>
                      <span className="text-zinc-500 text-xs">•</span>
                      <span className="text-zinc-400 text-xs font-medium">{booking.modalityName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
                      <span>Data: {booking.date.split('-').reverse().join('/')}</span>
                      <span>Horário: {booking.startTime} às {booking.endTime}</span>
                      <span>Valor: {formatCurrencyBrl(booking.price)}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isConfirmed && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmada</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Aguardando Pix</span>
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span>Concluída</span>
                      </span>
                    )}
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Cancelada</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalhes de Contato e Link da Chamada */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#101116] border border-white/[0.06] space-y-1">
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider font-semibold">
                      Contato do Cliente:
                    </span>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <span>WhatsApp: {booking.clientPhone}</span>
                      <a
                        href={`https://wa.me/55${booking.clientPhone}?text=${generateWhatsAppMessage(
                          booking,
                          isConfirmed ? 'confirmacao' : 'lembrete'
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Conversar</span>
                      </a>
                    </div>
                    <div className="text-zinc-400">E-mail: {booking.clientEmail}</div>
                    {booking.clientNotes && (
                      <div className="text-zinc-500 italic mt-1">&ldquo;{booking.clientNotes}&rdquo;</div>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-[#101116] border border-white/[0.06] space-y-1">
                    <span className="text-zinc-500 block text-[10px] uppercase tracking-wider font-semibold">
                      Link da Sala (Google Meet / Whereby):
                    </span>
                    {booking.meeting.url ? (
                      <div className="flex items-center gap-2 pt-0.5">
                        <a
                          href={booking.meeting.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#f4a7b9] hover:underline truncate max-w-[240px] font-mono text-xs"
                          title="Abrir sala de chamada"
                        >
                          {booking.meeting.url}
                        </a>
                        <button
                          type="button"
                          onClick={() => onOpenMeetingModal(booking)}
                          className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                          title="Alterar link da sala"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenMeetingModal(booking)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[#f4a7b9] text-[11px] font-medium transition-colors cursor-pointer mt-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar Link da Sala</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra de Ações Rápidas */}
                <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onConfirmPayment(booking.id)}
                        className="h-7 px-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Confirmar Pagamento (Pix)
                      </button>
                    )}

                    {isConfirmed && (
                      <>
                        <button
                          type="button"
                          onClick={() => onMarkComplete(booking.id)}
                          className="h-7 px-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-medium text-xs transition-colors cursor-pointer"
                        >
                          Marcar Concluída
                        </button>
                        <button
                          type="button"
                          onClick={() => onMarkAbsent(booking.id)}
                          className="h-7 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 text-xs transition-colors cursor-pointer"
                        >
                          Não Compareceu
                        </button>
                      </>
                    )}

                    {!booking.meeting.url && (
                      <button
                        type="button"
                        onClick={() => onOpenMeetingModal(booking)}
                        className="h-7 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs transition-colors cursor-pointer"
                      >
                        Inserir Link
                      </button>
                    )}

                    {onOpenBookingDetails && (
                      <button
                        type="button"
                        onClick={() => onOpenBookingDetails(booking)}
                        className="h-7 px-3 rounded-lg bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Ver todos os detalhes e comprovante desta chamada"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Ver Ficha Completa</span>
                      </button>
                    )}
                  </div>

                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => onOpenCancelModal(booking)}
                      className="h-7 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors cursor-pointer"
                    >
                      Cancelar Reserva
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
