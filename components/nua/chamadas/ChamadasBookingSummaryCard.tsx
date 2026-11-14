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
      <div className="sticky top-28 rounded-[28px] bg-[#08080c] border border-white/10 p-6 sm:p-7 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.95)] text-left">
        <div className="border-b border-white/[0.06] pb-5 mb-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[#f4a7b9] block font-medium">
              Agendamento Privativo
            </span>
            <h3 className="font-serif text-2xl text-white font-normal tracking-tight mt-1">
              Resumo da Reserva
            </h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f4a7b9]">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Detalhes selecionados */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-5 mb-6 space-y-3 text-xs">
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500 font-light">Modalidade:</span>
            <span className="font-medium text-white">{selectedModality.name}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500 font-light">Duração:</span>
            <span className="font-mono text-zinc-300">{selectedModality.durationMinutes} minutos</span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500 font-light">Data selecionada:</span>
            <span className="font-medium text-white">
              {selectedDate ? selectedDate.split('-').reverse().join('/') : 'A selecionar no calendário'}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-300">
            <span className="text-zinc-500 font-light">Horário:</span>
            <span className={selectedTime ? 'text-[#f4a7b9] font-mono font-medium' : 'text-zinc-500'}>
              {selectedTime ? `${selectedTime} (Brasília)` : 'A selecionar'}
            </span>
          </div>
          <div className="pt-3.5 border-t border-white/[0.08] flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-300">
              Total do Encontro
            </span>
            <span className="font-serif text-3xl sm:text-4xl text-[#f4a7b9] font-medium">
              {selectedModality.priceFormatted}
            </span>
          </div>
        </div>

        {/* Formulário de Identificação */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">
              Seu nome completo <span className="text-[#f4a7b9]">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Como prefere ser chamado(a)?"
              className="w-full h-12 rounded-xl bg-black/60 border border-white/10 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">
              E-mail para envio da sala privativa <span className="text-[#f4a7b9]">*</span>
            </label>
            <input
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-12 rounded-xl bg-black/60 border border-white/10 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">
              WhatsApp ou Telegram para alinhamento <span className="text-[#f4a7b9]">*</span>
            </label>
            <input
              type="tel"
              required
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(11) 99999-9999 ou @usuario"
              className="w-full h-12 rounded-xl bg-black/60 border border-white/10 px-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">
              Observações ou preferências (opcional)
            </label>
            <textarea
              rows={2}
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Algo que queira adiantar para a Nua..."
              className="w-full rounded-2xl bg-black/60 border border-white/10 p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Termos e Condições */}
          <div className="pt-2">
            <label className="flex items-start gap-3 text-xs text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer shrink-0"
              />
              <span className="leading-snug font-light">
                Concordo com os termos de discrição mútua, pontualidade e sigilo da sala privativa.
              </span>
            </label>
          </div>

          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !selectedTime}
            className="w-full min-h-[50px] rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] disabled:opacity-40 text-black font-bold text-xs tracking-widest uppercase transition-all duration-300 shadow-[0_4px_25px_rgba(244,167,185,0.25)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
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

        <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-zinc-500" />
          <span>Sala Criptografada &bull; Sigilo Absoluto</span>
        </div>
      </div>
    </div>
  );
}
