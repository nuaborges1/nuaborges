'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
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
      return { label: 'Cancelamento em análise', cls: 'border border-amber-500/25 bg-amber-500/10 text-amber-200' };
    }
    if (apt.proposal) {
      return { label: 'Proposta de novo horário', cls: 'border border-[#7A293D]/55 bg-[#431322]/40 text-[#F5EEE9]' };
    }
    return { label: 'Reagendamento solicitado', cls: 'border border-amber-500/25 bg-amber-500/10 text-amber-200' };
  }
  const map: Record<string, { label: string; cls: string }> = {
    aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'border border-amber-500/25 bg-amber-500/10 text-amber-200' },
    confirmada: { label: 'Confirmada', cls: 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200' },
    concluida: { label: 'Realizada', cls: 'border border-white/10 bg-white/[0.04] text-zinc-300' },
    cancelada: { label: 'Cancelada', cls: 'border border-rose-500/25 bg-rose-500/10 text-rose-200' },
    reembolso_pendente: { label: 'Reembolso em análise', cls: 'border border-amber-500/25 bg-amber-500/10 text-amber-200' },
    nao_compareceu: { label: 'Não compareceu', cls: 'border border-white/10 bg-white/[0.04] text-zinc-400' },
  };
  return map[apt.operationalStatus] || { label: apt.operationalStatus, cls: 'border border-white/10 bg-white/[0.04] text-zinc-300' };
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
      apt.callLink ? `Link da sala: ${apt.callLink}` : 'Acesse o link em Minha Conta (/conta/chamadas).'
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
      : 'Acesse o link da sala em Minha Conta (https://nuaborges.com.br/conta/chamadas).',
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

