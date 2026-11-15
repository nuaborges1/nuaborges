import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { CheckCircle2, PlayCircle, ArrowRight, Copy, Check, KeyRound } from 'lucide-react';
import { UniversalCheckoutContext } from './types';

interface CheckoutApprovedScreenProps {
  activeContext: UniversalCheckoutContext;
  displayAmount: number;
  buyerEmail: string;
  purchaseToken?: string;
  accessUrl: string;
  accessButtonText: string;
  onClose: () => void;
}

export function CheckoutApprovedScreen({
  activeContext,
  displayAmount,
  buyerEmail,
  purchaseToken,
  accessUrl,
  accessButtonText,
  onClose,
}: CheckoutApprovedScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (!purchaseToken) return;
    navigator.clipboard.writeText(purchaseToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="py-6 text-center space-y-4"
    >
      <div className="w-16 h-16 rounded-full bg-[#f4a7b9]/20 border border-[#f4a7b9]/40 flex items-center justify-center text-[#f4a7b9] mx-auto shadow-[0_0_30px_rgba(244,167,185,0.3)]">
        <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
      </div>

      <div>
        <h4 className="font-serif text-2xl text-white">
          {activeContext.type === 'chamada'
            ? 'Agendamento Confirmado! ♡'
            : activeContext.type === 'personalizado'
            ? 'Encomenda Confirmada! ♡'
            : 'Acesso Desbloqueado! ♡'}
        </h4>
        <p className="text-zinc-400 text-xs mt-1.5 max-w-sm mx-auto font-light leading-relaxed">
          Seu pagamento de{' '}
          <strong className="text-white">
            R$ {displayAmount.toFixed(2).replace('.', ',')}
          </strong>{' '}
          foi confirmado com sucesso.
        </p>
      </div>

      {/* Caixa do Token de Acesso com Cópia e Aviso de Uso Único */}
      {purchaseToken && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
              <KeyRound className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Seu Token de Acesso Privativo</span>
            </div>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Uso Único
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
              <span>{copied ? 'Copiado!' : 'Copiar Token'}</span>
            </button>
          </div>

          <p className="text-amber-200/80 text-[11px] font-light leading-relaxed">
            ⚠️ <strong>Guarde bem o seu token!</strong> Ele é pessoal, intransferível e só pode ser usado <strong>uma vez</strong> para liberar a sua produção.
          </p>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center space-y-2">
        <p className="text-emerald-300 text-xs font-medium">✓ Pagamento Confirmado &amp; Acesso Liberado!</p>
        <p className="text-zinc-400 text-[11px]">
          Enviamos as instruções e o link de acesso para{' '}
          <strong className="text-white">{buyerEmail || 'seu e-mail'}</strong>.
        </p>
      </div>

      <div className="pt-3">
        <Link
          href={
            purchaseToken
              ? `${accessUrl}${accessUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(purchaseToken)}`
              : accessUrl
          }
          onClick={onClose}
          className="w-full min-h-[48px] px-6 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(244,167,185,0.3)] cursor-pointer"
        >
          <PlayCircle className="w-4 h-4" />
          <span>{accessButtonText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}
