/* Vinho maduro / Nua Borges — Visão Geral V9 */
'use client';

import React, { useMemo } from 'react';
import {
  Video,
  Calendar as CalendarIcon,
  Clock,
  Check,
  AlertCircle,
  ArrowRight,
  Sliders,
  Layers,
  RefreshCw,
} from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentScheduleSettings,
  AppointmentModality,
  DEFAULT_SCHEDULE_SETTINGS,
  formatCurrencyBrl,
  formatDateForDisplay,
  getScheduleNow,
} from '@/lib/appointmentsCanonical';
import { getDayClosureReason } from '@/lib/appointments/availabilityEngine';

interface OverviewTabProps {
  bookings: AppointmentBooking[];
  settings: AppointmentScheduleSettings;
  modalities: AppointmentModality[];
  onNavigateTab: (tab: 'overview' | 'bookings' | 'calendar' | 'availability' | 'modalities') => void;
  onOpenBookingDetails: (booking: AppointmentBooking) => void;
  onOpenMeetingModal: (booking: AppointmentBooking) => void;
  onOpenProposalModal?: (booking: AppointmentBooking) => void;
  onOpenCancellationModal: (booking: AppointmentBooking) => void;
  onConfirmPayment: (bookingId: string) => void;
}

function isActiveBooking(b: AppointmentBooking): boolean {
  return (
    b.status === 'confirmada' ||
    b.status === 'aguardando_pagamento' ||
    b.status === 'reagendamento_pendente'
  );
}

