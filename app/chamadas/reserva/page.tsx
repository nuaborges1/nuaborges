/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Lock,
  ArrowLeft,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { usePublishedContent } from '@/lib/contentStore';
import { CHAMADAS_PUBLIC_ENABLED } from '@/lib/featureFlags';
import {
  AppointmentBooking,
  formatCurrencyBrl,
  formatDateForDisplay,
  formatDualTimezone,
  generateIcsCalendar,
  generateWhatsAppMessage,
} from '@/lib/appointmentsCanonical';
import {
  lookupBooking,
  verifyPixPayment,
  customerRequestCancellation,
  customerAcceptProposal,
  customerDeclineProposal,
} from '@/lib/services/nua/appointmentsService';
import QRCode from 'qrcode';

function ReservaContent({ onOpenContact }: { onOpenContact: () => void }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [booking, setBooking] = useState<AppointmentBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Estados dos Fluxos V9 do Cliente
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [clientCancelReason, setClientCancelReason] = useState('imprevisto');
  const [clientCancelDetails, setClientCancelDetails] = useState('');

  useEffect(() => {
    if (!booking?.payment) {
      setQrCodeDataUrl('');
      return;
    }
    const { pixQrCode, pixPayload } = booking.payment;
    if (pixQrCode && typeof pixQrCode === 'string' && pixQrCode.startsWith('data:image/')) {
      setQrCodeDataUrl(pixQrCode);
    } else if (pixPayload) {
      QRCode.toDataURL(pixPayload, {
        width: 320,
        margin: 1,
        color: { dark: '#09090b', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [booking]);

  const loadData = async () => {
    if (!token) {
      setLoading(false);
      setError('Token de agendamento não informado na URL.');
      return;
    }

    try {
      const res = await lookupBooking(token);
      if (res.success && res.booking) {
        setBooking(res.booking);
      } else {
        setError(res.error || 'Reserva não encontrada.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar reserva.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Polling automático para atualizar o status do Pix assim que for pago
  useEffect(() => {
    if (!booking || booking.status !== 'aguardando_pagamento') return;
    let cancelled = false;

    const interval = setInterval(async () => {
      try {
        const res = await verifyPixPayment(booking.publicToken);
        if (!cancelled && res.success && res.booking && res.booking.status === 'confirmada') {
          setBooking((prev) => (prev ? { ...prev, ...res.booking } : res.booking!));
          clearInterval(interval);
        }
      } catch {}
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [booking]);

  // Baixa o arquivo .ics para o calendário do celular/computador
  const handleDownloadIcs = () => {
    if (!booking) return;
    const icsContent = generateIcsCalendar(booking);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chamada-nua-borges-${booking.date}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copia o link do voucher
  const handleCopyVoucherLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Copia Pix se estiver pendente
  const handleCopyPix = () => {
    if (!booking?.payment?.pixPayload) return;
    navigator.clipboard.writeText(booking.payment.pixPayload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  // Ações de Proposta de Reagendamento
  const handleAcceptProposal = async () => {
    if (!token) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await customerAcceptProposal(token);
      if (res.success && res.booking) {
        setBooking((prev) => (prev ? { ...prev, ...res.booking } : res.booking!));
        setActionMessage('Proposta aceita! Seu novo horário foi confirmado.');
      } else {
        setActionError(res.error || 'Não foi possível aceitar a proposta no momento.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineProposal = async () => {
    if (!token) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    setConfirmingDecline(false);
    try {
      const res = await customerDeclineProposal(token);
      if (res.success && res.booking) {
        setBooking((prev) => (prev ? { ...prev, ...res.booking } : res.booking!));
        setActionMessage('Proposta recusada. O atendimento permanece na data original.');
      } else {
        setActionError(res.error || 'Não foi possível recusar a proposta.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submissão de Solicitação de Cancelamento
  const handleConfirmCancelRequest = async () => {
    if (!token) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await customerRequestCancellation(token, clientCancelReason, clientCancelDetails);
      if (res.success && res.booking) {
        setBooking((prev) => (prev ? { ...prev, ...res.booking } : res.booking!));
        setIsCancelModalOpen(false);
        setActionMessage('Sua solicitação de cancelamento foi enviada para análise da Nua Borges.');
      } else {
        setActionError(res.error || 'Não foi possível registrar a solicitação de cancelamento.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao registrar solicitação.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#90364B]" />
        <span className="text-zinc-400 text-xs font-mono">Carregando seu agendamento...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto my-16 text-center p-8 rounded-3xl bg-zinc-950 border border-zinc-800">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-serif text-white mb-2">Agendamento Não Encontrado</h2>
        <p className="text-zinc-400 text-xs mb-6 font-light">{error || 'Verifique o link recebido.'}</p>
        <Link
          href="/chamadas"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(67,19,34,0.45)] border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{CHAMADAS_PUBLIC_ENABLED ? 'Fazer Novo Agendamento' : 'Ver informações sobre Chamadas'}</span>
        </Link>
      </div>
    );
  }

  const isConfirmed = booking.status === 'confirmada';
  const isPending = booking.status === 'aguardando_pagamento';
  const isCompleted = booking.status === 'concluida';
  const isCancelled = booking.status === 'cancelada';
  const hasProposal = !!booking.proposal;
  const hasPendingCancel = booking.cancellation?.state === 'requested';

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Botão Voltar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/chamadas"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Chamadas</span>
        </Link>
        <Link
          href="/conta?tab=chamadas"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#7A293D]/50 bg-[#431322]/40 px-3.5 py-1.5 text-xs text-[#F5EEE9] hover:bg-[#661C30] transition-colors"
        >
          Ver em Minha Conta
        </Link>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* BANNER DE PROPOSTA DE REAGENDAMENTO (V9) */}
      {hasProposal && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <Clock className="w-4 h-4" />
            <span>Proposta de Novo Horário Recebida</span>
          </div>
          <p className="text-zinc-300 text-xs font-light leading-relaxed">
            A Nua propôs ajustar a data da sua chamada VIP para{' '}
            <strong className="text-white font-mono">{formatDateForDisplay(booking.proposal!.date)}</strong> às{' '}
            <strong className="text-white font-mono">{booking.proposal!.time}</strong>.
            {booking.proposal!.note && (
              <span className="block mt-1 italic text-zinc-400">"{booking.proposal!.note}"</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleAcceptProposal}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Aceitar novo horário</span>
            </button>
            {!confirmingDecline ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmingDecline(true)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 text-xs transition cursor-pointer disabled:opacity-50"
              >
                <span>Recusar proposta</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDeclineProposal}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Confirmar recusa (manter horário atual)
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setConfirmingDecline(false)}
                  className="px-3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-400 text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BANNER DE SOLICITAÇÃO DE CANCELAMENTO EM ANÁLISE (V9) */}
      {hasPendingCancel && (
        <div className="p-4 sm:p-5 rounded-2xl bg-red-500/10 border border-red-500/25 space-y-2">
          <div className="flex items-center gap-2 text-red-300 font-semibold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Solicitação de Cancelamento em Análise</span>
          </div>
          <p className="text-zinc-300 text-xs font-light">
            Sua solicitação de cancelamento está sob análise da equipe Nua Borges. Você receberá uma notificação assim que a decisão for registrada.
          </p>
        </div>
      )}

      {/* Cartão Haute-Couture do Voucher */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[32px] bg-gradient-to-b from-[#0e0e12] to-[#070709] border border-[#661C30]/40 p-6 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.95)] relative overflow-hidden"
      >
        {/* Monograma de fundo sutil */}
        <div className="absolute top-4 right-6 text-zinc-800/20 font-serif text-8xl font-black select-none pointer-events-none">
          NB
        </div>

        {/* Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-zinc-500">
            VOUCHER DE ACESSO EXCLUSIVO
          </span>

          {isConfirmed && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Reserva Confirmada</span>
            </span>
          )}

          {isPending && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Aguardando Pagamento Pix</span>
            </span>
          )}

          {isCompleted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Chamada Concluída</span>
            </span>
          )}

          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Cancelada</span>
            </span>
          )}
        </div>

        {/* Título & Cliente */}
        <h1 className="font-serif text-2xl sm:text-3xl text-white mb-1">
          {booking.modalityName}
        </h1>
        <p className="text-zinc-400 text-xs font-light mb-6">
          Titular da Reserva: <strong className="text-zinc-200">{booking.clientName || 'Cliente VIP'}</strong>
        </p>

        {/* Grid de Informações Chave */}
        {(() => {
          const dualTimes = formatDualTimezone(
            booking.date,
            booking.startTime,
            booking.endTime,
            booking.timezone || 'Europe/Dublin',
            booking.clientTimezone || 'America/Sao_Paulo'
          );

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 mb-8 text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">Data</span>
                <span className="text-white font-mono font-medium">
                  {formatDateForDisplay(booking.date)}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">Horário</span>
                <span className="text-[#90364B] font-mono font-bold block">
                  {dualTimes.primary}
                </span>
                <span className="text-zinc-500 font-mono text-[10px] block mt-0.5">
                  {dualTimes.secondary}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">Duração</span>
                <span className="text-white font-mono font-medium">{booking.durationMinutes || 30} min</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">Valor</span>
                <span className="text-white font-mono font-medium">{formatCurrencyBrl(booking.price)}</span>
              </div>
            </div>
          );
        })()}

        {/* SALA PRIVATIVA / LINK DA CHAMADA (Se Confirmada) */}
        {isConfirmed && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#661C30]/10 border border-[#7A293D]/35 mb-8">
            <div className="flex items-center gap-2 text-[#90364B] text-xs font-semibold uppercase tracking-wider mb-2">
              <Video className="w-4 h-4" />
              <span>Acesso à Sala Privativa de Vídeo</span>
            </div>

            {booking.meeting?.url ? (
              <div className="space-y-4">
                <p className="text-zinc-300 text-xs sm:text-sm font-light leading-relaxed">
                  {booking.meeting.instructions ||
                    'Sua sala privativa está liberada. Entre no horário agendado com câmera e microfone habilitados.'}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={booking.meeting.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10"
                  >
                    <Video className="w-4 h-4" />
                    <span>Entrar na Sala Privativa</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && booking.meeting?.url) {
                        navigator.clipboard.writeText(booking.meeting.url);
                        alert('Link da sala copiado!');
                      }
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link da Sala</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-zinc-300 text-xs sm:text-sm font-light leading-relaxed">
                  Sua chamada está confirmada. O link de acesso privativo será disponibilizado aqui assim que estiver preparado pela Nua Borges.
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] font-mono">
                    Link em preparação pela Nua Borges
                  </span>
                  <span className="text-[11px] text-zinc-500 font-light">
                    (Recomendamos favoritar este voucher para abrir antes da chamada)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SE AGUARDANDO PAGAMENTO: Exibe Pix e QR Code */}
        {isPending && (
          <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/[0.06] border border-amber-500/30 mb-8">
            <h3 className="text-amber-300 text-sm font-semibold mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Conclua o Pagamento Pix para Garantir seu Horário</span>
            </h3>
            <p className="text-zinc-400 text-xs font-light mb-4">
              Realize a transferência Pix para confirmar a chamada. Assim que recebido, o link da sala será ativado automaticamente.
            </p>

            {qrCodeDataUrl ? (
              <div className="flex flex-col items-center justify-center mb-4">
                <div className="bg-white p-3 rounded-xl shadow-md">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code Pix"
                    className="w-40 h-40 object-contain"
                  />
                </div>
              </div>
            ) : booking.payment?.pixPayload ? (
              <div className="flex flex-col items-center justify-center mb-4 py-4">
                <Loader2 className="w-6 h-6 text-[#90364B] animate-spin mb-1" />
                <span className="text-[11px] text-zinc-400">Gerando QR Code...</span>
              </div>
            ) : null}

            {booking.payment?.pixPayload && (
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={booking.payment.pixPayload}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase transition-all shadow-[0_2px_12px_rgba(67,19,34,0.4)] border border-white/10 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            )}

            {/* Status de Verificação Automática em Tempo Real */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-[#661C30]/40 flex items-center justify-between shadow-[0_0_24px_rgba(67,19,34,0.25)] mb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#90364B] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#90364B]" />
                </div>
                <div>
                  <p className="text-xs text-white font-medium">Aguardando Confirmação Bancária...</p>
                  <p className="text-[10px] text-zinc-400 font-light">
                    Liberação instantânea assim que o banco aprovar o Pix via Mercado Pago.
                  </p>
                </div>
              </div>
              <Loader2 className="w-4 h-4 text-[#90364B] animate-spin shrink-0" />
            </div>
          </div>
        )}

        {/* SE CANCELADA: Motivo */}
        {isCancelled && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs mb-8">
            <strong>Motivo do Cancelamento:</strong> {booking.cancellationReason || 'Imprevisto de agenda.'}
          </div>
        )}

        {/* Ações do Voucher: Salvar no Calendário, Compartilhar & Solicitar Cancelamento */}
        <div className="pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#90364B]" />
              <span>Adicionar ao Calendário (.ics)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyVoucherLink}
              className="px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-[#90364B]" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link Seguro'}</span>
            </button>

            {!isCancelled && !isCompleted && !isPending && !hasPendingCancel && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-red-500/15 text-zinc-400 hover:text-red-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
              >
                <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                <span>Solicitar cancelamento</span>
              </button>
            )}
          </div>

          {/* Dúvidas / Suporte Oficial */}
          <button
            type="button"
            onClick={onOpenContact}
            className="text-zinc-400 hover:text-[#90364B] flex items-center gap-1.5 transition-colors font-light cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Precisa de ajuda com o agendamento?</span>
          </button>
        </div>
      </motion.div>

      {/* MODAL DE SOLICITAÇÃO DE CANCELAMENTO PELO CLIENTE (V9) */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-[#14161d] border border-white/[0.08] p-6 space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white text-base">Solicitar cancelamento da chamada</h3>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-zinc-400 text-xs font-light leading-relaxed">
                Informe o motivo para análise. O cancelamento e as condições de reembolso serão avaliados pela equipe com base na antecedência do pedido.
              </p>

              <div className="space-y-3">
                <label className="block text-xs font-medium text-zinc-300">
                  Motivo principal:
                  <select
                    value={clientCancelReason}
                    onChange={(e) => setClientCancelReason(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs"
                  >
                    <option value="imprevisto">Imprevisto pessoal / profissional</option>
                    <option value="horario_incompativel">Horário ficou incompatível</option>
                    <option value="duvidas">Dúvidas sobre o formato da chamada</option>
                    <option value="outro">Outro motivo</option>
                  </select>
                </label>

                <label className="block text-xs font-medium text-zinc-300">
                  Detalhes adicionais (opcional):
                  <textarea
                    rows={3}
                    value={clientCancelDetails}
                    onChange={(e) => setClientCancelDetails(e.target.value)}
                    placeholder="Explique brevemente para auxiliar no atendimento..."
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white text-xs resize-none"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 text-xs"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmCancelRequest}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enviar solicitação</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReservaPage() {
  const content = usePublishedContent();
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#661C30] selection:text-white font-sans flex flex-col">
      <Header
        onOpenContact={() => setContactModalOpen(true)}
        activeSection="chamadas"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 px-4 sm:px-8 relative select-none">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#90364B]" />
            </div>
          }
        >
          <ReservaContent onOpenContact={() => setContactModalOpen(true)} />
        </Suspense>
      </main>

      <Footer
        customFooterData={content.footer}
        customInstitutionalData={content.institutional}
      />

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customContactData={content.contact}
      />
    </div>
  );
}
