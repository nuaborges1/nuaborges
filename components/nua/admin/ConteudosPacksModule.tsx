'use client';

import React, { useState, useEffect } from 'react';
import { Images, Plus } from 'lucide-react';
import { SiteContent, AvulsoProductItem, LibraryImageItem } from '@/lib/types';
import { AvulsosEditor } from './AvulsosEditor';
import { PackEditorPage } from './PackEditorPage';
import { PageHeader, StatusBadge } from './ui/AdminPrimitives';

interface ConteudosPacksModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
  initialPackToEdit?: string | null;
  searchQuery?: string;
  onOpenLibrary?: () => void;
}

export function ConteudosPacksModule({
  content,
  onChange,
  onUploadNew,
  initialPackToEdit = null,
  searchQuery = '',
  onOpenLibrary,
}: ConteudosPacksModuleProps) {
  const [subView, setSubView] = useState<'catalog' | 'edit_pack'>('catalog');
  const [editingPack, setEditingPack] = useState<AvulsoProductItem | null>(null);

  const createBlankPack = (): AvulsoProductItem => ({
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
  });

  // Manipulador para criar novo pack em página dedicada
  const handleStartNewPack = () => {
    setEditingPack(createBlankPack());
    setSubView('edit_pack');
  };

  // Manipulador para editar pack existente em página dedicada
  const handleStartEditPack = (pack: AvulsoProductItem) => {
    setEditingPack(pack);
    setSubView('edit_pack');
  };

  // Abre automaticamente um pack específico ou criação quando acionado pela Dashboard/Spotlight
  useEffect(() => {
    if (!initialPackToEdit) return;
    if (initialPackToEdit === 'new_pack') {
      handleStartNewPack();
      return;
    }
    const found = (content.avulsos?.items || []).find(
      (item) => item.id === initialPackToEdit || item.slug === initialPackToEdit
    );
    if (found) {
      handleStartEditPack(found);
    }
  }, [initialPackToEdit]);

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

  const libraryCount = content.library?.length || 0;

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title="Conteúdos & Packs"
        subtitle="Gerencie os pacotes avulsos à venda no site, suas amostras gratuitas e os arquivos protegidos entregues após a compra."
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenLibrary && (
              <button
                type="button"
                onClick={onOpenLibrary}
                className="h-9 px-3.5 rounded-xl bg-[#14161d] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-200 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Images className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>Biblioteca ({libraryCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStartNewPack}
              className="h-9 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar novo pack</span>
            </button>
          </div>
        }
      />

      <AvulsosEditor
        content={content}
        onChange={onChange}
        onUploadNew={onUploadNew}
        onEditPack={handleStartEditPack}
        onCreateNewPack={handleStartNewPack}
        searchQuery={searchQuery}
      />
    </div>
  );
}
