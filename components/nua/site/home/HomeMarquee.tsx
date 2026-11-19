/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';

const PHRASES = [
  'Ensaios autorais',
  'Vídeos em 4K',
  'Liberação imediata',
  'Extrato discreto',
  'Produção independente',
  'Deixa de vergonha',
];

function Row({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div
      aria-hidden={ariaHidden}
      className="animate-gallery-marquee flex shrink-0 items-center gap-10 pr-10"
      style={{ ['--marquee-duration' as string]: '38s' }}
    >
      {PHRASES.map((phrase) => (
        <span key={phrase} className="flex items-center gap-10 whitespace-nowrap">
          <span className="font-serif italic text-lg sm:text-xl text-zinc-300/80">{phrase}</span>
          <span className="w-1 h-1 rounded-full bg-[#90364B]/70" />
        </span>
      ))}
    </div>
  );
}

/** Faixa contínua de tom de marca — transição entre a Hero e o conteúdo. */
export function HomeMarquee() {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] bg-[#050506] py-5 select-none">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-[#050506] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-[#050506] to-transparent z-10" />
      <div className="flex w-max">
        <Row />
        <Row ariaHidden />
      </div>
    </div>
  );
}
