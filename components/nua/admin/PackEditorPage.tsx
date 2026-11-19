'use client';

import React, { useState, useRef, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SiteContent, AvulsoProductItem, LibraryImageItem, AvulsoVideoItem } from '@/lib/types';
import { cleanBrlInput, formatBrlPrice, parseBrlPrice } from '@/lib/formatters';
import { toSlug } from '@/lib/seo';
import { ImagePickerModal } from './ImagePickerModal';
import { ConfirmModal } from './ConfirmModal';
import { PackEditorHeader } from './packs/PackEditorHeader';
import { PackInfoTab } from './packs/PackInfoTab';
import { PackPreviewsTab } from './packs/PackPreviewsTab';
import { PackVaultTab } from './packs/PackVaultTab';
import { VideoThumbnailPickerModal } from './packs/VideoThumbnailPickerModal';

interface PackEditorPageProps {
  pack: AvulsoProductItem;
  content: SiteContent;
  onSave: (updatedPack: AvulsoProductItem) => void | Promise<void>;
  onDraftSave?: (updatedPack: AvulsoProductItem) => Promise<void>;
  onCancel: () => void;
  onDelete?: (packId: string) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

type PickerTarget =
  | { type: 'cover' }
  | { type: 'previewPhoto' }
  | { type: 'exclusivePhoto' }
  | { type: 'packVideo' }
  | { type: 'replaceVideo'; videoIndex: number }
  | { type: 'videoPoster'; videoIndex: number };

export function PackEditorPage({
  pack: initialPack,
  content,
  onSave,
  onDraftSave,
  onCancel,
  onDelete,
  onUploadNew,
}: PackEditorPageProps) {
  const [pack, setPack] = useState<AvulsoProductItem>({ ...initialPack });
  const [activeTab, setActiveTab] = useState<'info' | 'previews' | 'vault'>('info');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Video Thumbnail Picker Modal (YouTube style)
  const [videoThumbnailPicker, setVideoThumbnailPicker] = useState<{
    videoIndex: number;
    videoUrl: string;
    videoTitle?: string;
    currentPosterUrl?: string;
  } | null>(null);

  // Form Validation Errors
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    description?: string;
    imageUrl?: string;
  }>({});

  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSaveInFlightRef = useRef<Promise<void> | null>(null);
  const explicitLeaveRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  React.useEffect(() => {
    if (!onDraftSave || JSON.stringify(pack) === JSON.stringify(initialPack)) return;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      if (explicitLeaveRef.current) return;
      const draft = { ...pack, active: false, isDraft: true };
      const pending = onDraftSave(draft).catch((error) => {
        showToast(error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.');
      });
      const tracked = pending.finally(() => {
        if (draftSaveInFlightRef.current === tracked) draftSaveInFlightRef.current = null;
      });
      draftSaveInFlightRef.current = tracked;
    }, 800);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [pack, initialPack, onDraftSave, showToast]);

  const handleLeaveEditor = async () => {
    explicitLeaveRef.current = true;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    const changed = JSON.stringify(pack) !== JSON.stringify(initialPack);
    try {
      await draftSaveInFlightRef.current;
      if (changed && onDraftSave) await onDraftSave({ ...pack, active: false, isDraft: true });
      onCancel();
    } catch (error) {
      explicitLeaveRef.current = false;
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.');
    }
  };

