'use client';

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { DEFAULT_SITE_CONTENT } from '@/lib/defaultContent';
import { ImagePickerModal } from './ImagePickerModal';
import { ConfirmModal } from './ConfirmModal';
import { HeroTextForm } from './hero/HeroTextForm';
import { HeroHeaderForm, HeaderData } from './hero/HeroHeaderForm';
import { HeroPhotosManager } from './hero/HeroPhotosManager';
import { HeroPreviewModal } from './hero/HeroPreviewModal';

interface HeroEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

export function HeroEditor({ content, onChange, onUploadNew }: HeroEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [previewingPhotoUrl, setPreviewingPhotoUrl] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const hero = content.hero;
  const header: HeaderData = content.header || {
    brandName: 'Nua Borges',
    brandMonogram: 'NB',
    navLogoStyle: 'editorial' as const,
    showInstagram: true,
    showOnlyFans: true,
    onlyFansText: 'ASSINAR CLUB',
    onlyFansUrl: 'https://onlyfans.com/nuaborges',
  };

  const updateHeader = (fields: Partial<HeaderData>) => {
    onChange((prev) => ({
      ...prev,
      header: {
        ...(prev.header || header),
        ...fields,
      },
    }));
  };

  const updateHero = (
    updater: Partial<typeof hero> | ((prevHero: typeof hero) => Partial<typeof hero>)
  ) => {
    onChange((prev) => {
      const currentHero = prev.hero;
      const fields = typeof updater === 'function' ? updater(currentHero) : updater;
      return {
        ...prev,
        hero: { ...currentHero, ...fields },
      };
    });
  };

  const handleOpenPickerForSlide = (index: number) => {
    setEditingSlideIndex(index);
    setPickerOpen(true);
  };

  const handleAddNewSlide = () => {
    setEditingSlideIndex(hero.photos.length);
    setPickerOpen(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    if (editingSlideIndex === null) return;
    const targetIdx = editingSlideIndex;

    updateHero((currentHero) => {
      const currentPhotos = [...(currentHero.photos || [])];
      if (targetIdx < currentPhotos.length) {
        currentPhotos[targetIdx] = {
          ...currentPhotos[targetIdx],
          id: 'hero-' + Date.now(),
          imageUrl,
        };
      } else {
        currentPhotos.unshift({
          id: 'hero-' + Date.now(),
          title: 'Nua Borges',
          session: String(currentPhotos.length + 1).padStart(2, '0'),
          imageUrl,
        });
      }
      return { photos: currentPhotos };
    });

    setPickerOpen(false);
    setEditingSlideIndex(null);
  };

  const handleRemoveSlide = (index: number) => {
    if (hero.photos.length <= 1) {
      setNoticeMessage('A Capa precisa de pelo menos uma foto.');
      setTimeout(() => setNoticeMessage(null), 3500);
      return;
    }
    setDeleteConfirmIndex(index);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmIndex === null) return;
    const idxToRemove = deleteConfirmIndex;
    updateHero((currentHero) => ({
      photos: (currentHero.photos || []).filter((_, i) => i !== idxToRemove),
    }));
    setDeleteConfirmIndex(null);
  };

  const handleMoveSlide = (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= hero.photos.length) return;
    const updated = [...hero.photos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updateHero({ photos: updated });
  };

  const currentSlideUrl =
    editingSlideIndex !== null && editingSlideIndex < hero.photos.length
      ? hero.photos[editingSlideIndex].imageUrl
      : undefined;

  const handleResetToDefault = () => {
    updateHero(DEFAULT_SITE_CONTENT.hero);
    updateHeader(DEFAULT_SITE_CONTENT.header);
    setNoticeMessage('✓ Capa restaurada para o padrão editorial autoral.');
    setTimeout(() => setNoticeMessage(null), 3500);
    setResetConfirmOpen(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Notice Toast */}
      {noticeMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-emerald-400 hover:text-white text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Information & Texts Card */}
      <HeroTextForm
        hero={hero}
        onUpdateHero={updateHero}
        onOpenResetConfirm={() => setResetConfirmOpen(true)}
        onOpenLogoPicker={() => setLogoPickerOpen(true)}
      />

      {/* 2. Menu Superior & Identidade do Topo */}
      <HeroHeaderForm
        header={header}
        onUpdateHeader={updateHeader}
      />

      {/* 3. Hero Photos Carousel Management */}
      <HeroPhotosManager
        photos={hero.photos}
        onAddNewSlide={handleAddNewSlide}
        onOpenPickerForSlide={handleOpenPickerForSlide}
        onRemoveSlide={handleRemoveSlide}
        onMoveSlide={handleMoveSlide}
        onPreviewPhoto={(url) => setPreviewingPhotoUrl(url)}
      />

      {/* Universal Image Picker Modal */}
      <ImagePickerModal
        isOpen={pickerOpen}
        library={content.library}
        albums={content.albums}
        currentImageUrl={currentSlideUrl}
        title={
          editingSlideIndex !== null && editingSlideIndex < hero.photos.length
            ? `Trocar Foto 0${editingSlideIndex + 1} da Capa`
            : 'Adicionar Nova Foto à Capa'
        }
        onSelect={handleSelectImage}
        onUploadNew={onUploadNew}
        onClose={() => {
          setPickerOpen(false);
          setEditingSlideIndex(null);
        }}
      />

      {/* Logo Picker Modal */}
      <ImagePickerModal
        isOpen={logoPickerOpen}
        library={content.library}
        albums={content.albums}
        currentImageUrl={hero.logoUrl}
        title="Selecionar Imagem de Logo da Capa"
        onSelect={(url) => {
          updateHero({ logoUrl: url, useLogo: true });
          setLogoPickerOpen(false);
        }}
        onUploadNew={onUploadNew}
        onClose={() => setLogoPickerOpen(false)}
      />

      {/* Modal de Visualização de Foto em Alta Resolução */}
      <HeroPreviewModal
        photoUrl={previewingPhotoUrl}
        onClose={() => setPreviewingPhotoUrl(null)}
      />

      {/* Confirmation Modal for Deleting Photos */}
      <ConfirmModal
        isOpen={deleteConfirmIndex !== null}
        title="Remover esta foto da capa?"
        description="A foto será retirada do carrossel da capa, mas continuará guardada no seu acervo para você reutilizar quando quiser."
        confirmText="Remover Foto"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmIndex(null)}
      />

      {/* Confirmation Modal for Resetting Hero to Default */}
      <ConfirmModal
        isOpen={resetConfirmOpen}
        title="Restaurar Padrão Editorial da Capa?"
        description="Esta ação restaura os textos de apresentação, títulos e fotos originais da capa do site para o padrão editorial da marca Nua Borges."
        confirmText="Sim, Restaurar"
        cancelText="Cancelar"
        onConfirm={handleResetToDefault}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
