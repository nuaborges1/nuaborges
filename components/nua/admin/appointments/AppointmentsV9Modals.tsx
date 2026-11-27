/* Vinho maduro / Nua Borges — Modais V9 Completos (Funcionalidade de Referência Integrada ao Admin) */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  AlertCircle,
  Clock,
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Copy,
  Edit2,
  Ban,
  Video,
  ExternalLink,
  RefreshCw,
  UserX,
} from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
  DEFAULT_SCHEDULE_SETTINGS,
  formatCurrencyBrl,
  formatDateForDisplay,
  computeAvailableSlotsForDate,
  getDayClosureReason,
  getScheduleNow,
} from '@/lib/appointmentsCanonical';
import { executeAdminAction } from '@/lib/services/nua/appointmentsService';

/* -------------------------------------------------------------------------- */
/* Helpers Determinísticos de Data e Hora (Alinhados ao Motor Canônico)       */
/* -------------------------------------------------------------------------- */
function addDaysISO(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function buildFallbackModality(
  booking: AppointmentBooking,
  modalities: AppointmentModality[]
): AppointmentModality {
  const existing = modalities.find((m) => m.id === booking.modalityId);
  if (existing) return existing;
  return {
    id: booking.modalityId,
    name: booking.modalityName || 'Chamada VIP',
    durationMinutes: Number(booking.durationMinutes) || 30,
    price: Number(booking.price) || 180,
    priceFormatted: formatCurrencyBrl(Number(booking.price) || 180),
    description: '',
    active: true,
    minNoticeHours: 4,
    rules: [],
    order: 1,
    clientInstructions: '',
  };
}

export function validateScheduleTimeV9(
  dateStr: string,
  timeStr: string,
  modalityId: string,
  modalities: AppointmentModality[],
  settings: AppointmentScheduleSettings,
  bookings: AppointmentBooking[],
  exceptBookingId?: string,
  durationOverride?: number
): { ok: boolean; reason: string } {
  const todayStr = getScheduleNow(settings.timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { ok: false, reason: 'Escolha uma data válida.' };
  }
  if (dateStr < todayStr) {
    return { ok: false, reason: 'Escolha uma data de hoje em diante.' };
  }
  if (getDayClosureReason(settings, dateStr, todayStr) !== null) {
    return { ok: false, reason: 'Este dia está fechado na sua agenda. Escolha outra data.' };
  }
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
    return { ok: false, reason: 'Escolha o horário que deseja propor.' };
  }

  const baseMod = modalities.find((m) => m.id === modalityId);
  const targetModality: AppointmentModality = baseMod
    ? {
        ...baseMod,
        durationMinutes: Number(durationOverride ?? baseMod.durationMinutes) || 30,
      }
    : {
        id: modalityId,
        name: 'Chamada VIP',
        durationMinutes: Number(durationOverride) || 30,
        price: 180,
        priceFormatted: 'R$ 180,00',
        description: '',
        active: true,
        minNoticeHours: 4,
        rules: [],
        order: 1,
        clientInstructions: '',
      };

  const filteredBookings = exceptBookingId
    ? bookings.filter((b) => b.id !== exceptBookingId)
    : bookings;

  const availableSlots = computeAvailableSlotsForDate(
    dateStr,
    targetModality,
    settings,
    filteredBookings,
    undefined,
    { allowInactiveModality: Boolean(exceptBookingId) || true }
  );

  if (!availableSlots.includes(timeStr)) {
    return {
      ok: false,
      reason:
        availableSlots.length > 0
          ? `Este horário não está disponível. Escolha um dos ${availableSlots.length} horários livres sugeridos acima.`
          : 'Não há horários disponíveis nesta data (verifique expediente, limite diário ou conflitos).',
    };
  }

  return { ok: true, reason: 'Horário disponível e validado na agenda.' };
}

