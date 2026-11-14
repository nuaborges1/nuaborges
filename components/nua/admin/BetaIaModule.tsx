'use client';

import React from 'react';
import {
  Brain,
  Bot,
  Cpu,
  AlertCircle,
  Clock,
  ShieldCheck,
  Flame,
  Zap,
  Info,
  CheckCircle2,
} from 'lucide-react';

export function BetaIaModule() {
  return (
    <div className="space-y-6 select-none text-white max-w-5xl">
      {/* Banner de Status e Uso */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Assistente disponível</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider">
                IA DO PAINEL
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/90 font-light mt-0.5">
              Use a Nua IA para consultar o painel, encontrar funções e preparar alterações. Ações sensíveis sempre pedem sua confirmação.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>Protegida por confirmação</span>
        </div>
      </div>

      {/* Visão Geral da Arquitetura da IA */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#171821] border border-white/[0.06] relative overflow-hidden">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 text-[#f4a7b9] text-[10px] font-mono uppercase tracking-wider">
            <Brain className="w-3.5 h-3.5" />
            <span>Inteligência Artificial &amp; Automação Editorial</span>
          </div>

          <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-wide">
            O que é a IA Nua Borges?
          </h2>

          <p className="text-xs sm:text-sm text-zinc-300 font-light leading-relaxed">
            A IA Nua Borges é um conjunto de modelos inteligentes projetados para apoiar a criadora no gerenciamento de seu ecossistema digital. A ferramenta atuará como um co-piloto nos bastidores, auxiliando na curadoria de textos poéticos e sensuais para novos packs, na triagem de pedidos personalizados sob medida e na organização de solicitações de fãs VIPs.
          </p>
        </div>

        {/* Pilares Planejados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/[0.06]">
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9]">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-white">Triagem de Personalizados</h3>
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              Interpretação e organização automática dos briefings enviados por fãs para ensaios e vídeos sob medida.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-white">Assistente de Copywriting</h3>
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              Sugestões refinadas de títulos, biografias e descrições para novos packs, alinhadas à estética editorial de luxo.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
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
      <div className="p-4 rounded-xl bg-black/30 border border-white/[0.05] flex items-center gap-3 text-xs text-zinc-400 font-light">
        <Info className="w-4 h-4 text-zinc-500 shrink-0" />
        <span>
          Dica: você pode perguntar “onde troco as fotos da galeria?” ou pedir uma alteração. A IA explica o caminho e mostra uma confirmação antes de ações sensíveis.
        </span>
      </div>
    </div>
  );
}
