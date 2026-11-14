'use client';

import React from 'react';
import {
  Bot,
  Cpu,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { PageHeader } from './ui/AdminPrimitives';

export function BetaIaModule() {
  return (
    <div className="space-y-5 select-none text-white">
      <PageHeader
        title="Assistente Nua IA"
        subtitle="Use a Nua IA para consultar o painel, encontrar funções e preparar alterações. Ações sensíveis sempre pedem sua confirmação."
      />

      {/* Visão Geral da Arquitetura da IA */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#14161d] border border-white/[0.06] relative overflow-hidden">
        <div className="max-w-3xl space-y-2.5">
          <h2 className="font-serif text-lg sm:text-xl text-white font-normal tracking-wide">
            Como funciona a Nua IA?
          </h2>

          <p className="text-xs sm:text-sm text-zinc-300 font-light leading-relaxed">
            A Nua IA é um co-piloto projetado para apoiar no gerenciamento do seu painel administrativo, auxiliando na curadoria de textos para packs, na triagem de pedidos personalizados e na organização de solicitações.
          </p>
        </div>

        {/* Pilares Planejados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/[0.06]">
          <div className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-white">Triagem de Personalizados</h3>
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              Interpretação e organização automática dos briefings enviados por fãs para ensaios e vídeos sob medida.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-white">Assistente de Copywriting</h3>
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              Sugestões refinadas de títulos, biografias e descrições para novos packs, alinhadas à estética editorial de luxo.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-white">Privacidade e Sigilo</h3>
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              Processamento restrito em ambiente isolado, sem compartilhamento de dados ou mídias com terceiros.
            </p>
          </div>
        </div>
      </div>

      {/* Nota de Uso */}
      <div className="p-4 rounded-xl bg-[#14161d] border border-white/[0.06] flex items-center gap-3 text-xs text-zinc-400 font-light">
        <Info className="w-4 h-4 text-zinc-500 shrink-0" />
        <span>
          Dica: você pode perguntar “onde troco as fotos da galeria?” ou pedir uma alteração. A IA explica o caminho e mostra uma confirmação antes de ações sensíveis.
        </span>
      </div>
    </div>
  );
}
