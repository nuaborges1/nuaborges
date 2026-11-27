/* Vinho maduro / Nua Borges */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { CheckCircle2, PlayCircle, ArrowRight, Copy, Check, KeyRound, Loader2 } from 'lucide-react';
import { UniversalCheckoutContext } from './types';
import { useCopy } from '@/lib/copy';

interface CheckoutApprovedScreenProps {
  activeContext: UniversalCheckoutContext;
  displayAmount: number;
  buyerEmail: string;
  purchaseToken?: string;
  accessUrl: string;
  accessButtonText: string;
  onClose: () => void;
  isNuaIdAuthenticated?: boolean;
}

export function CheckoutApprovedScreen({
  activeContext,
  displayAmount,
  buyerEmail,
  purchaseToken,
  accessUrl,
  accessButtonText,
  onClose,
  isNuaIdAuthenticated = false,
}: CheckoutApprovedScreenProps) {
  const { copy } = useCopy();
  const [copied, setCopied] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const handleCopyToken = () => {
    if (!purchaseToken) return;
    navigator.clipboard.writeText(purchaseToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleAccess = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);

    const hasTokenAlready = /[?&]token=/.test(accessUrl);
    const finalUrl =
      purchaseToken && !hasTokenAlready
        ? `${accessUrl}${accessUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(purchaseToken)}`
        : accessUrl;

    onClose();
    router.push(finalUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-6 text-center space-y-4"
    >
      <div className="w-16 h-16 rounded-full bg-[#661C30]/25 border border-[#7A293D]/45 flex items-center justify-center text-[#90364B] mx-auto shadow-[0_0_30px_rgba(102,28,48,0.45)]">
        <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
      </div>

      <div>
        <h4 className="font-serif text-2xl text-white">
          {activeContext.type === 'chamada'
            ? copy.checkout.approved.titleChamada
            : activeContext.type === 'personalizado'
            ? copy.checkout.approved.titlePersonalizado
            : copy.checkout.approved.title}
        </h4>
        <p className="text-zinc-400 text-xs mt-1.5 max-w-sm mx-auto font-light leading-relaxed">
          {copy.checkout.approved.paidConfirmationPrefix}{' '}
          <strong className="text-white">
            R$ {displayAmount.toFixed(2).replace('.', ',')}
          </strong>{' '}
          {copy.checkout.approved.paidConfirmationSuffix}
        </p>
      </div>

      {/* Caixa do Token de Acesso apenas para compras como visitante (no NUA ID o acesso fica direto na Biblioteca) */}
      {!isNuaIdAuthenticated && purchaseToken && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
              <KeyRound className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{copy.checkout.approved.tokenHeading}</span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {copy.checkout.approved.tokenSingleUseBadge}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/70 border border-white/10 font-mono text-xs text-white">
            <span className="truncate select-all font-bold tracking-wider">{purchaseToken}</span>
            <button
              type="button"
              onClick={handleCopyToken}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-xs font-sans font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? copy.checkout.approved.tokenCopiedCta : copy.checkout.approved.tokenCopyCta}</span>
            </button>
          </div>

          <p className="text-amber-200/80 text-[11px] font-light leading-relaxed">
            {copy.checkout.approved.tokenWarningPrefix}
            <strong>{copy.checkout.approved.tokenWarningStrong}</strong>
            {copy.checkout.approved.tokenWarningMiddle}
            <strong>{copy.checkout.approved.tokenWarningOnce}</strong>
            {copy.checkout.approved.tokenWarningSuffix}
          </p>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center space-y-2">
        <p className="text-emerald-300 text-xs font-medium">{copy.checkout.approved.confirmedBanner}</p>
        <p className="text-zinc-400 text-[11px]">
          {isNuaIdAuthenticated ? (
            <>
              Este pedido já está vinculado à sua conta{' '}
              <strong className="text-white">{buyerEmail}</strong> e disponível em{' '}
              <strong className="text-white">Minha Conta</strong> (sem precisar copiar tokens).
            </>
          ) : (
            <>
              Enviamos as instruções e o link de acesso para{' '}
              <strong className="text-white">{buyerEmail || 'seu e-mail'}</strong>.
            </>
          )}
        </p>
      </div>

      {isNuaIdAuthenticated && (
        <button
          type="button"
          onClick={() => {
            onClose();
            const targetTab =
              activeContext.type === 'chamada'
                ? 'chamadas'
                : activeContext.type === 'personalizado'
                  ? 'personalizados'
                  : 'biblioteca';
            router.push(`/conta?tab=${targetTab}`);
          }}
          className="w-full min-h-[48px] py-3 px-5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] border border-white/10 text-[#F5EEE9] text-xs font-bold uppercase tracking-[0.14em] transition-colors cursor-pointer shadow-[0_4px_24px_rgba(67,19,34,0.45)]"
        >
          {activeContext.type === 'chamada'
            ? copy.checkout.approved.myAccountChamadaCta
            : activeContext.type === 'personalizado'
              ? copy.checkout.approved.myAccountPersonalizadoCta
              : copy.checkout.approved.myAccountBibliotecaCta}
        </button>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={handleAccess}
          disabled={isNavigating}
          className={
            isNuaIdAuthenticated
              ? 'w-full min-h-[44px] px-6 py-2.5 rounded-full border border-white/12 bg-white/[0.03] hover:bg-white/[0.07] text-zinc-200 hover:text-white text-xs font-medium tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85'
              : 'w-full min-h-[48px] px-6 py-3 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 cursor-pointer disabled:opacity-85'
          }
        >
          {isNavigating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>{copy.checkout.approved.navigatingLabel}</span>
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              <span>{accessButtonText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
