/* Vinho maduro / Nua Borges */
import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function AvulsoUpsellBanner() {
  return (
    <div className="mt-12 sm:mt-16 p-7 sm:p-10 rounded-[28px] bg-gradient-to-r from-[#0d0d12] via-[#09090c] to-[#0d0d12] border border-[#661C30]/40 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_16px_50px_rgba(67,19,34,0.35)]">
      <div className="text-center md:text-left">
        <span className="text-[#90364B] text-[10px] font-semibold tracking-[0.25em] uppercase block mb-1">
          ECONOMIA & ACERVO COMPLETO
        </span>
        <h3 className="font-serif text-2xl sm:text-3xl text-white">
          Deseja acesso a todas as obras sem pagar por item?
        </h3>
        <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1.5 max-w-xl">
          O Acervo VIP oferece acesso ilimitado a todos os ensaios fotográficos e vídeos íntimos semanais por uma assinatura mensal única via Privacy (PIX) ou OnlyFans.
        </p>
      </div>

      <Link
        href="/acervo"
        className="w-full md:w-auto min-h-[46px] px-8 py-3 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 shrink-0 shadow-lg"
      >
        <span>Conhecer o Acervo VIP</span>
        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
      </Link>
    </div>
  );
}
