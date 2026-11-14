'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import {
  AppointmentBooking,
  AppointmentModality,
  formatCurrencyBrl,
} from '@/lib/appointmentsCanonical';

interface MeetingLinkModalProps {
  booking: AppointmentBooking | null;
  meetingUrl: string;
  instructions: string;
  onUrlChange: (url: string) => void;
  onInstructionsChange: (instructions: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function MeetingLinkModal({
  booking,
  meetingUrl,
  instructions,
  onUrlChange,
  onInstructionsChange,
  onClose,
  onSave,
}: MeetingLinkModalProps) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-xl bg-[#171821] border border-white/[0.08] p-5 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-white">Sala de Atendimento / Link da Chamada</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 font-light">
          Informe o link direto da chamada (Google Meet, Jitsi, Whereby, etc.) para a reserva de{' '}
          <strong>{booking.clientName}</strong>. O cliente terá acesso a este link no comprovante e na sala segura.
        </p>

        <div className="space-y-1">
          <label className="block text-zinc-300 text-xs font-medium">Link da Sala:</label>
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f4a7b9]"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-zinc-300 text-xs font-medium">
            Instruções Específicas para o Cliente:
          </label>
          <textarea
            rows={3}
            value={instructions}
            onChange={(e) => onInstructionsChange(e.target.value)}
            placeholder="Ex: Entre 5 minutos antes para testar o microfone..."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f4a7b9] resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs border border-white/[0.08] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 text-xs font-semibold cursor-pointer shadow-sm"
          >
            Salvar Link
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface CancelBookingModalProps {
  booking: AppointmentBooking | null;
  cancelReason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelBookingModal({
  booking,
  cancelReason,
  onReasonChange,
  onClose,
  onConfirm,
}: CancelBookingModalProps) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-xl bg-[#171821] border border-red-500/30 p-5 space-y-3.5 shadow-2xl"
      >
        <h3 className="text-base font-semibold text-white">Cancelar Reserva</h3>
        <p className="text-zinc-400 text-xs font-light">
          Tem certeza que deseja cancelar a reserva de <strong>{booking.clientName}</strong> em{' '}
          {booking.date} às {booking.startTime}? O slot será imediatamente liberado na agenda.
        </p>

        <div>
          <label className="block text-zinc-400 text-xs mb-1.5 font-medium">
            Motivo do Cancelamento:
          </label>
          <textarea
            rows={2}
            required
            value={cancelReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Ex: Imprevisto de saúde, solicitação do cliente..."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs border border-white/[0.08] cursor-pointer"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-8 px-4 rounded-full bg-red-500 hover:bg-red-400 text-white text-xs font-semibold cursor-pointer"
          >
            Confirmar Cancelamento
          </button>
        </div>
      </motion.div>
    </div>
  );
}

interface ModalityEditModalProps {
  editingModality: AppointmentModality | null;
  isNewModality: boolean;
  onModalityChange: (modality: AppointmentModality) => void;
  onClose: () => void;
  onSave: () => void;
}

export function ModalityEditModal({
  editingModality,
  isNewModality,
  onModalityChange,
  onClose,
  onSave,
}: ModalityEditModalProps) {
  if (!editingModality) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg rounded-xl bg-[#171821] border border-white/[0.08] p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-white">
            {isNewModality ? 'Nova Modalidade de Chamada' : 'Editar Modalidade'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Nome da Modalidade *</label>
            <input
              type="text"
              required
              value={editingModality.name}
              onChange={(e) => onModalityChange({ ...editingModality, name: e.target.value })}
              placeholder="Ex: Encontro Privativo (30 min)"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Duração (Minutos) *</label>
              <input
                type="number"
                required
                min={10}
                max={180}
                value={editingModality.durationMinutes}
                onChange={(e) =>
                  onModalityChange({
                    ...editingModality,
                    durationMinutes: Number(e.target.value),
                  })
                }
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Preço em Reais (R$) *</label>
              <input
                type="number"
                required
                min={0}
                value={editingModality.price}
                onChange={(e) => {
                  const price = Number(e.target.value);
                  onModalityChange({
                    ...editingModality,
                    price,
                    priceFormatted: formatCurrencyBrl(price),
                  });
                }}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white"
              />
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
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
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
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={editingModality.active}
              onChange={(e) =>
                onModalityChange({ ...editingModality, active: e.target.checked })
              }
              className="rounded bg-[#0e0f14] border-white/20 text-[#f4a7b9]"
            />
            <span className="text-zinc-300">Modalidade ativa e visível no site</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs border border-white/[0.08] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 text-xs font-semibold cursor-pointer shadow-sm"
          >
            Salvar Modalidade
          </button>
        </div>
      </motion.div>
    </div>
  );
}