export function OverviewTab({
  bookings,
  settings,
  modalities,
  onNavigateTab,
  onOpenBookingDetails,
  onOpenMeetingModal,
  onOpenProposalModal,
  onOpenCancellationModal,
  onConfirmPayment,
}: OverviewTabProps) {
  const todayStr = useMemo(
    () => getScheduleNow(settings.timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString,
    [settings.timezone]
  );
  const currentYear = useMemo(() => Number(todayStr.slice(0, 4)), [todayStr]);
  const currentMonth = useMemo(() => Number(todayStr.slice(5, 7)) - 1, [todayStr]);

  const activeBookings = useMemo(() => bookings.filter(isActiveBooking), [bookings]);

  const upcomingBookings = useMemo(() => {
    return activeBookings
      .filter((b) => b.date >= todayStr)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }, [activeBookings, todayStr]);

  const pendingBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.status === 'aguardando_pagamento' ||
        (b.status === 'reagendamento_pendente' && b.cancellation?.state === 'requested') ||
        (b.status === 'reagendamento_pendente' && !b.proposal && b.cancellation?.state !== 'requested') ||
        (b.status === 'cancelada' && ['pending', 'failed'].includes(b.refundStatus || ''))
    );
  }, [bookings]);

  const nextCall = upcomingBookings[0];

  // Dias restantes abertos no mês atual (UTC determinístico)
  const monthOpenStats = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 12, 0, 0)).getUTCDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    });
    const remainingDates = dates.filter((d) => d >= todayStr);
    const openDays = remainingDates.filter(
      (d) => getDayClosureReason(settings, d, todayStr) === null
    ).length;
    return { open: openDays, total: remainingDates.length };
  }, [settings, currentYear, currentMonth, todayStr]);

  // Receita confirmada e não reembolsada
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

  const activeModalitiesCount = useMemo(
    () => modalities.filter((m) => m.active).length,
    [modalities]
  );

  return (
    <div className="space-y-6 text-left">
      {/* 4 Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium block">Próxima chamada</span>
          <div className="text-lg font-semibold text-white mt-1 tracking-tight">
            {nextCall ? `${formatDateForDisplay(nextCall.date)} · ${nextCall.startTime}` : 'Nenhuma'}
          </div>
          <span className="text-xs text-zinc-500 mt-1 block truncate">
            {nextCall
              ? `${nextCall.clientName} · ${nextCall.modalityName}`
              : 'Agenda livre nos próximos dias'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium block">
            Precisa da sua atenção
          </span>
          <div className="text-lg font-semibold text-white mt-1 tracking-tight">
            {pendingBookings.length}
          </div>
          <span className="text-xs text-zinc-500 mt-1 block">
            {pendingBookings.length
              ? 'Pagamento, cancelamento ou estorno pendente'
              : 'Tudo em dia'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium block">
            Dias abertos neste mês
          </span>
          <div className="text-lg font-semibold text-white mt-1 tracking-tight">
            {monthOpenStats.open} de {monthOpenStats.total}
          </div>
          <span className="text-xs text-zinc-500 mt-1 block">
            Controlados na aba Disponibilidade
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm">
          <span className="text-[11px] text-zinc-400 font-medium block">Receita confirmada</span>
          <div className="text-lg font-semibold text-emerald-400 mt-1 tracking-tight">
            {formatCurrencyBrl(confirmedRevenue)}
          </div>
          <span className="text-xs text-zinc-500 mt-1 block">
            Somente pagamentos aprovados
          </span>
        </div>
      </div>

      {/* Duas Colunas: Pendências + Próximas Chamadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Coluna 1: Precisa da sua atenção */}
        <section className="rounded-xl bg-[#14151c] border border-white/[0.07] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white">Precisa da sua atenção</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pedidos de cancelamento, pagamentos pendentes e estornos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('bookings')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingBookings.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-white/10 text-center space-y-1">
              <Check className="w-5 h-5 text-emerald-400 mx-auto" />
              <div className="text-xs font-semibold text-white">Nada pendente agora</div>
              <p className="text-[11px] text-zinc-500">
                Novos pedidos e confirmações aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {pendingBookings.map((b) => {
                const isCancelReq =
                  b.status === 'reagendamento_pendente' && b.cancellation?.state === 'requested';
                const isRescheduleReq =
                  b.status === 'reagendamento_pendente' && !b.proposal && b.cancellation?.state !== 'requested';
                const isRefundPending =
                  b.status === 'cancelada' && ['pending', 'failed'].includes(b.refundStatus || '');
                return (
                  <div
                    key={b.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {b.clientName} · {b.modalityName}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {formatDateForDisplay(b.date)} às {b.startTime} ·{' '}
                        {isCancelReq ? (
                          <span className="text-amber-300">Pediu cancelamento</span>
                        ) : isRescheduleReq ? (
                          <span className="text-amber-300">Pediu reagendamento</span>
                        ) : isRefundPending ? (
                          <span className="text-rose-300">
                            {b.refundStatus === 'failed' ? 'Estorno falhou' : 'Estorno pendente'}
                          </span>
                        ) : (
                          'Aguardando pagamento'
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCancelReq ? (
                        <button
                          type="button"
                          onClick={() => onOpenCancellationModal(b)}
                          className="h-8 px-3 rounded-lg bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-medium transition cursor-pointer"
                        >
                          Analisar pedido
                        </button>
                      ) : isRescheduleReq ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenProposalModal ? onOpenProposalModal(b) : onOpenBookingDetails(b)
                          }
                          className="h-8 px-3 rounded-lg bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-medium transition cursor-pointer"
                        >
                          Propor horário
                        </button>
                      ) : isRefundPending ? (
                        <button
                          type="button"
                          onClick={() => onOpenBookingDetails(b)}
                          className="h-8 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Executar estorno</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onConfirmPayment(b.id)}
                          className="h-8 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition cursor-pointer"
                        >
                          Confirmar pagamento
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenBookingDetails(b)}
                        className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-xs transition cursor-pointer"
                      >
                        Abrir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Coluna 2: Próximas chamadas */}
        <section className="rounded-xl bg-[#14151c] border border-white/[0.07] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-semibold text-white">Próximas chamadas</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Seus próximos compromissos na agenda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('calendar')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Abrir calendário</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-white/10 text-center space-y-1">
              <CalendarIcon className="w-5 h-5 text-zinc-500 mx-auto" />
              <div className="text-xs font-semibold text-white">Nenhuma chamada agendada</div>
              <p className="text-[11px] text-zinc-500">
                Quando um cliente reservar, o compromisso aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {upcomingBookings.slice(0, 4).map((b) => {
                const hasLink = Boolean(b.meeting?.url);
                const isCancelReq =
                  b.status === 'reagendamento_pendente' && b.cancellation?.state === 'requested';
                const isProposal =
                  Boolean(b.proposal) || (b.status === 'reagendamento_pendente' && !isCancelReq);
                return (
                  <div
                    key={b.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {formatDateForDisplay(b.date)} às {b.startTime} · {b.clientName}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {b.modalityName} ({b.durationMinutes} min) ·{' '}
                        {isCancelReq ? (
                          <span className="text-amber-300">Cancelamento solicitado</span>
                        ) : isProposal ? (
                          <span className="text-[#f4a7b9]">Proposta enviada</span>
                        ) : b.status === 'confirmada' ? (
                          <span className="text-emerald-400">Confirmada</span>
                        ) : (
                          <span className="text-amber-300">Aguardando pagamento</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!hasLink && b.status === 'confirmada' && (
                        <button
                          type="button"
                          onClick={() => onOpenMeetingModal(b)}
                          className="h-8 px-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-200 text-xs transition cursor-pointer"
                        >
                          Colocar link
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenBookingDetails(b)}
                        className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-xs transition cursor-pointer"
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Atalhos Rápidos para Disponibilidade e Tipos de Chamada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#14151c] border border-white/[0.07] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#843C52]/15 border border-[#843C52]/30 flex items-center justify-center text-[#f4a7b9] shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">Planejamento de Meses e Rotina</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Abra ou feche meses inteiros, marque folgas e ajuste seu horário habitual.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('availability')}
            className="h-8 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-white shrink-0 transition cursor-pointer"
          >
            Configurar
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#14151c] border border-white/[0.07] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#843C52]/15 border border-[#843C52]/30 flex items-center justify-center text-[#f4a7b9] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">
                Tipos de Chamada ({activeModalitiesCount} ativos no site)
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Edite preços em Reais, duração em minutos e textos exibidos na página de chamadas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('modalities')}
            className="h-8 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-white shrink-0 transition cursor-pointer"
          >
            Editar preços
          </button>
        </div>
      </div>
    </div>
  );
}
