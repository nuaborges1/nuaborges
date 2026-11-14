'use client';

import React, { useState } from 'react';
import { LayoutTemplate, Images, User } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { HeroEditor } from './HeroEditor';
import { GalleryEditor } from './GalleryEditor';
import { AboutEditor } from './AboutEditor';

interface VitrineCapaModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
  initialTab?: 'hero' | 'gallery' | 'about';
}

export function VitrineCapaModule({
  content,
  onChange,
  onUploadNew,
  initialTab = 'hero',
}: VitrineCapaModuleProps) {
  const [activeTab, setActiveTab] = useState<'hero' | 'gallery' | 'about'>(initialTab);

  return (
    <div className="space-y-5">
      {/* Barra de Sub-Navegação em Segmentos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div role="tablist" aria-label="Áreas de edição da vitrine" className="inline-flex items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06]">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'hero'}
            onClick={() => setActiveTab('hero')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'hero'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Foto e textos da capa</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'gallery'}
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Images className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Galeria de fotos</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
              {content.gallery?.photos?.length || 0}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'about'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sobre mim</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-light">
          <span>Gerencie a apresentação pública e os registros em destaque na Home</span>
        </div>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      <div className="w-full">
        {activeTab === 'hero' && (
          <HeroEditor
            content={content}
            onChange={onChange}
            onUploadNew={onUploadNew}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryEditor
            content={content}
            onChange={onChange}
            onUploadNew={onUploadNew}
          />
        )}

        {activeTab === 'about' && (
          <AboutEditor
            content={content}
            onChange={onChange}
            onUploadNew={onUploadNew}
          />
        )}
      </div>
    </div>
  );
}
