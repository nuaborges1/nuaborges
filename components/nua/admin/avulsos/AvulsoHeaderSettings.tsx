'use client';

import React from 'react';
import { Sliders, Eye, EyeOff } from 'lucide-react';
import { SiteContent } from '@/lib/types';

interface AvulsoHeaderSettingsProps {
  avulsos: NonNullable<SiteContent['avulsos']>;
  onUpdate: (fields: Partial<NonNullable<SiteContent['avulsos']>>) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  itemsCount: number;
  activeCount: number;
  avgPrice: string;
}

export function AvulsoHeaderSettings({
  avulsos,
  onUpdate,
  isOpen,
  onToggleOpen,
  itemsCount,
  activeCount,
  avgPrice,
}: AvulsoHeaderSettingsProps) {
  return (
    <div className="bg-[#14151b] border border-white/[0.06] rounded-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleOpen}
            className="flex items-center gap-2 text-xs font-semibold text-white hover:text-[#f4a7b9] transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Configurações da Seção & Textos da Vitrine</span>
            <span className="text-[10px] text-zinc-500 font-normal">
              {isOpen ? '(Clique para recolher)' : '(Clique para expandir)'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-[#0e0f14] px-2.5 py-1 rounded-lg border border-white/10">
            <input
              type="checkbox"
              checked={avulsos.active !== false}
              onChange={(e) => onUpdate({ active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="relative w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#f4a7b9]" />
            <span className="text-[11px] font-medium text-zinc-300">
              {avulsos.active !== false ? 'Seção Ativa' : 'Seção Oculta'}
            </span>
          </label>
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
              Etiqueta Superior (Eyebrow)
            </label>
            <input
              type="text"
              value={avulsos.eyebrow || ''}
              onChange={(e) => onUpdate({ eyebrow: e.target.value })}
              placeholder="Ex: CONTEÚDOS AVULSOS"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#f4a7b9]"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
              Título Principal
            </label>
            <input
              type="text"
              value={avulsos.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Ex: Acervo Sob Demanda"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#f4a7b9]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
              Subtítulo Explicativo
            </label>
            <input
              type="text"
              value={avulsos.subtitle || ''}
              onChange={(e) => onUpdate({ subtitle: e.target.value })}
              placeholder="Ex: Escolha e adquira obras e produções unitárias..."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#f4a7b9]"
            />
          </div>
        </div>
      )}

      {/* Métricas Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-[#101116] border border-white/[0.04] rounded-lg p-3">
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block mb-0.5">
            Total de Packs
          </span>
          <span className="text-lg font-bold text-white font-sans">{itemsCount}</span>
        </div>

        <div className="bg-[#101116] border border-white/[0.04] rounded-lg p-3">
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block mb-0.5">
            Ativos no Site
          </span>
          <span className="text-lg font-bold text-emerald-400 font-sans">{activeCount}</span>
        </div>

        <div className="bg-[#101116] border border-white/[0.04] rounded-lg p-3">
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block mb-0.5">
            Preço Médio
          </span>
          <span className="text-lg font-bold text-[#f4a7b9] font-sans">{avgPrice}</span>
        </div>

        <div className="bg-[#101116] border border-white/[0.04] rounded-lg p-3">
          <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block mb-0.5">
            Exibição Pública
          </span>
          <span className={`text-xs font-semibold ${avulsos.active !== false ? 'text-emerald-400' : 'text-amber-400'}`}>
            {avulsos.active !== false ? '● Ativo' : '○ Oculto'}
          </span>
        </div>
      </div>
    </div>
  );
}
