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
    <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-4">
      <div className="pb-3 border-b border-white/[0.06]">
        <span className="text-[#f4a7b9] text-[10px] font-mono font-semibold tracking-wider uppercase block mb-1">
          IDENTIDADE VISUAL DO TOPO
        </span>
        <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide">Menu & Cabeçalho do Site</h3>
        <p className="text-zinc-400 text-xs font-light mt-0.5">
          Personalize o nome exibido na barra superior fixa do site, suas iniciais e os atalhos de acesso.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Nome na Barra de Navegação
          </label>
          <input
            type="text"
            value={header.brandName}
            onChange={(e) => onUpdateHeader({ brandName: e.target.value })}
            placeholder="Nua Borges"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Nome exibido na barra fixa superior.</span>
        </div>

        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Monograma / Iniciais (Ex: NB)
          </label>
          <input
            type="text"
            value={header.brandMonogram || 'NB'}
            onChange={(e) => onUpdateHeader({ brandMonogram: e.target.value })}
            placeholder="NB"
            maxLength={4}
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition uppercase font-mono"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Iniciais exibidas no emblema discreto do menu.</span>
        </div>

        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Texto do Botão no Topo
          </label>
          <input
            type="text"
            value={header.onlyFansText || 'ASSINAR CLUB'}
            onChange={(e) => onUpdateHeader({ onlyFansText: e.target.value })}
            placeholder="ASSINAR CLUB"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Chamada do botão no canto superior direito.</span>
        </div>

        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Link de Destino do Botão no Topo
          </label>
          <input
            type="text"
            value={header.onlyFansUrl || ''}
            onChange={(e) => onUpdateHeader({ onlyFansUrl: e.target.value })}
            placeholder="https://..."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
          />
          <span className="text-zinc-500 text-[10px] block mt-1">Para onde o visitante vai ao clicar no botão do topo.</span>
        </div>
      </div>
    </div>
  );
}
