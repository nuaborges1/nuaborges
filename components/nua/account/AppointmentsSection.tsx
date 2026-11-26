'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { NuaIdAppointment, requestAppointmentAction } from '@/lib/nuaIdClient';
import { convertSlotBetweenTimezones, timeStringToMinutes } from '@/lib/appointmentsCanonical';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useModalFocus } from '@/hooks/useModalFocus';
import { sanitizeUrl } from '@/lib/security';
import { OrderPaymentPanel } from './OrderPaymentPanel';

interface AppointmentsSectionProps {
  appointments: NuaIdAppointment[];
  loading: boolean;
  onUpdated: () => void;
  onOpenContact?: () => void;
}

function formatBrl(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function formatIsoDateBr(isoDate: string) {
  if (!isoDate) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate.split('-').reverse().join('/');
  }
  return isoDate;
}

function resolveStatusBadge(apt: NuaIdAppointment): { label: string; cls: string } {
  if (apt.operationalStatus === 'reagendamento_pendente') {
    if (apt.cancellation?.state === 'requested') {
      return { label: 'Cancelamento em análise', cls: 'bg-amber-500/15 text-amber-200 border border-amber-500/30' };
    }
    if (apt.proposal) {
      return { label: 'Proposta de novo horário', cls: 'bg-[#661C30]/35 text-[#F5EEE9] border border-[#90364B]/50' };
    }
    return { label: 'Reagendamento solicitado', cls: 'bg-amber-500/15 text-amber-200 border border-amber-500/30' };
  }
  const map: Record<string, { label: string; cls: string }> = {
    aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' },
    confirmada: { label: 'Confirmada', cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25' },
    concluida: { label: 'Realizada', cls: 'bg-zinc-500/20 text-zinc-200 border border-white/10' },
    cancelada: { label: 'Cancelada', cls: 'bg-rose-500/15 text-rose-300 border border-rose-500/25' },
    reembolso_pendente: { label: 'Reembolso em análise', cls: 'bg-amber-500/15 text-amber-200 border border-amber-500/25' },
    nao_compareceu: { label: 'Não compareceu', cls: 'bg-zinc-600/20 text-zinc-400 border border-white/10' },
  };
  return map[apt.operationalStatus] || { label: apt.operationalStatus, cls: 'bg-zinc-700/30 text-zinc-300' };
}

function formatUtcIcsStamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function escapeIcsText(val: string): string {
  return String(val || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function downloadAppointmentIcs(apt: NuaIdAppointment) {
  if (!apt.scheduleDate || !/^\d{4}-\d{2}-\d{2}$/.test(apt.scheduleDate)) return;
  const sourceTz = apt.scheduleTimezone || 'Europe/Dublin';
  const startLocal = apt.scheduleTime || '14:00';
  const utcStartSlot = convertSlotBetweenTimezones(apt.scheduleDate, startLocal, sourceTz, 'UTC');

  const [sy, sm, sd] = utcStartSlot.date.split('-').map(Number);
  const [sh, smin] = utcStartSlot.time.split(':').map(Number);
  if (![sy, sm, sd, sh, smin].every(Number.isFinite)) return;

  let durationMin = Number(apt.durationMinutes || 0);
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    const startMins = timeStringToMinutes(startLocal);
    const endMins = apt.scheduleEndTime ? timeStringToMinutes(apt.scheduleEndTime) : startMins + 30;
    durationMin = endMins > startMins ? endMins - startMins : 30;
  }

  const startUtc = new Date(Date.UTC(sy, sm - 1, sd, sh, smin, 0));
  const endUtc = new Date(startUtc.getTime() + durationMin * 60_000);
  const nowUtc = formatUtcIcsStamp(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nua Borges//Chamadas VIP//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${apt.id}@nuaborges.com.br`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${formatUtcIcsStamp(startUtc)}`,
    `DTEND:${formatUtcIcsStamp(endUtc)}`,
    `SUMMARY:${escapeIcsText(`Chamada VIP — ${apt.modalityName}`)}`,
    `DESCRIPTION:${escapeIcsText(
      apt.callLink ? `Link da sala: ${apt.callLink}` : 'Acesse o link em Minha Conta (/conta).'
    )}`,
    `LOCATION:${escapeIcsText(apt.callLink || 'Sala Privativa Nua Borges')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chamada-vip-${apt.scheduleDate || apt.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildGoogleCalendarUrl(apt: NuaIdAppointment): string | null {
  if (!apt.scheduleDate || !/^\d{4}-\d{2}-\d{2}$/.test(apt.scheduleDate)) return null;
  const sourceTz = apt.scheduleTimezone || 'Europe/Dublin';
  const startLocal = apt.scheduleTime || '14:00';
  const utcStartSlot = convertSlotBetweenTimezones(apt.scheduleDate, startLocal, sourceTz, 'UTC');
  const [sy, sm, sd] = utcStartSlot.date.split('-').map(Number);
  const [sh, smin] = utcStartSlot.time.split(':').map(Number);
  if (![sy, sm, sd, sh, smin].every(Number.isFinite)) return null;
  const durationMin = Number(apt.durationMinutes || 30);
  const startUtc = new Date(Date.UTC(sy, sm - 1, sd, sh, smin, 0));
  const endUtc = new Date(startUtc.getTime() + durationMin * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Chamada VIP — ${apt.modalityName}`,
    dates: `${formatUtcIcsStamp(startUtc)}/${formatUtcIcsStamp(endUtc)}`,
    details: apt.callLink
      ? `Link da sala: ${apt.callLink}`
      : 'Acesse o link da sala em Minha Conta (https://nuaborges.com.br/conta?tab=chamadas).',
    location: apt.callLink || 'Sala Privativa Nua Borges',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function getCountdownLabel(dateUtc: string | null, nowMs: number): string | null {
  if (!dateUtc) return null;
  const startMs = new Date(dateUtc).getTime();
  if (!Number.isFinite(startMs)) return null;
  const diffMin = Math.round((startMs - nowMs) / 60000);
  if (diffMin < -30 || diffMin > 24 * 60) return null;
  if (diffMin <= 0) return 'Acontecendo agora';
  if (diffMin < 60) return `Começa em ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `Começa em ${h}h ${m}min` : `Começa em ${h}h`;
}

function formatLocalTzHint(dateUtc: string | null): string | null {
  if (!dateUtc || typeof Intl === 'undefined') return null;
  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!userTz || userTz === 'America/Sao_Paulo') return null;
    const dt = new Date(dateUtc);
    if (!Number.isFinite(dt.getTime())) return null;
    const localTime = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTz,
    }).format(dt);
    return `${localTime} no seu fuso`;
  } catch {
    return null;
  }
}

export function AppointmentsSection({ appointments, loading, onUpdated, onOpenContact }: AppointmentsSectionProps) {
  const [modal, setModal] = useState<{
    appointment: NuaIdAppointment;
    action: 'request_cancel' | 'request_reschedule';
  } | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [openChecklistId, setOpenChecklistId] = useState<string | null>(null);
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null);
  const modalFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useScrollLock(Boolean(modal));
  useModalFocus(Boolean(modal), modalFormRef);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        setModal(null);
        setReason('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, submitting]);

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

  const handleProposalResponse = async (
    appointmentId: string,
    action: 'accept_proposal' | 'decline_proposal'
  ) => {
    setBusyKey(`${appointmentId}:${action}`);
    setFeedback(null);
    try {
      const res = await requestAppointmentAction(appointmentId, action);
      if (!res.ok || !res.data?.success) {
        setFeedback({ type: 'err', text: res.data?.error || 'Não foi possível responder à proposta.' });
      } else {
        setFeedback({ type: 'ok', text: res.data.message || 'Resposta registrada.' });
        onUpdated();
      }
    } catch {
      setFeedback({ type: 'err', text: 'Falha de conexão ao responder proposta.' });
    } finally {
      setBusyKey(null);
    }
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2500);
    } catch {}
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div key={n} className="h-40 animate-pulse rounded-[28px] border border-white/[0.06] bg-[#08080c]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-2xl leading-tight tracking-tight sm:text-3xl text-[#F5EEE9]">Minhas Chamadas VIP</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Link da sala, propostas de horário e status das suas reservas.
          </p>
        </div>
        <Link
          href="/chamadas"
          className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#7A293D]/55 bg-[#431322]/40 px-5 py-2 text-xs font-medium text-[#F5EEE9] transition-colors duration-200 hover:bg-[#661C30] hover:border-white/20"
        >
          Agendar chamada
        </Link>
      </div>

      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs ${
            feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
              : 'border-rose-500/30 bg-rose-950/35 text-rose-200'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#08080c] px-6 py-12 text-center">
          <Video className="mx-auto mb-3 h-7 w-7 text-[#90364B]/80" />
          <p className="font-serif text-base text-[#F5EEE9]">Nenhuma chamada agendada</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-zinc-400">
            Suas reservas de Chamadas VIP, links de sala e histórico aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => {
            const st = resolveStatusBadge(apt);
            const isPaid = apt.financialStatus === 'paid';
            const isActivePaid =
              isPaid && ['confirmada', 'reagendamento_pendente'].includes(apt.operationalStatus);
            const isCancelled = apt.operationalStatus === 'cancelada';
            const isPendingPayment = apt.operationalStatus === 'aguardando_pagamento';
            const hasPendingCancel = apt.cancellation?.state === 'requested';
            const wasCancelDenied = apt.cancellation?.state === 'denied';
            const timeLabel = apt.displayEndTimeBr
              ? `${apt.displayTimeBr} às ${apt.displayEndTimeBr}`
              : apt.displayTimeBr;
            const countdown = isActivePaid ? getCountdownLabel(apt.dateUtc, nowMs) : null;
            const localTzHint = formatLocalTzHint(apt.dateUtc);
            const gcalUrl = apt.scheduleDate && !isCancelled ? buildGoogleCalendarUrl(apt) : null;

            return (
              <article
                key={apt.id}
                className="rounded-2xl border border-white/[0.08] bg-[#08080c] p-5 sm:p-6 space-y-4"
              >
                {/* Cabeçalho da Chamada */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.cls}`}>
                        {st.label}
                      </span>
                      {countdown && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#90364B]/60 bg-[#661C30]/35 px-2.5 py-0.5 text-[10px] font-semibold text-[#F5EEE9]">
                          <Clock className="h-3 w-3 text-[#C97A8D]" />
                          {countdown}
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-500">
                        Pagamento:{' '}
                        <strong className="text-zinc-300">
                          {apt.financialStatus === 'paid'
                            ? 'Pago'
                            : apt.financialStatus === 'refunded'
                              ? 'Reembolsado'
                              : apt.financialStatus === 'cancelled'
                                ? 'Cancelado'
                                : 'Pendente'}
                        </strong>
                      </span>
                      <span className="font-mono text-[10px] text-zinc-600">{apt.id}</span>
                    </div>

                    <h3 className="mt-2 font-serif text-lg sm:text-xl text-[#F5EEE9]">{apt.modalityName}</h3>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-300">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#90364B]" />
                        {apt.displayDateBr}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#90364B]" />
                        {timeLabel} (Brasília) · {apt.durationMinutes} min
                        {localTzHint && <span className="text-zinc-500">({localTzHint})</span>}
                      </span>
                      <span className="font-semibold text-[#F5EEE9]">{formatBrl(apt.price)}</span>
                    </div>

                    {apt.rescheduledFrom && (
                      <p className="mt-1.5 text-[11px] text-zinc-500">
                        Reagendada (horário anterior: {formatIsoDateBr(apt.rescheduledFrom.date)} às {apt.rescheduledFrom.startTime})
                      </p>
                    )}
                  </div>

                  {/* Ações secundárias no topo */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {gcalUrl && (
                      <a
                        href={gcalUrl}
                        rel="noreferrer"
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-xs text-zinc-300 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
                      >
                        <CalendarPlus className="h-3.5 w-3.5 text-[#C97A8D]" />
                        Google Agenda
                      </a>
                    )}
                    {apt.scheduleDate && !isCancelled && (
                      <button
                        type="button"
                        onClick={() => downloadAppointmentIcs(apt)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-xs text-zinc-300 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.06] hover:text-white cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-[#C97A8D]" />
                        .ics
                      </button>
                    )}
                    {apt.voucherUrl && (
                      <Link
                        href={apt.voucherUrl}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-xs text-zinc-300 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
                      >
                        Voucher
                      </Link>
                    )}
                    {apt.canRequestReschedule && (
                      <button
                        type="button"
                        onClick={() => setModal({ appointment: apt, action: 'request_reschedule' })}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5 text-xs text-zinc-300 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.06] hover:text-white cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reagendar
                      </button>
                    )}
                    {apt.canRequestCancel && (
                      <button
                        type="button"
                        onClick={() => setModal({ appointment: apt, action: 'request_cancel' })}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-rose-500/30 bg-rose-950/25 px-3.5 py-1.5 text-xs text-rose-200 transition-colors duration-200 hover:border-rose-400/50 hover:bg-rose-950/55 hover:text-rose-100 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. PROPOSTA DE NOVO HORÁRIO ENVIADA PELA NUA (Aceite / Recusa direto aqui) */}
                {apt.proposal && (
                  <div className="rounded-2xl border border-amber-500/35 bg-amber-950/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                      <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                      <span>Proposta de Novo Horário da Nua Borges</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed">
                      A Nua sugeriu alterar a chamada para{' '}
                      <strong className="text-white">{formatIsoDateBr(apt.proposal.date)}</strong> às{' '}
                      <strong className="text-white">{apt.proposal.time}</strong>.
                      {apt.proposal.note && (
                        <span className="mt-1 block italic text-zinc-400">&ldquo;{apt.proposal.note}&rdquo;</span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => handleProposalResponse(apt.id, 'accept_proposal')}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                      >
                        {busyKey === `${apt.id}:accept_proposal` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Aceitar novo horário
                      </button>
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => handleProposalResponse(apt.id, 'decline_proposal')}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                      >
                        {busyKey === `${apt.id}:decline_proposal` && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        Recusar (manter horário atual)
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. SOLICITAÇÃO DE REAGENDAMENTO DO CLIENTE AGUARDANDO PROPOSTA */}
                {apt.operationalStatus === 'reagendamento_pendente' && !apt.proposal && !hasPendingCancel && (
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 text-xs text-amber-200">
                    <p className="font-medium">Solicitação de reagendamento enviada</p>
                    <p className="mt-1 text-zinc-300">
                      {apt.rescheduleRequest?.note
                        ? `Sua mensagem: "${apt.rescheduleRequest.note}". `
                        : ''}
                      Assim que a Nua sugerir um novo horário, a proposta aparecerá aqui para você aceitar em 1 clique.
                    </p>
                  </div>
                )}

                {/* 3. SOLICITAÇÃO DE CANCELAMENTO EM ANÁLISE / RECUSADA */}
                {hasPendingCancel && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-200 space-y-1">
                    <p className="font-semibold">Solicitação de cancelamento em análise</p>
                    <p className="text-zinc-300">
                      Seu pedido foi enviado à equipe Nua Borges. Assim que a decisão e o eventual reembolso forem registrados, o status será atualizado aqui automaticamente.
                    </p>
                  </div>
                )}

                {wasCancelDenied && !isCancelled && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-zinc-300">
                    <p className="font-medium text-[#F5EEE9]">Solicitação de cancelamento analisada — reserva mantida</p>
                    {(apt.cancellation?.denialNote || apt.cancellation?.decisionNote) && (
                      <p className="mt-1 text-zinc-400">
                        Resposta: {apt.cancellation.denialNote || apt.cancellation.decisionNote}
                      </p>
                    )}
                  </div>
                )}

                {/* 4. SALA PRIVATIVA DE VÍDEO (LINK EM TEMPO REAL) */}
                {isActivePaid && (
                  <div className="rounded-2xl border border-[#7A293D]/40 bg-[#431322]/15 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F5EEE9]">
                      <Video className="h-4 w-4 text-[#90364B]" />
                      <span>Sala Privativa de Vídeo</span>
                    </div>

                    {apt.callLink ? (
                      <div className="space-y-3">
                        <p className="text-xs leading-relaxed text-zinc-300">
                          {apt.meetingInstructions ||
                            'Sua sala privativa está liberada! Entre no horário agendado com câmera e microfone prontos.'}
                        </p>
                        <div className="rounded-xl border border-white/[0.08] bg-black/70 px-3.5 py-2.5 font-mono text-xs text-zinc-200 break-all select-all">
                          {apt.callLink}
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <a
                            href={sanitizeUrl(apt.callLink, '#')}
                            rel="noreferrer"
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#661C30] hover:bg-[#7A293D] hover:border-white/25 hover:shadow-[0_6px_26px_rgba(102,28,48,0.5)] active:scale-[0.985] border border-white/10 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#F5EEE9] shadow-[0_4px_20px_rgba(67,19,34,0.45)] transition-all duration-200"
                          >
                            <Video className="h-4 w-4" />
                            Entrar na Chamada em Vídeo
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyText(`link:${apt.id}`, apt.callLink!)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-white/12 bg-black/50 px-4 py-2 text-xs text-zinc-200 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.06] hover:text-white cursor-pointer"
                          >
                            {copiedId === `link:${apt.id}` ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                Link copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-[#C97A8D]" />
                                Copiar link da sala
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-zinc-400">
                        Pagamento confirmado. O link da sala privativa aparecerá aqui automaticamente assim que a Nua Borges gerar o endereço do encontro.
                      </p>
                    )}

                    {/* Checklist pré-chamada expansível */}
                    <div className="border-t border-white/[0.06] pt-2.5">
                      <button
                        type="button"
                        onClick={() => setOpenChecklistId((cur) => (cur === apt.id ? null : apt.id))}
                        className="flex w-full items-center justify-between text-left text-[11px] text-zinc-400 hover:text-[#F5EEE9] transition-colors cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#C97A8D]" />
                          Checklist rápido antes da chamada
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-200 ${
                            openChecklistId === apt.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {openChecklistId === apt.id && (
                        <ul className="mt-2.5 space-y-1.5 text-[11px] leading-relaxed text-zinc-400 pl-1">
                          <li>• Teste câmera, microfone e conexão 5 minutos antes do horário agendado.</li>
                          <li>• Escolha um ambiente silencioso, iluminado e reservado.</li>
                          <li>• Gravações ou capturas de tela não são permitidas, preservando a privacidade de ambos.</li>
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. AGUARDANDO PAGAMENTO PIX */}
                {isPendingPayment && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4 space-y-3">
                    <p className="text-xs text-amber-200 font-medium">
                      Conclua o pagamento Pix para confirmar seu horário e liberar a sala privativa.
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setOpenPaymentId((cur) => (cur === apt.id ? null : apt.id))}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#661C30] hover:bg-[#7A293D] hover:border-white/25 transition-all duration-200 border border-white/10 px-5 py-2 text-xs font-semibold text-[#F5EEE9] cursor-pointer"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        {openPaymentId === apt.id ? 'Fechar QR Code Pix' : 'Pagar agora com Pix'}
                      </button>
                      {apt.voucherUrl && (
                        <Link
                          href={apt.voucherUrl}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs text-zinc-200 transition-colors duration-200 hover:bg-white/[0.06] hover:border-white/25 hover:text-white"
                        >
                          Abrir voucher
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                    {openPaymentId === apt.id && (
                      <OrderPaymentPanel id={apt.id} onOrderUpdated={onUpdated} onOpenContact={onOpenContact} />
                    )}
                  </div>
                )}

                {/* 6. CANCELADA & STATUS DE REEMBOLSO */}
                {isCancelled && (
                  <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-4 text-xs space-y-1.5">
                    {apt.cancellationReason && (
                      <p className="text-rose-200">
                        <strong>Motivo:</strong> {apt.cancellationReason}
                      </p>
                    )}
                    {apt.cancellation?.decisionNote && (
                      <p className="text-zinc-300">
                        <strong>Observação da equipe:</strong> {apt.cancellation.decisionNote}
                      </p>
                    )}
                    {apt.refundStatus && apt.refundStatus !== 'not_required' && apt.refundStatus !== 'not_applicable' && (
                      <p className="text-amber-200 font-medium">
                        Reembolso
                        {typeof apt.refundAmount === 'number' && apt.refundAmount > 0
                          ? ` (${formatBrl(apt.refundAmount)})`
                          : ''}
                        :{' '}
                        {['refunded', 'approved', 'completed'].includes(apt.refundStatus)
                          ? 'Concluído'
                          : apt.refundStatus === 'manual_required'
                            ? 'Devolução manual em andamento'
                            : 'Em processamento'}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Cancelamento / Reagendamento */}
      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apt-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setModal(null);
              setReason('');
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <form
            ref={modalFormRef}
            onSubmit={handleConfirmAction}
            className="w-full max-w-md space-y-4 rounded-[28px] border border-white/[0.10] bg-[#08080c] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 id="apt-modal-title" className="font-serif text-lg text-[#F5EEE9]">
                {modal.action === 'request_cancel' ? 'Solicitar cancelamento' : 'Solicitar reagendamento'}
              </h3>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setModal(null);
                  setReason('');
                }}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-400 transition-colors hover:border-white/25 hover:text-white cursor-pointer disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              {modal.action === 'request_cancel'
                ? 'Sua solicitação será enviada imediatamente à Nua Borges para análise e devolução conforme a política vigente.'
                : 'Informe o motivo ou preferência de novo dia/horário. A Nua enviará uma proposta para você aprovar aqui.'}
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                modal.action === 'request_cancel'
                  ? 'Informe o motivo do cancelamento...'
                  : 'Ex.: Teria disponibilidade na sexta à noite?'
              }
              className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-base sm:text-xs text-[#F5EEE9] placeholder:text-zinc-600 focus:border-[#90364B] focus:outline-none transition-colors"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setModal(null);
                  setReason('');
                }}
                className="min-h-[40px] rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:text-white cursor-pointer disabled:opacity-40"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[40px] rounded-full bg-[#661C30] hover:bg-[#7A293D] hover:border-white/25 border border-white/10 px-5 py-2 text-xs font-semibold text-[#F5EEE9] transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
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
