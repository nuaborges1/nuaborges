import React, { useState } from 'react';
import { AvulsoProductItem, AvulsoVideoItem, LibraryImageItem, SiteContent, AvulsosSectionData } from '@/lib/types';
import { autoDetectVideoMetadata } from './videoMetadata';
import {
  generateSlugFromTitle,
  isMediaItemAVideo,
  resolveVideoUrls,
  sanitizeItemMedia,
} from './avulsoUtils';

const ensureAvulsosSection = (
  section: AvulsosSectionData | undefined,
  items: AvulsoProductItem[]
): AvulsosSectionData => ({
  eyebrow: section?.eyebrow || 'CONTEÚDOS AVULSOS',
  title: section?.title || 'Acervo Sob Demanda',
  subtitle: section?.subtitle || 'Acervo Sob Demanda',
  active: section?.active !== false,
  upsellText: section?.upsellText || '',
  upsellUrl: section?.upsellUrl || '',
  items,
});

interface UseAvulsoModalOperationsParams {
  items: AvulsoProductItem[];
  updateAvulsos: (fields: Partial<NonNullable<SiteContent['avulsos']>>) => void;
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onEditPack?: (pack: AvulsoProductItem) => void;
  onCreateNewPack?: () => void;
}

export function useAvulsoModalOperations({
  items,
  updateAvulsos,
  onAdministrativeChange,
  onEditPack,
  onCreateNewPack,
}: UseAvulsoModalOperationsParams) {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemData, setEditingItemData] = useState<AvulsoProductItem | null>(null);
  const [modalTab, setModalTab] = useState<'general' | 'previews' | 'vault'>('general');

  const [pickerTarget, setPickerTarget] = useState<{
    type: 'cover' | 'previewPhoto' | 'exclusivePhoto' | 'packVideo' | 'videoPoster';
    index: number;
    videoIndex?: number;
  } | null>(null);

  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const handleStartCreateItem = () => {
    if (onCreateNewPack) {
      onCreateNewPack();
      return;
    }
    const defaultTitle = 'Novo Conteúdo Exclusivo';
    const autoSlug = generateSlugFromTitle(defaultTitle) + '-' + Date.now().toString().slice(-4);
    const newItem: AvulsoProductItem = {
      id: 'avulso-' + Date.now(),
      slug: autoSlug,
      title: defaultTitle,
      price: 'R$ 39,90',
      numericPrice: 39.9,
      duration: '1 Foto 4K',
      badge: 'LANÇAMENTO',
      description: 'Descrição envolvente e autoral da produção...',
      longDescription: 'Apresentação detalhada da narrativa fotográfica e audiovisual do ensaio.',
      imageUrl: '/images/nua/gallery/gallery-1.png',
      previewImages: ['/images/nua/gallery/gallery-1.png'],
      exclusivePhotos: ['/images/nua/gallery/gallery-1.png'],
      videos: [],
      checkoutUrl: `/avulsos/${autoSlug}`,
      buttonText: 'QUERO VER AGORA',
      active: false,
      isDraft: true,
    };

    setEditingItemIndex(-1);
    setEditingItemData(newItem);
    setModalTab('general');
  };

  const handleStartEditItem = (index: number) => {
    const item = items[index];
    if (onEditPack && item) {
      onEditPack(item);
      return;
    }
    setEditingItemIndex(index);
    const sanitized = sanitizeItemMedia({
      ...item,
      exclusivePhotos:
        item.exclusivePhotos && item.exclusivePhotos.length > 0
          ? item.exclusivePhotos
          : item.previewImages || [],
    });
    setEditingItemData(sanitized);
    setModalTab('general');
  };

  const handleSaveModalItem = () => {
    if (!editingItemData) return;

    const sanitizedData = sanitizeItemMedia(editingItemData);

    let numericPrice = sanitizedData.numericPrice;
    if (sanitizedData.price) {
      const clean = sanitizedData.price.replace(/[^\d,.]/g, '').replace(',', '.');
      const parsed = parseFloat(clean);
      if (!isNaN(parsed) && parsed > 0) {
        numericPrice = parsed;
      }
    }

    const autoSlug = generateSlugFromTitle(sanitizedData.title || 'novo-ensaio');
    const rawSlug = sanitizedData.slug || autoSlug;
    const finalSlug =
      rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '') || autoSlug;
    const finalCheckout = `/avulsos/${finalSlug}`;
    const formattedPrice = numericPrice
      ? `R$ ${numericPrice.toFixed(2).replace('.', ',')}`
      : sanitizedData.price;

    const isPublished = sanitizedData.active !== false;
    const finalItem: AvulsoProductItem = {
      ...sanitizedData,
      modality: 'pack',
      previewImages: sanitizedData.previewImages || [],
      exclusivePhotos: sanitizedData.exclusivePhotos || [],
      videos: sanitizedData.videos || [],
      slug: finalSlug,
      checkoutUrl: finalCheckout,
      price: formattedPrice,
      numericPrice: numericPrice || 39.9,
      active: isPublished,
      isDraft: !isPublished,
    };

    const newItems =
      editingItemIndex === -1 ? [finalItem, ...items] : [...items];
    if (editingItemIndex !== -1 && editingItemIndex !== null && editingItemIndex >= 0) {
      newItems[editingItemIndex] = finalItem;
    }

    if (onAdministrativeChange) {
      onAdministrativeChange(
        (prev) => ({
          ...prev,
          avulsos: ensureAvulsosSection(prev.avulsos, newItems),
        }),
        {
          summary: editingItemIndex === -1 ? 'Novo conteúdo criado' : 'Conteúdo atualizado',
          feedbackMessage:
            editingItemIndex === -1 ? 'Conteúdo salvo como rascunho.' : 'Conteúdo salvo com sucesso.',
        }
      );
    } else {
      updateAvulsos({ items: newItems });
    }

    setEditingItemIndex(null);
    setEditingItemData(null);
  };

  const handleCloneItem = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const source = items[index];
    if (!source) return;

    const sourcePhotos = Array.isArray(source.exclusivePhotos) ? source.exclusivePhotos : [];
    const sourceVideos = Array.isArray(source.videos) ? source.videos : [];

    const newTitle = `${source.title} (Cópia)`;
    const newSlug = generateSlugFromTitle(newTitle) + '-' + Date.now().toString().slice(-4);
    const clonedItem: AvulsoProductItem = {
      ...source,
      id: 'avulso-' + Date.now(),
      title: newTitle,
      slug: newSlug,
      checkoutUrl: `/avulsos/${newSlug}`,
      badge: 'CÓPIA',
      active: false,
      isDraft: true,
      previewImages: Array.isArray(source.previewImages) ? [...source.previewImages] : [],
      exclusivePhotos: [...sourcePhotos],
      videos: sourceVideos.map((v) => ({ ...v })),
      technicalDetails: source.technicalDetails ? { ...source.technicalDetails } : undefined,
    };

    const newItems = [...items];
    newItems.splice(index + 1, 0, clonedItem);

    const feedbackMessage = 'Cópia criada como rascunho.';

    if (onAdministrativeChange) {
      onAdministrativeChange(
        (prev) => ({
          ...prev,
          avulsos: ensureAvulsosSection(prev.avulsos, newItems),
        }),
        { summary: 'Conteúdo duplicado', feedbackMessage }
      );
    } else {
      updateAvulsos({ items: newItems });
    }
  };

  const handleUpdateModalFields = (fields: Partial<AvulsoProductItem>) => {
    setEditingItemData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      if (
        fields.title &&
        (editingItemIndex === -1 || !prev.slug || prev.slug.startsWith('novo-'))
      ) {
        const autoSlug = generateSlugFromTitle(fields.title);
        updated.slug = autoSlug;
        if (!prev.checkoutUrl || prev.checkoutUrl.startsWith('/avulsos/')) {
          updated.checkoutUrl = `/avulsos/${autoSlug}`;
        }
      }
      return updated;
    });
  };

  const handleUpdateVideoField = (
    videoIndex: number,
    field: string,
    value: string
  ) => {
    if (!editingItemData) return;
    const currentVideos = [...(editingItemData.videos || [])];
    if (currentVideos[videoIndex]) {
      currentVideos[videoIndex] = {
        ...currentVideos[videoIndex],
        [field]: value,
      };
      handleUpdateModalFields({ videos: currentVideos });
    }
  };

  const handleAddEmptyVideoCard = () => {
    if (!editingItemData) return;
    const currentVideos = [...(editingItemData.videos || [])];
    const nextNumber = currentVideos.length + 1;
    const newVid: AvulsoVideoItem = {
      id: 'vid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      title: `Vídeo ${nextNumber} — ${editingItemData.title || 'Produção Autoral'}`,
      url: '',
      posterUrl: editingItemData.imageUrl || '',
      duration: 'Vídeo 4K UHD',
    };
    handleUpdateModalFields({ videos: [...currentVideos, newVid] });
  };

  const handleCopyPreviewsToVault = () => {
    if (!editingItemData) return;
    const isAvulso = editingItemData.modality === 'avulso';
    const previews = editingItemData.previewImages || [];
    handleUpdateModalFields({ exclusivePhotos: isAvulso ? previews.slice(0, 1) : [...previews] });
  };

  const handleSelectImageForModal = async (
    selectedMediaUrl: string,
    mediaItem?: LibraryImageItem
  ) => {
    if (!pickerTarget || !editingItemData) return;

    if (pickerTarget.type === 'cover') {
      const isVid = mediaItem?.isVideo || isMediaItemAVideo(selectedMediaUrl);
      if (isVid) {
        const { posterUrl } = resolveVideoUrls(selectedMediaUrl, mediaItem);
        handleUpdateModalFields({ imageUrl: posterUrl || selectedMediaUrl });
      } else {
        handleUpdateModalFields({ imageUrl: selectedMediaUrl });
      }
    } else if (pickerTarget.type === 'previewPhoto') {
      const isAvulso = editingItemData.modality === 'avulso';
      if (isAvulso) {
        handleUpdateModalFields({ previewImages: [selectedMediaUrl] });
      } else {
        const currentPreviews = editingItemData.previewImages || [];
        if (!currentPreviews.includes(selectedMediaUrl)) {
          handleUpdateModalFields({ previewImages: [...currentPreviews, selectedMediaUrl] });
        }
      }
    } else if (pickerTarget.type === 'exclusivePhoto') {
      const isAvulso = editingItemData.modality === 'avulso';
      if (isAvulso) {
        handleUpdateModalFields({ exclusivePhotos: [selectedMediaUrl] });
      } else {
        const currentExclusive = editingItemData.exclusivePhotos || [];
        if (!currentExclusive.includes(selectedMediaUrl)) {
          handleUpdateModalFields({ exclusivePhotos: [...currentExclusive, selectedMediaUrl] });
        }
      }
    } else if (pickerTarget.type === 'packVideo') {
      const { videoUrl, posterUrl } = resolveVideoUrls(selectedMediaUrl, mediaItem);
      const currentVideos = [...(editingItemData.videos || [])];

      if (pickerTarget.videoIndex !== undefined && currentVideos[pickerTarget.videoIndex]) {
        currentVideos[pickerTarget.videoIndex] = {
          ...currentVideos[pickerTarget.videoIndex],
          url: videoUrl,
          posterUrl:
            posterUrl ||
            currentVideos[pickerTarget.videoIndex].posterUrl ||
            editingItemData.imageUrl,
          title:
            currentVideos[pickerTarget.videoIndex].title ||
            mediaItem?.customName ||
            mediaItem?.name ||
            `Vídeo — ${editingItemData.title}`,
        };
        handleUpdateModalFields({ videos: currentVideos });
      } else {
        const detected = await autoDetectVideoMetadata(videoUrl);
        const newVid: AvulsoVideoItem = {
          id: 'vid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          title: mediaItem?.customName || mediaItem?.name || `Vídeo — ${editingItemData.title}`,
          url: videoUrl,
          posterUrl: posterUrl || editingItemData.imageUrl,
          duration: detected.duration || 'Vídeo 4K UHD',
        };
        handleUpdateModalFields({ videos: [...currentVideos, newVid] });
      }
    } else if (pickerTarget.type === 'videoPoster') {
      if (pickerTarget.videoIndex !== undefined) {
        const currentVideos = [...(editingItemData.videos || [])];
        if (currentVideos[pickerTarget.videoIndex]) {
          currentVideos[pickerTarget.videoIndex] = {
            ...currentVideos[pickerTarget.videoIndex],
            posterUrl: selectedMediaUrl,
          };
          handleUpdateModalFields({ videos: currentVideos });
        }
      }
    }

    setPickerTarget(null);
  };

  const handleSelectMultipleImagesForModal = async (
    imageUrls: string[],
    mediaItems?: LibraryImageItem[]
  ) => {
    if (!pickerTarget || !editingItemData || imageUrls.length === 0) return;

    if (pickerTarget.type === 'cover') {
      handleSelectImageForModal(imageUrls[0], mediaItems?.[0]);
    } else if (pickerTarget.type === 'previewPhoto') {
      const isAvulso = editingItemData.modality === 'avulso';
      if (isAvulso) {
        handleUpdateModalFields({ previewImages: [imageUrls[0]] });
      } else {
        const currentPreviews = [...(editingItemData.previewImages || [])];
        for (const url of imageUrls) {
          if (!currentPreviews.includes(url)) currentPreviews.push(url);
        }
        handleUpdateModalFields({ previewImages: currentPreviews });
      }
    } else if (pickerTarget.type === 'exclusivePhoto') {
      const isAvulso = editingItemData.modality === 'avulso';
      if (isAvulso) {
        handleUpdateModalFields({ exclusivePhotos: [imageUrls[0]] });
      } else {
        const currentExclusive = [...(editingItemData.exclusivePhotos || [])];
        for (const url of imageUrls) {
          if (!currentExclusive.includes(url)) currentExclusive.push(url);
        }
        handleUpdateModalFields({ exclusivePhotos: currentExclusive });
      }
    } else if (pickerTarget.type === 'packVideo') {
      const currentVideos = [...(editingItemData.videos || [])];

      for (const url of imageUrls) {
        const item = mediaItems?.find((m) => m.url === url);
        const { videoUrl, posterUrl } = resolveVideoUrls(url, item);

        if (!currentVideos.some((v) => v.url === videoUrl)) {
          const detected = await autoDetectVideoMetadata(videoUrl);
          currentVideos.push({
            id: 'vid-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            title: item?.customName || item?.name || `Vídeo — ${editingItemData.title}`,
            url: videoUrl,
            posterUrl: posterUrl || editingItemData.imageUrl,
            duration: detected.duration || 'Vídeo 4K UHD',
          });
        }
      }

      handleUpdateModalFields({ videos: currentVideos });
    }

    setPickerTarget(null);
  };

  const handleToggleItemActiveDirect = (index: number) => {
    const updated = [...items];
    if (updated[index]) {
      const nextActive = updated[index].active === false;
      updated[index] = {
        ...updated[index],
        active: nextActive,
        isDraft: !nextActive,
      };
      if (onAdministrativeChange) {
        onAdministrativeChange(
          (prev) => ({
            ...prev,
            avulsos: ensureAvulsosSection(prev.avulsos, updated),
          }),
          { summary: 'Visibilidade alterada', feedbackMessage: 'Visibilidade do item atualizada.' }
        );
      } else {
        updateAvulsos({ items: updated });
      }
    }
  };

  const handleDeleteItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    if (onAdministrativeChange) {
      onAdministrativeChange(
        (prev) => ({
          ...prev,
          avulsos: ensureAvulsosSection(prev.avulsos, updated),
        }),
        { summary: 'Excluir conteúdo', feedbackMessage: 'Conteúdo removido com sucesso.' }
      );
    } else {
      updateAvulsos({ items: updated });
    }
    setDeleteConfirmIndex(null);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(target, 0, moved);
    if (onAdministrativeChange) {
      onAdministrativeChange(
        (prev) => ({
          ...prev,
          avulsos: ensureAvulsosSection(prev.avulsos, updated),
        }),
        { summary: 'Reordenar conteúdos', feedbackMessage: 'Ordem dos conteúdos atualizada.' }
      );
    } else {
      updateAvulsos({ items: updated });
    }
  };

  return {
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
  };
}
