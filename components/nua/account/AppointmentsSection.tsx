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
import { useCopy } from '@/lib/copy';

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
    cancelada: { label: 'Cancelada', cls: 'border border-red-500/25 bg-red-500/10 text-red-200' },
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
    'PRODID:-//NB Digital//Agenda//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${apt.id}@nbdigital.local`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${formatUtcIcsStamp(startUtc)}`,
    `DTEND:${formatUtcIcsStamp(endUtc)}`,
    `SUMMARY:${escapeIcsText('Compromisso Reservado')}`,
    `DESCRIPTION:${escapeIcsText(
      apt.callLink ? `Link de acesso: ${apt.callLink}` : 'Consulte os detalhes e o link de acesso na sua conta.'
    )}`,
    `LOCATION:${escapeIcsText(apt.callLink || 'Online')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `compromisso-${apt.scheduleDate || apt.id}.ics`;
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
    text: 'Compromisso Reservado',
    dates: `${formatUtcIcsStamp(startUtc)}/${formatUtcIcsStamp(endUtc)}`,
    details: apt.callLink
      ? `Link de acesso: ${apt.callLink}`
      : 'Consulte os detalhes e o link de acesso na sua conta.',
    location: apt.callLink || 'Online',
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

function isUpcomingAppointment(apt: NuaIdAppointment, nowMs: number): boolean {
  if (['aguardando_pagamento', 'reagendamento_pendente'].includes(apt.operationalStatus)) return true;
  if (apt.operationalStatus !== 'confirmada') return false;
  if (!apt.dateUtc) return true;
  const startMs = new Date(apt.dateUtc).getTime();
  return !Number.isFinite(startMs) || startMs >= nowMs - 30 * 60 * 1000;
}

function sanitizeRoomInstruction(raw: string | null | undefined, hasLink: boolean): string {
  const clean = String(raw || '').trim();
  const isStalePrePayment =
    /ap[oó]s\s+a\s+confirma[cç][aã]o\s+do\s+pagamento|ser[aá]\s+liberado\s+no\s+seu\s+voucher/i.test(clean);
  if (hasLink) {
    if (clean && !isStalePrePayment) return clean;
    return 'Sua sala privativa está pronta. Entre no horário agendado com câmera e microfone preparados.';
  }
  return 'Pagamento confirmado. O link da sala privativa aparecerá aqui automaticamente antes do encontro.';
}

export function AppointmentsSection({ appointments, loading, onUpdated, onOpenContact }: AppointmentsSectionProps) {
  const { copy } = useCopy();
  const [subTab, setSubTab] = useState<'proximas' | 'historico'>('proximas');
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
  const [openCalendarMenuId, setOpenCalendarMenuId] = useState<string | null>(null);
  const modalFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!openCalendarMenuId) return;
    const onDocClick = () => setOpenCalendarMenuId(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCalendarMenuId(null);
    };
    document.addEventListener('click', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [openCalendarMenuId]);

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
      if (isUpcomingAppointment(apt, nowMs)) nextList.push(apt);
      else pastList.push(apt);
    }
    nextList.sort((a, b) => {
      const ta = a.dateUtc ? new Date(a.dateUtc).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.dateUtc ? new Date(b.dateUtc).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
    return { upcoming: nextList, history: pastList };
  }, [appointments, nowMs]);

  const hasSubTabs = upcoming.length > 0 && history.length > 0;
  const visibleList = hasSubTabs
    ? subTab === 'proximas'
      ? upcoming
      : history
    : upcoming.length > 0
      ? upcoming
      : history;

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
        {[1, 2].map((n) => (
          <div key={n} className="h-44 rounded-[24px] border border-white/[0.08] bg-[#08080c]" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#F5EEE9]">
          <Video className="size-5" />
        </div>
        <p className="font-serif text-2xl font-normal text-[#F5EEE9]">Nenhuma chamada agendada</p>
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
    );
  }

  return (
    <div className="space-y-5">
      {/* Sub-abas contextuais (Próximas · Histórico) */}
      {hasSubTabs && (
        <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#08080c] p-1" role="tablist">
          {[
            { id: 'proximas' as const, label: 'Próximas', count: upcoming.length },
            { id: 'historico' as const, label: 'Histórico', count: history.length },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={subTab === t.id}
              onClick={() => setSubTab(t.id)}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-xs transition-colors cursor-pointer touch-manipulation ${
                subTab === t.id
                  ? 'border border-[#90364B]/50 bg-[#661C30]/40 font-medium text-[#F5EEE9]'
                  : 'border border-transparent text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <span>{t.label}</span>
              <span className="text-[11px] tabular-nums opacity-75">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-950/25 text-emerald-200'
              : 'border-red-500/30 bg-red-950/30 text-red-200'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-red-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="space-y-4">
        {visibleList.map((apt, idx) => {
          const st = resolveStatusBadge(apt);
          const isPaid = apt.financialStatus === 'paid';
          const isActivePaid = isPaid && ['confirmada', 'reagendamento_pendente'].includes(apt.operationalStatus);
          const isCancelled = apt.operationalStatus === 'cancelada';
          const isPendingPayment = apt.operationalStatus === 'aguardando_pagamento';
          const hasPendingCancel = apt.cancellation?.state === 'requested';
          const wasCancelDenied = apt.cancellation?.state === 'denied';
          const isFeaturedNext = subTab === 'proximas' && idx === 0 && isUpcomingAppointment(apt, nowMs);

          const timeLabel = apt.displayEndTimeBr ? `${apt.displayTimeBr} às ${apt.displayEndTimeBr}` : apt.displayTimeBr;
          const titleIncludesDuration = /\d+\s*min/i.test(apt.modalityName);
          const countdown = isActivePaid ? getCountdownLabel(apt.dateUtc, nowMs) : null;
          const localTzHint = formatLocalTzHint(apt.dateUtc);
          const gcalUrl = apt.scheduleDate && !isCancelled ? buildGoogleCalendarUrl(apt) : null;
          const hasCalendarAction = Boolean(gcalUrl || (apt.scheduleDate && !isCancelled));
          const hasFooterActions =
            hasCalendarAction || Boolean(apt.voucherUrl && !isPendingPayment) || apt.canRequestReschedule || apt.canRequestCancel;

          return (
            <article
              key={apt.id}
              className={`rounded-[24px] border bg-[#08080c] p-5 sm:p-7 ${
                isFeaturedNext ? 'border-[#7A293D]/55' : 'border-white/[0.08]'
              }`}
            >
              {/* Composição única em 2 colunas no desktop — sem caixas aninhadas! */}
              <div className={isActivePaid ? 'grid gap-6 lg:grid-cols-12 lg:gap-8' : 'space-y-5'}>
                {/* Coluna Esquerda: Identidade e Horário */}
                <div className={`min-w-0 space-y-3 ${isActivePaid ? 'lg:col-span-7' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {isFeaturedNext && (
                      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#F5EEE9]/80">
                        Próxima chamada
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                    {countdown && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#7A293D]/55 bg-[#431322]/40 px-2.5 py-0.5 text-[11px] font-medium text-[#F5EEE9]">
                        <Clock className="size-3 text-[#90364B]" />
                        {countdown}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-serif text-2xl font-normal text-[#F5EEE9] sm:text-3xl">
                      {apt.modalityName}
                    </h2>
                    <span className="font-serif text-lg text-zinc-300 tabular-nums">
                      {formatBrl(apt.price)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-zinc-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-[#90364B]" />
                      {apt.displayDateBr}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5 text-[#90364B]" />
                      {timeLabel} (Brasília)
                      {!titleIncludesDuration && apt.durationMinutes > 0 && ` · ${apt.durationMinutes} min`}
                      {localTzHint && <span className="text-zinc-500">({localTzHint})</span>}
                    </span>
                  </div>

                  {apt.rescheduledFrom && (
                    <p className="text-xs text-zinc-500">
                      Reagendada (anterior: {formatIsoDateBr(apt.rescheduledFrom.date)} às {apt.rescheduledFrom.startTime})
                    </p>
                  )}

                  {/* Alertas operacionais pontuais */}
                  {apt.proposal && (
                    <div className="mt-2 space-y-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                      <p className="text-xs font-medium text-amber-200">Proposta de novo horário</p>
                      <p className="text-sm leading-relaxed text-zinc-200">
                        Novo horário sugerido:{' '}
                        <strong className="font-medium text-[#F5EEE9]">{formatIsoDateBr(apt.proposal.date)}</strong> às{' '}
                        <strong className="font-medium text-[#F5EEE9]">{apt.proposal.time}</strong>.
                        {apt.proposal.note && (
                          <span className="mt-1 block italic text-zinc-400">&ldquo;{apt.proposal.note}&rdquo;</span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
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
                          <span>Aceitar horário</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyKey !== null}
                          onClick={() => handleProposalResponse(apt.id, 'decline_proposal')}
                          className="btn-ghost !min-h-[40px] !px-4"
                        >
                          {busyKey === `${apt.id}:decline_proposal` && <Loader2 className="size-3.5 animate-spin" />}
                          <span>Manter atual</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {apt.operationalStatus === 'reagendamento_pendente' && !apt.proposal && !hasPendingCancel && (
                    <p className="text-xs leading-relaxed text-amber-200/90">
                      Solicitação de reagendamento enviada. Assim que houver um novo horário sugerido, a proposta aparecerá aqui.
                    </p>
                  )}

                  {hasPendingCancel && (
                    <p className="text-xs leading-relaxed text-amber-200/90">
                      Solicitação de cancelamento em análise pela equipe.
                    </p>
                  )}

                  {wasCancelDenied && !isCancelled && (
                    <p className="text-xs leading-relaxed text-zinc-400">
                      Reserva mantida após análise.{apt.cancellation?.denialNote ? ` ${apt.cancellation.denialNote}` : ''}
                    </p>
                  )}
                </div>

                {/* Coluna Direita: Acesso à Sala Privativa (integrada por hairline, sem caixa pesada aninhada) */}
                {isActivePaid && (
                  <div className="flex flex-col justify-between space-y-4 border-t border-white/[0.06] pt-5 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                    <div className="space-y-3">
                      <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#F5EEE9]/80">
                        <Video className="size-3.5" />
                        <span>Sala privativa</span>
                      </p>
                      <p className="text-sm leading-relaxed text-zinc-300">
                        {sanitizeRoomInstruction(apt.meetingInstructions, Boolean(apt.callLink))}
                      </p>

                      {apt.callLink && (
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <a
                            href={sanitizeUrl(apt.callLink, '#')}
                            rel="noreferrer"
                            className="btn-primary !min-h-[44px] !px-5"
                          >
                            <Video className="size-4" />
                            <span>Entrar na sala</span>
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
                                <span>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3.5 text-[#90364B]" />
                                <span>Copiar link</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Orientações rápidas expansíveis */}
                    <div className="border-t border-white/[0.06] pt-3">
                      <button
                        type="button"
                        onClick={() => setOpenChecklistId((cur) => (cur === apt.id ? null : apt.id))}
                        className="flex w-full items-center justify-between text-left text-xs text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-[#90364B]" />
                          <span>Orientações antes da chamada</span>
                        </span>
                        <ChevronDown
                          className={`size-3.5 transition-transform duration-200 ${
                            openChecklistId === apt.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {openChecklistId === apt.id && (
                        <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-zinc-400">
                          <li>• Teste câmera, microfone e conexão 5 minutos antes.</li>
                          <li>• Escolha um ambiente silencioso, iluminado e reservado.</li>
                          <li>• Gravações ou capturas de tela não são permitidas.</li>
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Pagamento pendente */}
              {isPendingPayment && (
                <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
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

              {/* Detalhes de cancelamento */}
              {isCancelled &&
                (apt.cancellationReason ||
                  apt.cancellation?.decisionNote ||
                  (apt.refundStatus && apt.refundStatus !== 'not_required' && apt.refundStatus !== 'not_applicable')) && (
                  <div className="mt-4 space-y-1 border-t border-white/[0.06] pt-4 text-xs text-zinc-400">
                    {apt.cancellationReason && <p>Motivo: {apt.cancellationReason}</p>}
                    {apt.cancellation?.decisionNote && <p>Observação: {apt.cancellation.decisionNote}</p>}
                    {apt.refundStatus && apt.refundStatus !== 'not_required' && apt.refundStatus !== 'not_applicable' && (
                      <p className="text-amber-200">
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

              {/* Rodapé leve e organizado — menu único de Agenda + ações discretas */}
              {hasFooterActions && (
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4 text-xs">
                  {hasCalendarAction && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-expanded={openCalendarMenuId === apt.id}
                        onClick={() => setOpenCalendarMenuId((cur) => (cur === apt.id ? null : apt.id))}
                        className="inline-flex min-h-[36px] items-center gap-1.5 text-zinc-300 transition-colors hover:text-[#F5EEE9] cursor-pointer"
                      >
                        <CalendarPlus className="size-3.5 text-[#90364B]" />
                        <span>Adicionar à agenda</span>
                        <ChevronDown className="size-3 text-zinc-500" />
                      </button>

                      {openCalendarMenuId === apt.id && (
                        <div
                          role="menu"
                          className="absolute bottom-10 left-0 z-30 w-48 overflow-hidden rounded-xl border border-white/[0.1] bg-[#08080c] p-1 shadow-[0_14px_40px_rgba(0,0,0,0.9)]"
                        >
                          {gcalUrl && (
                            <a
                              role="menuitem"
                              href={gcalUrl}
                              rel="noreferrer"
                              onClick={() => setOpenCalendarMenuId(null)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-200 transition-colors hover:bg-white/[0.06]"
                            >
                              <CalendarPlus className="size-3.5 text-[#90364B]" />
                              <span>Google Agenda</span>
                            </a>
                          )}
                          {apt.scheduleDate && !isCancelled && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                downloadAppointmentIcs(apt);
                                setOpenCalendarMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-200 transition-colors hover:bg-white/[0.06] cursor-pointer"
                            >
                              <Download className="size-3.5 text-[#90364B]" />
                              <span>Apple / Outlook (.ics)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {apt.voucherUrl && !isPendingPayment && (
                    <Link
                      href={apt.voucherUrl}
                      className="inline-flex min-h-[36px] items-center gap-1 text-zinc-300 transition-colors hover:text-[#F5EEE9]"
                    >
                      <span>Voucher</span>
                      <ExternalLink className="size-3 text-zinc-500" />
                    </Link>
                  )}

                  {apt.canRequestReschedule && (
                    <button
                      type="button"
                      onClick={() => setModal({ appointment: apt, action: 'request_reschedule' })}
                      className="inline-flex min-h-[36px] items-center gap-1.5 text-zinc-300 transition-colors hover:text-[#F5EEE9] cursor-pointer"
                    >
                      <RefreshCw className="size-3.5 text-zinc-500" />
                      <span>Reagendar</span>
                    </button>
                  )}

                  {apt.canRequestCancel && (
                    <button
                      type="button"
                      onClick={() => setModal({ appointment: apt, action: 'request_cancel' })}
                      className="inline-flex min-h-[36px] items-center gap-1.5 text-red-300/80 transition-colors hover:text-red-200 sm:ml-auto cursor-pointer"
                    >
                      <XCircle className="size-3.5" />
                      <span>Cancelar reserva</span>
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

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
                ? copy.conta.appointments.modalCancelBody
                : copy.conta.appointments.modalRescheduleBody}
            </p>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                modal.action === 'request_cancel'
                  ? copy.conta.appointments.modalCancelPlaceholder
                  : copy.conta.appointments.modalReschedulePlaceholder
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
                {copy.conta.appointments.modalBackCta}
              </button>
              <button type="submit" disabled={submitting} className="btn-primary !min-h-[42px] !px-5">
                {submitting ? copy.conta.appointments.modalSubmitting : copy.conta.appointments.modalConfirmCta}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
