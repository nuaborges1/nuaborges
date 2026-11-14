'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Package } from 'lucide-react';
import { SiteContent, AvulsoProductItem, LibraryImageItem } from '@/lib/types';
import { useAvulsoUploads } from './avulsos/useAvulsoUploads';
import { useAvulsoModalOperations } from './avulsos/useAvulsoModalOperations';
import { AvulsoHeaderSettings } from './avulsos/AvulsoHeaderSettings';
import { AvulsoProductCard } from './avulsos/AvulsoProductCard';
import { AvulsoEditModal } from './avulsos/AvulsoEditModal';
import { AvulsoMediaModals } from './avulsos/AvulsoMediaModals';

interface AvulsosEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
  onEditPack?: (pack: AvulsoProductItem) => void;
  onCreateNewPack?: () => void;
  searchQuery?: string;
}

const DEFAULT_AVULSOS_FALLBACK = {
  eyebrow: 'CONTEÚDOS AVULSOS',
  title: 'Acervo Sob Demanda',
  subtitle:
    'Escolha e adquira obras e produções unitárias sem necessidade de mensalidade. Acesso vitalício e cobrança 100% discreta.',
  active: true,
  upsellText:
    'Prefere acesso ilimitado a todos os ensaios e vídeos sem pagar por item? Conheça os Planos Completos',
  upsellUrl: '#links',
  items: [] as AvulsoProductItem[],
};
const EMPTY_AVULSO_ITEMS: AvulsoProductItem[] = [];

