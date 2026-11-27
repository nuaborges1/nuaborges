/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  Clock,
  Lock,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Receipt,
  UserCheck,
} from 'lucide-react';
import {
  PersonalizadosSettings,
  DeliveryChannel,
  calculateOrderPrice,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from '@/components/nua/account/TurnstileWidget';
import { useCopy } from '@/lib/copy';

interface PersonalizadosSummaryProps {
  settings: PersonalizadosSettings;
  priceDetails: ReturnType<typeof calculateOrderPrice>;
  photoCount: number;
  mentionName: boolean;
  express24h: boolean;
  deliveryChannel: DeliveryChannel;
}

export function PersonalizadosOrderSummaryCard({
  settings,
  priceDetails,
  photoCount,
  mentionName,
  express24h,
  deliveryChannel,
}: PersonalizadosSummaryProps) {
  const { copy, cms } = useCopy();
  const s = copy.personalizados.summaryCard;
  const resolvedTerms = cms(
    settings.termsAndLimitsText,
    'personalizados.termsAndLimitsText',
    settings.termsAndLimitsText
  );
  const resolvedDelivery = cms(
    settings.estimatedDeliveryText,
    'personalizados.estimatedDeliveryText',
    settings.estimatedDeliveryText
  );

  return (
    <div className="h-full flex flex-col justify-between gap-5 rounded-[28px] bg-[#08080c] border border-white/10 p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.95)] relative text-left">
      <div>
        <div className="border-b border-white/[0.06] pb-4 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[#F5EEE9]/80 block font-medium">
              {s.eyebrow}
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
              {s.heading}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#F5EEE9]/80">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        {/* Itens da Comanda */}
        <div className="space-y-2 text-xs text-zinc-300 font-light mb-5">
          <div className="flex justify-between items-center py-0.5 gap-3">
            <span className="text-zinc-400">{s.photosRow(photoCount)}</span>
            <span className="font-mono text-zinc-200 font-medium whitespace-nowrap tabular-nums">
              {formatCurrencyBrl(priceDetails.photosPrice)}
            </span>
          </div>

          {priceDetails.videoPrice > 0 && (
            <div className="flex justify-between items-center py-0.5 gap-3">
              <span className="text-zinc-400">{s.videoRow} ({priceDetails.selectedVideoOption?.label})</span>
              <span className="font-mono text-zinc-200 font-medium whitespace-nowrap tabular-nums">
                {formatCurrencyBrl(priceDetails.videoPrice)}
              </span>
            </div>
          )}

          {mentionName && (
            <div className="flex justify-between items-center py-0.5 gap-3">
              <span className="text-zinc-400">{s.mentionRow}</span>
              <span className="font-mono text-zinc-200 font-medium whitespace-nowrap tabular-nums">
                {formatCurrencyBrl(settings.mentionNamePrice)}
              </span>
            </div>
          )}

          {express24h && (
            <div className="flex justify-between items-center py-0.5 gap-3 text-[#D8B888]">
              <span className="font-medium">{s.expressRow}</span>
              <span className="font-mono font-medium whitespace-nowrap tabular-nums">
                {formatCurrencyBrl(settings.express24hPrice)}
              </span>
            </div>
          )}

          <div className="border-t border-white/[0.08] pt-3.5 mt-2.5 flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-300">
              {s.totalLabel}
            </span>
            <span className="font-serif text-2xl sm:text-3xl text-[#F5EEE9] font-medium whitespace-nowrap tabular-nums">
              {formatCurrencyBrl(priceDetails.total)}
            </span>
          </div>
        </div>

        {/* Diretrizes Éticas da Produção */}
        {resolvedTerms && (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
            <p className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#90364B] shrink-0" />
              <span>{s.guidelinesHeading}</span>
            </p>
            <p className="text-xs text-zinc-400 font-light leading-relaxed">
              {resolvedTerms}
            </p>
          </div>
        )}
      </div>

      {/* Prazo & Entrega Segura */}
      <div className="rounded-2xl bg-white/[0.025] border border-white/[0.07] divide-y divide-white/[0.06]">
        <div className="p-3 flex items-center gap-2.5 text-xs text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-[#90364B] shrink-0" />
          <span className="text-[11px] text-zinc-300 leading-relaxed font-light">
            {express24h ? s.express24hDeliveryText : resolvedDelivery}
          </span>
        </div>
        <div className="p-3 flex items-start gap-2.5 text-xs">
          <Lock className="w-3.5 h-3.5 text-[#90364B] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-zinc-200 leading-snug">
              {deliveryChannel === 'vault' ? s.vaultDeliveryTitle : s.telegramDeliveryTitle}
            </p>
            <p className="text-[10px] text-zinc-400 font-light leading-relaxed mt-0.5">
              {deliveryChannel === 'vault' ? s.vaultDeliveryDesc : s.telegramDeliveryDesc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PersonalizadosFinalizationCardProps {
  totalPrice: number;
  deliveryChannel: DeliveryChannel;
  clientName: string;
  setClientName: (v: string) => void;
  clientContact: string;
  setClientContact: (v: string) => void;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent, turnstileToken?: string) => void | Promise<void>;
}

export function PersonalizadosFinalizationCard({
  totalPrice,
  deliveryChannel,
  clientName,
  setClientName,
  clientContact,
  setClientContact,
  termsAccepted,
  setTermsAccepted,
  submitError,
  isSubmitting,
  onSubmit,
}: PersonalizadosFinalizationCardProps) {
  const { copy } = useCopy();
  const s = copy.personalizados.summaryCard;
  const [turnstileToken, setTurnstileToken] = React.useState<string | undefined>();
  const [turnstileReset, setTurnstileReset] = React.useState(0);

  const handleFormSubmit = async (event: React.FormEvent) => {
    await onSubmit(event, turnstileToken);
    setTurnstileToken(undefined);
    setTurnstileReset((value) => value + 1);
  };

  return (
    <div
      id="personalizados-finalizacao"
      className="h-full scroll-mt-28 rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.85)] transition-all duration-300 text-left flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center gap-3.5 pb-5 border-b border-white/[0.06]">
          <div className="w-10 h-10 rounded-xl bg-[#661C30]/15 border border-[#7A293D]/30 flex items-center justify-center text-[#F5EEE9] shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#F5EEE9]/80 block">
              {s.clientSectionEyebrow}
            </span>
            <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
              {s.clientSectionHeading}
            </h2>
            <p className="text-zinc-400 text-xs font-light mt-0.5">
              {s.clientSectionSubtitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="personalizado-name" className="block text-xs font-medium text-zinc-200">
                {s.nameLabel} <span className="text-[#F5EEE9]/80">*</span>
              </label>
              <input
                id="personalizado-name"
                type="text"
                autoComplete="nickname"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={s.namePlaceholder}
                className="w-full min-h-11 rounded-xl bg-black/60 border border-white/10 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="personalizado-delivery-contact" className="block text-xs font-medium text-zinc-200">
                {deliveryChannel === 'telegram' ? s.contactLabelTelegram : s.contactLabel}{' '}
                <span className="text-[#F5EEE9]/80">*</span>
              </label>
              <input
                id="personalizado-delivery-contact"
                type={deliveryChannel === 'vault' ? 'email' : 'text'}
                autoComplete={deliveryChannel === 'vault' ? 'email' : 'off'}
                inputMode={deliveryChannel === 'vault' ? 'email' : 'text'}
                required
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder={deliveryChannel === 'telegram' ? s.contactPlaceholderTelegram : s.contactPlaceholderVault}
                className="w-full min-h-11 rounded-xl bg-black/60 border border-white/10 px-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors"
              />
            </div>
          </div>

          {deliveryChannel === 'vault' && (
            <p className="text-[11px] leading-relaxed text-zinc-400">
              {s.vaultEmailHint}
            </p>
          )}

          <label className="flex min-h-11 items-start gap-2.5 cursor-pointer py-1.5 px-1 rounded-xl focus-within:ring-2 focus-within:ring-[#90364B] focus-within:ring-offset-2 focus-within:ring-offset-[#08080c]">
            <input
              type="checkbox"
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
              {s.termsSuffix}
            </span>
          </label>

          {submitError && (
            <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <TurnstileWidget
            action="personalizado_checkout"
            resetSignal={turnstileReset}
            onToken={setTurnstileToken}
          />

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#90364B] shrink-0" />
              <span>{s.privacyBadge}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || totalPrice <= 0 || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
              className="w-full sm:w-auto sm:min-w-[240px] min-h-[50px] px-7 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] disabled:opacity-45 text-[#F5EEE9] font-bold text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#90364B]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{s.submitting}</span>
                </>
              ) : (
                <>
                  <span>{s.submitCta}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {TURNSTILE_SITE_KEY && !turnstileToken && (
            <p className="text-right text-[11px] text-zinc-400">Conclua a verificação de segurança para continuar.</p>
          )}
        </form>
      </div>
    </div>
  );
}
