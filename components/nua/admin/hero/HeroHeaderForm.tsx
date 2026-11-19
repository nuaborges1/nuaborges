/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';

import { SiteContent } from '@/lib/types';

export type HeaderData = SiteContent['header'];

interface HeroHeaderFormProps {
  header: HeaderData;
  onUpdateHeader: (fields: Partial<HeaderData>) => void;
}

export function HeroHeaderForm({ header, onUpdateHeader }: HeroHeaderFormProps) {
  return (
    <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-4">
      <div className="pb-3.5 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white tracking-wide">Menu &amp; Cabeçalho do Site</h3>
        <p className="text-zinc-400 text-xs font-light mt-0.5">
          Personalize o nome exibido na barra superior fixa do site, suas iniciais e o botão de destaque.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-zinc-300 block mb-1.5">
            Nome na Barra de Navegação
          </label>
          <input
            type="text"
            value={header.brandName}
            onChange={(e) => onUpdateHeader({ brandName: e.target.value })}
            placeholder="Nua Borges"
            className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#843C52] transition"
          />
          <span className="text-zinc-500 text-[11px] block mt-1">Nome exibido na barra fixa superior.</span>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-300 block mb-1.5">
            Monograma / Iniciais (Ex: NB)
          </label>
          <input
            type="text"
            value={header.brandMonogram || 'NB'}
            onChange={(e) => onUpdateHeader({ brandMonogram: e.target.value })}
            placeholder="NB"
            maxLength={4}
            className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#843C52] transition uppercase font-mono"
          />
          <span className="text-zinc-500 text-[11px] block mt-1">Iniciais exibidas no emblema do menu.</span>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-300 block mb-1.5">
            Texto do Botão no Topo
          </label>
          <input
            type="text"
            value={header.onlyFansText || 'ASSINAR CLUB'}
            onChange={(e) => onUpdateHeader({ onlyFansText: e.target.value })}
            placeholder="ASSINAR CLUB"
            className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#843C52] transition"
          />
          <span className="text-zinc-500 text-[11px] block mt-1">Chamada do botão no canto superior direito.</span>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-300 block mb-1.5">
            Link de Destino do Botão
          </label>
          <input
            type="text"
            value={header.onlyFansUrl || ''}
            onChange={(e) => onUpdateHeader({ onlyFansUrl: e.target.value })}
            placeholder="https://..."
            className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#843C52] transition"
          />
          <span className="text-zinc-500 text-[11px] block mt-1">Destino ao clicar no botão do topo.</span>
        </div>
      </div>
    </div>
  );
}
