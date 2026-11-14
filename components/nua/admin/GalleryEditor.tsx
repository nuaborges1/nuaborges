'use client';

import React, { useState } from 'react';
import {
  Plus,
  ImageIcon,
  Film,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { SiteContent, GalleryPhotoItem, LibraryImageItem } from '@/lib/types';
import { ImagePickerModal } from './ImagePickerModal';
import { ConfirmModal } from './ConfirmModal';
import { isMediaVideo } from '@/lib/media';
import { GalleryHeaderSettings } from './gallery/GalleryHeaderSettings';
import { GalleryItemRow } from './gallery/GalleryItemRow';
import { GalleryPreviewModal } from './gallery/GalleryPreviewModal';

interface GalleryEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

export function GalleryEditor({ content, onChange, onUploadNew }: GalleryEditorProps) {
  const [showPageHeaderSettings, setShowPageHeaderSettings] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [previewingPhotoUrl, setPreviewingPhotoUrl] = useState<string | null>(null);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photos' | 'videos'>('all');

  const gallery = content.gallery;

  const updateGallery = (
    updater: Partial<typeof gallery> | ((prevGallery: typeof gallery) => Partial<typeof gallery>)
  ) => {
    onChange((prev) => {
      const currentGallery = prev.gallery;
      const fields = typeof updater === 'function' ? updater(currentGallery) : updater;
      return {
        ...prev,
        gallery: { ...currentGallery, ...fields },
      };
    });
  };

  const handleOpenPickerForPhoto = (index: number) => {
    setEditingPhotoIndex(index);
    setPickerOpen(true);
  };

  const handleAddNewPhoto = () => {
    setEditingPhotoIndex(gallery.photos.length);
    setPickerOpen(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    if (editingPhotoIndex === null) return;
    const targetIdx = editingPhotoIndex;

    updateGallery((currentGallery) => {
      const updated = [...(currentGallery.photos || [])];
      if (targetIdx < updated.length) {
        updated[targetIdx] = {
          ...updated[targetIdx],
          id: 'gal-' + Date.now(),
          imageUrl,
        };
      } else {
        updated.unshift({
          id: 'gal-' + Date.now(),
          title: 'Novo Ensaio',
          caption: 'Ensaio fotográfico autoral',
          imageUrl,
          linkUrl: content.hero?.ctaUrl || 'https://onlyfans.com/nuaborges',
          active: true,
        });
      }
      return { photos: updated };
    });

    setPickerOpen(false);
    setEditingPhotoIndex(null);
  };

  const handleUpdateItem = (index: number, fields: Partial<GalleryPhotoItem>) => {
    updateGallery((currentGallery) => {
      const updated = [...(currentGallery.photos || [])];
      updated[index] = { ...updated[index], ...fields };
      return { photos: updated };
    });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmIndex === null) return;
    const idxToRemove = deleteConfirmIndex;
    updateGallery((currentGallery) => ({
      photos: (currentGallery.photos || []).filter((_, i) => i !== idxToRemove),
    }));
    setDeleteConfirmIndex(null);
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= gallery.photos.length) return;
    const updated = [...gallery.photos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updateGallery({ photos: updated });
  };

  const currentPhotoUrl =
    editingPhotoIndex !== null && editingPhotoIndex < gallery.photos.length
      ? gallery.photos[editingPhotoIndex].imageUrl
      : undefined;

  const activePhotosCount = gallery.photos.filter((p) => p.active !== false).length;
  const hiddenPhotosCount = gallery.photos.filter((p) => p.active === false).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Info & Vitrine Settings Collapsible */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[#f4a7b9] text-[10px] font-mono font-semibold tracking-wider uppercase block mb-1">
              PORTFÓLIO VISUAL
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide">Bastidores &amp; Registros</h3>
            <p className="text-zinc-400 text-xs font-light mt-0.5">
              Gerencie os ensaios e fotos de bastidores exibidos na faixa horizontal da Home.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPageHeaderSettings(!showPageHeaderSettings)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium border border-white/10 transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Sliders className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>{showPageHeaderSettings ? 'Ocultar Textos' : 'Editar Textos da Vitrine'}</span>
            {showPageHeaderSettings ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>
        </div>

        {showPageHeaderSettings && (
          <GalleryHeaderSettings
            gallery={gallery}
            onChange={(fields) => updateGallery(fields)}
          />
        )}
      </div>

      {/* Ensaios List */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#f4a7b9] text-[10px] font-mono font-semibold tracking-wider uppercase block">
                CURADORIA VISUAL
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                <CheckCircle2 className="w-3 h-3" />
                {activePhotosCount} Ativos no Site
              </span>
              {hiddenPhotosCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 text-[10px] font-mono">
                  {hiddenPhotosCount} Ocultos
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide">
              Ensaios da Galeria ({gallery.photos.length})
            </h3>
            <p className="text-zinc-400 text-xs font-light mt-0.5">
              Organize os ensaios em destaque exibidos publicamente na home. Use as setas para definir a ordem.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddNewPhoto}
            className="h-8 px-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Novo Ensaio</span>
          </button>
        </div>

        {/* Filtros Instantâneos: Todos / Fotos / Vídeos */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#101116] border border-white/[0.06] select-none">
          <button
            type="button"
            onClick={() => setMediaFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              mediaFilter === 'all'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Todos os Ensaios</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] font-mono">
              {gallery.photos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMediaFilter('photos')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              mediaFilter === 'photos'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <ImageIcon className="w-3 h-3 text-[#f4a7b9]" />
            <span>Apenas Fotos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] font-mono">
              {gallery.photos.filter((p) => !isMediaVideo(p.imageUrl)).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMediaFilter('videos')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              mediaFilter === 'videos'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Film className="w-3 h-3 text-[#f4a7b9]" />
            <span>Produções em Vídeo</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] font-mono">
              {gallery.photos.filter((p) => isMediaVideo(p.imageUrl)).length}
            </span>
          </button>
        </div>

        {gallery.photos.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-white/10 rounded-xl bg-[#101116]">
            <div className="w-10 h-10 rounded-full bg-[#f4a7b9]/10 text-[#f4a7b9] flex items-center justify-center mx-auto mb-2">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h4 className="text-white font-medium text-sm mb-1">Ainda não há ensaios na galeria</h4>
            <p className="text-zinc-400 text-xs max-w-md mx-auto mb-4">
              Adicione fotos dos seus ensaios autorais para que os visitantes possam conhecer o seu trabalho.
            </p>
            <button
              type="button"
              onClick={handleAddNewPhoto}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Primeiro Ensaio</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {gallery.photos
              .map((photo, originalIndex) => ({ photo, index: originalIndex }))
              .filter(({ photo }) => {
                const isVid = isMediaVideo(photo.imageUrl);
                if (mediaFilter === 'photos') return !isVid;
                if (mediaFilter === 'videos') return isVid;
                return true;
              })
              .map(({ photo, index }) => (
                <GalleryItemRow
                  key={`${photo.id || index}-${photo.imageUrl}`}
                  photo={photo}
                  index={index}
                  totalCount={gallery.photos.length}
                  onOpenPicker={() => handleOpenPickerForPhoto(index)}
                  onPreview={(url) => setPreviewingPhotoUrl(url)}
                  onUpdate={(fields) => handleUpdateItem(index, fields)}
                  onMoveUp={() => handleMovePhoto(index, 'up')}
                  onMoveDown={() => handleMovePhoto(index, 'down')}
                  onDelete={() => setDeleteConfirmIndex(index)}
                />
              ))}
          </div>
        )}
      </div>

      <ImagePickerModal
        isOpen={pickerOpen}
        library={content.library}
        albums={content.albums}
        currentImageUrl={currentPhotoUrl}
        title={
          editingPhotoIndex !== null && editingPhotoIndex < gallery.photos.length
            ? `Trocar Foto do Ensaio: ${gallery.photos[editingPhotoIndex].title || 'Ensaio'}`
            : 'Adicionar Foto para Novo Ensaio'
        }
        onSelect={handleSelectImage}
        onUploadNew={onUploadNew}
        onClose={() => {
          setPickerOpen(false);
          setEditingPhotoIndex(null);
        }}
      />

      <GalleryPreviewModal
        url={previewingPhotoUrl}
        onClose={() => setPreviewingPhotoUrl(null)}
      />

      <ConfirmModal
        isOpen={deleteConfirmIndex !== null}
        title={
          deleteConfirmIndex !== null
            ? `Remover ensaio "${gallery.photos[deleteConfirmIndex]?.title || 'Sem título'}"?`
            : 'Remover Ensaio da Galeria'
        }
        description="Deseja remover este ensaio da galeria do site? A foto continuará guardada no seu acervo para você reutilizar quando quiser."
        confirmText="Remover Ensaio"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmIndex(null)}
      />
    </div>
  );
}
