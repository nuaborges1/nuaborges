'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Video,
  Clock,
  Calendar,
  User,
  Phone,
  Mail,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Save,
  MessageCircle,
  Link as LinkIcon,
  XCircle,
  ChevronDown,
  Check,
  Loader2,
} from 'lucide-react';
import {
  AppointmentBooking,
  formatCurrencyBrl,
} from '@/lib/appointmentsCanonical';
import { PageHeader } from './ui/AdminPrimitives';

interface AppointmentBookingPageProps {
  booking: AppointmentBooking;
  onUpdateAction: (bookingId: string, action: string, payload?: any) => Promise<boolean>;
  onBack: () => void;
}

const STATUS_OPTIONS: Array<{
  value: AppointmentBooking['status'];
  label: string;
  dotColor: string;
  badgeClass: string;
}> = [
  {
    value: 'confirmada',
    label: 'Confirmada / Agendada',
    dotColor: 'bg-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    value: 'concluida',
    label: 'Concluída',
    dotColor: 'bg-purple-400',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  {
    value: 'aguardando_pagamento',
    label: 'Aguardando Pagamento',
    dotColor: 'bg-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    value: 'cancelada',
    label: 'Cancelada',
    dotColor: 'bg-rose-400',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  {
    value: 'nao_compareceu',
    label: 'Cliente Não Compareceu',
    dotColor: 'bg-red-400',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
];

export function AppointmentBookingPage({
  booking: initialBooking,
  onUpdateAction,
  onBack,
}: AppointmentBookingPageProps) {
  const [booking, setBooking] = useState<AppointmentBooking>(initialBooking);
  const [meetingUrl, setMeetingUrl] = useState(booking.meeting?.url || '');
  const [meetingInstructions, setMeetingInstructions] = useState(booking.meeting?.instructions || '');
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelSection, setShowCancelSection] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const normalizedStatus = booking.status === ('no_show' as any) ? 'nao_compareceu' : booking.status;
  const currentStatusOption = STATUS_OPTIONS.find((s) => s.value === normalizedStatus) || {
    value: normalizedStatus,
    label: normalizedStatus,
    dotColor: 'bg-zinc-400',
    badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  };

  const handleSaveMeetingInfo = async () => {
    setIsSavingMeeting(true);
    const ok = await onUpdateAction(booking.id, 'set_meeting_url', {
      meetingUrl,
      instructions: meetingInstructions,
    });
    setIsSavingMeeting(false);
    if (ok) {
      setBooking((prev) => ({
        ...prev,
        meeting: {
          ...prev.meeting,
          meetingUrl,
          instructions: meetingInstructions,
          visibleToClient: true,
        },
      }));
      showToast('Link da sala e instruções salvos com sucesso!');
    } else {
      showToast('Falha ao salvar link da chamada.');
    }
  };

  const handleStatusChange = async (newStatus: AppointmentBooking['status']) => {
    setIsUpdatingStatus(true);
    const ok = await onUpdateAction(booking.id, 'update_status', { status: newStatus });
    setIsUpdatingStatus(false);
    if (ok) {
      setBooking((prev) => ({
        ...prev,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      }));
      const label = STATUS_OPTIONS.find((s) => s.value === newStatus)?.label || newStatus;
      showToast(`Status atualizado para "${label}".`);
    } else {
      showToast('Falha ao atualizar status.');
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      showToast('Informe o motivo do cancelamento.');
      return;
    }
    const ok = await onUpdateAction(booking.id, 'cancel', { reason: cancelReason });
    if (ok) {
      setBooking((prev) => ({
        ...prev,
        status: 'cancelada',
        cancellation: {
          cancelledAt: new Date().toISOString(),
          reason: cancelReason,
          cancelledBy: 'admin',
        },
      }));
      setShowCancelSection(false);
      showToast('Agendamento cancelado com sucesso.');
    } else {
      showToast('Erro ao cancelar agendamento.');
    }
  };

  const shortId = booking.id.replace('apt_', '').slice(-6).toUpperCase();
  const clientPublicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/chamadas/status?token=${booking.publicToken || booking.id}`
    : `/chamadas/status?token=${booking.publicToken || booking.id}`;

  const handleCopyClientUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(clientPublicUrl);
      showToast('Link do cliente copiado!');
    }
  };

  return (
    <div className="space-y-6 select-none text-white w-full">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171821] border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Padronizado do Agendamento */}
      <PageHeader
        backAction={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Fila de Chamadas</span>
          </button>
        }
        title={booking.clientName}
        subtitle={`#APT-${shortId} · Modalidade: ${booking.modalityName} (${booking.durationMinutes} min) · Criado em ${new Date(
          booking.createdAt
        ).toLocaleString('pt-BR')}`}
        actions={
          <div className="flex items-center gap-2.5 relative">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold font-mono">
              Status:
            </span>
            <div className="relative">
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className={`h-9 px-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider border inline-flex items-center gap-2 transition-all shadow-sm ${
                  currentStatusOption.badgeClass
                } ${isUpdatingStatus ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110 cursor-pointer'}`}
              >
                <span className={`w-2 h-2 rounded-full ${currentStatusOption.dotColor}`} />
                <span>{currentStatusOption.label}</span>
                {isUpdatingStatus ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
                ) : (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {isStatusDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsStatusDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 p-1.5 rounded-xl bg-[#13141c] border border-white/[0.1] shadow-2xl shadow-black/80 z-50 flex flex-col gap-1 backdrop-blur-md">
                    {STATUS_OPTIONS.map((opt) => {
                      const isSelected = opt.value === normalizedStatus;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setIsStatusDropdownOpen(false);
                            if (!isSelected) {
                              handleStatusChange(opt.value);
                            }
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                            isSelected
                              ? 'bg-white/[0.08] text-white font-semibold'
                              : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                            <span>{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#f4a7b9]" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        }
      />

      {/* Grid de 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Coluna 1: Dados da Sessão & Contato */}
        <div className="space-y-5">
          <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide pb-2.5 border-b border-white/[0.06]">
              Horário Marcado &amp; Valores
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#101116] border border-white/[0.06]">
                <span className="text-xs text-zinc-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#f4a7b9]" />
                  <span>Data da Sessão</span>
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  {booking.date ? new Date(booking.date).toLocaleDateString('pt-BR') : 'A definir'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#101116] border border-white/[0.06]">
                <span className="text-xs text-zinc-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Horário (Brasília)</span>
                </span>
                <span className="font-mono text-xs font-bold text-purple-300">
                  {booking.startTime || '19:00'} - {booking.endTime || '19:30'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#101116] border border-white/[0.06]">
                <span className="text-xs text-zinc-300 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp / Telefone</span>
                </span>
                <span className="font-mono text-xs text-zinc-200">
                  {booking.clientPhone || 'Não informado'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#101116] border border-white/[0.06]">
                <span className="text-xs text-zinc-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  <span>E-mail do Cliente</span>
                </span>
                <span className="font-mono text-xs text-zinc-200">
                  {booking.clientEmail || 'Não informado'}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                  Valor da Chamada:
                </span>
                <span className="text-xl font-bold text-[#f4a7b9]">
                  {formatCurrencyBrl(booking.price)}
                </span>
              </div>
            </div>
          </div>

          {/* Sala Virtual de Atendimento */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Link da Sala Virtual (Google Meet / Telegram)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleSaveMeetingInfo}
                disabled={isSavingMeeting}
                className="h-8 px-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Link</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                  URL da Sala de Vídeo:
                </label>
                <input
                  type="text"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/xyz-abcd-efg ou link do Telegram..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white font-mono outline-none focus:border-[#f4a7b9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                  Instruções Especiais de Conexão:
                </label>
                <textarea
                  rows={2}
                  value={meetingInstructions}
                  onChange={(e) => setMeetingInstructions(e.target.value)}
                  placeholder="Ex: 'Entre com a câmera ligada e fone de ouvido para melhor experiência'..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9] resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: Acesso do Cliente & Histórico */}
        <div className="space-y-5">
          {/* Card da Página do Cliente */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#f4a7b9]" />
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Página Segura de Acesso do Cliente
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyClientUrl}
                className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar Link</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-light leading-relaxed">
              O cliente visualiza o status da sessão, cronômetro de contagem regressiva e o botão de entrar na chamada através desta URL protegida por token:
            </p>

            <div className="p-2.5 rounded-lg bg-[#101116] border border-white/[0.06] flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-zinc-300 truncate">
                {clientPublicUrl}
              </span>
              <a
                href={clientPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white shrink-0 p-1"
                title="Abrir página do cliente"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Linha do Tempo / Histórico da Chamada */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide pb-2 border-b border-white/[0.06]">
              Histórico Operacional da Sessão
            </h3>

            {booking.history && booking.history.length > 0 ? (
              <div className="space-y-2.5">
                {booking.history.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#101116] border border-white/[0.06] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>{new Date(h.at).toLocaleString('pt-BR')}</span>
                      <span className="uppercase">{h.author || 'sistema'}</span>
                    </div>
                    <p className="text-zinc-300 text-xs font-light">{h.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-lg bg-[#101116] border border-white/[0.06] text-zinc-500 text-xs">
                Nenhum histórico registrado além da criação.
              </div>
            )}
          </div>

          {/* Seção de Cancelamento */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Zona de Gerenciamento &amp; Cancelamento
              </h3>
              {!showCancelSection && booking.status !== 'cancelada' && (
                <button
                  type="button"
                  onClick={() => setShowCancelSection(true)}
                  className="text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  Cancelar Agendamento
                </button>
              )}
            </div>

            {showCancelSection && (
              <div className="p-3.5 rounded-lg bg-rose-500/[0.05] border border-rose-500/20 space-y-3">
                <span className="text-xs text-rose-300 font-semibold block">
                  Informe o motivo do cancelamento:
                </span>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Conflito de agenda da modelo, cliente solicitou reembolso..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-rose-400"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCancelSection(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    className="px-4 py-1.5 rounded-full bg-rose-500 text-white font-semibold text-xs"
                  >
                    Confirmar Cancelamento
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
