'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, ExternalLink, RefreshCw, Video, XCircle } from 'lucide-react';
import { NuaIdAppointment, requestAppointmentAction } from '@/lib/nuaIdClient';

interface AppointmentsSectionProps {
  appointments: NuaIdAppointment[];
  loading: boolean;
  onUpdated: () => void;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-amber-500/15 text-amber-300' },
  confirmada: { label: 'Confirmada', cls: 'bg-emerald-500/15 text-emerald-300' },
  concluida: { label: 'Realizada', cls: 'bg-zinc-500/20 text-zinc-300' },
  cancelada: { label: 'Cancelada', cls: 'bg-rose-500/15 text-rose-300' },
  reagendamento_pendente: { label: 'Reagendamento solicitado', cls: 'bg-amber-500/15 text-amber-200' },
  reembolso_pendente: { label: 'Reembolso em análise', cls: 'bg-amber-500/15 text-amber-200' },
  nao_compareceu: { label: 'Não compareceu', cls: 'bg-zinc-600/20 text-zinc-400' },
};

function formatBrl(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

export function AppointmentsSection({ appointments, loading, onUpdated }: AppointmentsSectionProps) {
  const [modal, setModal] = useState<{
    appointment: NuaIdAppointment;
    action: 'request_cancel' | 'request_reschedule';
  } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await requestAppointmentAction(modal.appointment.id, modal.action, reason);
      if (!res.ok || !res.data?.success) {
        setFeedback({ type: 'err', text: res.data?.error || 'Não foi possível concluir a solicitação.' });
      } else {
        setFeedback({ type: 'ok', text: res.data.message || 'Solicitação registrada.' });
        setModal(null);
        setReason('');
        onUpdated();
      }
    } catch {
      setFeedback({ type: 'err', text: 'Falha de conexão ao enviar solicitação.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div key={n} className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-[#171115]/70" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-xl text-[#F5EEE9]">Minhas Chamadas VIP</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Horários exibidos no fuso de Brasília (America/Sao_Paulo).
          </p>
        </div>
        <Link
          href="/chamadas"
          className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#7A293D]/50 bg-[#431322]/40 px-4 py-2 text-xs font-medium text-[#F5EEE9] transition-colors hover:bg-[#661C30]"
        >
          Agendar chamada
        </Link>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs ${
            feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
              : 'border-rose-500/30 bg-rose-950/35 text-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-12 text-center shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
          <Video className="mx-auto mb-3 h-7 w-7 text-[#90364B]/80" />
          <p className="font-serif text-base text-[#F5EEE9]">Nenhuma chamada agendada</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-zinc-400">
            Suas reservas de Chamadas VIP, links de sala e histórico aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const st = STATUS_LABELS[apt.operationalStatus] || {
              label: apt.operationalStatus,
              cls: 'bg-zinc-700/30 text-zinc-300',
            };
            return (
              <article
                key={apt.id}
                className="rounded-[24px] border border-white/[0.08] bg-[#08080c] p-4 sm:p-5 shadow-[0_16px_50px_rgba(0,0,0,0.85)]"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.cls}`}>
                        {st.label}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Pagamento: <strong className="text-zinc-300">{apt.financialStatus === 'paid' ? 'Pago' : apt.financialStatus === 'refunded' ? 'Reembolsado' : 'Pendente'}</strong>
                      </span>
                    </div>
                    <h3 className="mt-2 font-serif text-lg text-[#F5EEE9]">{apt.modalityName}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#A65B6C]" />
                        {apt.displayDateBr}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#A65B6C]" />
                        {apt.displayTimeBr} (Brasília) · {apt.durationMinutes} min
                      </span>
                      <span className="font-medium text-[#F5EEE9]">{formatBrl(apt.price)}</span>
                    </div>
                    {apt.cancellationReason && (
                      <p className="mt-2 text-xs text-zinc-400">Motivo: {apt.cancellationReason}</p>
                    )}
                    {apt.refundStatus && (
                      <p className="mt-1 text-xs text-amber-300/90">
                        Reembolso: {apt.refundStatus === 'refunded' || apt.refundStatus === 'approved' || apt.refundStatus === 'completed' ? 'Concluído' : 'Em andamento'}
                      </p>
                    )}
                    {apt.operationalStatus === 'confirmada' && !apt.callLink && (
                      <p className="mt-2 text-[11px] text-zinc-400">
                        {apt.meetingInstructions || 'Chamada confirmada! O link privativo da sala será exibido aqui assim que liberado.'}
                      </p>
                    )}
                    {apt.proposal && (
                      <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-xs text-amber-200">
                        Proposta de novo horário: <strong>{apt.proposal.date} às {apt.proposal.time}</strong>
                        {apt.voucherUrl && (
                          <>
                            {' · '}
                            <Link href={apt.voucherUrl} className="underline hover:text-white">
                              Responder no voucher
                            </Link>
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {apt.callLink && (
                      <a
                        href={apt.callLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] border border-white/10 px-4 py-2 text-xs font-semibold text-[#F5EEE9] transition-colors hover:from-[#661C30] hover:to-[#90364B]"
                      >
                        Entrar na chamada
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {apt.voucherUrl && (
                      <Link
                        href={apt.voucherUrl}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-white/10 px-3.5 py-2 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                      >
                        Ver voucher
                      </Link>
                    )}
                    {apt.canRequestReschedule && (
                      <button
                        type="button"
                        onClick={() => setModal({ appointment: apt, action: 'request_reschedule' })}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3.5 py-2 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reagendar
                      </button>
                    )}
                    {apt.canRequestCancel && (
                      <button
                        type="button"
                        onClick={() => setModal({ appointment: apt, action: 'request_cancel' })}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-950/25 px-3.5 py-2 text-xs text-rose-200 transition-colors hover:bg-rose-950/50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleConfirmAction}
            className="w-full max-w-md space-y-4 rounded-2xl border border-[#7A293D]/40 bg-[#151014] p-6"
          >
            <h3 className="font-serif text-lg text-[#F5EEE9]">
              {modal.action === 'request_cancel' ? 'Solicitar cancelamento' : 'Solicitar reagendamento'}
            </h3>
            <p className="text-xs leading-relaxed text-zinc-400">
              {modal.action === 'request_cancel'
                ? 'O cancelamento e eventual reembolso seguem a política vigente da modalidade contratada.'
                : 'Informe o motivo ou preferência de novo horário. Nossa equipe confirmará a disponibilidade.'}
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Observação opcional..."
              className="w-full rounded-xl border border-white/10 bg-[#0b090c] p-3 text-xs text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setReason('');
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#661C30] px-5 py-2 text-xs font-semibold text-[#F5EEE9] hover:bg-[#7A293D] disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
