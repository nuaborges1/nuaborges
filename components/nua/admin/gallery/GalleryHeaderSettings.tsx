/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { SiteContent } from '@/lib/types';

interface GalleryHeaderSettingsProps {
  gallery: SiteContent['gallery'];
  onChange: (fields: Partial<SiteContent['gallery']>) => void;
}

export function GalleryHeaderSettings({
  gallery,
  onChange,
}: GalleryHeaderSettingsProps) {
  return (
    <div className="pt-4 border-t border-white/[0.06] space-y-3 animate-fade-in">
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0e0f14] border border-white/[0.08]">
        <div>
          <span className="text-xs font-semibold text-white block">Exibir Seção Vitrine de Ensaios no Site</span>
          <span className="text-[11px] text-zinc-400 block mt-0.5">
            Quando desativada, a vitrine de ensaios públicos não aparece na página inicial.
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={gallery.active !== false}
            onChange={(e) => onChange({ active: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#843C52]" />
        </label>
      </div>

      <div className="p-3 rounded-lg bg-[#101116] border border-white/[0.06] text-zinc-400 text-xs flex items-center gap-2">
        <span className="text-[#843C52] font-semibold text-[10px] font-mono uppercase tracking-wider">
          Dica:
        </span>
        <span className="text-[11px]">
          Estes textos identificam a seção no site público. Para guardar arquivos sem
          exibi-los na home, utilize a <strong className="text-zinc-200">Biblioteca de Mídias</strong>.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Texto Pequeno no Topo
          </label>
          <input
            type="text"
            value={gallery.eyebrow || ''}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder="Ex: GALERIA DE ENSAIOS"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#843C52]/60 transition"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Título da Seção
          </label>
          <input
            type="text"
            value={gallery.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Ex: Acervo Autoral"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#843C52]/60 transition"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
            Texto de Apresentação
          </label>
          <input
            type="text"
            value={gallery.subtitle || ''}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="Ex: Produções independentes sob luz natural, revelando a estética e a verdade do corpo."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#843C52]/60 transition"
          />
        </div>
      </div>
    </div>
  );
}