  const handleFieldChange = (field: keyof AvulsoProductItem, value: any) => {
    // Limpa erro de validação correspondente ao editar o campo
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof typeof validationErrors];
        return next;
      });
    }

    if (field === 'title') {
      const newTitle = String(value || '');
      setPack((prev) => {
        const prevAutoSlug = toSlug(prev.title || '');
        const currentSlug = (prev.slug || '').trim();
        const shouldUpdateSlug =
          !currentSlug ||
          currentSlug === prevAutoSlug ||
          currentSlug.startsWith('pack_') ||
          currentSlug === 'ensaio-exclusivo' ||
          currentSlug === 'novo-conteudo-exclusivo';
        const newSlug = shouldUpdateSlug ? toSlug(newTitle) : currentSlug;
        return {
          ...prev,
          title: newTitle,
          slug: newSlug,
          checkoutUrl: `/avulsos/${newSlug}`,
        };
      });
      return;
    }

    if (field === 'slug') {
      const clean = toSlug(String(value || ''));
      setPack((prev) => ({
        ...prev,
        slug: clean,
        checkoutUrl: `/avulsos/${clean}`,
      }));
      return;
    }

    if (field === 'active') {
      const isActive = Boolean(value);
      setPack((prev) => ({
        ...prev,
        active: isActive,
        isDraft: !isActive,
      }));
      return;
    }

    if (field === 'modality' && value === 'avulso') {
      setPack((prev) => {
        const hasVid = (prev.videos || []).length > 0;
        const hasPho = (prev.exclusivePhotos || []).length > 0;
        let vids = prev.videos || [];
        let phos = prev.exclusivePhotos || [];
        if (hasVid && hasPho) {
          phos = [];
          vids = vids.slice(0, 1);
        } else if (hasVid) {
          vids = vids.slice(0, 1);
          phos = [];
        } else if (hasPho) {
          phos = phos.slice(0, 1);
          vids = [];
        }
        return {
          ...prev,
          modality: 'avulso',
          previewImages: [],
          exclusivePhotos: phos,
          videos: vids,
        };
      });
      return;
    }
    setPack((prev) => ({ ...prev, [field]: value }));
  };

  const handlePriceChange = (val: string) => {
    const cleaned = cleanBrlInput(val);
    const parsed = parseBrlPrice(cleaned);
    setPack((prev) => ({
      ...prev,
      price: cleaned,
      numericPrice: parsed,
    }));
  };

  const handlePriceBlur = () => {
    setPack((prev) => {
      const formatted = formatBrlPrice(prev.price);
      const parsed = parseBrlPrice(formatted);
      return {
        ...prev,
        price: formatted,
        numericPrice: parsed,
      };
    });
  };

  const handleAddPreviewPhotos = (urls: string[]) => {
    setPack((prev) => {
      const isAvulso = prev.modality === 'avulso';
      const current = isAvulso ? [] : prev.previewImages || [];
      const merged = isAvulso
        ? urls.slice(0, 1)
        : Array.from(new Set([...current, ...urls]));
      return {
        ...prev,
        previewImages: merged,
        imageUrl: merged[0] || prev.imageUrl || '',
      };
    });
    setPickerTarget(null);
  };

  const handleRemovePreviewPhoto = (idx: number) => {
    setPack((prev) => ({
      ...prev,
      previewImages: (prev.previewImages || []).filter((_, i) => i !== idx),
    }));
  };

  const handleAddExclusivePhotos = (urls: string[]) => {
    setPack((prev) => {
      const current = prev.exclusivePhotos || [];
      const merged = Array.from(new Set([...current, ...urls]));
      return { ...prev, exclusivePhotos: merged };
    });
    setPickerTarget(null);
  };

  const handleCopyPreviewsToVault = () => {
    const previews = pack.previewImages || [];
    if (previews.length === 0) return;
    handleAddExclusivePhotos(previews);
    showToast(`${previews.length} amostra(s) também incluídas no cofre protegido!`);
  };

  const handleRemoveExclusivePhoto = (idx: number) => {
    setPack((prev) => ({
      ...prev,
      exclusivePhotos: (prev.exclusivePhotos || []).filter((_, i) => i !== idx),
    }));
  };

  const buildVideoItemFromLibrary = (item: LibraryImageItem, fallbackUrl: string): AvulsoVideoItem => {
    const cleanTitle = (item?.customName || item?.name || 'Vídeo Autoral (4K UHD)').replace(
      /\.(mp4|mov|webm)$/i,
      ''
    );
    const resolvedDuration =
      item?.duration ||
      (item?.durationSeconds
        ? `${Math.floor(item.durationSeconds / 60)}:${String(
            Math.floor(item.durationSeconds % 60)
          ).padStart(2, '0')}`
        : 'Vídeo 4K');

    return {
      id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: cleanTitle,
      duration: resolvedDuration,
      url: item?.url || fallbackUrl,
      posterUrl: item?.posterUrl || pack.imageUrl || undefined,
    };
  };

  const handleAddVideosFromLibrary = (urls: string[], items?: LibraryImageItem[]) => {
    const newVideos: AvulsoVideoItem[] = urls.map((url, idx) => {
      const matched =
        items?.[idx] ||
        (content.library || []).find((m) => m.url === url || m.objectKey === url);
      return buildVideoItemFromLibrary(
        matched || ({ id: url, name: 'Vídeo Autoral 4K', url, uploadedAt: '' } as LibraryImageItem),
        url
      );
    });

    setPack((prev) => ({
      ...prev,
      videos: [...(prev.videos || []), ...newVideos],
    }));
    setPickerTarget(null);
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

  const handleOpenVideoPosterPicker = (vIdx: number) => {
    const vid = pack.videos?.[vIdx];
    if (vid?.url) {
      setVideoThumbnailPicker({
        videoIndex: vIdx,
        videoUrl: vid.url,
        videoTitle: vid.title || `Vídeo #${vIdx + 1}`,
        currentPosterUrl: vid.posterUrl,
      });
    } else {
      setPickerTarget({ type: 'videoPoster', videoIndex: vIdx });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { title?: string; description?: string; imageUrl?: string } = {};
    if (!pack.title?.trim()) {
      errors.title = 'Título do pack é obrigatório.';
    }
    if (!pack.description?.trim()) {
      errors.description = 'Descrição do pack é obrigatória.';
    }
    if (!pack.imageUrl?.trim()) {
      errors.imageUrl = 'Selecione uma foto de capa para o pack.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setActiveTab('info');
      showToast('Preencha os campos obrigatórios (título, descrição e foto de capa).');
      return;
    }

    explicitLeaveRef.current = true;
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    await draftSaveInFlightRef.current;

    const finalSlug = toSlug(pack.slug?.trim() || toSlug(pack.title) || 'pack-exclusivo');
    const formattedPrice = formatBrlPrice(pack.price);
    const parsedPrice = parseBrlPrice(formattedPrice);
    const isPublished = pack.active !== false;

    try {
      await onSave({
        ...pack,
        modality: 'pack',
        previewImages: pack.previewImages || [],
        exclusivePhotos: pack.exclusivePhotos || [],
        videos: pack.videos || [],
        slug: finalSlug,
        checkoutUrl: `/avulsos/${finalSlug}`,
        active: isPublished,
        isDraft: !isPublished,
        price: formattedPrice,
        numericPrice: parsedPrice,
      });
    } catch (error) {
      explicitLeaveRef.current = false;
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar o pack.');
    }
  };

  const isNew = !initialPack.id || initialPack.id.startsWith('new_') || !initialPack.title;

  return (
    <div className="space-y-5 select-none text-white w-full">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#14151c] border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl">
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
        onCancel={handleLeaveEditor}
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
            onBlurPrice={handlePriceBlur}
            onOpenCoverPicker={() => setPickerTarget({ type: 'cover' })}
            validationErrors={validationErrors}
          />
        )}

        {activeTab === 'previews' && (
          <PackPreviewsTab
            previewImages={pack.previewImages}
            modality={pack.modality || 'pack'}
            onAddPhotos={() => setPickerTarget({ type: 'previewPhoto' })}
            onRemovePhoto={handleRemovePreviewPhoto}
          />
        )}

        {activeTab === 'vault' && (
          <PackVaultTab
            exclusivePhotos={pack.exclusivePhotos}
            previewPhotosCount={(pack.previewImages || []).length}
            videos={pack.videos}
            onAddPhotosFromLibrary={() => setPickerTarget({ type: 'exclusivePhoto' })}
            onCopyPreviewsToVault={handleCopyPreviewsToVault}
            onRemovePhoto={handleRemoveExclusivePhoto}
            onSelectVideosFromLibrary={() => setPickerTarget({ type: 'packVideo' })}
            onSelectVideoPoster={handleOpenVideoPosterPicker}
            onReplaceVideoFromLibrary={(vIdx) =>
              setPickerTarget({ type: 'replaceVideo', videoIndex: vIdx })
            }
            onUpdateVideo={handleUpdateVideo}
            onRemoveVideo={handleRemoveVideo}
          />
        )}
      </form>

      {/* Seletor Universal de Mídias (ImagePickerModal) */}
      {pickerTarget && (
        <ImagePickerModal
          isOpen={Boolean(pickerTarget)}
          library={content.library || []}
          albums={content.albums || []}
          currentImageUrl={
            pickerTarget.type === 'cover'
              ? pack.imageUrl
              : pickerTarget.type === 'videoPoster'
              ? pack.videos?.[pickerTarget.videoIndex]?.posterUrl
              : pickerTarget.type === 'replaceVideo'
              ? pack.videos?.[pickerTarget.videoIndex]?.url
              : undefined
          }
          title={
            pickerTarget.type === 'cover'
              ? 'Escolher foto de capa'
              : pickerTarget.type === 'previewPhoto'
              ? 'Escolher fotos para mostrar antes da compra'
              : pickerTarget.type === 'exclusivePhoto'
              ? 'Escolher fotos que serão entregues após a compra'
              : pickerTarget.type === 'packVideo'
              ? 'Escolher vídeos que serão entregues após a compra'
              : pickerTarget.type === 'replaceVideo'
              ? 'Trocar vídeo do pack'
              : 'Escolher Foto de Capa do Vídeo'
          }
          subtitle={
            pickerTarget.type === 'previewPhoto'
              ? 'Essas fotos aparecem na página do pack antes da compra.'
              : pickerTarget.type === 'exclusivePhoto'
              ? 'Essas fotos só serão entregues para quem comprar este pack.'
              : pickerTarget.type === 'packVideo' || pickerTarget.type === 'replaceVideo'
              ? 'Marque os vídeos que serão entregues após a compra.'
              : undefined
          }
          backText="Voltar ao Pack"
          allowedMediaType={
            pickerTarget.type === 'packVideo' || pickerTarget.type === 'replaceVideo'
              ? 'videos'
              : 'photos'
          }
          selectionMode={
            pickerTarget.type === 'previewPhoto' ||
            pickerTarget.type === 'exclusivePhoto' ||
            pickerTarget.type === 'packVideo'
              ? 'multiple'
              : 'single'
          }
          onSelect={(url, item) => {
            if (pickerTarget.type === 'cover') {
              handleFieldChange('imageUrl', url);
              setValidationErrors((prev) => {
                const next = { ...prev };
                delete next.imageUrl;
                return next;
              });
            } else if (pickerTarget.type === 'previewPhoto') {
              handleAddPreviewPhotos([url]);
            } else if (pickerTarget.type === 'exclusivePhoto') {
              handleAddExclusivePhotos([url]);
            } else if (pickerTarget.type === 'packVideo') {
              handleAddVideosFromLibrary([url], item ? [item] : undefined);
            } else if (pickerTarget.type === 'replaceVideo') {
              const built = item
                ? buildVideoItemFromLibrary(item, url)
                : { url, duration: 'Vídeo 4K', posterUrl: undefined };
              handleUpdateVideo(pickerTarget.videoIndex, {
                url: built.url,
                duration: built.duration,
                posterUrl: built.posterUrl || pack.videos?.[pickerTarget.videoIndex]?.posterUrl,
              });
            } else if (pickerTarget.type === 'videoPoster') {
              handleUpdateVideo(pickerTarget.videoIndex, { posterUrl: url });
            }
            setPickerTarget(null);
          }}
          onSelectMultiple={
            pickerTarget.type === 'previewPhoto'
              ? (urls) => handleAddPreviewPhotos(urls)
              : pickerTarget.type === 'exclusivePhoto'
              ? (urls) => handleAddExclusivePhotos(urls)
              : pickerTarget.type === 'packVideo'
              ? (urls, items) => handleAddVideosFromLibrary(urls, items)
              : undefined
          }
          onClose={() => setPickerTarget(null)}
          onUploadNew={onUploadNew}
          uploadVisibility={pickerTarget.type === 'exclusivePhoto' || pickerTarget.type === 'packVideo' || pickerTarget.type === 'replaceVideo' ? 'private' : 'public'}
          uploadDestinationLabel={pickerTarget.type === 'cover' ? 'a capa do pack' : pickerTarget.type === 'previewPhoto' ? 'as amostras gratuitas' : pickerTarget.type === 'exclusivePhoto' ? 'as fotos entregues após a compra' : pickerTarget.type === 'packVideo' || pickerTarget.type === 'replaceVideo' ? 'os vídeos entregues após a compra' : 'a capa do vídeo'}
          confirmActionLabel={pickerTarget.type === 'cover' ? 'Usar como capa' : pickerTarget.type === 'previewPhoto' ? 'Adicionar às amostras' : pickerTarget.type === 'exclusivePhoto' ? 'Adicionar ao conteúdo do pack' : pickerTarget.type === 'packVideo' ? 'Adicionar vídeos ao pack' : pickerTarget.type === 'replaceVideo' ? 'Trocar vídeo' : 'Usar como capa do vídeo'}
        />
      )}

      {/* Seletor de Miniaturas de Vídeo Estilo YouTube */}
      {videoThumbnailPicker && (
        <VideoThumbnailPickerModal
          isOpen={Boolean(videoThumbnailPicker)}
          videoUrl={videoThumbnailPicker.videoUrl}
          videoTitle={videoThumbnailPicker.videoTitle}
          currentPosterUrl={videoThumbnailPicker.currentPosterUrl}
          onSelectPoster={(posterUrl) => {
            handleUpdateVideo(videoThumbnailPicker.videoIndex, { posterUrl });
            setVideoThumbnailPicker(null);
            showToast('Capa do vídeo atualizada com sucesso!');
          }}
          onOpenLibraryPicker={() => {
            const vIdx = videoThumbnailPicker.videoIndex;
            setVideoThumbnailPicker(null);
            setPickerTarget({ type: 'videoPoster', videoIndex: vIdx });
          }}
          onClose={() => setVideoThumbnailPicker(null)}
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