function isUpcomingStatus(status: string): boolean {
  return ['confirmada', 'aguardando_pagamento', 'reagendamento_pendente'].includes(status);
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

  const { upcoming, history } = useMemo(() => {
    const nextList: NuaIdAppointment[] = [];
    const pastList: NuaIdAppointment[] = [];
    for (const apt of appointments) {
      if (isUpcomingStatus(apt.operationalStatus)) nextList.push(apt);
      else pastList.push(apt);
    }
    nextList.sort((a, b) => {
      const ta = a.dateUtc ? new Date(a.dateUtc).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.dateUtc ? new Date(b.dateUtc).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
    return { upcoming: nextList, history: pastList };
  }, [appointments]);

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
      <div className="space-y-4">
        <div className="h-7 w-48 rounded-lg bg-white/[0.04]" />
        {[1, 2].map((n) => (
          <div key={n} className="h-44 rounded-[24px] border border-white/[0.08] bg-[#08080c]" />
        ))}
      </div>
    );
  }

  const renderAppointmentCard = (apt: NuaIdAppointment, isFeaturedNext = false) => {
    const st = resolveStatusBadge(apt);
    const isPaid = apt.financialStatus === 'paid';
    const isActivePaid = isPaid && ['confirmada', 'reagendamento_pendente'].includes(apt.operationalStatus);
    const isCancelled = apt.operationalStatus === 'cancelada';
    const isPendingPayment = apt.operationalStatus === 'aguardando_pagamento';
    const hasPendingCancel = apt.cancellation?.state === 'requested';
    const wasCancelDenied = apt.cancellation?.state === 'denied';
    const timeLabel = apt.displayEndTimeBr ? `${apt.displayTimeBr} às ${apt.displayEndTimeBr}` : apt.displayTimeBr;
    const countdown = isActivePaid ? getCountdownLabel(apt.dateUtc, nowMs) : null;
    const localTzHint = formatLocalTzHint(apt.dateUtc);
    const gcalUrl = apt.scheduleDate && !isCancelled ? buildGoogleCalendarUrl(apt) : null;
    const hasSecondaryActions =
      Boolean(gcalUrl) ||
      Boolean(apt.scheduleDate && !isCancelled) ||
      Boolean(apt.voucherUrl) ||
      apt.canRequestReschedule ||
      apt.canRequestCancel;

    return (
      <article
        key={apt.id}
        className={`rounded-[24px] border bg-[#08080c] p-5 sm:p-6 space-y-5 ${
          isFeaturedNext ? 'border-[#7A293D]/55' : 'border-white/[0.08]'
        }`}
      >
        {/* Cabeçalho objetivo da Chamada */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {isFeaturedNext && (
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#C97A8D]">
                  Próxima chamada
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
              {countdown && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#7A293D]/55 bg-[#431322]/40 px-2.5 py-0.5 text-[11px] font-medium text-[#F5EEE9]">
                  <Clock className="size-3 text-[#C97A8D]" />
                  {countdown}
                </span>
              )}
            </div>

            <h3 className="font-serif text-xl font-normal text-[#F5EEE9] sm:text-2xl">{apt.modalityName}</h3>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-300">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-[#C97A8D]" />
                {apt.displayDateBr}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-[#C97A8D]" />
                {timeLabel} (Brasília) · {apt.durationMinutes} min
                {localTzHint && <span className="text-zinc-500">({localTzHint})</span>}
              </span>
            </div>

            {apt.rescheduledFrom && (
              <p className="text-xs text-zinc-500">
                Reagendada (horário anterior: {formatIsoDateBr(apt.rescheduledFrom.date)} às {apt.rescheduledFrom.startTime})
              </p>
            )}
          </div>

          <div className="text-left sm:text-right">
            <p className="font-serif text-lg text-[#F5EEE9] tabular-nums">{formatBrl(apt.price)}</p>
            <p className="text-xs text-zinc-500">
              {apt.financialStatus === 'paid'
                ? 'Pago'
                : apt.financialStatus === 'refunded'
                  ? 'Reembolsado'
                  : apt.financialStatus === 'cancelled'
                    ? 'Cancelado'
                    : 'Pagamento pendente'}
            </p>
          </div>
        </div>

        {/* Proposta de novo horário */}
        {apt.proposal && (
          <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-200">
              <Clock className="size-4 shrink-0 text-amber-400" />
              <span>Proposta de novo horário</span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-200">
              A Nua sugeriu alterar a chamada para{' '}
              <strong className="font-medium text-[#F5EEE9]">{formatIsoDateBr(apt.proposal.date)}</strong> às{' '}
              <strong className="font-medium text-[#F5EEE9]">{apt.proposal.time}</strong>.
              {apt.proposal.note && (
                <span className="mt-1 block italic text-zinc-400">&ldquo;{apt.proposal.note}&rdquo;</span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => handleProposalResponse(apt.id, 'accept_proposal')}
                className="btn-primary !min-h-[40px] !px-5"
              >
                {busyKey === `${apt.id}:accept_proposal` ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                <span>Aceitar novo horário</span>
              </button>
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => handleProposalResponse(apt.id, 'decline_proposal')}
                className="btn-ghost !min-h-[40px] !px-4"
              >
                {busyKey === `${apt.id}:decline_proposal` && <Loader2 className="size-3.5 animate-spin" />}
                <span>Manter horário atual</span>
              </button>
            </div>
          </div>
        )}

        {/* Reagendamento aguardando proposta */}
        {apt.operationalStatus === 'reagendamento_pendente' && !apt.proposal && !hasPendingCancel && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 text-xs leading-relaxed text-amber-200">
            <p className="font-medium">Solicitação de reagendamento enviada</p>
            <p className="mt-1 text-zinc-300">
              {apt.rescheduleRequest?.note ? `Sua mensagem: "${apt.rescheduleRequest.note}". ` : ''}
              Assim que um novo horário for sugerido, a proposta aparecerá aqui para aprovação.
            </p>
          </div>
        )}

        {/* Cancelamento em análise / mantida */}
        {hasPendingCancel && (
          <div className="space-y-1 rounded-xl border border-amber-500/25 bg-amber-950/15 px-4 py-3 text-xs text-amber-200">
            <p className="font-medium">Solicitação de cancelamento em análise</p>
            <p className="text-zinc-300">
              Seu pedido foi enviado à equipe. Assim que houver atualização ou eventual reembolso, o status aparecerá aqui.
            </p>
          </div>
        )}

        {wasCancelDenied && !isCancelled && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-zinc-300">
            <p className="font-medium text-[#F5EEE9]">Solicitação de cancelamento analisada — reserva mantida</p>
            {(apt.cancellation?.denialNote || apt.cancellation?.decisionNote) && (
              <p className="mt-1 text-zinc-400">
                Resposta: {apt.cancellation.denialNote || apt.cancellation.decisionNote}
              </p>
            )}
          </div>
        )}

        {/* Sala Privativa de Vídeo */}
        {isActivePaid && (
          <div className="space-y-3.5 rounded-2xl border border-[#7A293D]/40 bg-[#431322]/15 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#C97A8D]">
              <Video className="size-4" />
              <span>Sala privativa de vídeo</span>
            </div>

            {apt.callLink ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-zinc-300">
                  {apt.meetingInstructions ||
                    'Sua sala privativa está liberada. Entre no horário agendado com câmera e microfone prontos.'}
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={sanitizeUrl(apt.callLink, '#')}
                    rel="noreferrer"
                    className="btn-primary !min-h-[44px] !px-6"
                  >
                    <Video className="size-4" />
                    <span>Entrar na chamada</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyText(`link:${apt.id}`, apt.callLink!)}
                    className="btn-ghost !min-h-[44px] !px-4"
                  >
                    {copiedId === `link:${apt.id}` ? (
                      <>
                        <Check className="size-3.5 text-emerald-400" />
                        <span>Link copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-[#C97A8D]" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-zinc-400">
                Pagamento confirmado. O link da sala privativa aparecerá aqui automaticamente antes do encontro.
              </p>
            )}

            {/* Checklist pré-chamada expansível */}
            <div className="border-t border-white/[0.06] pt-3">
              <button
                type="button"
                onClick={() => setOpenChecklistId((cur) => (cur === apt.id ? null : apt.id))}
                className="flex w-full items-center justify-between text-left text-xs text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#C97A8D]" />
                  Orientações rápidas antes da chamada
                </span>
                <ChevronDown
                  className={`size-3.5 transition-transform duration-200 ${
                    openChecklistId === apt.id ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openChecklistId === apt.id && (
                <ul className="mt-2.5 space-y-1.5 pl-1 text-xs leading-relaxed text-zinc-400">
                  <li>• Teste câmera, microfone e conexão 5 minutos antes do horário agendado.</li>
                  <li>• Escolha um ambiente silencioso, iluminado e reservado.</li>
                  <li>• Gravações ou capturas de tela não são permitidas, preservando a privacidade de ambos.</li>
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Pagamento pendente */}
        {isPendingPayment && (
          <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-950/15 p-4">
            <p className="text-sm text-amber-100">
              Conclua o pagamento Pix para confirmar seu horário e liberar a sala privativa.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setOpenPaymentId((cur) => (cur === apt.id ? null : apt.id))}
                className="btn-primary !min-h-[42px] !px-5"
              >
                <QrCode className="size-3.5" />
                <span>{openPaymentId === apt.id ? 'Fechar pagamento Pix' : 'Pagar com Pix'}</span>
              </button>
              {apt.voucherUrl && (
                <Link href={apt.voucherUrl} className="btn-ghost !min-h-[42px] !px-4">
                  <span>Abrir voucher</span>
                  <ExternalLink className="size-3.5" />
                </Link>
              )}
            </div>
            {openPaymentId === apt.id && (
              <OrderPaymentPanel id={apt.id} onOrderUpdated={onUpdated} onOpenContact={onOpenContact} />
            )}
          </div>
        )}

        {/* Cancelada & status de reembolso */}
        {isCancelled && (apt.cancellationReason || apt.cancellation?.decisionNote || (apt.refundStatus && apt.refundStatus !== 'not_required' && apt.refundStatus !== 'not_applicable')) && (
          <div className="space-y-1.5 rounded-xl border border-rose-500/20 bg-rose-950/15 p-4 text-xs">
            {apt.cancellationReason && (
              <p className="text-rose-200">
                <strong>Motivo:</strong> {apt.cancellationReason}
              </p>
            )}
            {apt.cancellation?.decisionNote && (
              <p className="text-zinc-300">
                <strong>Observação:</strong> {apt.cancellation.decisionNote}
              </p>
            )}
            {apt.refundStatus && apt.refundStatus !== 'not_required' && apt.refundStatus !== 'not_applicable' && (
              <p className="font-medium text-amber-200">
                Reembolso
                {typeof apt.refundAmount === 'number' && apt.refundAmount > 0 ? ` (${formatBrl(apt.refundAmount)})` : ''}
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

        {/* Ações secundárias organizadas no rodapé do card */}
        {hasSecondaryActions && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
            {gcalUrl && (
              <a
                href={gcalUrl}
                rel="noreferrer"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-3.5 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-[#F5EEE9]"
              >
                <CalendarPlus className="size-3.5 text-[#C97A8D]" />
                <span>Google Agenda</span>
              </a>
            )}
            {apt.scheduleDate && !isCancelled && (
              <button
                type="button"
                onClick={() => downloadAppointmentIcs(apt)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-3.5 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-[#F5EEE9] cursor-pointer"
              >
                <Download className="size-3.5 text-[#C97A8D]" />
                <span>.ics</span>
              </button>
            )}
            {apt.voucherUrl && !isPendingPayment && (
              <Link
                href={apt.voucherUrl}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.02] px-3.5 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-[#F5EEE9]"
              >
                Voucher
              </Link>
            )}
            {apt.canRequestReschedule && (
              <button
                type="button"
                onClick={() => setModal({ appointment: apt, action: 'request_reschedule' })}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-3.5 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-[#F5EEE9] cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Reagendar</span>
              </button>
            )}
            {apt.canRequestCancel && (
              <button
                type="button"
                onClick={() => setModal({ appointment: apt, action: 'request_cancel' })}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-950/20 px-3.5 text-xs text-rose-200 transition-colors hover:border-rose-400/50 hover:bg-rose-950/45 sm:ml-auto cursor-pointer"
              >
                <XCircle className="size-3.5" />
                <span>Cancelar</span>
              </button>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-normal leading-tight tracking-tight text-[#F5EEE9] sm:text-3xl">
            Chamadas VIP
          </h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            Acesse sua sala privativa, acompanhe propostas de horário e consulte suas reservas.
          </p>
        </div>
        <Link href="/chamadas" className="btn-ghost !min-h-[40px] !px-4">
          <span>Agendar chamada</span>
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </header>

      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-950/25 text-emerald-200'
              : 'border-rose-500/30 bg-rose-950/30 text-rose-200'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#C97A8D]">
            <Video className="size-5" />
          </div>
          <p className="font-serif text-xl font-normal text-[#F5EEE9]">Nenhuma chamada agendada</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            Suas reservas de Chamadas VIP, links de sala privativa e histórico aparecerão aqui.
          </p>
          <div className="mt-7">
            <Link href="/chamadas" className="btn-primary !min-h-[46px] !px-6">
              <span>Ver horários disponíveis</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Próximas chamadas */}
          {upcoming.length > 0 && (
            <div className="space-y-4">
              {upcoming.map((apt, idx) => renderAppointmentCard(apt, idx === 0))}
            </div>
          )}

          {/* Histórico separado */}
          {history.length > 0 && (
            <div className="space-y-4">
              {upcoming.length > 0 && <div className="section-divider" />}
              <h3 className="font-serif text-xl font-normal text-zinc-300">Histórico de chamadas</h3>
              <div className="space-y-4">
                {history.map((apt) => renderAppointmentCard(apt, false))}
              </div>
            </div>
          )}
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
            className="w-full max-w-md space-y-4 rounded-[24px] border border-white/[0.1] bg-[#08080c] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 id="apt-modal-title" className="font-serif text-xl font-normal text-[#F5EEE9]">
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
                className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors hover:border-white/25 hover:text-white cursor-pointer disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-zinc-400">
              {modal.action === 'request_cancel'
                ? 'Sua solicitação será enviada à equipe Nua Borges para análise conforme a política vigente.'
                : 'Informe sua preferência de novo dia ou horário. A Nua enviará uma proposta para você confirmar aqui.'}
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                modal.action === 'request_cancel'
                  ? 'Informe o motivo do cancelamento…'
                  : 'Ex.: Teria disponibilidade na sexta à noite?'
              }
              className="w-full rounded-xl border border-white/[0.1] bg-black/60 p-3.5 text-base sm:text-sm text-[#F5EEE9] placeholder:text-zinc-500 focus:border-[#90364B] focus:outline-none transition-colors"
            />
            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setModal(null);
                  setReason('');
                }}
                className="btn-ghost !min-h-[42px] !px-4"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary !min-h-[42px] !px-5"
              >
                {submitting ? 'Enviando…' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
