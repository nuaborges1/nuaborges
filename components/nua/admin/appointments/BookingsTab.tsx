/* Vinho maduro / Nua Borges — Aba de Reservas V9 */
'use client';

import React, { useMemo } from 'react';
import {
  Search,
  Video,
  Check,
  Clock,
  AlertCircle,
  Eye,
  Link2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  AppointmentBooking,
  DEFAULT_SCHEDULE_SETTINGS,
  formatCurrencyBrl,
  formatDateForDisplay,
  getScheduleNow,
} from '@/lib/appointmentsCanonical';

interface BookingsTabProps {
  bookings: AppointmentBooking[];
  timezone?: string;
  finalizedCount?: number;
  searchFilter: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onOpenBookingDetails: (booking: AppointmentBooking) => void;
  onOpenMeetingModal: (booking: AppointmentBooking) => void;
  onOpenProposalModal: (booking: AppointmentBooking) => void;
  onOpenCancellationModal: (booking: AppointmentBooking) => void;
  onConfirmPayment: (bookingId: string) => void;
  onMarkComplete: (bookingId: string) => void;
}

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'em_andamento', label: 'Em andamento' },
  { id: 'confirmada', label: 'Confirmadas' },
  { id: 'aguardando_pagamento', label: 'Aguardando Pix' },
  { id: 'reschedule_requested', label: 'Reagendamento' },
  { id: 'proposal', label: 'Proposta enviada' },
  { id: 'cancel_requested', label: 'Cancelamento' },
  { id: 'refund_pending', label: 'Estorno pendente' },
];

