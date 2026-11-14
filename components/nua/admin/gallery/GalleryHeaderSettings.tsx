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
      <div className="p-3 rounded-lg bg-[#101116] border border-white/[0.06] text-zinc-400 text-xs flex items-center gap-2">
        <span className="text-[#f4a7b9] font-semibold text-[10px] font-mono uppercase tracking-wider">
          💡 Dica:
        </span>
        <span className="text-[11px]">
          Estes textos identificam a seção no site público. Para guardar arquivos brutos sem
          exibi-los na home, utilize o <strong className="text-zinc-200">Cofre de Mídias</strong>.
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
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
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
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
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
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#f4a7b9]/60 transition"
          />
        </div>
      </div>
    </div>
  );
}
