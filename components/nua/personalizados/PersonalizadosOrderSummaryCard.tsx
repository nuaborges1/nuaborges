'use client';

import React from 'react';
import {
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Receipt,
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
    <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
      <div className="rounded-[28px] bg-[#08080c] border border-white/10 p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.95)] relative text-left">
        <div className="border-b border-white/[0.06] pb-4 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[#f4a7b9] block font-medium">
              Resumo do Pedido
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
              Comanda Sob Medida
            </h3>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f4a7b9]">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        {/* Itens da Comanda */}
        <div className="space-y-1.5 text-xs text-zinc-300 font-light mb-4">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-zinc-400">{photoCount} Fotos Exclusivas</span>
            <span className="font-mono text-zinc-200 font-medium">
              {formatCurrencyBrl(priceDetails.photosPrice)}
            </span>
          </div>

          {priceDetails.videoPrice > 0 && (
            <div className="flex justify-between items-center py-0.5">
              <span className="text-zinc-400">Vídeo ({priceDetails.selectedVideoOption?.label})</span>
              <span className="font-mono text-zinc-200 font-medium">
                {formatCurrencyBrl(priceDetails.videoPrice)}
              </span>
            </div>
          )}

          {mentionName && (
            <div className="flex justify-between items-center py-0.5">
              <span className="text-zinc-400">Dizer meu nome / dedicatória</span>
              <span className="font-mono text-zinc-200 font-medium">
                {formatCurrencyBrl(settings.mentionNamePrice)}
              </span>
            </div>
          )}

          {express24h && (
            <div className="flex justify-between items-center py-0.5 text-amber-300">
              <span className="text-amber-300/90 font-medium">Prioridade Express (24h)</span>
              <span className="font-mono font-medium">
                {formatCurrencyBrl(settings.express24hPrice)}
              </span>
            </div>
          )}

          <div className="border-t border-white/[0.08] pt-3 mt-2 flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-300">
              Total a Pagar
            </span>
            <span className="font-serif text-2xl sm:text-3xl text-[#f4a7b9] font-medium">
              {formatCurrencyBrl(priceDetails.total)}
            </span>
          </div>
        </div>

        {/* Prazo Prometido */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5 text-xs text-zinc-300 mb-4">
          <Clock className="w-3.5 h-3.5 text-[#f4a7b9] shrink-0" />
          <span className="text-[11px] text-zinc-300 leading-relaxed font-light">
            {express24h ? 'Entrega prioritária em até 24 horas úteis.' : settings.estimatedDeliveryText}
          </span>
        </div>

        {/* Formulário do Cliente */}
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-300">
              Seu nome ou apelido <span className="text-[#f4a7b9]">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Como prefere ser chamado(a)?"
              className="w-full h-10 rounded-xl bg-black/60 border border-white/10 px-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-zinc-300">
              {deliveryChannel === 'telegram'
                ? 'Seu @ de usuário no Telegram *'
                : 'E-mail para entrega do cofre *'}
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
              className="w-full h-10 rounded-xl bg-black/60 border border-white/10 px-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-1 select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-3.5 h-3.5 mt-0.5 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer shrink-0"
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
            disabled={isSubmitting || priceDetails.total <= 0}
            className="w-full min-h-[46px] rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] disabled:opacity-40 text-black font-bold text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(244,167,185,0.25)] active:scale-[0.99] cursor-pointer mt-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando Pix Seguro...</span>
              </>
            ) : (
              <>
                <span>Gerar Pix &amp; Encomendar</span>
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
