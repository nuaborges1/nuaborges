'use client';

import React from 'react';
import { Sliders, ChevronDown } from 'lucide-react';
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
    <div className="bg-[#14161d] border border-white/[0.06] rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleOpen}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-200 hover:text-white transition cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#f4a7b9]" />
          <span>Título e textos da vitrine de packs no site</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-400">
          <span>
            <strong className="text-white">{activeCount}</strong> de {itemsCount} ativos · Preço médio{' '}
            <strong className="text-[#f4a7b9]">{avgPrice}</strong>
          </span>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-[#0e0f14] px-2.5 py-1 rounded-lg border border-white/10">
            <input
              type="checkbox"
              checked={avulsos.active !== false}
              onChange={(e) => onUpdate({ active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="relative w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#f4a7b9]" />
            <span className="text-[11px] font-medium text-zinc-300">
              {avulsos.active !== false ? 'Vitrine visível no site' : 'Vitrine oculta'}
            </span>
          </label>
        </div>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-white/[0.06]">
          <div>
            <label className="block text-zinc-300 text-xs font-medium mb-1">
              Etiqueta superior
            </label>
            <input
              type="text"
              value={avulsos.eyebrow || ''}
              onChange={(e) => onUpdate({ eyebrow: e.target.value })}
              placeholder="Ex: CONTEÚDOS AVULSOS"
              className="w-full h-9 bg-[#0e0f14] border border-white/10 rounded-lg px-3 text-white text-xs outline-none focus:border-[#f4a7b9]"
            />
          </div>

          <div>
            <label className="block text-zinc-300 text-xs font-medium mb-1">
              Título principal da vitrine
            </label>
            <input
              type="text"
              value={avulsos.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Ex: Acervo Sob Demanda"
              className="w-full h-9 bg-[#0e0f14] border border-white/10 rounded-lg px-3 text-white text-xs outline-none focus:border-[#f4a7b9]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-300 text-xs font-medium mb-1">
              Subtítulo explicativo
            </label>
            <input
              type="text"
              value={avulsos.subtitle || ''}
              onChange={(e) => onUpdate({ subtitle: e.target.value })}
              placeholder="Ex: Escolha e adquira obras e produções unitárias..."
              className="w-full h-9 bg-[#0e0f14] border border-white/10 rounded-lg px-3 text-white text-xs outline-none focus:border-[#f4a7b9]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
