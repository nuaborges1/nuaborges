import React from 'react';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { AppointmentModality } from '@/lib/appointmentsCanonical';

interface ChamadasBookingSummaryCardProps {
  selectedModality: AppointmentModality;
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  setClientName: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  clientPhone: string;
  setClientPhone: (v: string) => void;
  clientNotes: string;
  setClientNotes: (v: string) => void;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChamadasBookingSummaryCard({
  selectedModality,
  selectedDate,
  selectedTime,
  clientName,
  setClientName,
  clientEmail,
  setClientEmail,
  clientPhone,
  setClientPhone,
  clientNotes,
  setClientNotes,
  termsAccepted,
  setTermsAccepted,
  submitError,
  isSubmitting,
  onSubmit,
}: ChamadasBookingSummaryCardProps) {
  return (
    <div className="lg:col-span-5">
      <div className="sticky top-28 rounded-3xl bg-zinc-950/90 border border-zinc-800/80 p-6 sm:p-7 backdrop-blur-xl shadow-2xl">
        <h3 className="font-serif text-xl text-white mb-4">Resumo da Reserva</h3>

        {/* Detalhes selecionados */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/50 p-4 mb-6 space-y-2 text-xs">
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500">Modalidade:</span>
            <span className="font-medium text-white">{selectedModality.name}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500">Duração:</span>
            <span>{selectedModality.durationMinutes} minutos</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500">Data:</span>
            <span className="font-medium text-white">
              {selectedDate ? selectedDate.split('-').reverse().join('/') : 'A selecionar'}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500">Horário:</span>
            <span className={selectedTime ? 'text-[#f4a7b9] font-bold' : 'text-zinc-500'}>
              {selectedTime ? `${selectedTime} (Brasília)` : 'A selecionar'}
            </span>
          </div>
          <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-sm font-semibold">
            <span className="text-zinc-400">Total:</span>
            <span className="text-[#f4a7b9]">{selectedModality.priceFormatted}</span>
          </div>
        </div>

        {/* Formulário de Identificação */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
              Seu Nome Completo *
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Como deseja ser chamado(a)"
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-[#f4a7b9] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
              E-mail *
            </label>
            <input
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-[#f4a7b9] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
              WhatsApp (com DDD) *
            </label>
            <input
              type="tel"
              required
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-[#f4a7b9] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
              Observações ou preferências (opcional)
            </label>
            <textarea
              rows={2}
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Algo que queira adiantar para a Lua..."
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-[#f4a7b9] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Termos e Condições */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 text-[11px] text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded bg-zinc-900 border-zinc-700 text-[#f4a7b9] focus:ring-0 cursor-pointer"
              />
              <span>
                Declaro que li e concordo com os termos de privacidade, pontualidade britânica e
                proibição estrita de gravações de áudio/vídeo.
              </span>
            </label>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !selectedTime}
            className="w-full py-4 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:scale-[0.99] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_24px_rgba(244,167,185,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>
              {isSubmitting ? 'Reservando Horário...' : 'Avançar para Pagamento Pix'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
