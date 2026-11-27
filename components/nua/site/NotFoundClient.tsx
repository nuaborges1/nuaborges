/* Vinho maduro / Nua Borges */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Globe, LayoutDashboard } from 'lucide-react';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { CHAMADAS_PUBLIC_ENABLED } from '@/lib/featureFlags';
import { useCopy } from '@/lib/copy';

export function NotFoundClient() {
  const { copy } = useCopy();
  const pathname = usePathname();
  const [isAdminPath, setIsAdminPath] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdminPath(
        Boolean(pathname?.startsWith('/admin')) ||
        Boolean(window.location.pathname.startsWith('/admin'))
      );
    }
  }, [pathname]);

  if (isAdminPath) {
    return (
      <div className="relative min-h-screen bg-[#09090c] text-white flex flex-col items-center justify-center px-4 sm:px-6 py-12 text-center select-none overflow-hidden">
        {/* Glow ambiental de fundo */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] bg-[#661C30]/[0.04] rounded-full blur-[140px] pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center max-w-lg w-full">
          <div className="w-14 h-14 rounded-2xl bg-[#661C30]/20 border border-[#7A293D]/40 flex items-center justify-center text-[#90364B] mb-5 shadow-lg shadow-[#661C30]/20">
            <LayoutDashboard className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#90364B]" />
            <span className="text-[#90364B] text-[10px] font-semibold tracking-[0.24em] uppercase font-mono">
              PAINEL ADMINISTRATIVO
            </span>
          </div>

          <div className="font-serif text-6xl sm:text-7xl text-white/20 tabular-nums leading-none tracking-tight mb-3">
            404
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-white font-normal tracking-tight leading-snug mb-3">
            Página não encontrada no Painel
          </h1>

          <p className="text-zinc-400 text-xs sm:text-sm font-light max-w-sm mb-8 leading-relaxed">
            O módulo ou seção solicitada não foi encontrada ou foi movida. Verifique a URL ou retorne ao início da gestão.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <Link
              href="/admin"
              className="w-full sm:w-auto h-11 px-6 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Voltar ao Painel Geral</span>
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto h-11 px-6 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>Ver Site Público</span>
            </Link>
          </div>
        </div>

        {/* Rodapé discreto */}
        <div className="absolute bottom-6 left-0 right-0 text-center text-zinc-600 text-[11px] font-mono tracking-wider">
          NUA BORGES CMS &bull; AMBIENTE SEGURO
        </div>
      </div>
    );
  }

  // Visual 404 para o Site Público (Editorial, Elegante, Vinho Maduro)
  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 sm:px-6 py-16 text-center overflow-hidden font-sans">
      {/* Fundo editorial unificado */}
      <PublicBackground />

      <div className="relative z-10 flex flex-col items-center max-w-xl w-full">
        {/* Selo minimalista */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7A293D]" />
          <span className="text-[#F5EEE9]/80 text-[10px] font-medium tracking-[0.28em] uppercase font-mono">
            {copy.notFound.badge}
          </span>
        </div>

        {/* Numeral 404 Editorial */}
        <div className="font-serif text-7xl sm:text-8xl md:text-9xl text-white/15 tabular-nums leading-none tracking-tighter mb-4 font-light">
          404
        </div>

        {/* Título de Impacto */}
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white font-normal tracking-tight leading-tight mb-4">
          {copy.notFound.title}
        </h1>

        {/* Descrição acolhedora */}
        <p className="text-zinc-400 text-sm sm:text-base font-light max-w-md mb-10 leading-relaxed">
          {copy.notFound.description}
        </p>

        {/* Ações Elegantes */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          <Link
            href="/"
            className="w-full sm:w-auto min-h-[46px] px-8 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] font-bold text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{copy.notFound.backHomeCta}</span>
          </Link>

          <Link
            href={CHAMADAS_PUBLIC_ENABLED ? '/chamadas' : '/acervo'}
            className="w-full sm:w-auto min-h-[46px] px-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{CHAMADAS_PUBLIC_ENABLED ? copy.notFound.secondaryChamadasCta : copy.notFound.secondaryAcervoCta}</span>
          </Link>
        </div>
      </div>

      {/* Assinatura no Rodapé */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-zinc-600 text-[10px] font-mono tracking-[0.2em] uppercase">
        {copy.notFound.footerNote}
      </div>
    </div>
  );
}
