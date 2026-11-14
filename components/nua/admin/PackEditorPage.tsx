'use client';

import React, { useState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { SiteContent, AvulsoProductItem, LibraryImageItem, AvulsoVideoItem } from '@/lib/types';
import { ImagePickerModal } from './ImagePickerModal';
import { ConfirmModal } from './ConfirmModal';
import { PackEditorHeader } from './packs/PackEditorHeader';
import { PackInfoTab } from './packs/PackInfoTab';
import { PackPreviewsTab } from './packs/PackPreviewsTab';
import { PackVaultTab } from './packs/PackVaultTab';

interface PackEditorPageProps {
  pack: AvulsoProductItem;
  content: SiteContent;
  onSave: (updatedPack: AvulsoProductItem) => void;
  onCancel: () => void;
  onDelete?: (packId: string) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

export function PackEditorPage({
  pack: initialPack,
  content,
  onSave,
  onCancel,
  onDelete,
  onUploadNew,
}: PackEditorPageProps) {
  const [pack, setPack] = useState<AvulsoProductItem>({ ...initialPack });
  const [activeTab, setActiveTab] = useState<'info' | 'previews' | 'vault'>('info');
  const [pickerTarget, setPickerTarget] = useState<{
    type: 'cover' | 'previewPhoto' | 'exclusivePhoto';
  } | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFieldChange = (field: keyof AvulsoProductItem, value: any) => {
    setPack((prev) => ({ ...prev, [field]: value }));
  };

  const handlePriceChange = (val: string) => {
    const clean = val.replace(/[^\d,.]/g, '').replace(',', '.');
    const parsed = parseFloat(clean) || 0;
    setPack((prev) => ({
      ...prev,
      price: val,
      numericPrice: parsed,
    }));
  };

  const handleAddPreviewPhoto = (url: string) => {
    const current = pack.previewImages || [];
    if (!current.includes(url)) {
      setPack((prev) => ({ ...prev, previewImages: [...current, url] }));
    }
    setPickerTarget(null);
  };

  const handleRemovePreviewPhoto = (idx: number) => {
    setPack((prev) => ({
      ...prev,
      previewImages: (prev.previewImages || []).filter((_, i) => i !== idx),
    }));
  };

  const handleAddExclusivePhoto = (url: string) => {
    const current = pack.exclusivePhotos || [];
    if (!current.includes(url)) {
      setPack((prev) => ({ ...prev, exclusivePhotos: [...current, url] }));
    }
    setPickerTarget(null);
  };

  const handleRemoveExclusivePhoto = (idx: number) => {
    setPack((prev) => ({
      ...prev,
      exclusivePhotos: (prev.exclusivePhotos || []).filter((_, i) => i !== idx),
    }));
  };

  const handleAddVideo = () => {
    const newVideo: AvulsoVideoItem = {
      id: `vid_${Date.now()}`,
      title: 'Vídeo Autoral (4K UHD)',
      duration: 'Vídeo 4K',
      url: '',
    };
    setPack((prev) => ({
      ...prev,
      videos: [...(prev.videos || []), newVideo],
    }));
  };

  const handleUpdateVideo = (idx: number, patch: Partial<AvulsoVideoItem>) => {
    setPack((prev) => {
      const current = [...(prev.videos || [])];
      current[idx] = { ...current[idx], ...patch };
      return { ...prev, videos: current };
    });
  };

  const handleRemoveVideo = (idx: number) => {
    setPack((prev) => ({
      ...prev,
      videos: (prev.videos || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pack.title.trim()) {
      showToast('Por favor, informe o título do produto.');
      return;
    }
    onSave(pack);
  };

  const isNew = !initialPack.id || initialPack.id.startsWith('new_');

  return (
    <div className="space-y-5 select-none text-white max-w-6xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171821] border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <PackEditorHeader
        pack={pack}
        isNew={isNew}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onFieldChange={handleFieldChange}
        onCancel={onCancel}
        onSave={handleSubmit}
        onDeleteRequest={onDelete ? () => setIsConfirmDeleteOpen(true) : undefined}
      />

      {/* Formulário Principal da Página */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {activeTab === 'info' && (
          <PackInfoTab
            pack={pack}
            onChangeField={handleFieldChange}
            onChangePrice={handlePriceChange}
            onOpenCoverPicker={() => setPickerTarget({ type: 'cover' })}
          />
        )}

        {activeTab === 'previews' && (
          <PackPreviewsTab
            previewImages={pack.previewImages}
            onAddClick={() => setPickerTarget({ type: 'previewPhoto' })}
            onRemovePhoto={handleRemovePreviewPhoto}
          />
        )}

        {activeTab === 'vault' && (
          <PackVaultTab
            exclusivePhotos={pack.exclusivePhotos}
            videos={pack.videos}
            onAddPhotoClick={() => setPickerTarget({ type: 'exclusivePhoto' })}
            onRemovePhoto={handleRemoveExclusivePhoto}
            onAddVideo={handleAddVideo}
            onUpdateVideo={handleUpdateVideo}
            onRemoveVideo={handleRemoveVideo}
          />
        )}

        {/* Floating Bottom Bar para Salvar */}
        <div className="sticky bottom-4 z-30 p-3 rounded-xl bg-[#171821]/95 backdrop-blur-md border border-white/[0.08] shadow-xl flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar e Descartar
          </button>

          <button
            type="submit"
            className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Pack Agora</span>
          </button>
        </div>
      </form>

      {/* Image Picker Modal para Seleção Rápida */}
      {pickerTarget && (
        <ImagePickerModal
          isOpen={!!pickerTarget}
          library={content.library || []}
          albums={content.albums || []}
          onSelect={(url) => {
            if (pickerTarget.type === 'cover') {
              handleFieldChange('imageUrl', url);
            } else if (pickerTarget.type === 'previewPhoto') {
              handleAddPreviewPhoto(url);
            } else if (pickerTarget.type === 'exclusivePhoto') {
              handleAddExclusivePhoto(url);
            }
            setPickerTarget(null);
          }}
          onClose={() => setPickerTarget(null)}
          onUploadNew={onUploadNew}
        />
      )}

      {/* Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Excluir este Pack?"
        description={`Deseja realmente remover o produto "${pack.title}"? Esta ação removerá o pack da vitrine.`}
        confirmText="Sim, Excluir"
        onConfirm={() => {
          setIsConfirmDeleteOpen(false);
          if (onDelete && pack.id) {
            onDelete(pack.id);
          }
        }}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
}
