import React from 'react';
import { CreditCard, Lock, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

interface CheckoutCardScreenProps {
  displayAmount: number;
  cardError: string | null;
  isRedirectingToCard: boolean;
  onStartCardCheckout: () => void;
}

export function CheckoutCardScreen({
  displayAmount,
  cardError,
  isRedirectingToCard,
  onStartCardCheckout,
}: CheckoutCardScreenProps) {
  return (
    <div className="space-y-4 py-1">
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 flex items-center justify-center text-[#f4a7b9] mx-auto">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-serif text-base text-white font-medium">Cartão de Crédito & Carteiras Digitais</h4>
          <p className="text-zinc-400 text-xs mt-1 font-light leading-relaxed max-w-xs mx-auto">
            Processamento seguro e criptografado de ponta a ponta oficial da Stripe.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[10px] text-zinc-300 font-medium">
          <span className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/[0.08]">Visa</span>
          <span className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/[0.08]">Mastercard</span>
          <span className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/[0.08]">Elo</span>
          <span className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/[0.08]">Hipercard</span>
          <span className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/[0.08]">Apple Pay</span>
          <span className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/[0.08]">Google Pay</span>
        </div>

        {cardError && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200">
            {cardError}
          </div>
        )}

        <button
          type="button"
          onClick={onStartCardCheckout}
          disabled={isRedirectingToCard}
          className="w-full min-h-[48px] py-3 px-6 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] active:scale-[0.99] text-black text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_24px_rgba(244,167,185,0.3)] disabled:opacity-50"
        >
          {isRedirectingToCard ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Iniciando Checkout Seguro...</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Pagar R$ {displayAmount.toFixed(2).replace('.', ',')} com Cartão</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-light">
          <ShieldCheck className="w-3.5 h-3.5 text-[#f4a7b9]" />
          <span>Ambiente seguro certificado Stripe Checkout</span>
        </div>
      </div>
    </div>
  );
}
