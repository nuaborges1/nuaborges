/* Vinho maduro / Nua Borges */
import React, { useId } from 'react';
import Image from 'next/image';
import { Video, Camera, Crown, Lock, Mail } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';
import { UniversalCheckoutContext } from './types';

interface CheckoutSummaryCardProps {
  activeContext: UniversalCheckoutContext;
  displayAmount: number;
  paymentStatus: string;
  buyerEmail: string;
  emailError: string | null;
  onBuyerEmailChange: (email: string) => void;
  hideGuestEmailInput?: boolean;
  emailSubmitted?: boolean;
  isSavingEmail?: boolean;
  showSaveEmailButton?: boolean;
  onSaveBuyerEmail?: () => void;
}

export function CheckoutSummaryCard({
  activeContext,
  displayAmount,
  paymentStatus,
  buyerEmail,
  emailError,
  onBuyerEmailChange,
  hideGuestEmailInput = false,
  emailSubmitted = false,
  isSavingEmail = false,
  showSaveEmailButton = false,
  onSaveBuyerEmail,
}: CheckoutSummaryCardProps) {
  const emailId = useId();
  return (
    <>
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 sm:gap-4">
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-zinc-900 shrink-0 flex items-center justify-center border border-white/[0.08]">
          {activeContext.imageUrl ? (
            <Image
              src={resolveMediaUrl(activeContext.imageUrl, 'thumb')}
              alt={activeContext.title}
              fill
              className="object-cover"
            />
          ) : activeContext.type === 'chamada' ? (
            <Video className="w-7 h-7 text-[#90364B]" />
          ) : activeContext.type === 'personalizado' ? (
            <Camera className="w-7 h-7 text-[#90364B]" />
          ) : activeContext.type === 'vip' ? (
            <Crown className="w-7 h-7 text-[#90364B]" />
          ) : (
            <Lock className="w-7 h-7 text-[#90364B]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {activeContext.badge && (
              <span className="px-2 py-0.5 rounded-full bg-[#661C30]/25 text-[#C97A8D] text-[9px] font-semibold uppercase tracking-wider">
                {activeContext.badge}
              </span>
            )}
            {activeContext.type && (
              <span className="text-[10px] text-zinc-400 font-mono uppercase">
                {activeContext.type === 'avulso' ? 'PACK / CONTEÚDO EXCLUSIVO' : activeContext.type}
              </span>
            )}
          </div>
          <h4 className="text-white text-sm font-serif font-medium truncate">
            {activeContext.title}
          </h4>
          {activeContext.subtitle && (
            <span className="text-[11px] text-zinc-400 font-light block truncate">
              {activeContext.subtitle}
            </span>
          )}
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block">
            Total
          </span>
          <span className="font-serif text-lg sm:text-xl text-[#F5EEE9] font-semibold">
            R$ {displayAmount.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      {activeContext.details && activeContext.details.length > 0 && (
        <div className="flex flex-col gap-1.5 text-[11px] p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          {activeContext.details.map((d, i) => (
            <div key={i} className="flex justify-between items-center py-0.5 px-1 gap-2">
              <span className="text-zinc-400 shrink-0">{d.label}:</span>
              <span className="text-zinc-200 font-medium text-right leading-snug">{d.value}</span>
            </div>
          ))}
        </div>
      )}

      {paymentStatus === 'pending' && !hideGuestEmailInput && (
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2 text-left">
          <label htmlFor={emailId} className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
            <Mail className="w-3.5 h-3.5 text-[#90364B]" />
            <span>E-mail para receber o acesso</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              value={buyerEmail}
              onChange={(e) => onBuyerEmailChange(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="flex-1 min-h-[44px] bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-base sm:text-xs font-mono outline-none focus:border-[#90364B]"
            />
            {showSaveEmailButton && onSaveBuyerEmail && (
              <button
                type="button"
                disabled={isSavingEmail}
                onClick={onSaveBuyerEmail}
                className="min-h-[44px] px-4 rounded-xl bg-[#661C30] hover:bg-[#7A293D] border border-white/10 text-[#F5EEE9] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {isSavingEmail ? 'Salvando...' : emailSubmitted ? 'Salvo' : 'Salvar e-mail'}
              </button>
            )}
          </div>
          {emailSubmitted && (
            <p className="text-emerald-400 text-[11px]">
              E-mail vinculado ao pedido. O link de acesso será enviado automaticamente após o pagamento.
            </p>
          )}
          {emailError && (
            <p className="text-red-400 text-[11px]">{emailError}</p>
          )}
        </div>
      )}
    </>
  );
}
