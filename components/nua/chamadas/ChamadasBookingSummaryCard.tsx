import React from 'react';
import { AlertCircle, Loader2, ArrowRight, ShieldCheck, CalendarCheck } from 'lucide-react';
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
      <div className="sticky top-28 rounded-2xl bg-[#14161d] border border-white/[0.08] p-5 sm:p-6 shadow-xl text-left">
        <div className="border-b border-white/[0.06] pb-4 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
              Agendamento
            </span>
            <h3 className="text-base font-semibold text-white tracking-tight mt-0.5">
              Resumo da Reserva
            </h3>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Detalhes selecionados */}
        <div className="rounded-xl bg-[#0e1015] border border-white/[0.06] p-3.5 mb-5 space-y-2 text-xs">
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500 font-light">Modalidade:</span>
            <span className="font-medium text-white">{selectedModality.name}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500 font-light">Duração:</span>
            <span className="font-mono text-zinc-200">{selectedModality.durationMinutes} minutos</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500 font-light">Data selecionada:</span>
            <span className="font-medium text-white">
              {selectedDate ? selectedDate.split('-').reverse().join('/') : 'A selecionar no calendário'}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500 font-light">Horário:</span>
            <span className={selectedTime ? 'text-[#f4a7b9] font-mono font-semibold' : 'text-zinc-500'}>
              {selectedTime ? `${selectedTime} (Brasília)` : 'A selecionar'}
            </span>
          </div>
          <div className="pt-2.5 border-t border-white/[0.06] flex justify-between items-center text-xs">
            <span className="uppercase tracking-wider font-semibold text-white">Total do Encontro:</span>
            <span className="font-mono font-bold text-base text-[#f4a7b9]">
              {selectedModality.priceFormatted}
            </span>
          </div>
        </div>

        {/* Formulário de Identificação */}
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-300">
              Seu nome completo <span className="text-[#f4a7b9]">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Como prefere ser chamado(a)?"
              className="w-full h-10 rounded-xl bg-[#0e1015] border border-white/[0.08] px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-300">
              E-mail para envio da sala <span className="text-[#f4a7b9]">*</span>
            </label>
            <input
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-10 rounded-xl bg-[#0e1015] border border-white/[0.08] px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-300">
              WhatsApp ou Telegram <span className="text-[#f4a7b9]">*</span>
            </label>
            <input
              type="tel"
              required
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(11) 99999-9999 ou @usuario"
              className="w-full h-10 rounded-xl bg-[#0e1015] border border-white/[0.08] px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-300">
              Observações ou preferências (opcional)
            </label>
            <textarea
              rows={2}
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Algo que queira adiantar para a Nua..."
              className="w-full rounded-xl bg-[#0e1015] border border-white/[0.08] p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Termos e Condições */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 text-[11px] text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer shrink-0"
              />
              <span className="leading-snug">
                Concordo com os termos de discrição mútua, pontualidade e sigilo da sala privativa.
              </span>
            </label>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !selectedTime}
            className="w-full h-11 rounded-xl bg-[#f4a7b9] hover:bg-[#ffb8c9] disabled:opacity-40 text-zinc-950 font-semibold text-xs tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reservando Horário...</span>
              </>
            ) : (
              <>
                <span>Avançar para Pagamento Pix</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
          <span>Sala Criptografada &bull; Sigilo Absoluto</span>
        </div>
      </div>
    </div>
  );
}
