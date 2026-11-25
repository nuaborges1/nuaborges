/* Vinho maduro / Nua Borges */
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
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onUploadNew: (img: LibraryImageItem) => void;
}

export function GalleryEditor({ content, onChange, onAdministrativeChange, onUploadNew }: GalleryEditorProps) {
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

  const isAddingNewPhotos =
    editingPhotoIndex !== null && editingPhotoIndex >= gallery.photos.length;

  const handleSelectImage = (imageUrl: string) => {
    if (editingPhotoIndex === null) return;
    const targetIdx = editingPhotoIndex;

    if (targetIdx < gallery.photos.length) {
      // Trocar foto existente: operação administrativa executada diretamente
      const updated = [...(gallery.photos || [])];
      updated[targetIdx] = {
        ...updated[targetIdx],
        imageUrl,
      };
      if (onAdministrativeChange) {
        onAdministrativeChange((prev) => ({
          ...prev,
          gallery: { ...prev.gallery, photos: updated },
        }), {
          summary: 'Foto do ensaio trocada na galeria',
          feedbackMessage: 'Foto do ensaio atualizada.',
        });
      } else {
        updateGallery({ photos: updated });
      }
    } else {
      // Adicionar NOVA foto à galeria pública: execução e persistência imediata
      const updated = [
        {
          id: 'gal-' + Date.now(),
          title: 'Novo Ensaio',
          caption: 'Ensaio fotográfico autoral',
          imageUrl,
          linkUrl: content.hero?.ctaUrl || 'https://onlyfans.com/nuaborges',
          active: true,
        },
        ...(gallery.photos || []),
      ];
      if (onAdministrativeChange) {
        onAdministrativeChange((prev) => ({
          ...prev,
          gallery: { ...prev.gallery, photos: updated },
        }), {
          summary: 'Foto adicionada à galeria pública',
          feedbackMessage: 'Foto adicionada à galeria e visível no site.',
        });
      } else {
        updateGallery({ photos: updated });
      }
    }

    setPickerOpen(false);
    setEditingPhotoIndex(null);
  };

  const handleSelectMultipleImages = (urls: string[]) => {
    if (!urls.length) return;
    const current = [...(gallery.photos || [])];
    const existingUrls = new Set(current.map((p) => p.imageUrl));
    const newItems = urls
      .filter((url) => !existingUrls.has(url))
      .map((imageUrl, idx) => ({
        id: `gal-${Date.now()}-${idx}`,
        title: 'Novo Ensaio',
        caption: 'Ensaio fotográfico autoral',
        imageUrl,
        linkUrl: content.hero?.ctaUrl || 'https://onlyfans.com/nuaborges',
        active: true,
      }));
    const updated = [...newItems, ...current];

    if (onAdministrativeChange) {
      onAdministrativeChange((prev) => ({
        ...prev,
        gallery: { ...prev.gallery, photos: updated },
      }), {
        summary: `${newItems.length} foto(s) adicionada(s) à galeria`,
        feedbackMessage: `${newItems.length} foto(s) adicionada(s) à galeria e visível(is) no site.`,
      });
    } else {
      updateGallery({ photos: updated });
    }

    setPickerOpen(false);
    setEditingPhotoIndex(null);
  };

  const handleUpdateItem = (index: number, fields: Partial<GalleryPhotoItem>) => {
    const updated = [...(gallery.photos || [])];
    updated[index] = { ...updated[index], ...fields };

    if (onAdministrativeChange) {
      onAdministrativeChange((prev) => ({
        ...prev,
        gallery: { ...prev.gallery, photos: updated },
      }), {
        summary: 'Informações da foto na galeria atualizadas',
        feedbackMessage: fields.active !== undefined
          ? fields.active ? 'Foto exibida no site.' : 'Foto ocultada do site.'
          : 'Alteração salva.',
      });
    } else {
      updateGallery({ photos: updated });
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmIndex === null) return;
    const idxToRemove = deleteConfirmIndex;
    const updated = (gallery.photos || []).filter((_, i) => i !== idxToRemove);
    setDeleteConfirmIndex(null);

    // Remoção direta sem exigir publicação nem excluir arquivo original compartilhado (Cenário C)
    if (onAdministrativeChange) {
      onAdministrativeChange((prev) => ({
        ...prev,
        gallery: { ...prev.gallery, photos: updated },
      }), {
        summary: 'Remoção de foto da galeria pública',
        feedbackMessage: 'Foto removida da galeria.',
      });
    } else {
      updateGallery({ photos: updated });
    }
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= gallery.photos.length) return;
    const updated = [...gallery.photos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Reordenação direta sem exigir publicação (Cenário B)
    if (onAdministrativeChange) {
      onAdministrativeChange((prev) => ({
        ...prev,
        gallery: { ...prev.gallery, photos: updated },
      }), {
        summary: 'Reordenação de fotos na galeria pública',
        feedbackMessage: 'Nova posição da foto salva no site.',
      });
    } else {
      updateGallery({ photos: updated });
    }
  };

  const currentPhotoUrl =
    editingPhotoIndex !== null && editingPhotoIndex < gallery.photos.length
      ? gallery.photos[editingPhotoIndex].imageUrl
      : undefined;

  const activePhotosCount = gallery.photos.filter((p) => p.active !== false).length;
  const hiddenPhotosCount = gallery.photos.filter((p) => p.active === false).length;

  return (
    <div id="admin-gallery-section" data-field="gallery.section" className="space-y-5 w-full">
      {/* Painel Unificado da Vitrine de Ensaios Pública */}
      <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Vitrine de Ensaios no Site ({gallery.photos.length})
            </h3>
            <p className="text-zinc-400 text-xs font-light mt-0.5">
              Escolha quais fotos da sua Biblioteca de Mídias aparecem na vitrine da página inicial ({activePhotosCount} visíveis
              {hiddenPhotosCount > 0 ? ` · ${hiddenPhotosCount} ocultas` : ''}).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setShowPageHeaderSettings(!showPageHeaderSettings)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#0e1015] hover:bg-white/[0.06] text-zinc-200 hover:text-white text-xs font-medium border border-white/[0.08] transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#843C52]" />
              <span>{showPageHeaderSettings ? 'Ocultar textos da seção' : 'Textos da seção'}</span>
              {showPageHeaderSettings ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            <button
              type="button"
              onClick={handleAddNewPhoto}
              className="h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar fotos à galeria</span>
            </button>
          </div>
        </div>

        {showPageHeaderSettings && (
          <div className="pb-3 border-b border-white/[0.06]">
            <GalleryHeaderSettings
              gallery={gallery}
              onChange={(fields) => {
                if (fields.active !== undefined && onAdministrativeChange) {
                  onAdministrativeChange(
                    (prev) => ({
                      ...prev,
                      gallery: { ...prev.gallery, ...fields },
                    }),
                    {
                      summary: fields.active ? 'Galeria ativada no site' : 'Galeria ocultada do site',
                      feedbackMessage: fields.active ? 'Galeria ativada no site.' : 'Galeria ocultada do site.',
                    }
                  );
                } else {
                  updateGallery(fields);
                }
              }}
            />
          </div>
        )}

        {/* Filtros Instantâneos: Todos / Fotos / Vídeos */}
        <div className="inline-flex flex-wrap items-center p-1 rounded-xl bg-[#0e1015] border border-white/[0.06] select-none gap-1">
          <button
            type="button"
            onClick={() => setMediaFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              mediaFilter === 'all'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>Todos ({gallery.photos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMediaFilter('photos')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              mediaFilter === 'photos'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <ImageIcon className="w-3 h-3 text-[#843C52]" />
            <span>Fotos ({gallery.photos.filter((p) => !isMediaVideo(p.imageUrl)).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setMediaFilter('videos')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              mediaFilter === 'videos'
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Film className="w-3 h-3 text-[#843C52]" />
            <span>Vídeos ({gallery.photos.filter((p) => isMediaVideo(p.imageUrl)).length})</span>
          </button>
        </div>

        {gallery.photos.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-white/10 rounded-xl bg-[#0e1015]">
            <div className="w-10 h-10 rounded-full bg-[#843C52]/10 text-[#843C52] flex items-center justify-center mx-auto mb-2">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h4 className="text-white font-medium text-sm mb-1">Ainda não há ensaios na galeria</h4>
            <p className="text-zinc-400 text-xs max-w-md mx-auto mb-4">
              Escolha fotos da sua Biblioteca de Mídias para que os visitantes conheçam o seu trabalho na página inicial.
            </p>
            <button
              type="button"
              onClick={handleAddNewPhoto}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Primeiro Ensaio</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        publicOnly
        isOpen={pickerOpen}
        library={content.library}
        albums={content.albums}
        currentImageUrl={currentPhotoUrl}
        selectionMode={isAddingNewPhotos ? 'multiple' : 'single'}
        title={
          editingPhotoIndex !== null && editingPhotoIndex < gallery.photos.length
            ? `Trocar Foto do Ensaio: ${gallery.photos[editingPhotoIndex].title || 'Ensaio'}`
            : 'Adicionar Fotos à Vitrine de Ensaios'
        }
        subtitle={
          isAddingNewPhotos
            ? 'Selecione uma ou mais fotos da sua Biblioteca de Mídias para publicar na vitrine da página inicial'
            : 'Escolha a nova foto para substituir este item da vitrine'
        }
        onSelect={handleSelectImage}
        onSelectMultiple={isAddingNewPhotos ? handleSelectMultipleImages : undefined}
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
            : 'Remover Ensaio da Vitrine'
        }
        description="Deseja remover este ensaio da vitrine do site? A foto continuará guardada em segurança na sua Biblioteca de Mídias para você reutilizar quando quiser."
        confirmText="Remover da Vitrine"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmIndex(null)}
      />
    </div>
  );
}
