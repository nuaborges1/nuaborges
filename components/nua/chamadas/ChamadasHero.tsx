import React from 'react';
import Link from 'next/link';
import { Video } from 'lucide-react';

export function ChamadasHero() {
  return (
    <>
      {/* Breadcrumb discreto */}
      <nav aria-label="Navegação estrutural" className="mb-6 sm:mb-8">
        <ol className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-500 font-light">
          <li>
            <Link href="/" className="hover:text-zinc-300 transition-colors">
              Início
            </Link>
          </li>
          <li className="text-zinc-700">/</li>
          <li className="text-[#f4a7b9] font-medium">Chamadas por Vídeo</li>
        </ol>
      </nav>

      {/* Hero Section da Página */}
      <div className="max-w-3xl mb-12 sm:mb-16">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 text-[#f4a7b9] text-[10px] font-semibold tracking-[0.24em] uppercase mb-3">
          <Video className="w-3 h-3" />
          <span>EXPERIÊNCIA PRIVATIVA &amp; AO VIVO</span>
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-[1.08] mb-4">
          Encontros em Vídeo Privativo com Lua Borges
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base font-light leading-relaxed">
          Tempo de qualidade, intimidade autoral e conexão profunda em sala privativa segura.
          Escolha a modalidade, selecione data e horário de sua preferência no calendário oficial abaixo.
        </p>
      </div>
    </>
  );
}
