/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { XCircle, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useCopy } from '@/lib/copy';

interface CheckoutStatusScreenProps {
  status: 'rejected' | 'expired';
  nextHref: string;
  nextLabel: string;
}

export function CheckoutStatusScreens({ status, nextHref, nextLabel }: CheckoutStatusScreenProps) {
  const { copy } = useCopy();
  if (status === 'rejected') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
          <XCircle className="w-7 h-7" />
        </div>
        <div>
          <h4 className="font-serif text-xl text-white">{copy.checkout.status.rejectedTitle}</h4>
          <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto font-light leading-relaxed">
            {copy.checkout.status.rejectedBody}
          </p>
        </div>
        <Link href={nextHref}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer border border-white/10"
        >
          <span>{nextLabel}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto">
          <Clock className="w-7 h-7" />
        </div>
        <div>
          <h4 className="font-serif text-xl text-white">{copy.checkout.status.expiredTitle}</h4>
          <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto font-light leading-relaxed">
            {copy.checkout.status.expiredBody}
          </p>
        </div>
        <Link href={nextHref}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer border border-white/10"
        >
          <span>{nextLabel}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return null;
}
