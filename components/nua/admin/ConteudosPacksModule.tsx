'use client';

import React, { useState } from 'react';
import { ShoppingBag, Images, Plus, FolderOpen } from 'lucide-react';
import { SiteContent, AvulsoProductItem, LibraryImageItem } from '@/lib/types';
import { AvulsosEditor } from './AvulsosEditor';
import { LibraryEditor } from './LibraryEditor';
import { PackEditorPage } from './PackEditorPage';

interface ConteudosPacksModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
  initialPackToEdit?: string | null;
  searchQuery?: string;
}

export function ConteudosPacksModule({
  content,
  onChange,
  onUploadNew,
  initialPackToEdit = null,
  searchQuery = '',
}: ConteudosPacksModuleProps) {
  const [subView, setSubView] = useState<'catalog' | 'library' | 'edit_pack'>('catalog');
  const [editingPack, setEditingPack] = useState<AvulsoProductItem | null>(null);
  const [libraryCount, setLibraryCount] = useState(content.library?.length || 0);

  // Manipulador para criar novo pack em página dedicada
  const handleStartNewPack = () => {
    const newPack: AvulsoProductItem = {
      id: `pack_${Date.now()}`,
      title: '',
      slug: '',
      price: '39,90',
      numericPrice: 39.9,
      description: '',
      imageUrl: '',
      checkoutUrl: '',
      previewImages: [],
      exclusivePhotos: [],
      videos: [],
      badge: 'LANÇAMENTO',
      active: true,
    };
    setEditingPack(newPack);
    setSubView('edit_pack');
  };

  // Manipulador para editar pack existente em página dedicada
  const handleStartEditPack = (pack: AvulsoProductItem) => {
    setEditingPack(pack);
    setSubView('edit_pack');
  };

  // Salva pack editado no site_content
  const handleSavePack = (updatedPack: AvulsoProductItem) => {
    onChange((prev) => {
      const currentItems = prev.avulsos?.items || [];
      const exists = currentItems.some((i) => i.id === updatedPack.id);
      let nextItems: AvulsoProductItem[] = [];

      if (exists) {
        nextItems = currentItems.map((i) => (i.id === updatedPack.id ? updatedPack : i));
      } else {
        nextItems = [updatedPack, ...currentItems];
      }

      return {
        ...prev,
        avulsos: {
          eyebrow: prev.avulsos?.eyebrow || 'CONTEÚDOS AVULSOS',
          title: prev.avulsos?.title || 'Acervo Sob Demanda',
          subtitle: prev.avulsos?.subtitle || 'Escolha produções unitárias sem mensalidade.',
          active: prev.avulsos?.active !== false,
          upsellText: prev.avulsos?.upsellText || 'Planos completos',
          upsellUrl: prev.avulsos?.upsellUrl || '#links',
          items: nextItems,
        },
      };
    });

    setEditingPack(null);
    setSubView('catalog');
  };

  // Exclui pack do site_content
  const handleDeletePack = (packId: string) => {
    onChange((prev) => {
      const currentItems = prev.avulsos?.items || [];
      return {
        ...prev,
        avulsos: {
          ...(prev.avulsos || { eyebrow: '', title: '', subtitle: '', active: true, items: [] }),
          items: currentItems.filter((i) => i.id !== packId),
        },
      };
    });

    setEditingPack(null);
    setSubView('catalog');
  };

  // Se estiver na página dedicada de edição de pack:
  if (subView === 'edit_pack' && editingPack) {
    return (
      <PackEditorPage
        pack={editingPack}
        content={content}
        onSave={handleSavePack}
        onCancel={() => {
          setEditingPack(null);
          setSubView('catalog');
        }}
        onDelete={handleDeletePack}
        onUploadNew={onUploadNew}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Barra de Sub-Navegação em Segmentos (Estilo Yahoo Mail / SaaS Executivo) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div role="tablist" aria-label="Áreas de conteúdos" className="inline-flex items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06]">
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'catalog'}
            onClick={() => setSubView('catalog')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              subView === 'catalog'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Produtos à venda</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
              {content.avulsos?.items?.length || 0}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subView === 'library'}
            onClick={() => setSubView('library')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              subView === 'library'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Images className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Fotos e vídeos</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300">
              {libraryCount}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-400 font-light">
          Gerencie os produtos que aparecem para venda e a biblioteca de fotos e vídeos usada nas capas, prévias e entregas.
        </p>

        {subView === 'catalog' && (
          <button
            type="button"
            onClick={handleStartNewPack}
            className="h-8 px-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar produto / pack</span>
          </button>
        )}
      </div>

      {/* Renderização da Sub-Visão */}
      {subView === 'catalog' && (
        <AvulsosEditor
          content={content}
          onChange={onChange}
          onUploadNew={onUploadNew}
          onEditPack={handleStartEditPack}
          onCreateNewPack={handleStartNewPack}
          searchQuery={searchQuery}
        />
      )}

      {subView === 'library' && (
        <LibraryEditor
          content={content}
          onChange={onChange}
          onUploadNew={onUploadNew}
          onLibraryCountChange={setLibraryCount}
        />
      )}
    </div>
  );
}