export function BookingsTab({
  bookings,
  timezone,
  finalizedCount = 0,
  searchFilter,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenBookingDetails,
  onOpenMeetingModal,
  onOpenProposalModal,
  onOpenCancellationModal,
  onConfirmPayment,
  onMarkComplete,
}: BookingsTabProps) {
  const todayStr = useMemo(
    () => getScheduleNow(timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString,
    [timezone]
  );

  const filteredList = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();

    return [...bookings]
      .sort((a, b) => {
        const aRunning = a.status === 'em_andamento';
        const bRunning = b.status === 'em_andamento';
        if (aRunning && !bRunning) return -1;
        if (!aRunning && bRunning) return 1;

        const aFuture = a.date >= todayStr && a.status !== 'cancelada';
        const bFuture = b.date >= todayStr && b.status !== 'cancelada';
        if (aFuture && !bFuture) return -1;
        if (!aFuture && bFuture) return 1;
        if (aFuture && bFuture) {
          return `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);
        }
        return `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`);
      })
      .filter((b) => {
        if (statusFilter === 'em_andamento' && b.status !== 'em_andamento') return false;
        if (statusFilter === 'confirmada' && b.status !== 'confirmada') return false;
        if (
          statusFilter === 'aguardando_pagamento' &&
          b.status !== 'aguardando_pagamento'
        )
          return false;
        if (
          statusFilter === 'reschedule_requested' &&
          !(
            b.status === 'reagendamento_pendente' &&
            !b.proposal &&
            b.cancellation?.state !== 'requested'
          )
        )
          return false;
        if (
          statusFilter === 'proposal' &&
          !b.proposal
        )
          return false;
        if (
          statusFilter === 'cancel_requested' &&
          !(
            b.status === 'reagendamento_pendente' &&
            b.cancellation?.state === 'requested'
          )
        )
          return false;
        if (
          statusFilter === 'refund_pending' &&
          !(b.status === 'cancelada' && ['pending', 'failed', 'manual_required'].includes(b.refundStatus || ''))
        )
          return false;

        if (!q) return true;
        return (
          (b.clientName || '').toLowerCase().includes(q) ||
          (b.clientEmail || '').toLowerCase().includes(q) ||
          (b.modalityName || '').toLowerCase().includes(q) ||
          (b.date || '').includes(q)
        );
      });
  }, [bookings, searchFilter, statusFilter, todayStr]);

  const navigateToUnifiedHistory = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nua_admin_navigate', {
          detail: { module: 'historico' },
        })
      );
    }
  };

  return (
    <div className="space-y-4 text-left">
      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-xl bg-[#14151c] border border-white/[0.07] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onStatusFilterChange(f.id)}
                className={`h-8 px-3 rounded-lg text-xs font-medium transition cursor-pointer ${
                  active
                    ? 'bg-[#843C52] text-white shadow-xs'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar cliente, e-mail ou data…"
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#0e0f14] border border-white/10 text-white text-xs focus:border-[#843C52] focus:outline-none"
          />
        </div>
      </div>

      {/* Lista de Reservas */}
      {filteredList.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#14151c] border border-dashed border-white/10 text-center space-y-2">
          <Video className="w-6 h-6 text-zinc-500 mx-auto" />
          <div className="text-sm font-semibold text-white">
            Nenhuma reserva ativa na fila
          </div>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            {searchFilter || statusFilter !== 'all'
              ? 'Tente mudar o filtro ou limpar a busca.'
              : 'Chamadas já realizadas ou canceladas são arquivadas automaticamente na aba Histórico de Pedidos do painel.'}
          </p>
          {finalizedCount > 0 && !searchFilter && statusFilter === 'all' && (
            <div className="pt-2">
              <button
                type="button"
                onClick={navigateToUnifiedHistory}
                className="h-8 px-3.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-[#f4a7b9] hover:text-white transition cursor-pointer"
              >
                Ver {finalizedCount} chamada(s) arquivada(s) no Histórico de Pedidos →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[#14151c] border border-white/[0.07] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#101116] text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Chamada</th>
                  <th className="py-3 px-4">Data e hora</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-xs">
                {filteredList.map((b) => {
                  const isPaid =
                    b.payment?.status === 'approved' ||
                    b.payment?.status === 'manual_confirmed';
                  const isRefunded =
                    b.payment?.status === 'refunded' ||
                    b.refundStatus === 'refunded' ||
                    b.refundStatus === 'completed';
                  const isRejected = b.payment?.status === 'rejected';
                  const amount = Number(b.price || b.payment?.amount || 0);
                  const hasCancelReq =
                    b.status === 'reagendamento_pendente' &&
                    b.cancellation?.state === 'requested';
                  const hasRescheduleReq =
                    b.status === 'reagendamento_pendente' &&
                    !b.proposal &&
                    !hasCancelReq;
                  const hasProposal = Boolean(b.proposal);
                  const isRefundPending =
                    b.status === 'cancelada' &&
                    ['pending', 'failed', 'manual_required'].includes(b.refundStatus || '');
                  const isFuture = b.date > todayStr;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => onOpenBookingDetails(b)}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{b.clientName}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                          {b.clientEmail}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="font-medium text-zinc-200">{b.modalityName}</div>
                          {b.meeting?.url && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#843C52]/20 text-[#f4a7b9] border border-[#843C52]/30"
                              title="Sala exclusiva do Google Meet"
                            >
                              <Video className="w-2.5 h-2.5" />
                              <span>Meet</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {b.durationMinutes} min · {formatCurrencyBrl(amount)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">
                          {formatDateForDisplay(b.date)}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                          às {b.startTime}
                        </div>
                        {b.proposal && (
                          <div className="text-[10px] text-[#f4a7b9] mt-1 font-medium">
                            Proposta: {formatDateForDisplay(b.proposal.date)} às{' '}
                            {b.proposal.time}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            b.status === 'em_andamento'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                              : hasCancelReq || hasRescheduleReq
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                              : isRefundPending
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                              : hasProposal
                              ? 'bg-[#843C52]/15 text-[#f4a7b9] border-[#843C52]/30'
                              : b.status === 'confirmada'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                              : b.status === 'aguardando_pagamento'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                              : b.status === 'concluida'
                              ? 'bg-white/[0.06] text-zinc-300 border-white/10'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                          }`}
                        >
                          {b.status === 'em_andamento' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                          {b.status === 'em_andamento'
                            ? 'Em andamento'
                            : hasCancelReq
                            ? 'Pediu cancelamento'
                            : hasRescheduleReq
                            ? 'Pediu reagendamento'
                            : isRefundPending
                            ? b.refundStatus === 'failed'
                              ? 'Falha no estorno'
                              : 'Estorno pendente'
                            : hasProposal
                            ? 'Proposta enviada'
                            : b.status === 'confirmada'
                            ? 'Confirmada'
                            : b.status === 'aguardando_pagamento'
                            ? 'Aguardando pagamento'
                            : b.status === 'concluida'
                            ? 'Concluída'
                            : b.status === 'nao_compareceu'
                            ? 'Não compareceu'
                            : 'Cancelada'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            isRefunded
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/25'
                              : isRejected
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                              : isPaid
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                          }`}
                        >
                          {isRefunded
                            ? 'Reembolsado'
                            : isRejected
                            ? 'Recusado'
                            : isPaid
                            ? 'Pago'
                            : 'Pendente'}
                        </span>
                      </td>

                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          {hasCancelReq && (
                            <button
                              type="button"
                              onClick={() => onOpenCancellationModal(b)}
                              className="h-7 px-2.5 rounded-lg bg-[#843C52] hover:bg-[#992b4a] text-white text-[11px] font-semibold transition cursor-pointer"
                            >
                              Analisar
                            </button>
                          )}

                          {isRefundPending && (
                            <button
                              type="button"
                              onClick={() => onOpenBookingDetails(b)}
                              className="h-7 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Estornar</span>
                            </button>
                          )}

                          {b.meeting?.url && (b.status === 'em_andamento' || (b.status === 'confirmada' && !isFuture)) && (
                            <a
                              href={b.meeting.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-7 px-2.5 rounded-lg bg-[#843C52] hover:bg-[#992b4a] text-white text-[11px] font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                            >
                              <Video className="w-3 h-3" />
                              <span>{b.status === 'em_andamento' ? 'Entrar agora' : 'Entrar no Meet'}</span>
                            </a>
                          )}

                          {b.status === 'aguardando_pagamento' && (
                            <button
                              type="button"
                              onClick={() => onConfirmPayment(b.id)}
                              className="h-7 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium transition cursor-pointer"
                            >
                              Confirmar pagamento
                            </button>
                          )}

                          {!hasCancelReq &&
                            b.status !== 'cancelada' &&
                            b.status !== 'concluida' &&
                            b.status !== 'nao_compareceu' &&
                            b.status !== 'em_andamento' &&
                            !b.proposal && (
                              <button
                                type="button"
                                onClick={() => onOpenProposalModal(b)}
                                className="h-7 px-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-200 text-[11px] transition cursor-pointer"
                              >
                                Propor horário
                              </button>
                            )}

                          {b.status === 'confirmada' && !isFuture && (
                            <button
                              type="button"
                              onClick={() => onMarkComplete(b.id)}
                              className="h-7 px-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-200 text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Concluir</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenBookingDetails(b)}
                            className="h-7 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detalhes</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rodapé informativo apontando para o Histórico de Pedidos unificado */}
      {finalizedCount > 0 && filteredList.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#14151c] border border-white/[0.06] flex items-center justify-between gap-3 flex-wrap text-xs text-zinc-400">
          <span>
            Chamadas concluídas ou canceladas ({finalizedCount}) ficam arquivadas no <strong>Histórico de Pedidos</strong> do painel.
          </span>
          <button
            type="button"
            onClick={navigateToUnifiedHistory}
            className="text-xs font-medium text-[#f4a7b9] hover:text-white underline cursor-pointer"
          >
            Abrir Histórico de Pedidos →
          </button>
        </div>
      )}
    </div>
  );
}