export function AvulsosEditor({
  content,
  onChange,
  onUploadNew,
  onEditPack,
  onCreateNewPack,
  searchQuery = '',
}: AvulsosEditorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [showPageHeaderSettings, setShowPageHeaderSettings] = useState(false);
  const [showManualUrlMap, setShowManualUrlMap] = useState<Record<number, boolean>>({});

  const [previewingVideo, setPreviewingVideo] = useState<{
    url: string;
    title: string;
    poster?: string;
  } | null>(null);

  const [previewingPhotoUrl, setPreviewingPhotoUrl] = useState<string | null>(null);

  const avulsos = content.avulsos || DEFAULT_AVULSOS_FALLBACK;

  const updateAvulsos = (fields: Partial<typeof avulsos>) => {
    onChange((prev) => ({
      ...prev,
      avulsos: {
        ...(prev.avulsos || avulsos),
        ...fields,
      },
    }));
  };

  const items = avulsos.items || EMPTY_AVULSO_ITEMS;

  const {
    editingItemIndex,
    setEditingItemIndex,
    editingItemData,
    setEditingItemData,
    modalTab,
    setModalTab,
    pickerTarget,
    setPickerTarget,
    deleteConfirmIndex,
    setDeleteConfirmIndex,
    handleStartCreateItem,
    handleStartEditItem,
    handleSaveModalItem,
    handleCloneItem,
    handleUpdateModalFields,
    handleUpdateVideoField,
    handleAddEmptyVideoCard,
    handleCopyPreviewsToVault,
    handleSelectImageForModal,
    handleSelectMultipleImagesForModal,
    handleToggleItemActiveDirect,
    handleDeleteItem,
    handleMoveItem,
  } = useAvulsoModalOperations({
    items,
    updateAvulsos,
    onEditPack,
    onCreateNewPack,
  });

  const {
    uploadingState,
    videoFileInputRef,
    previewPhotosInputRef,
    vaultPhotosInputRef,
    handleTriggerNewVideoUpload,
    handleTriggerReplaceVideoUpload,
    handleVideoFileChange,
    handlePreviewPhotosFileChange,
    handleVaultPhotosFileChange,
  } = useAvulsoUploads({
    editingItemData,
    setEditingItemData,
    onUploadNew,
  });

  const getPublicPackUrl = (slug?: string) => {
    if (!slug) return '';
    const clean = slug.replace(/^\/+/, '').replace(/\/+$/, '');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const base = (origin || process.env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges.com.br').replace(/\/+$/, '');
    return `${base}/avulsos/${clean}`;
  };

  useEffect(() => {
    const handleDraftUpdated = (e: any) => {
      const newPack = e?.detail?.pack;
      if (newPack && newPack.id) {
        onChange((prev) => {
          const currentItems = prev.avulsos?.items || [];
          const exists = currentItems.some((i) => i.id === newPack.id);
          if (exists) return prev;
          return {
            ...prev,
            avulsos: {
              ...(prev.avulsos || avulsos),
              items: [newPack, ...currentItems],
            },
          };
        });
      }
    };

    window.addEventListener('nua_pack_created', handleDraftUpdated);
    return () => window.removeEventListener('nua_pack_created', handleDraftUpdated);
  }, [onChange, avulsos]);

  const activeCount = useMemo(
    () => items.filter((i) => i.active !== false).length,
    [items]
  );

  const avgPrice = useMemo(() => {
    if (items.length === 0) return 'R$ 0,00';
    let total = 0;
    let count = 0;
    items.forEach((item) => {
      if (typeof item.numericPrice === 'number' && item.numericPrice > 0) {
        total += item.numericPrice;
        count++;
      } else if (item.price) {
        const clean = item.price.replace(/[^\d,.]/g, '').replace(',', '.');
        const parsed = parseFloat(clean);
        if (!isNaN(parsed) && parsed > 0) {
          total += parsed;
          count++;
        }
      }
    });
    if (count === 0) return 'R$ 39,90';
    const avg = total / count;
    return `R$ ${avg.toFixed(2).replace('.', ',')}`;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (statusFilter === 'active' && item.active === false) return false;
        if (statusFilter === 'hidden' && item.active !== false) return false;

        const effectiveQ = (searchTerm || searchQuery).toLowerCase().trim();
        if (!effectiveQ) return true;
        return (
          (item.title || '').toLowerCase().includes(effectiveQ) ||
          (item.description || '').toLowerCase().includes(effectiveQ) ||
          (item.badge || '').toLowerCase().includes(effectiveQ) ||
          (item.price || '').toLowerCase().includes(effectiveQ) ||
          (item.slug || '').toLowerCase().includes(effectiveQ)
        );
      });
  }, [items, searchTerm, searchQuery, statusFilter]);

  return (
    <div className="space-y-4">
      {/* 1. Configurações da Seção & Métricas */}
      <AvulsoHeaderSettings
        avulsos={avulsos}
        onUpdate={updateAvulsos}
        isOpen={showPageHeaderSettings}
        onToggleOpen={() => setShowPageHeaderSettings((prev) => !prev)}
        itemsCount={items.length}
        activeCount={activeCount}
        avgPrice={avgPrice}
      />

      {/* 2. Barra de Busca e Filtros */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Localizar pack por título, preço ou palavra-chave..."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          <div className="inline-flex rounded-lg bg-[#0e0f14] p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white/15 text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                statusFilter === 'active' ? 'bg-white/15 text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ativos ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('hidden')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                statusFilter === 'hidden' ? 'bg-white/15 text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ocultos ({items.length - activeCount})
            </button>
          </div>

          <button
            type="button"
            onClick={handleStartCreateItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition cursor-pointer shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Pack</span>
          </button>
        </div>
      </div>

      {/* 3. Lista de Cards dos Packs */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl bg-[#171821] border border-dashed border-white/10 p-8 text-center space-y-3">
          <Package className="w-8 h-8 text-zinc-500 mx-auto" />
          <h5 className="text-white text-xs font-medium">Nenhum pack encontrado</h5>
          <p className="text-zinc-400 text-xs max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros ou a busca acima para encontrar o item desejado.'
              : 'Você ainda não possui conteúdos avulsos cadastrados. Clique no botão abaixo para adicionar seu primeiro pack.'}
          </p>
          <button
            type="button"
            onClick={handleStartCreateItem}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#f4a7b9] text-zinc-950 font-semibold text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Primeiro Pack</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map(({ item, originalIndex }) => (
            <AvulsoProductCard
              key={item.id || originalIndex}
              item={item}
              originalIndex={originalIndex}
              totalItems={items.length}
              onEdit={handleStartEditItem}
              onClone={handleCloneItem}
              onDelete={(idx) => setDeleteConfirmIndex(idx)}
              onToggleActive={handleToggleItemActiveDirect}
              onMove={handleMoveItem}
              getPublicPackUrl={getPublicPackUrl}
            />
          ))}
        </div>
      )}

      {/* 4. Modal de Edição Completa */}
      {editingItemData !== null && (
        <AvulsoEditModal
          editingItemIndex={editingItemIndex}
          editingItemData={editingItemData}
          modalTab={modalTab}
          setModalTab={setModalTab}
          onClose={() => {
            setEditingItemIndex(null);
            setEditingItemData(null);
          }}
          onSave={handleSaveModalItem}
          onUpdateFields={handleUpdateModalFields}
          getPublicPackUrl={getPublicPackUrl}
          onSelectCover={() =>
            setPickerTarget({
              type: 'cover',
              index: editingItemIndex ?? -1,
            })
          }
          onTriggerUploadPreviews={() => previewPhotosInputRef.current?.click()}
          onOpenAcervoPreviews={() =>
            setPickerTarget({
              type: 'previewPhoto',
              index: editingItemIndex ?? -1,
            })
          }
          onPreviewPhoto={(url) => setPreviewingPhotoUrl(url)}
          onRemovePreviewPhoto={(idx) => {
            if (!editingItemData) return;
            const previews = (editingItemData.previewImages || []).filter((_, i) => i !== idx);
            handleUpdateModalFields({ previewImages: previews });
          }}
          uploadingState={uploadingState}
          showManualUrlMap={showManualUrlMap}
          onToggleManualUrl={(idx) =>
            setShowManualUrlMap((prev) => ({ ...prev, [idx]: !prev[idx] }))
          }
          onUpdateVideoField={handleUpdateVideoField}
          onRemoveVideo={(idx) => {
            if (!editingItemData) return;
            const vids = (editingItemData.videos || []).filter((_, i) => i !== idx);
            handleUpdateModalFields({ videos: vids });
          }}
          onAddEmptyVideo={handleAddEmptyVideoCard}
          onTriggerNewVideoUpload={handleTriggerNewVideoUpload}
          onTriggerReplaceVideoUpload={handleTriggerReplaceVideoUpload}
          onOpenAcervoVideo={() =>
            setPickerTarget({
              type: 'packVideo',
              index: editingItemIndex ?? -1,
            })
          }
          onOpenAcervoVideoPoster={(vIdx) =>
            setPickerTarget({
              type: 'videoPoster',
              index: editingItemIndex ?? -1,
              videoIndex: vIdx,
            })
          }
          onPreviewVideo={(vid) => setPreviewingVideo(vid)}
          onTriggerUploadVaultPhotos={() => vaultPhotosInputRef.current?.click()}
          onOpenAcervoVaultPhotos={() =>
            setPickerTarget({
              type: 'exclusivePhoto',
              index: editingItemIndex ?? -1,
            })
          }
          onCopyPreviewsToVault={handleCopyPreviewsToVault}
          onRemoveExclusivePhoto={(idx) => {
            if (!editingItemData) return;
            const exclusive = (editingItemData.exclusivePhotos || []).filter((_, i) => i !== idx);
            handleUpdateModalFields({ exclusivePhotos: exclusive });
          }}
        />
      )}

      {/* 5. Modais de Mídia e Confirmação */}
      <AvulsoMediaModals
        pickerTarget={pickerTarget}
        onClosePicker={() => setPickerTarget(null)}
        onSelectImage={handleSelectImageForModal}
        onSelectMultipleImages={handleSelectMultipleImagesForModal}
        editingItemData={editingItemData}
        library={content.library || []}
        albums={content.albums || []}
        onUploadNew={onUploadNew}
        previewingVideo={previewingVideo}
        onClosePreviewingVideo={() => setPreviewingVideo(null)}
        previewingPhotoUrl={previewingPhotoUrl}
        onClosePreviewingPhoto={() => setPreviewingPhotoUrl(null)}
        deleteConfirmIndex={deleteConfirmIndex}
        onCancelDelete={() => setDeleteConfirmIndex(null)}
        onConfirmDelete={handleDeleteItem}
        items={items}
      />

      {/* Inputs ocultos do SO para upload direto sem links */}
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
        className="hidden"
        onChange={handleVideoFileChange}
      />
      <input
        ref={previewPhotosInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handlePreviewPhotosFileChange}
      />
      <input
        ref={vaultPhotosInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleVaultPhotosFileChange}
      />
    </div>
  );
}
