/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  Bot,
  Cpu,
  ShieldCheck,
  Info,
  MessageSquare,
} from 'lucide-react';
import { PageHeader } from './ui/AdminPrimitives';

export function BetaIaModule() {
  const handleOpenNay = (initialPrompt?: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('open_nua_ai', {
        detail: initialPrompt ? { initialPrompt } : {},
      })
    );
  };

  return (
    <div className="space-y-5 select-none text-white">
      <PageHeader
        title="Nay • Sua Parceira de Bastidores"
        subtitle="Converse com a Nay para consultar vendas e agenda, organizar fotos, montar packs e preparar alterações. Ações sensíveis sempre pedem sua confirmação."
        helpId="beta_ia"
        actions={
          <button
            type="button"
            onClick={() => handleOpenNay()}
            className="h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#99455E] text-white text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Conversar com a Nay</span>
          </button>
        }
      />

      {/* Visão Geral da Arquitetura da IA */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#14161d] border border-white/[0.06] relative overflow-hidden">
        <div className="max-w-3xl space-y-2.5">
          <h2 className="font-serif text-lg sm:text-xl text-white font-normal tracking-wide">
            Como a Nay cuida de você?
          </h2>

          <p className="text-xs sm:text-sm text-zinc-300 font-light leading-relaxed">
            A Nay é o seu alter-ego dos bastidores, projetada para apoiar na curadoria de fotos para packs, na organização da vitrine do site e na triagem de solicitações com segurança total.
          </p>
        </div>

        {/* Pilares Planejados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/[0.06]">
          <div className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#843C52]">
              <Bot className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-white">Triagem de Personalizados</h3>
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              Interpretação e organização automática dos pedidos enviados por fãs para ensaios e vídeos sob medida.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#843C52]">
              <Cpu className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-white">Assistente de Textos</h3>
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              Sugestões refinadas de títulos, biografias e descrições para novos packs, alinhadas ao estilo do seu site.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0c0d12] border border-white/[0.06] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#843C52]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-white">Privacidade e Sigilo</h3>
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              Tudo fica protegido e privado, sem compartilhar seus dados ou mídias com terceiros.
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
