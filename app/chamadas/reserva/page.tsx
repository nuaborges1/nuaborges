'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
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
} from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { usePublishedContent } from '@/lib/contentStore';
import {
  AppointmentBooking,
  formatCurrencyBrl,
  generateIcsCalendar,
  generateWhatsAppMessage,
} from '@/lib/appointmentsCanonical';
import { lookupBooking, verifyPixPayment, syncBookingToServer } from '@/lib/services/nua/appointmentsService';
import { confirmBookingPayment } from '@/lib/appointmentsStore';
import QRCode from 'qrcode';

function ReservaContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [booking, setBooking] = useState<AppointmentBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

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

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      setError('Token de agendamento não informado na URL.');
      return;
    }

    async function load() {
      try {
        const res = await lookupBooking(token!);
        if (active) {
          if (res.success && res.booking) {
            setBooking(res.booking);
          } else {
            setError(res.error || 'Reserva não encontrada.');
          }
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Erro ao carregar reserva.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

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

  // Polling automático para atualizar o status do Pix assim que for pago
  useEffect(() => {
    if (!booking || booking.status !== 'aguardando_pagamento') return;
    let cancelled = false;

    const interval = setInterval(async () => {
      try {
        const res = await verifyPixPayment(booking.id);
        if (!cancelled && res.success && res.booking && res.booking.status === 'confirmada') {
          setBooking(res.booking);
          clearInterval(interval);
        }
      } catch {}
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [booking]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#f4a7b9]" />
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
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#f4a7b9] text-zinc-950 text-xs font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Fazer Novo Agendamento</span>
        </Link>
      </div>
    );
  }

  const isConfirmed = booking.status === 'confirmada';
  const isPending = booking.status === 'aguardando_pagamento';
  const isCompleted = booking.status === 'concluida';
  const isCancelled = booking.status === 'cancelada';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Botão Voltar */}
      <div className="mb-6">
        <Link
          href="/chamadas"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Chamadas</span>
        </Link>
      </div>

      {/* Cartão Haute-Couture do Voucher */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[32px] bg-gradient-to-b from-[#0e0e12] to-[#070709] border border-[#f4a7b9]/25 p-6 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.95)] relative overflow-hidden"
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
          Titular da Reserva: <strong className="text-zinc-200">{booking.clientName}</strong>
        </p>

        {/* Grid de Informações Chave */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 mb-8 text-xs">
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">Data</span>
            <span className="text-white font-mono font-medium">
              {booking.date.split('-').reverse().join('/')}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">Horário</span>
            <span className="text-[#f4a7b9] font-mono font-bold">
              {booking.startTime} às {booking.endTime}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">Duração</span>
            <span className="text-white font-mono font-medium">{booking.durationMinutes} min</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase tracking-wider mb-1">Valor</span>
            <span className="text-white font-mono font-medium">{formatCurrencyBrl(booking.price)}</span>
          </div>
        </div>

        {/* SALA PRIVATIVA / LINK DA CHAMADA (Se Confirmada) */}
        {isConfirmed && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#f4a7b9]/[0.06] border border-[#f4a7b9]/30 mb-8">
            <div className="flex items-center gap-2 text-[#f4a7b9] text-xs font-semibold uppercase tracking-wider mb-2">
              <Video className="w-4 h-4" />
              <span>Acesso à Sala Privativa de Vídeo</span>
            </div>

            {booking.meeting.url ? (
              <div className="space-y-4">
                <p className="text-zinc-300 text-xs sm:text-sm font-light leading-relaxed">
                  {booking.meeting.instructions ||
                    'Sua sala privativa está liberada. Entre no horário agendado com câmera e microfone habilitados.'}
                </p>
                <a
                  href={booking.meeting.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(244,167,185,0.3)]"
                >
                  <Video className="w-4 h-4" />
                  <span>Entrar na Sala Privativa</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-zinc-400 text-xs font-light">
                  Seu link de acesso privativo (Google Meet / Sala Segura) será disponibilizado aqui momentos antes do horário agendado.
                </p>
                <span className="inline-block px-3 py-1 rounded-full bg-zinc-900 text-zinc-400 text-[11px] font-mono">
                  Link em preparação pela Nua Borges
                </span>
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
                <Loader2 className="w-6 h-6 text-[#f4a7b9] animate-spin mb-1" />
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
                  className="px-4 py-2 rounded-xl bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 text-xs font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            )}

            {/* Status de Verificação Automática em Tempo Real */}
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-[#f4a7b9]/25 flex items-center justify-between shadow-[0_0_24px_rgba(244,167,185,0.08)] mb-4">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-3 h-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f4a7b9] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f4a7b9]" />
                </div>
                <div>
                  <p className="text-xs text-white font-medium">Aguardando Confirmação Bancária...</p>
                  <p className="text-[10px] text-zinc-400 font-light">
                    Liberação instantânea assim que o banco aprovar o Pix via Stripe.
                  </p>
                </div>
              </div>
              <Loader2 className="w-4 h-4 text-[#f4a7b9] animate-spin shrink-0" />
            </div>

          </div>
        )}

        {/* SE CANCELADA: Motivo */}
        {isCancelled && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs mb-8">
            <strong>Motivo do Cancelamento:</strong> {booking.cancellationReason || 'Imprevisto de agenda.'}
          </div>
        )}

        {/* Ações do Voucher: Salvar no Calendário & Compartilhar */}
        <div className="pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>Adicionar ao Calendário (.ics)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyVoucherLink}
              className="px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-[#f4a7b9]" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link Seguro'}</span>
            </button>
          </div>

          {/* Dúvidas no WhatsApp */}
          <a
            href={`https://wa.me/55${booking.clientPhone}?text=${generateWhatsAppMessage(
              booking,
              'confirmacao'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-[#f4a7b9] flex items-center gap-1.5 transition-colors font-light"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Precisa de ajuda com o agendamento?</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

export default function ReservaPage() {
  const content = usePublishedContent();
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#f4a7b9] selection:text-black font-sans flex flex-col">
      <Header
        onOpenContact={() => setContactModalOpen(true)}
        activeSection="chamadas"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-32 pb-24 px-4 sm:px-8 relative">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#f4a7b9]" />
            </div>
          }
        >
          <ReservaContent />
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