export function findNextOpenDateV9(
  startDateStr: string,
  modalityId: string,
  modalities: AppointmentModality[],
  settings: AppointmentScheduleSettings,
  bookings: AppointmentBooking[],
  exceptBookingId?: string,
  fallbackModality?: AppointmentModality
): string {
  const maxDays = Math.min(366, Number(settings.advanceDays ?? settings.maxFutureDays ?? 120) + 1);
  let d = startDateStr;
  const filteredBookings = exceptBookingId
    ? bookings.filter((b) => b.id !== exceptBookingId)
    : bookings;
  const targetMod =
    modalities.find((m) => m.id === modalityId) ||
    fallbackModality || {
      id: modalityId,
      name: 'Chamada VIP',
      durationMinutes: 30,
      price: 180,
      priceFormatted: 'R$ 180,00',
      description: '',
      active: true,
      minNoticeHours: 4,
      rules: [],
      order: 1,
      clientInstructions: '',
    };

  for (let i = 0; i < maxDays; i++) {
    if (getDayClosureReason(settings, d) === null) {
      const slots = computeAvailableSlotsForDate(
        d,
        targetMod,
        settings,
        filteredBookings,
        undefined,
        { allowInactiveModality: true }
      );
      if (slots.length > 0) {
        return d;
      }
    }
    d = addDaysISO(d, 1);
  }
  return startDateStr;
}

/* -------------------------------------------------------------------------- */
/* V9: ProposalModal — Propor novo horário ao cliente                        */
/* -------------------------------------------------------------------------- */
export interface ProposalModalProps {
  isOpen: boolean;
  booking: AppointmentBooking | null;
  modalities?: AppointmentModality[];
  settings?: AppointmentScheduleSettings;
  bookings?: AppointmentBooking[];
  onClose: () => void;
  onSubmit: (bookingId: string, newDate: string, newTime: string, note?: string) => Promise<any>;
}

