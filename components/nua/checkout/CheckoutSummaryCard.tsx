/* Vinho maduro / Nua Borges */
import React from 'react';
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
}

export function CheckoutSummaryCard({
  activeContext,
  displayAmount,
  paymentStatus,
  buyerEmail,
  emailError,
  onBuyerEmailChange,
}: CheckoutSummaryCardProps) {
  return (
    <>
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-4">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 shrink-0 flex items-center justify-center border border-white/[0.08]">
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
              <span className="px-2 py-0.5 rounded-full bg-[#661C30]/25 text-[#90364B] text-[9px] font-semibold uppercase tracking-wider">
                {activeContext.badge}
              </span>
            )}
            {activeContext.type && (
              <span className="text-[10px] text-zinc-500 font-mono uppercase">
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
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
            Total
          </span>
          <span className="font-serif text-lg sm:text-xl text-[#90364B] font-semibold">
            R$ {displayAmount.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      {activeContext.details && activeContext.details.length > 0 && (
        <div className="flex flex-col gap-1.5 text-[11px] p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          {activeContext.details.map((d, i) => (
            <div key={i} className="flex justify-between items-center py-0.5 px-1 gap-2">
              <span className="text-zinc-500 shrink-0">{d.label}:</span>
              <span className="text-zinc-300 font-medium text-right leading-snug">{d.value}</span>
            </div>
          ))}
        </div>
      )}

      {paymentStatus === 'pending' && (
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2 text-left">
          <label className="block text-zinc-300 text-[11px] font-medium flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-[#90364B]" />
            <span>Seu E-mail (para liberação e recibo):</span>
          </label>
          <input
            type="email"
            value={buyerEmail}
            onChange={(e) => onBuyerEmailChange(e.target.value)}
            placeholder="seu.email@exemplo.com"
            className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono outline-none focus:border-[#90364B]"
          />
          {emailError && (
            <p className="text-red-400 text-[11px]">{emailError}</p>
          )}
        </div>
      )}
    </>
  );
}
