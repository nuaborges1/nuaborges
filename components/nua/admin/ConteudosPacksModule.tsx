/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Images, Plus } from 'lucide-react';
import { SiteContent, AvulsoProductItem, LibraryImageItem } from '@/lib/types';
import { toSlug } from '@/lib/seo';
import { AvulsosEditor } from './AvulsosEditor';
import { PackEditorPage } from './PackEditorPage';
import { PageHeader, StatusBadge } from './ui/AdminPrimitives';

interface ConteudosPacksModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onUploadNew: (img: LibraryImageItem) => void;
  initialPackToEdit?: string | null;
  searchQuery?: string;
  onOpenLibrary?: () => void;
}

export function ConteudosPacksModule({
  content,
  onChange,
  onAdministrativeChange,
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
    modality: 'pack',
    price: '39,90',
    numericPrice: 39.9,
    description: '',
    imageUrl: '',
    checkoutUrl: '',
    previewImages: [],
    exclusivePhotos: [],
    videos: [],
    badge: 'LANÇAMENTO',
    active: false, // Inicia como rascunho invisível no site público até publicação explícita (Cenário E)
    isDraft: true,
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
    if (typeof window === 'undefined') return;
    if (subView === 'edit_pack') {
      window.dispatchEvent(
        new CustomEvent('nua_subview_dirty', {
          detail: {
            isDirty: true,
            label: 'Salve o pack antes de publicar no site',
          },
        })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent('nua_subview_dirty', {
          detail: { isDirty: false },
        })
      );
    }
    return () => {
      window.dispatchEvent(
        new CustomEvent('nua_subview_dirty', {
          detail: { isDirty: false },
        })
      );
    };
  }, [subView]);

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
  const handleSavePack = async (updatedPack: AvulsoProductItem) => {
    const cleanSlug = toSlug(updatedPack.slug?.trim() || toSlug(updatedPack.title) || 'pack-exclusivo');
    const isPublished = updatedPack.active !== false;
    const normalizedPack: AvulsoProductItem = {
      ...updatedPack,
      modality: updatedPack.modality || 'pack',
      slug: cleanSlug,
      checkoutUrl: `/avulsos/${cleanSlug}`,
      active: isPublished,
      isDraft: !isPublished,
    };

    const updater = (prev: SiteContent) => {
      const currentItems = prev.avulsos?.items || [];
      const exists = currentItems.some((i) => i.id === normalizedPack.id);
      let nextItems: AvulsoProductItem[] = [];

      if (exists) {
        nextItems = currentItems.map((i) => (i.id === normalizedPack.id ? normalizedPack : i));
      } else {
        nextItems = [normalizedPack, ...currentItems];
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
    };

    if (onAdministrativeChange) {
      const result = await onAdministrativeChange(updater, {
        summary: `Pack "${updatedPack.title}" salvo`,
        feedbackMessage: updatedPack.active === false
          ? 'Pack salvo como rascunho com sucesso (invisível no site).'
          : 'Pack salvo e atualizado com sucesso.',
      });
      if (!result.success) throw new Error(result.error || 'Não foi possível salvar o pack.');
    } else {
      onChange(updater);
    }

    setEditingPack(null);
    setSubView('catalog');
  };

  const handleSavePackDraft = useCallback(async (updatedPack: AvulsoProductItem) => {
    const draftPack: AvulsoProductItem = {
      ...updatedPack,
      modality: 'pack',
      active: false,
      isDraft: true,
      slug: toSlug(updatedPack.slug?.trim() || toSlug(updatedPack.title) || 'pack-exclusivo'),
    };
    const updater = (prev: SiteContent) => {
      const currentItems = prev.avulsos?.items || [];
      const exists = currentItems.some((item) => item.id === draftPack.id);
      return {
        ...prev,
        avulsos: {
          eyebrow: prev.avulsos?.eyebrow || 'CONTEÚDOS AVULSOS',
          title: prev.avulsos?.title || 'Acervo Sob Demanda',
          subtitle: prev.avulsos?.subtitle || 'Escolha produções unitárias sem mensalidade.',
          active: prev.avulsos?.active !== false,
          upsellText: prev.avulsos?.upsellText || 'Planos completos',
          upsellUrl: prev.avulsos?.upsellUrl || '#links',
          items: exists
            ? currentItems.map((item) => item.id === draftPack.id ? draftPack : item)
            : [draftPack, ...currentItems],
        },
      };
    };

    if (onAdministrativeChange) {
      const result = await onAdministrativeChange(updater, {
        summary: `Rascunho do pack "${draftPack.title || 'sem título'}" salvo automaticamente`,
      });
      if (!result.success) throw new Error(result.error || 'Não foi possível salvar o rascunho.');
    } else {
      onChange(updater);
    }
  }, [onAdministrativeChange, onChange]);

  // Exclui pack do site_content
  const handleDeletePack = (packId: string) => {
    const updater = (prev: SiteContent) => {
      const currentItems = prev.avulsos?.items || [];
      return {
        ...prev,
        avulsos: {
          ...(prev.avulsos || { eyebrow: '', title: '', subtitle: '', active: true, items: [] }),
          items: currentItems.filter((i) => i.id !== packId),
        },
      };
    };

    if (onAdministrativeChange) {
      onAdministrativeChange(updater, {
        summary: 'Pack removido do catálogo',
        feedbackMessage: 'Pack removido com sucesso.',
      });
    } else {
      onChange(updater);
    }

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
        onDraftSave={handleSavePackDraft}
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
    <div id="admin-packs-section" data-field="avulsos.section" className="space-y-5 w-full">
      <PageHeader
        title="Conteúdos & Packs"
        subtitle="Gerencie os pacotes avulsos à venda no site, suas amostras gratuitas e os arquivos protegidos entregues após a compra."
        helpId="conteudos_catalogo"
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenLibrary && (
              <button
                type="button"
                onClick={onOpenLibrary}
                className="h-9 px-3.5 rounded-xl bg-[#14161d] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-200 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Images className="w-3.5 h-3.5 text-[#843C52]" />
                <span>Biblioteca ({libraryCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStartNewPack}
              className="h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
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
        onAdministrativeChange={onAdministrativeChange}
        onUploadNew={onUploadNew}
        onEditPack={handleStartEditPack}
        onCreateNewPack={handleStartNewPack}
        searchQuery={searchQuery}
      />
    </div>
  );
}