export function ProposalModal({
  isOpen,
  booking,
  modalities = [],
  settings,
  bookings = [],
  onClose,
  onSubmit,
}: ProposalModalProps) {
  const todayStr = useMemo(
    () => getScheduleNow(settings?.timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString,
    [settings?.timezone]
  );
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializa apenas quando o modal abre ou o ID da reserva muda (evita resetar durante o polling de 45s)
  useEffect(() => {
    if (booking && isOpen) {
      const fallbackMod = buildFallbackModality(booking, modalities);
      const tomorrow = addDaysISO(todayStr, 1);
      const initialDate = settings
        ? findNextOpenDateV9(
            tomorrow,
            booking.modalityId,
            modalities,
            settings,
            bookings,
            booking.id,
            fallbackMod
          )
        : booking.date >= todayStr
        ? booking.date
        : tomorrow;

      setDate(initialDate);

      if (settings) {
        const availableForDate = computeAvailableSlotsForDate(
          initialDate,
          fallbackMod,
          settings,
          bookings.filter((b) => b.id !== booking.id),
          undefined,
          { allowInactiveModality: true }
        );

        if (availableForDate.includes(booking.startTime)) {
          setTime(booking.startTime);
        } else if (availableForDate.length > 0) {
          setTime(availableForDate[0]);
        } else {
          setTime(booking.startTime || '14:00');
        }
      } else {
        setTime(booking.startTime || '14:00');
      }

      setNote('');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id, isOpen]);

  // Slots canônicos disponíveis para a data selecionada
  const availableSlots = useMemo(() => {
    if (!booking || !settings || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const fallbackMod = buildFallbackModality(booking, modalities);
    return computeAvailableSlotsForDate(
      date,
      fallbackMod,
      settings,
      bookings.filter((b) => b.id !== booking.id),
      undefined,
      { allowInactiveModality: true }
    );
  }, [booking, settings, date, modalities, bookings]);

  const timeValidation = useMemo(() => {
    if (!booking || !settings) {
      return {
        ok: Boolean(date && time),
        reason: 'Informe a hora que deseja propor. O sistema verificará disponibilidade e conflitos.',
      };
    }
    return validateScheduleTimeV9(
      date,
      time,
      booking.modalityId,
      modalities,
      settings,
      bookings,
      booking.id,
      booking.durationMinutes
    );
  }, [booking, date, time, modalities, settings, bookings]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      setError('Por favor, informe a nova data e o horário sugerido.');
      return;
    }
    if (settings && !timeValidation.ok) {
      setError(timeValidation.reason);
      return;
    }
    if (booking.date === date && booking.startTime === time) {
      setError('Este já é o horário atual da reserva.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await onSubmit(booking.id, date, time, note);
      if (res?.success) {
        onClose();
      } else {
        setError(res?.error || 'Não foi possível enviar a proposta. Tente novamente em instantes.');
      }
    } catch (err: any) {
      setError('Não foi possível enviar a proposta. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#14161d] border border-white/10 rounded-2xl shadow-2xl p-6 text-left relative overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h3 className="text-base font-semibold text-white">Propor novo horário</h3>
            <p className="text-zinc-400 text-xs mt-0.5">
              Sugira uma nova data e horário; a mudança ocorre após o aceite do cliente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.06] text-xs text-zinc-300">
            <div className="font-semibold text-white">Reserva atual</div>
            <div className="mt-1 text-zinc-400">
              {formatDateForDisplay(booking.date)} às {booking.startTime} · {booking.modalityName}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Nova data</label>
              <input
                type="date"
                min={todayStr}
                value={date}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setDate(newDate);
                  if (newDate && settings && booking) {
                    const fallbackMod = buildFallbackModality(booking, modalities);
                    const nextSlots = computeAvailableSlotsForDate(
                      newDate,
                      fallbackMod,
                      settings,
                      bookings.filter((b) => b.id !== booking.id),
                      undefined,
                      { allowInactiveModality: true }
                    );
                    if (nextSlots.length > 0 && !nextSlots.includes(time)) {
                      setTime(nextSlots[0]);
                    }
                  }
                }}
                required
                className="w-full h-9 px-3 rounded-xl bg-[#0e1015] border border-white/10 text-white text-xs font-mono focus:border-[#843C52] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Hora sugerida</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl bg-[#0e1015] border border-white/10 text-white text-xs font-mono focus:border-[#843C52] focus:outline-none"
              />
            </div>
          </div>

          {/* Slots disponíveis clicáveis para a data selecionada */}
          {availableSlots.length > 0 && (
            <div className="space-y-1.5">
              <span className="block text-[11px] text-zinc-400">
                Horários livres em {formatDateForDisplay(date)}:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-[#0e1015] border border-white/[0.06]">
                {availableSlots.map((slotTime) => {
                  const isSelected = slotTime === time;
                  return (
                    <button
                      key={slotTime}
                      type="button"
                      onClick={() => setTime(slotTime)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#843C52] text-white font-semibold'
                          : 'bg-[#14161d] text-zinc-300 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]'
                      }`}
                    >
                      {slotTime}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              timeValidation.ok
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
            }`}
          >
            {timeValidation.ok ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{timeValidation.reason}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Mensagem para o cliente (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explique a mudança em poucas palavras…"
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0e1015] border border-white/10 text-white text-xs focus:border-[#843C52] focus:outline-none resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#0e1015] border border-white/[0.06] flex items-start gap-2.5 text-xs text-zinc-400">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#843C52]" />
            <span>
              A data original fica reservada até o cliente aceitar. O cliente receberá um e-mail com o link para confirmar o novo horário.
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading || !timeValidation.ok}
              className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-[#843C52] hover:bg-[#992b4a] disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Enviar proposta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* V9: CancellationAnalysisModal — Analisar solicitação / Cancelar chamada     */
/* -------------------------------------------------------------------------- */
export interface CancellationAnalysisModalProps {
  isOpen: boolean;
  booking: AppointmentBooking | null;
  onClose: () => void;
  onResolveRequest: (
    bookingId: string,
    decision: 'approve' | 'deny',
    decisionNote?: string,
    refundPercent?: number
  ) => Promise<any>;
  onAdminCancel: (bookingId: string, reason: string, refundPercent: number) => Promise<any>;
}

export function CancellationAnalysisModal({
  isOpen,
  booking,
  onClose,
  onResolveRequest,
  onAdminCancel,
}: CancellationAnalysisModalProps) {
  const isRequest =
    booking?.status === 'reagendamento_pendente' && booking?.cancellation?.state === 'requested';
  const isPaid =
    booking?.payment?.status === 'approved' || booking?.payment?.status === 'manual_confirmed';
  const bookingAmount = Number(booking?.price || booking?.payment?.amount || 0);

  const [reason, setReason] = useState('Imprevisto pessoal');
  const [decisionNote, setDecisionNote] = useState('');
  const [refundPercent, setRefundPercent] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (booking && isOpen) {
      setReason('Imprevisto pessoal');
      setDecisionNote('');
      setRefundPercent(100);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id, isOpen]);

  if (!isOpen || !booking) return null;

  const handleApproveOrCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isRequest) {
        const res = await onResolveRequest(
          booking.id,
          'approve',
          decisionNote,
          isPaid ? refundPercent : 0
        );
        if (res?.success) onClose();
        else setError(res?.error || 'Não foi possível aprovar o cancelamento. Tente novamente em instantes.');
      } else {
        const res = await onAdminCancel(
          booking.id,
          reason + (decisionNote ? ' - ' + decisionNote : ''),
          isPaid ? refundPercent : 0
        );
        if (res?.success) onClose();
        else setError(res?.error || 'Não foi possível cancelar o atendimento. Tente novamente em instantes.');
      }
    } catch (err: any) {
      setError('Não foi possível concluir a ação. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await onResolveRequest(
        booking.id,
        'deny',
        decisionNote || 'Solicitação analisada e não aprovada.',
        0
      );
      if (res?.success) onClose();
      else setError(res?.error || 'Não foi possível recusar a solicitação. Tente novamente em instantes.');
    } catch (err: any) {
      setError('Não foi possível recusar a solicitação. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#14161d] border border-white/10 rounded-2xl shadow-2xl p-6 text-left relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h3 className="text-base font-semibold text-white">
              {isRequest ? 'Analisar pedido do cliente' : 'Cancelar chamada'}
            </h3>
            <p className="text-zinc-400 text-xs mt-0.5">
              {isRequest
                ? 'O cliente pediu para cancelar. Analise o motivo e decida como responder.'
                : 'A Nua está iniciando um cancelamento. O cliente receberá uma notificação.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.06] text-xs text-zinc-300">
            <div className="font-semibold text-white">
              {booking.clientName} · {formatDateForDisplay(booking.date)} às {booking.startTime}
            </div>
            <div className="mt-1 text-zinc-400">
              {booking.modalityName} ·{' '}
              {isPaid ? `Pago ${formatCurrencyBrl(bookingAmount)}` : 'Pagamento pendente'}
            </div>
          </div>

          {isRequest && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Motivo do cliente: {booking.cancellation?.reason || 'Não informado'}</span>
              </div>
              {booking.cancellation?.details && (
                <p className="pl-5 text-zinc-300 text-[11px]">{booking.cancellation.details}</p>
              )}
              <p className="pl-5 text-amber-200/80 text-[11px]">
                A chamada continua reservada até a decisão.
              </p>
            </div>
          )}

          {!isRequest && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Motivo do cancelamento *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-[#0e1015] border border-white/10 text-white text-xs focus:border-[#843C52] focus:outline-none"
              >
                <option value="Imprevisto pessoal" className="bg-[#14161d]">
                  Imprevisto pessoal
                </option>
                <option value="Problema de disponibilidade" className="bg-[#14161d]">
                  Problema de disponibilidade
                </option>
                <option value="Problema técnico" className="bg-[#14161d]">
                  Problema técnico
                </option>
                <option value="Solicitado pelo cliente" className="bg-[#14161d]">
                  Solicitado pelo cliente
                </option>
                <option value="Outro motivo" className="bg-[#14161d]">
                  Outro motivo
                </option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              {isRequest ? 'Resposta para o cliente' : 'Explique ao cliente (opcional)'}
            </label>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder={
                isRequest
                  ? 'Explique a decisão de forma clara…'
                  : 'Escreva uma explicação breve…'
              }
              rows={3}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0e1015] border border-white/10 text-white text-xs focus:border-[#843C52] focus:outline-none resize-none"
            />
          </div>

          {isPaid ? (
            <div className="p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <b className="font-semibold text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#843C52]" />
                  <span>
                    {isRequest ? 'Decisão sobre reembolso' : 'Reembolso ao cliente'}
                  </span>
                </b>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-semibold">
                  {formatCurrencyBrl(bookingAmount)} pago
                </span>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Percentual de devolução da reserva
                </label>
                <select
                  value={refundPercent}
                  onChange={(e) => setRefundPercent(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-xl bg-[#14161d] border border-white/10 text-white text-xs focus:border-[#843C52] focus:outline-none"
                >
                  <option value={100} className="bg-[#14161d]">
                    Integral (100%) · {formatCurrencyBrl(bookingAmount)}
                  </option>
                  <option value={50} className="bg-[#14161d]">
                    Parcial (50%) · {formatCurrencyBrl(bookingAmount * 0.5)}
                  </option>
                  <option value={0} className="bg-[#14161d]">
                    Sem devolução · R$ 0,00
                  </option>
                </select>
              </div>
              <p className="text-[11px] text-zinc-400">
                Após confirmar o cancelamento, caso haja valor a devolver via Mercado Pago, você poderá disparar o estorno diretamente nos detalhes da chamada.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#0e1015] border border-white/[0.06] flex items-start gap-2 text-xs text-zinc-400">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Não há pagamento confirmado. Portanto, não existe valor a devolver.</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Voltar
            </button>

            <div className="flex items-center gap-2">
              {isRequest && (
                <button
                  type="button"
                  onClick={handleDeny}
                  disabled={loading}
                  className="h-9 px-4 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Recusar pedido
                </button>
              )}
              <button
                type="button"
                onClick={handleApproveOrCancel}
                disabled={loading}
                className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isRequest ? 'Aprovar cancelamento' : 'Confirmar cancelamento'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* V9: BookingDetailModal — Detalhes completos e ações da chamada             */
/* -------------------------------------------------------------------------- */
export interface BookingDetailModalProps {
  isOpen: boolean;
  booking: AppointmentBooking | null;
  timezone?: string;
  onClose: () => void;
  onOpenMeetingModal?: (booking: AppointmentBooking) => void;
  onOpenProposalModal: (booking: AppointmentBooking) => void;
  onOpenCancellationModal: (booking: AppointmentBooking) => void;
  onConfirmPayment: (bookingId: string) => Promise<any>;
  onMarkComplete: (bookingId: string) => Promise<any>;
  onMarkAbsent?: (bookingId: string) => Promise<any>;
  onOpenRefund?: (bookingId: string) => void;
  onWithdrawProposal: (bookingId: string) => Promise<any>;
  onRestoreConfirmed?: (bookingId: string) => Promise<any>;
  onReloadData?: () => Promise<any>;
  showToast?: (msg: string) => void;
}

export function BookingDetailModal({
  isOpen,
  booking,
  timezone,
  onClose,
  onOpenProposalModal,
  onOpenCancellationModal,
  onConfirmPayment,
  onMarkComplete,
  onMarkAbsent,
  onOpenRefund,
  onWithdrawProposal,
  onRestoreConfirmed,
  onReloadData,
  showToast,
}: BookingDetailModalProps) {
  // Todos os Hooks React DEVEM ficar acima de qualquer return condicional (Regra de Hooks)
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [meetingUrlInput, setMeetingUrlInput] = useState('');
  const [meetingInstructionsInput, setMeetingInstructionsInput] = useState('');
  const [savedMeetingUrl, setSavedMeetingUrl] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    const url = booking?.meeting?.url || '';
    const instructions = booking?.meeting?.instructions || '';
    setMeetingUrlInput(url);
    setMeetingInstructionsInput(instructions);
    setSavedMeetingUrl(url);
    setIsEditingMeeting(false);
    setBusyAction(null);
  }, [booking?.id, booking?.meeting?.url, booking?.meeting?.instructions]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !booking) return null;

  const todayStr = getScheduleNow(timezone || booking.timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString;
  const isFutureBooking = booking.date > todayStr;
  const isPaid =
    booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed';
  const isRefunded =
    booking.payment?.status === 'refunded' ||
    booking.refundStatus === 'refunded' ||
    booking.refundStatus === 'completed';
  const isPaymentRejected = booking.payment?.status === 'rejected';
  const bookingAmount = Number(booking.price || booking.payment?.amount || 0);
  const isPending = booking.status === 'aguardando_pagamento';
  const isConfirmed = booking.status === 'confirmada';
  const isCompleted = booking.status === 'concluida';
  const isAbsent = booking.status === 'nao_compareceu';
  const isCancelled = booking.status === 'cancelada';
  const hasRequest =
    booking.status === 'reagendamento_pendente' && booking.cancellation?.state === 'requested';
  const hasProposal = Boolean(booking.proposal);
  const hasClientRescheduleRequest =
    booking.status === 'reagendamento_pendente' && !hasRequest && !hasProposal;
  const needsRefundExecution =
    isCancelled &&
    (booking.refundStatus === 'pending' || booking.refundStatus === 'failed') &&
    Boolean(onOpenRefund);

  const activeMeetingUrl = savedMeetingUrl || booking.meeting?.url || '';

  const clientVoucherUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/chamadas/reserva?token=${booking.publicToken || booking.id}`
      : `/chamadas/reserva?token=${booking.publicToken || booking.id}`;

  const runAction = async (key: string, fn: () => Promise<any>) => {
    if (busyAction) return;
    setBusyAction(key);
    try {
      await fn();
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyMeeting = async () => {
    const url = activeMeetingUrl || meetingUrlInput;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      if (showToast) showToast('Link da chamada copiado para a área de transferência.');
    } catch {
      if (showToast) showToast('Não foi possível copiar o link.');
    }
  };

  const handleCopyVoucher = async () => {
    try {
      await navigator.clipboard.writeText(clientVoucherUrl);
      if (showToast) showToast('Link do comprovante do cliente copiado!');
    } catch {
      if (showToast) showToast('Não foi possível copiar o link.');
    }
  };

  const handleSaveMeetingInline = async () => {
    const trimmedUrl = meetingUrlInput.trim();
    if (!trimmedUrl) {
      if (showToast) showToast('Digite ou cole o link da chamada.');
      return;
    }
    if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      if (showToast) showToast('Informe um link válido começando com https://');
      return;
    }
    setSavingMeeting(true);
    try {
      const res = await executeAdminAction('updateMeeting', {
        bookingId: booking.id,
        meetingUrl: trimmedUrl,
        instructions: meetingInstructionsInput.trim(),
      });
      if (res?.success) {
        setSavedMeetingUrl(trimmedUrl);
        setIsEditingMeeting(false);
        if (showToast) showToast('Link da chamada salvo com sucesso!');
        if (onReloadData) await onReloadData();
      } else {
        if (showToast) showToast(res?.error || 'Não foi possível salvar o link da chamada. Tente novamente em instantes.');
      }
    } catch {
      if (showToast) showToast('Não foi possível salvar o link da chamada. Tente novamente em instantes.');
    } finally {
      setSavingMeeting(false);
    }
  };

  const rawContact = (booking.clientPhone || '').trim();
  const isTelegramContact =
    booking.contactType === 'telegram' ||
    rawContact.startsWith('@') ||
    (/^[a-zA-Z]/.test(rawContact) && !rawContact.includes('@'));
  const telegramHandle = rawContact.replace(/^@/, '').trim();
  const rawDigits = rawContact.replace(/\D/g, '');
  const normalizedWhatsAppPhone =
    rawDigits.length >= 10 && rawDigits.length <= 11 && !rawDigits.startsWith('55')
      ? `55${rawDigits}`
      : rawDigits;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#14161d] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#161821] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6B1D2F]/25 border border-[#6B1D2F]/40 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5 text-[#f4a7b9]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-white">Atendimento VIP</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-400 border border-white/10">
                  #{booking.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">
                {booking.clientName} · {formatDateForDisplay(booking.date)} às {booking.startTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                booking.status === 'em_andamento'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1.5'
                  : hasRequest
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                  : hasProposal
                  ? 'bg-[#843C52]/15 text-[#f4a7b9] border-[#843C52]/30'
                  : isConfirmed
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                  : isPending
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                  : isCompleted
                  ? 'bg-white/[0.06] text-zinc-300 border-white/10'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
              }`}
            >
              {booking.status === 'em_andamento' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              {booking.status === 'em_andamento'
                ? 'Em andamento'
                : hasRequest
                ? 'Cancelamento Solicitado'
                : hasClientRescheduleRequest
                ? 'Reagendamento Solicitado'
                : hasProposal
                ? 'Proposta Enviada'
                : isConfirmed
                ? 'Confirmada'
                : isPending
                ? 'Aguardando PIX'
                : isCompleted
                ? 'Concluída'
                : isAbsent
                ? 'Não compareceu'
                : 'Cancelada'}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* CARD 1: Google Meet (Destaque Oficial da API) */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-[#1a1c26] to-[#0e1015] border border-white/[0.08] space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-white tracking-wide uppercase font-mono">
                  Google Meet Oficial
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {booking.status === 'em_andamento'
                    ? 'Reunião em andamento'
                    : isCompleted
                    ? 'Reunião finalizada'
                    : 'Sala exclusiva integrada'}
                </span>
              </div>

              {!isCancelled && activeMeetingUrl && (
                <button
                  type="button"
                  onClick={() => setIsEditingMeeting(!isEditingMeeting)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                >
                  {isEditingMeeting ? 'Fechar edição' : 'Editar link manual'}
                </button>
              )}
            </div>

            {/* Exibição do Link e Ações */}
            {activeMeetingUrl && !isEditingMeeting ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#14161d] border border-white/[0.06]">
                  <span className="text-xs font-mono text-[#f4a7b9] break-all truncate">
                    {activeMeetingUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMeeting}
                    className="p-1.5 rounded-md hover:bg-white/[0.08] text-zinc-400 hover:text-white transition shrink-0"
                    title="Copiar link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <a
                    href={activeMeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shadow-md"
                  >
                    <Video className="w-4 h-4" />
                    <span>Entrar no Google Meet</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyMeeting}
                    className="h-9 px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar link</span>
                  </button>
                </div>
              </div>
            ) : isEditingMeeting || !activeMeetingUrl ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Link da sala de vídeo (Google Meet):
                  </label>
                  <input
                    type="url"
                    value={meetingUrlInput}
                    onChange={(e) => setMeetingUrlInput(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full h-9 px-3 rounded-xl bg-[#14161d] border border-white/10 text-white font-mono text-xs focus:border-[#843C52] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveMeetingInline}
                    disabled={savingMeeting}
                    className="h-8 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {savingMeeting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Salvar link</span>
                  </button>
                  {activeMeetingUrl && (
                    <button
                      type="button"
                      onClick={() => setIsEditingMeeting(false)}
                      className="h-8 px-3 rounded-xl text-zinc-400 hover:text-white text-xs transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Métricas Reais do Google Meet */}
            {(booking.meeting?.actualStartedAt || booking.meeting?.actualEndedAt || typeof booking.meeting?.effectiveDurationSeconds === 'number') && (
              <div className="p-3 rounded-lg bg-black/30 border border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {booking.meeting?.actualStartedAt && (
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 block uppercase">Início real</span>
                    <span className="text-zinc-200 font-medium font-mono">
                      {new Date(booking.meeting.actualStartedAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                {booking.meeting?.actualEndedAt && (
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 block uppercase">Encerramento real</span>
                    <span className="text-zinc-200 font-medium font-mono">
                      {new Date(booking.meeting.actualEndedAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                {typeof booking.meeting?.effectiveDurationSeconds === 'number' && (
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 block uppercase">Duração comprovada</span>
                    <span className="text-emerald-300 font-medium font-mono">
                      {Math.max(1, Math.round(booking.meeting.effectiveDurationSeconds / 60))} min
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GRID 2 COLUNAS: Cliente e Dados do Agendamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Coluna 1: Cliente */}
            <div className="p-4 rounded-xl bg-[#0e1015] border border-white/[0.06] space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold block">
                CLIENTE
              </span>
              <div>
                <h4 className="text-base font-bold text-white">{booking.clientName}</h4>
                <span className="text-xs text-zinc-400 font-mono block mt-0.5">{booking.clientEmail}</span>
              </div>

              {rawContact && (
                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-zinc-300 font-mono">{rawContact}</span>
                  {isTelegramContact && telegramHandle ? (
                    <a
                      href={`https://t.me/${encodeURIComponent(telegramHandle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/25 text-xs font-medium transition cursor-pointer"
                    >
                      <span>Telegram</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : normalizedWhatsAppPhone ? (
                    <a
                      href={`https://wa.me/${normalizedWhatsAppPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-medium transition cursor-pointer"
                    >
                      <span>WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                </div>
              )}
            </div>

            {/* Coluna 2: Dados do Atendimento e Pagamento */}
            <div className="p-4 rounded-xl bg-[#0e1015] border border-white/[0.06] space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold block">
                HORÁRIO & VALOR
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Data</span>
                  <span className="text-white font-medium">{formatDateForDisplay(booking.date)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Horário</span>
                  <span className="text-white font-medium font-mono">{booking.startTime} ({booking.durationMinutes} min)</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-white/[0.04] flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Modalidade</span>
                    <span className="text-zinc-200 font-medium">{booking.modalityName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block text-[11px]">Valor</span>
                    <span className="text-white font-bold">{formatCurrencyBrl(bookingAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between border-t border-white/[0.04]">
                <span className="text-[11px] text-zinc-400">Pagamento:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isRefunded
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/25'
                      : isPaymentRejected
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                      : isPaid
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                  }`}
                >
                  {isRefunded
                    ? 'Reembolsado'
                    : isPaymentRejected
                    ? 'Recusado'
                    : isPaid
                    ? 'Pago via PIX'
                    : 'Aguardando PIX'}
                </span>
              </div>
            </div>
          </div>

          {needsRefundExecution && (
            <button type="button" onClick={() => onOpenRefund?.(booking.id)}
              className="h-9 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 text-xs font-medium text-rose-300 hover:bg-rose-500/20">
              Ver devolução no Mercado Pago
            </button>
          )}

          {/* Observações do Cliente */}
          {booking.clientNotes && (
            <div className="p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.06] text-xs">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold block mb-1">
                OBSERVAÇÕES DO CLIENTE
              </span>
              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{booking.clientNotes}</p>
            </div>
          )}

          {/* Banner de Cancelamento Solicitado */}
          {hasRequest && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-2">
              <b className="text-amber-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Pedido de cancelamento recebido</span>
              </b>
              <p className="text-amber-100">
                Motivo informado: <strong>{booking.cancellation?.reason || 'Não informado'}</strong>
              </p>
              <button
                type="button"
                onClick={() => onOpenCancellationModal(booking)}
                className="h-8 px-3.5 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold transition cursor-pointer"
              >
                Analisar solicitação
              </button>
            </div>
          )}

          {/* Ações do Atendimento */}
          {!isCancelled && !isCompleted && !isAbsent && (
            <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 flex-wrap justify-end">
              {!booking.proposal && (
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => onOpenProposalModal(booking)}
                  className="h-8 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-200 inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Propor outro horário</span>
                </button>
              )}

              {isConfirmed && !isFutureBooking && (
                <button
                  type="button"
                  disabled={busyAction !== null}
                  onClick={() => runAction('complete', () => onMarkComplete(booking.id))}
                  className="h-8 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-medium text-emerald-300 inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  {busyAction === 'complete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Concluir</span>
                </button>
              )}

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => onOpenCancellationModal(booking)}
                className="h-8 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-medium text-rose-300 inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-white/[0.08] bg-[#161821] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyVoucher}
            className="text-xs text-[#f4a7b9] hover:text-white inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar link do voucher do cliente</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium text-white transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* V9: BlockPeriodModal — Fechar período por intervalo de datas               */
/* -------------------------------------------------------------------------- */
export interface BlockPeriodModalProps {
  isOpen: boolean;
  timezone?: string;
  onClose: () => void;
  onSubmit: (dates: string[]) => Promise<{ success: boolean; error?: string } | undefined>;
}

export function BlockPeriodModal({ isOpen, timezone, onClose, onSubmit }: BlockPeriodModalProps) {
  const todayStr = getScheduleNow(timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString;
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFromDate(todayStr);
      setToDate(todayStr);
      setError(null);
    }
  }, [isOpen, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      setError('Informe a data de início e de término.');
      return;
    }
    if (fromDate > toDate) {
      setError('A data inicial não pode ser depois da data final.');
      return;
    }

    const dates: string[] = [];
    const cur = new Date(`${fromDate}T12:00:00Z`);
    const end = new Date(`${toDate}T12:00:00Z`);

    while (cur <= end && dates.length < 367) {
      const dStr = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`;
      dates.push(dStr);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    setLoading(true);
    setError(null);
    try {
      const result = await onSubmit(dates);
      if (result?.success) onClose();
      else setError(result?.error || 'Não foi possível bloquear o período. Tente novamente em instantes.');
    } catch (err: any) {
      setError('Não foi possível bloquear o período. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#14161d] border border-white/10 rounded-2xl shadow-2xl p-6 text-left relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div>
            <h3 className="text-base font-semibold text-white">Marcar folga</h3>
            <p className="text-zinc-400 text-xs mt-0.5">
              Feche um dia ou um período para novas chamadas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Começa em</label>
              <input
                type="date"
                min={todayStr}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl bg-[#0e1015] border border-white/10 text-white text-xs font-mono focus:border-[#843C52] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Termina em</label>
              <input
                type="date"
                min={todayStr}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-xl bg-[#0e1015] border border-white/10 text-white text-xs font-mono focus:border-[#843C52] focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0e1015] border border-white/[0.06] text-xs text-zinc-400 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#843C52]" />
            <span>
              As datas escolhidas ficarão indisponíveis para novas reservas. Chamadas já marcadas continuarão visíveis no calendário.
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded-xl text-xs font-semibold text-white bg-[#843C52] hover:bg-[#992b4a] disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <Ban className="w-3.5 h-3.5" />
              <span>Bloquear período</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
