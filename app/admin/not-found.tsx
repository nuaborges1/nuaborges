'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, ArrowLeft, Globe } from 'lucide-react';

export default function AdminNotFound() {
  return (
    <div className="min-h-screen bg-[#09090c] text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] bg-[#f4a7b9]/[0.035] rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
        <div className="w-14 h-14 rounded-2xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 flex items-center justify-center text-[#f4a7b9] mb-5 shadow-lg shadow-[#f4a7b9]/10">
          <LayoutDashboard className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9]" />
          <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-[0.24em] uppercase font-mono">
            PAINEL ADMINISTRATIVO
          </span>
        </div>

        <div className="font-serif text-6xl sm:text-7xl text-white/20 tabular-nums leading-none tracking-tight mb-3">
          404
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl text-white font-normal tracking-tight mb-3">
          Página não encontrada no Painel
        </h1>

        <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed max-w-sm sm:max-w-md mb-8">
          O módulo ou recurso administrativo que você tentou acessar não foi localizado ou foi reorganizado no sistema.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Link
            href="/admin"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_24px_rgba(244,167,185,0.25)] min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Painel Administrativo</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-3 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/[0.03] text-zinc-300 hover:text-white text-xs uppercase tracking-wider transition text-center min-h-[44px] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Ir ao Site Público</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
