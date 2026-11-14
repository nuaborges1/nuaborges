'use client';

import React, { useState } from 'react';
import { Share2, Mail, Info } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { ChannelsEditor } from './ChannelsEditor';
import { ContactEditor } from './ContactEditor';
import { VipLeadsEditor } from './VipLeadsEditor';

interface ConexoesContatoModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  initialTab?: 'channels' | 'contact' | 'vip';
  searchQuery?: string;
}

export function ConexoesContatoModule({
  content,
  onChange,
  initialTab = 'channels',
  searchQuery = '',
}: ConexoesContatoModuleProps) {
  const [activeTab, setActiveTab] = useState<'channels' | 'contact' | 'vip'>(
    initialTab === 'vip' ? 'channels' : initialTab
  );

  const activeChannelsCount = [
    content.channels?.onlyfans,
    content.channels?.instagram,
    content.channels?.privacy,
    content.channels?.closefans,
  ].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Barra de Sub-Navegação em Segmentos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div role="tablist" aria-label="Áreas de conexões e contato" className="inline-flex items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06] overflow-x-auto max-w-full">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'channels'}
            onClick={() => setActiveTab('channels')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'channels'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Redes sociais e plataformas</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
              {activeChannelsCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'contact'}
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'contact'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-zinc-400" />
            <span>Contato comercial</span>
          </button>
        </div>

        {/* Nota discreta de privacidade */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-light">
          <Info className="w-3.5 h-3.5 text-[#f4a7b9] shrink-0" />
          <span>Informações e contatos oficiais com proteção de dados</span>
        </div>
      </div>

      {/* Conteúdo Ativo */}
      <div className="w-full">
        {activeTab === 'channels' && (
          <ChannelsEditor
            content={content}
            onChange={(updated) => onChange(updated)}
          />
        )}

        {activeTab === 'contact' && (
          <ContactEditor
            content={content}
            onChange={onChange}
          />
        )}

        {/* Aba VIP mantida no código mas oculta do menu conforme solicitado */}
        {activeTab === 'vip' && (
          <VipLeadsEditor
            content={content}
            onChange={onChange}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  );
}
