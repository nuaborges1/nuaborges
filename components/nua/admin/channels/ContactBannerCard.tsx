/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { SiteContent } from '@/lib/types';

interface ContactBannerCardProps {
  contactBanner: SiteContent['channels']['contactBanner'];
  onChange: (fields: Partial<SiteContent['channels']['contactBanner']>) => void;
}

export function ContactBannerCard({
  contactBanner,
  onChange,
}: ContactBannerCardProps) {
  return (
    <div className="bg-[#171821] border border-white/[0.06] rounded-xl p-5 space-y-3">
      <div className="pb-2 border-b border-white/[0.06]">
        <h4 className="font-semibold text-sm text-white">
          Faixa de Contato Profissional &amp; Imprensa
        </h4>
        <p className="text-zinc-400 text-[11px] font-light mt-0.5">
          Chamada exibida logo abaixo das plataformas para atrair parcerias comerciais e imprensa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Título da Faixa
          </label>
          <input
            type="text"
            value={contactBanner.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Ex: Parcerias & Imprensa"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#843C52] transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Texto do Botão
          </label>
          <input
            type="text"
            value={contactBanner.buttonText || ''}
            onChange={(e) => onChange({ buttonText: e.target.value })}
            placeholder="Ex: Entrar em Contato"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#843C52] transition-colors"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1 font-mono">
            Texto Explicativo
          </label>
          <input
            type="text"
            value={contactBanner.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Ex: Para propostas comerciais, palestras ou projetos especiais."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#843C52] transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
