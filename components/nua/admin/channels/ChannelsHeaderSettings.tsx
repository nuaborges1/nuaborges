/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { SiteContent } from '@/lib/types';

interface ChannelsHeaderSettingsProps {
  channels: SiteContent['channels'];
  onChange: (fields: Partial<SiteContent['channels']>) => void;
}

export function ChannelsHeaderSettings({
  channels,
  onChange,
}: ChannelsHeaderSettingsProps) {
  return (
    <div className="p-4 rounded-xl bg-[#171821] border border-white/[0.06] space-y-3 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1.5 font-mono">
            Texto Pequeno no Topo
          </label>
          <input
            type="text"
            value={channels.eyebrow || ''}
            onChange={(e) => onChange({ eyebrow: e.target.value })}
            placeholder="Ex: CANAIS OFICIAIS"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3.5 py-2 text-white text-xs outline-none focus:border-[#843C52] transition-colors"
          />
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1.5 font-mono">
            Título da Seção
          </label>
          <input
            type="text"
            value={channels.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Ex: Presença & Conexão"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3.5 py-2 text-white text-xs outline-none focus:border-[#843C52] transition-colors"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1.5 font-mono">
            Texto de Apresentação
          </label>
          <input
            type="text"
            value={channels.subtitle || ''}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="Ex: Acompanhe a pesquisa, os diálogos sobre sexologia e os ensaios autorais exclusivos."
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3.5 py-2 text-white text-xs outline-none focus:border-[#843C52] transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
