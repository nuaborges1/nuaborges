'use client';

import React, { useState } from 'react';
import { Search, FileText, Globe, Shield } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { SeoEditor } from './SeoEditor';
import { InstitutionalEditor } from './InstitutionalEditor';

interface DivulgacaoSeoModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew?: (img: LibraryImageItem) => void;
  initialTab?: 'seo' | 'legal';
}

export function DivulgacaoSeoModule({
  content,
  onChange,
  onUploadNew,
  initialTab = 'seo',
}: DivulgacaoSeoModuleProps) {
  const [activeTab, setActiveTab] = useState<'seo' | 'legal'>(initialTab);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#f4a7b9]">
            Visibilidade & Conformidade
          </span>
          <h1 className="text-2xl font-serif text-white tracking-wide mt-1">
            Divulgação & SEO
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Configure os metadados de compartilhamento para redes sociais e mecanismos de busca, e gerencie os termos legais e políticas de privacidade.
          </p>
        </div>

        {/* Pílulas de Sub-Navegação */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06] self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`h-7 flex items-center gap-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer ${
              activeTab === 'seo'
                ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Divulgação & Google</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('legal')}
            className={`h-7 flex items-center gap-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer ${
              activeTab === 'legal'
                ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Páginas Legais & Termos</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === 'legal' ? 'bg-white/20 text-white font-semibold' : 'bg-white/[0.06] text-zinc-400'
            }`}>
              {content.institutional?.links?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Conteúdo Ativo */}
      <div className="w-full">
        {activeTab === 'seo' && (
          <SeoEditor
            content={content}
            onChange={onChange}
            onUploadNew={onUploadNew}
          />
        )}

        {activeTab === 'legal' && (
          <InstitutionalEditor
            content={content}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  );
}
