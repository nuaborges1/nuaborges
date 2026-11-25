/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { SiteContent } from '@/lib/types';

export type HeaderData = SiteContent['header'];

interface HeroHeaderFormProps {
  header: HeaderData;
  onUpdateHeader: (fields: Partial<HeaderData>) => void;
}

const HEADER_CTA_PRESETS = [
  { label: 'Acervo VIP', url: '/acervo' },
  { label: 'Packs Avulsos', url: '/avulsos' },
  { label: 'Personalizados', url: '/personalizados' },
  { label: 'Chamadas VIP', url: '/chamadas' },
];

export function HeroHeaderForm({ header, onUpdateHeader }: HeroHeaderFormProps) {
  return (
    <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-5">
      <div className="pb-3.5 border-b border-white/[0.06]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c8647d] block mb-0.5">
          Topo do Site
        </span>
        <h3 className="text-sm font-semibold text-white tracking-wide">
          Barra do Menu Superior
        </h3>
        <p className="text-zinc-400 text-xs font-light mt-0.5">
          Personalize o seu nome e o botão de destaque que aparecem no topo de todas as páginas.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-200 block mb-1.5">
          Seu Nome no Topo do Site
        </label>
        <input
          type="text"
          value={header.brandName}
          onChange={(e) => onUpdateHeader({ brandName: e.target.value })}
          placeholder="Nua Borges"
          className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#843C52] transition"
        />
      </div>

      {/* Botão de Destaque no Topo */}
      <div className="p-4 rounded-xl bg-[#0e1015] border border-white/[0.06] space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-xs font-semibold text-white block">
              Botão de Destaque no Canto Direito do Topo
            </span>
            <span className="text-[11px] text-zinc-400 font-light">
              Botão vinho que fica sempre visível no canto superior direito.
            </span>
          </div>
          <input
            type="checkbox"
            checked={header.showOnlyFans !== false}
            onChange={(e) => onUpdateHeader({ showOnlyFans: e.target.checked })}
            className="accent-[#843C52] w-4 h-4 rounded cursor-pointer"
          />
        </label>

        {header.showOnlyFans !== false && (
          <div className="pt-3 border-t border-white/[0.06] space-y-3.5">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Texto do Botão
              </label>
              <input
                type="text"
                value={header.onlyFansText || 'Acervo VIP'}
                onChange={(e) => onUpdateHeader({ onlyFansText: e.target.value })}
                placeholder="Ex: Acervo VIP"
                className="w-full h-9 bg-[#14161d] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#843C52] transition"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Para qual página esse botão leva
              </label>
              <div className="flex flex-wrap gap-1.5">
                {HEADER_CTA_PRESETS.map((p) => {
                  const currentUrl =
                    !header.onlyFansUrl ||
                    header.onlyFansUrl === 'https://onlyfans.com/nuaborges'
                      ? '/acervo'
                      : header.onlyFansUrl;
                  return (
                    <button
                      key={p.url}
                      type="button"
                      onClick={() => onUpdateHeader({ onlyFansUrl: p.url })}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition cursor-pointer ${
                        currentUrl === p.url
                          ? 'bg-[#843C52]/25 border-[#843C52] text-white font-medium'
                          : 'bg-[#14161d] border-white/[0.08] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
