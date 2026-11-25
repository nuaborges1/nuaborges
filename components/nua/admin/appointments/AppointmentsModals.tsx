/* Vinho maduro / Nua Borges */
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
  DEFAULT_SCHEDULE_SETTINGS,
  formatCurrencyBrl,
  getScheduleNow,
} from '@/lib/appointmentsCanonical';
import { computeAvailableSlotsForDate } from '@/lib/appointments/availabilityEngine';
import { AdminNumberStepper } from '@/components/nua/admin';

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

interface ModalityEditModalProps {
  editingModality: AppointmentModality | null;
  isNewModality: boolean;
  onModalityChange: (modality: AppointmentModality) => void;
  onClose: () => void;
  onSave: () => Promise<any> | void;
}

export function ModalityEditModal({
  editingModality,
  isNewModality,
  onModalityChange,
  onClose,
  onSave,
}: ModalityEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rulesText, setRulesText] = useState('');

  useEffect(() => {
    if (editingModality) {
      setRulesText((editingModality.rules || []).join('\n'));
      setError(null);
      setSaving(false);
    }
  }, [editingModality?.id, isNewModality]);

  if (!editingModality) return null;

  const handleSaveClick = async () => {
    if (!editingModality.name.trim()) {
      setError('Informe o nome do tipo de chamada.');
      return;
    }
    if (!Number.isFinite(editingModality.durationMinutes) || editingModality.durationMinutes < 10) {
      setError('A duração mínima permitida é de 10 minutos.');
      return;
    }
    if (!Number.isFinite(editingModality.price) || editingModality.price < 1) {
      setError('O preço mínimo permitido é de R$ 1,00.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave();
    } catch (err: any) {
      setError('Não foi possível salvar a modalidade. Tente novamente em instantes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-[#171821] border border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-white">
            {isNewModality ? 'Novo Tipo de Chamada' : 'Editar Tipo de Chamada'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Nome que o cliente vê no site *</label>
            <input
              type="text"
              required
              value={editingModality.name}
              onChange={(e) => onModalityChange({ ...editingModality, name: e.target.value })}
              placeholder="Ex: Encontro Privativo (30 min)"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#843C52]"
            />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AdminNumberStepper
                variant="card"
                label="Duração"
                unit="min"
                min={10}
                max={240}
                step={5}
                value={editingModality.durationMinutes}
                onChange={(durationMinutes) =>
                  onModalityChange({
                    ...editingModality,
                    durationMinutes,
                  })
                }
              />

              <AdminNumberStepper
                variant="card"
                label="Preço em Reais"
                prefix="R$"
                min={1}
                step={25}
                value={editingModality.price}
                onChange={(price) => {
                  onModalityChange({
                    ...editingModality,
                    price,
                    priceFormatted: formatCurrencyBrl(price),
                  });
                }}
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-zinc-500 mr-1">Durações rápidas:</span>
              {DURATION_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() =>
                    onModalityChange({
                      ...editingModality,
                      durationMinutes: mins,
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                    editingModality.durationMinutes === mins
                      ? 'bg-[#843C52] text-white font-semibold'
                      : 'bg-[#0e0f14] text-zinc-400 hover:text-white border border-white/[0.08]'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Descrição Comercial</label>
            <textarea
              rows={2}
              value={editingModality.description}
              onChange={(e) =>
                onModalityChange({ ...editingModality, description: e.target.value })
              }
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-[#843C52]"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Instruções Apresentadas ao Cliente</label>
            <textarea
              rows={2}
              value={editingModality.clientInstructions}
              onChange={(e) =>
                onModalityChange({ ...editingModality, clientInstructions: e.target.value })
              }
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-[#843C52]"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">
              Destaques / Regras da Modalidade (uma por linha, opcional)
            </label>
            <textarea
              rows={3}
              value={rulesText}
              onChange={(e) => {
                const raw = e.target.value;
                setRulesText(raw);
                const parsedRules = raw
                  .split('\n')
                  .map((r) => r.trim())
                  .filter(Boolean);
                onModalityChange({ ...editingModality, rules: parsedRules });
              }}
              placeholder="Ex: Vídeo em tempo real em sala privativa&#10;Tolerância de 10 minutos&#10;Proibido gravar ou capturar tela"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-[#843C52]"
            />
          </div>

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editingModality.active}
              onChange={(e) =>
                onModalityChange({ ...editingModality, active: e.target.checked })
              }
              className="rounded bg-[#0e0f14] border-white/20 text-[#843C52] cursor-pointer"
            />
            <span className="text-zinc-300">Modalidade ativa e visível para novos agendamentos</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs border border-white/[0.08] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving}
            className="h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Salvar Modalidade</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface CreateManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalities: AppointmentModality[];
  settings?: AppointmentScheduleSettings;
  bookings?: AppointmentBooking[];
  defaultDate?: string;
  timezone?: string;
  onCreateBooking: (bookingData: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientNotes?: string;
    modalityId: string;
    date: string;
    startTime: string;
    paymentStatus: 'manual_confirmed' | 'pending';
    meetingUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function CreateManualBookingModal({
  isOpen,
  onClose,
  modalities,
  settings,
  bookings = [],
  defaultDate,
  timezone,
  onCreateBooking,
}: CreateManualBookingModalProps) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [modalityId, setModalityId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [paymentStatus, setPaymentStatus] = useState<'manual_confirmed' | 'pending'>('manual_confirmed');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wasOpenRef = React.useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const todayStr = getScheduleNow(timezone || DEFAULT_SCHEDULE_SETTINGS.timezone).dateString;
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setClientNotes('');
      setModalityId(modalities[0]?.id || 'chamada-30');
      setDate(defaultDate && defaultDate >= todayStr ? defaultDate : todayStr);
      setStartTime('18:00');
      setPaymentStatus('manual_confirmed');
      setMeetingUrl('');
      setErrorMsg(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, defaultDate, modalities, timezone]);

  const suggestedSlots = useMemo(() => {
    if (!isOpen || !date || !settings) return [];
    const mod = modalities.find((m) => m.id === modalityId) || modalities[0];
    if (!mod) return [];
    return computeAvailableSlotsForDate(date, mod, settings, bookings, new Date(), {
      allowInactiveModality: true,
    });
  }, [isOpen, date, modalityId, modalities, settings, bookings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim() || !date || !startTime) {
      setErrorMsg('Por favor, preencha Nome, E-mail, Data e Horário.');
      return;
    }
    if (meetingUrl.trim() && !/^https?:\/\/.+/i.test(meetingUrl.trim())) {
      setErrorMsg('O link da sala virtual deve começar com https://');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await onCreateBooking({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        clientNotes: clientNotes.trim() || undefined,
        modalityId,
        date,
        startTime,
        paymentStatus,
        meetingUrl: meetingUrl.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Não foi possível agendar essa chamada.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg('Não foi possível agendar a chamada. Tente novamente em instantes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-[#171821] border border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-base font-semibold text-white">Criar Chamada VIP Manual</h3>
            <p className="text-zinc-400 text-xs">Agende um atendimento diretamente para um cliente VIP.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 mb-1 font-medium">Nome do Cliente *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Camila Silva"
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#843C52]"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-1 font-medium">WhatsApp / Telegram</label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Ex: 5511999998888 ou @usuario"
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#843C52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-medium">E-mail do Cliente *</label>
            <input
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="cliente@email.com"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#843C52]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-zinc-300 mb-1 font-medium">Modalidade *</label>
              <select
                value={modalityId}
                onChange={(e) => setModalityId(e.target.value)}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-[#843C52] cursor-pointer"
              >
                {modalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.durationMinutes}m - {formatCurrencyBrl(m.price)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-300 mb-1 font-medium">Data *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-[#843C52]"
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-1 font-medium">Início *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-[#843C52]"
              />
            </div>
          </div>

          {settings && date && (
            <div className="rounded-lg bg-[#0e0f14] border border-white/[0.06] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-300">
                  Horários livres na agenda ({suggestedSlots.length})
                </span>
                <span className="text-[10px] text-zinc-500">
                  Clique para preencher ou digite um horário manual acima
                </span>
              </div>
              {suggestedSlots.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
                  {suggestedSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setStartTime(slot)}
                      className={`px-2 py-1 rounded-md text-[11px] font-mono border transition cursor-pointer ${
                        startTime === slot
                          ? 'bg-[#843C52] border-[#843C52] text-white font-semibold'
                          : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:border-[#843C52]/60 hover:text-white'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-amber-300/80">
                  Nenhum horário livre automático nesta data (dia fechado, lotado ou fora da rotina). Você ainda pode agendar manualmente desde que não haja conflito com outra chamada.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-zinc-300 mb-1 font-medium">Situação do pagamento</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as 'manual_confirmed' | 'pending')}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#843C52] cursor-pointer"
              >
                <option value="manual_confirmed">Confirmado / Já Pago (Cortesia ou Pix)</option>
                <option value="pending">Aguardando Pagamento (Pendente)</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-zinc-300 font-medium">Link da Sala (Opcional)</label>
                {!meetingUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setMeetingUrl(
                        `https://meet.jit.si/nua-vip-${Math.random().toString(36).substring(2, 10)}`
                      )
                    }
                    className="text-[10px] text-[#f4a7b9] hover:text-white underline cursor-pointer"
                  >
                    + Criar sala de vídeo automática
                  </button>
                )}
              </div>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#843C52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 mb-1 font-medium">Observações Internas (Opcional)</label>
            <textarea
              rows={2}
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Ex: Cliente VIP agendado via assessoria."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-[#843C52]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs border border-white/[0.08] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold cursor-pointer shadow-sm disabled:opacity-50"
            >
              {saving ? 'Agendando...' : 'Criar Chamada VIP'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
