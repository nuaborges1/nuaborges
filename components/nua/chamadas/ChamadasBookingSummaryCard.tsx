/* Vinho maduro / Nua Borges */
import React from 'react';
import {
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Clock,
  Check,
  UserCheck,
} from 'lucide-react';
import { AppointmentModality } from '@/lib/appointmentsCanonical';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from '@/components/nua/account/TurnstileWidget';

interface ChamadasSummaryProps {
  selectedModality: AppointmentModality;
  selectedDate: string;
  selectedTime: string;
  timezoneLabel?: string;
  brasiliaSummary?: string | null;
}

export function ChamadasBookingSummaryCard({
  selectedModality,
  selectedDate,
  selectedTime,
  timezoneLabel = 'Horário da Agenda',
  brasiliaSummary,
}: ChamadasSummaryProps) {
  const modalityRules = Array.isArray(selectedModality.rules)
    ? selectedModality.rules.filter((r) => typeof r === 'string' && r.trim().length > 0)
    : [];

  return (
    <div className="h-full flex flex-col justify-between gap-5 rounded-[28px] bg-[#08080c] border border-white/10 p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.95)] relative text-left">
      <div>
        <div className="border-b border-white/[0.06] pb-4 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[#F5EEE9]/80 block font-medium">
              Resumo da Reserva
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
              Reserva da Chamada
            </h3>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#F5EEE9]/80">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Detalhes do Encontro */}
        <div className="space-y-2 text-xs text-zinc-300 font-light mb-5">
          <div className="flex justify-between items-center py-0.5 gap-3">
            <span className="text-zinc-400">{selectedModality.name}</span>
            <span className="font-mono text-zinc-200 font-medium whitespace-nowrap tabular-nums">
              {selectedModality.priceFormatted?.replace(/\s+/g, '\u00A0')}
            </span>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-zinc-400">Duração do Encontro</span>
            <span className="font-mono text-zinc-200">
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
            <span className={selectedTime ? 'text-[#F5EEE9]/80 font-mono font-medium' : 'text-zinc-400'}>
              {selectedTime ? selectedTime : 'A selecionar'}
            </span>
          </div>

          {brasiliaSummary && (
            <div className="flex justify-between items-center py-0.5">
              <span className="text-zinc-400">Horário em Brasília</span>
              <span className="font-mono text-zinc-200">{brasiliaSummary}</span>
            </div>
          )}

          <div className="border-t border-white/[0.08] pt-3.5 mt-2.5 flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-300">
              Total a Pagar
            </span>
            <span className="font-serif text-2xl sm:text-3xl text-[#F5EEE9] font-medium whitespace-nowrap tabular-nums">
              {selectedModality.priceFormatted?.replace(/\s+/g, '\u00A0')}
            </span>
          </div>
        </div>

        {/* Diretrizes reais desta modalidade */}
        {modalityRules.length > 0 && (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <p className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#90364B] shrink-0" />
              <span>Diretrizes do encontro</span>
            </p>
            <ul className="space-y-1 text-xs text-zinc-400 font-light list-disc pl-4">
              {modalityRules.map((rule, idx) => (
                <li key={idx} className="leading-relaxed">{rule}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Instrução da sala privativa */}
      <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07] flex items-start gap-2.5 text-xs text-zinc-300">
        <Clock className="w-3.5 h-3.5 text-[#90364B] shrink-0 mt-0.5" />
        <span className="text-[11px] text-zinc-300 leading-relaxed font-light">
          {selectedModality.clientInstructions || 'Sala privativa segura e link liberado após a confirmação.'}
        </span>
      </div>
    </div>
  );
}

interface ChamadasFinalizationCardProps {
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
  onSubmit: (e: React.FormEvent, turnstileToken?: string) => void | Promise<void>;
}

export function ChamadasFinalizationCard({
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
}: ChamadasFinalizationCardProps) {
  const [turnstileToken, setTurnstileToken] = React.useState<string | undefined>();
  const [turnstileReset, setTurnstileReset] = React.useState(0);

  const handleFormSubmit = async (event: React.FormEvent) => {
    await onSubmit(event, turnstileToken);
    setTurnstileToken(undefined);
    setTurnstileReset((value) => value + 1);
  };

  return (
    <div
      id="chamadas-finalizacao"
      className="h-full scroll-mt-28 rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center gap-3.5 pb-5 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl bg-[#661C30]/15 border border-[#7A293D]/30 flex items-center justify-center text-[#F5EEE9] shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#F5EEE9]/80 block">
              Identificação &amp; Reserva
            </span>
            <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
              Seus Dados &amp; Confirmação
            </h2>
            <p className="text-zinc-400 text-xs font-light mt-0.5">
              O link da sala privativa e o voucher serão enviados por e-mail após a confirmação do Pix
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="chamada-name" className="block text-xs font-medium text-zinc-200">
                Seu nome ou apelido <span className="text-[#F5EEE9]/80">*</span>
              </label>
              <input
                id="chamada-name"
                type="text"
                autoComplete="nickname"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Como prefere ser chamado(a)?"
                className="w-full min-h-11 rounded-xl bg-black/60 border border-white/10 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="chamada-contact" className="block text-xs font-medium text-zinc-200">
                WhatsApp ou Telegram para alinhamento <span className="text-[#F5EEE9]/80">*</span>
              </label>
              <input
                id="chamada-contact"
                type="text"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(11) 99999-9999 ou @usuario"
                className="w-full min-h-11 rounded-xl bg-black/60 border border-white/10 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="chamada-email" className="block text-xs font-medium text-zinc-200">
                E-mail para envio da sala privativa <span className="text-[#F5EEE9]/80">*</span>
              </label>
              <input
                id="chamada-email"
                type="email"
                autoComplete="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full min-h-11 rounded-xl bg-black/60 border border-white/10 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="chamada-notes" className="block text-xs font-medium text-zinc-200">
                Observações ou preferências (opcional)
              </label>
              <input
                id="chamada-notes"
                type="text"
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Algo que queira adiantar para a Nua..."
                className="w-full min-h-11 rounded-xl bg-black/60 border border-white/10 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors"
              />
            </div>
          </div>

          {/* Termos e Condições */}
          <label className="flex min-h-11 items-start gap-2.5 cursor-pointer py-1.5 px-1 rounded-xl focus-within:ring-2 focus-within:ring-[#90364B] focus-within:ring-offset-2 focus-within:ring-offset-[#08080c]">
            <input
              type="checkbox"
              required
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                termsAccepted
                  ? 'border-[#90364B] bg-[#661C30] text-white'
                  : 'border-white/30 bg-black/50'
              }`}
            >
              {termsAccepted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </span>
            <span className="text-xs text-zinc-300 leading-snug font-light">
              Li e concordo com os{' '}
              <a
                href="/termos"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#F5EEE9]/80 underline underline-offset-2 hover:text-[#F5EEE9] transition-colors"
              >
                Termos de Uso
              </a>{' '}
              e a{' '}
              <a
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#F5EEE9]/80 underline underline-offset-2 hover:text-[#F5EEE9] transition-colors"
              >
                Política de Privacidade
              </a>
              , e compreendo que o extrato bancário do Pix é neutro e discreto.
            </span>
          </label>

          {submitError && (
            <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <TurnstileWidget
            action="chamada_booking"
            resetSignal={turnstileReset}
            onToken={setTurnstileToken}
          />

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#90364B] shrink-0" />
              <span>Pagamento Instantâneo &bull; Sigilo Privado</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedTime || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
              className="w-full sm:w-auto sm:min-w-[240px] min-h-[50px] px-7 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] disabled:opacity-45 text-[#F5EEE9] font-bold text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
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
          </div>

          {!selectedTime && (
            <p className="text-right text-[11px] text-zinc-400">
              Selecione um horário disponível acima para habilitar a geração do Pix.
            </p>
          )}
          {selectedTime && TURNSTILE_SITE_KEY && !turnstileToken && (
            <p className="text-right text-[11px] text-zinc-400">
              Conclua a verificação de segurança para continuar.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
