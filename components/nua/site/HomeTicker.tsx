'use client';

import React from 'react';

const TICKER_ITEMS = [
  'Ensaios autorais',
  'Vídeos em 4K',
  'Liberação imediata',
  'Extrato discreto',
  'Produção independente',
  'Acesso vitalício no cofre',
];

export function HomeTicker() {
  return (
    <div className="w-full bg-[#050507] border-y border-[#f4a7b9]/15 py-3 overflow-hidden select-none relative z-20">
      <div className="flex whitespace-nowrap animate-marquee">
        {[...Array(4)].map((_, loopIdx) => (
          <div key={loopIdx} className="flex items-center gap-6 shrink-0 pr-6">
            {TICKER_ITEMS.map((item, itemIdx) => (
              <React.Fragment key={`${loopIdx}-${itemIdx}`}>
                <span className="font-serif italic text-xs sm:text-sm text-[#f4a7b9]/90 tracking-wide font-medium">
                  {item}
                </span>
                <span className="text-[#f4a7b9]/40 text-[10px] font-mono">•</span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
