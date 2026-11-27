/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useCopy } from '@/lib/copy';

export function AvulsoUpsellBanner() {
  const { copy } = useCopy();

  return (
    <aside
      aria-label={copy.avulsos.catalogDetails.upsellAsideEyebrow}
      className="mt-10 sm:mt-12 p-6 sm:p-8 rounded-[28px] bg-[#08080c] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-5"
    >
      <div className="text-left space-y-1.5 max-w-xl">
        <span className="text-[#F5EEE9]/80 text-[10px] font-semibold tracking-[0.24em] uppercase block">
          {copy.avulsos.catalogDetails.upsellAsideEyebrow}
        </span>
        <h3 className="font-serif text-lg sm:text-xl text-[#F5EEE9] font-normal">
          {copy.avulsos.catalogDetails.upsellAsideTitle}
        </h3>
        <p className="text-zinc-400 text-xs sm:text-[13px] font-light leading-relaxed">
          {copy.avulsos.catalogDetails.upsellAsideBody}
        </p>
      </div>

      <div className="sm:border-l sm:border-white/[0.08] sm:pl-7 shrink-0 flex items-center">
        <Link
          href="/acervo"
          className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-full border border-white/15 bg-white/[0.03] hover:border-[#7A293D]/60 hover:bg-[#431322]/25 text-[#F5EEE9] text-xs font-medium tracking-wider uppercase transition-colors duration-200 inline-flex items-center justify-center gap-2 shrink-0"
        >
          <span>{copy.avulsos.catalogDetails.upsellAsideCta}</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#90364B]" />
        </Link>
      </div>
    </aside>
  );
}
