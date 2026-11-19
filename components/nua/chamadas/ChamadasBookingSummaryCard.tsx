/* Vinho maduro / Nua Borges */
import React from 'react';
import { AlertCircle, Loader2, ArrowRight, ShieldCheck, CalendarCheck, Clock } from 'lucide-react';
import { AppointmentModality } from '@/lib/appointmentsCanonical';

interface ChamadasBookingSummaryCardProps {
  selectedModality: AppointmentModality;
  selectedDate: string;
  selectedTime: string;
  timezoneLabel?: string;
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
  timezoneLabel = 'Horário da Agenda',
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
    <div className="lg:col-span-5 space-y-4">
      <div className="rounded-[28px] bg-[#08080c] border border-white/10 p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] relative text-left">
        <div className="border-b border-white/[0.06] pb-4 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[#90364B] block font-medium">
              Resumo do Pedido
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
              Reserva da Chamada
            </h3>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#90364B]">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Detalhes do Encontro */}
        <div className="space-y-1.5 text-xs text-zinc-300 font-light mb-4">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-zinc-400">{selectedModality.name}</span>
            <span className="font-mono text-zinc-200 font-medium whitespace-nowrap tabular-nums">
              {selectedModality.priceFormatted?.replace(/\s+/g, '\u00A0')}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-zinc-400">Duração do Encontro</span>
            <span className="font-mono text-zinc-300">
              {selectedModality.durationMinutes} minutos
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-zinc-400">Data Agendada</span>
            <span className="font-medium text-white">
              {selectedDate ? selectedDate.split('-').reverse().join('/') : 'A selecionar'}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-zinc-400">{timezoneLabel}</span>
            <span className={selectedTime ? 'text-[#90364B] font-mono font-medium' : 'text-zinc-500'}>
              {selectedTime ? selectedTime : 'A selecionar no calendário'}
            </span>
          </div>

          <div className="border-t border-white/[0.08] pt-3 mt-2 flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-300">
              Total a Pagar
            </span>
            <span className="font-serif text-2xl sm:text-3xl text-[#90364B] font-medium whitespace-nowrap tabular-nums">
              {selectedModality.priceFormatted?.replace(/\s+/g, '\u00A0')}
            </span>
          </div>
        </div>

        {/* Aviso de Sigilo e Sala Privativa */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5 text-xs text-zinc-300 mb-4">
          <Clock className="w-3.5 h-3.5 text-[#90364B] shrink-0" />
          <span className="text-[11px] text-zinc-300 leading-relaxed font-light">
            Sala privativa segura e link liberado após a confirmação.
          </span>
        </div>

        {/* Formulário de Identificação */}
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-300">
              Seu nome ou apelido <span className="text-[#90364B]">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Como prefere ser chamado(a)?"
              className="w-full h-10 rounded-xl bg-black/60 border border-white/10 px-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-300">
              WhatsApp ou Telegram para alinhamento <span className="text-[#90364B]">*</span>
            </label>
            <input
              type="tel"
              required
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(11) 99999-9999 ou @usuario"
              className="w-full h-10 rounded-xl bg-black/60 border border-white/10 px-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-300">
              E-mail para envio da sala privativa <span className="text-[#90364B]">*</span>
            </label>
            <input
              type="email"
              required
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full h-10 rounded-xl bg-black/60 border border-white/10 px-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-300">
              Observações ou preferências (opcional)
            </label>
            <input
              type="text"
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Algo que queira adiantar para a Nua..."
              className="w-full h-10 rounded-xl bg-black/60 border border-white/10 px-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] transition-colors"
            />
          </div>

          {/* Termos e Condições */}
          <label className="flex items-start gap-2.5 cursor-pointer pt-1 select-none">
            <input
              type="checkbox"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-3.5 h-3.5 mt-0.5 rounded text-[#661C30] accent-[#661C30] focus:ring-0 cursor-pointer shrink-0"
            />
            <span className="text-[11px] text-zinc-400 leading-snug font-light">
              Concordo com as diretrizes e compreendo que o extrato bancário do Pix é 100% neutro e discreto.
            </span>
          </label>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !selectedTime}
            className="w-full min-h-[46px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] disabled:opacity-40 text-[#F5EEE9] font-bold text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 active:scale-[0.99] cursor-pointer mt-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reservando Horário...</span>
              </>
            ) : (
              <>
                <span>Gerar Pix &amp; Reservar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-3.5 pt-3 border-t border-white/[0.05] flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
          <span>Pagamento Instantâneo &bull; Discrição Absoluta</span>
        </div>
      </div>
    </div>
  );
}
