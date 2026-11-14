'use client';

import React from 'react';
import {
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  PersonalizadosSettings,
  DeliveryChannel,
  calculateOrderPrice,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';

interface PersonalizadosOrderSummaryCardProps {
  settings: PersonalizadosSettings;
  priceDetails: ReturnType<typeof calculateOrderPrice>;
  photoCount: number;
  mentionName: boolean;
  express24h: boolean;
  deliveryChannel: DeliveryChannel;
  clientName: string;
  setClientName: (v: string) => void;
  clientContact: string;
  setClientContact: (v: string) => void;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function PersonalizadosOrderSummaryCard({
  settings,
  priceDetails,
  photoCount,
  mentionName,
  express24h,
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
}: PersonalizadosOrderSummaryCardProps) {
  return (
    <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-5">
      <div className="rounded-[28px] bg-gradient-to-b from-[#0f0e14] to-[#07070a] border border-[#f4a7b9]/30 p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#f4a7b9]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="border-b border-white/[0.08] pb-4 mb-5">
          <span className="text-[10px] uppercase font-semibold tracking-widest text-[#f4a7b9] block">
            Resumo do Pedido
          </span>
          <h3 className="text-xl font-serif text-white mt-1">Sua Comanda Autoral</h3>
        </div>

        {/* Itens da Comanda */}
        <div className="space-y-2.5 text-xs text-zinc-300 font-light mb-6">
          <div className="flex justify-between items-center py-1">
            <span>{photoCount} Fotos Exclusivas</span>
            <span className="font-mono text-white font-medium">
              {formatCurrencyBrl(priceDetails.photosPrice)}
            </span>
          </div>

          {priceDetails.videoPrice > 0 && (
            <div className="flex justify-between items-center py-1">
              <span>Vídeo ({priceDetails.selectedVideoOption?.label})</span>
              <span className="font-mono text-white font-medium">
                {formatCurrencyBrl(priceDetails.videoPrice)}
              </span>
            </div>
          )}

          {mentionName && (
            <div className="flex justify-between items-center py-1">
              <span>Dizer meu nome</span>
              <span className="font-mono text-white font-medium">
                {formatCurrencyBrl(settings.mentionNamePrice)}
              </span>
            </div>
          )}

          {express24h && (
            <div className="flex justify-between items-center py-1 text-amber-300">
              <span>⚡ Prioridade Express (24h)</span>
              <span className="font-mono font-medium">
                {formatCurrencyBrl(settings.express24hPrice)}
              </span>
            </div>
          )}

          <div className="border-t border-white/[0.08] pt-3 flex justify-between items-baseline">
            <span className="text-sm font-medium text-white">Total a Pagar:</span>
            <span className="text-2xl font-bold font-mono text-[#f4a7b9]">
              {formatCurrencyBrl(priceDetails.total)}
            </span>
          </div>
        </div>

        {/* Prazo Prometido */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5 text-xs text-zinc-400 mb-6">
          <Clock className="w-4 h-4 text-[#f4a7b9] shrink-0" />
          <span>
            {express24h ? 'Entrega prioritária em até 24 horas!' : settings.estimatedDeliveryText}
          </span>
        </div>

        {/* Formulário do Cliente */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
              Seu Nome ou Apelido *
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Como deseja ser chamado?"
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
              {deliveryChannel === 'telegram'
                ? 'Seu @Username ou Celular do Telegram *'
                : 'E-mail para Receber o Código do Cofre *'}
            </label>
            <input
              type="text"
              required
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
              placeholder={
                deliveryChannel === 'telegram'
                  ? '@seu_usuario'
                  : 'seu@email.com'
              }
              className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer shrink-0"
            />
            <span className="text-[11px] text-zinc-400 leading-snug">
              Concordo com os limites de gravação e entendo que o extrato do banco é 100% neutro e discreto.
            </span>
          </label>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || priceDetails.total <= 0}
            className="w-full min-h-[48px] rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] disabled:opacity-50 text-black font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(244,167,185,0.3)] active:scale-98 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando Pix...</span>
              </>
            ) : (
              <>
                <span>Gerar Pix &amp; Encomendar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            Pagamento Instantâneo &bull; Discrição Absoluta
          </span>
        </div>
      </div>
    </div>
  );
}
