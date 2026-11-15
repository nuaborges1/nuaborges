'use client';

import React, { useState, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SiteContent, AvulsoProductItem, LibraryImageItem, AvulsoVideoItem } from '@/lib/types';
import { optimizeAndStoreImage } from '@/lib/contentStore';
import { cleanBrlInput, formatBrlPrice, parseBrlPrice } from '@/lib/formatters';
import { toSlug } from '@/lib/seo';
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
  onCancel,
  onDelete,
  onUploadNew,
}: PackEditorPageProps) {
  const [pack, setPack] = useState<AvulsoProductItem>({ ...initialPack });
  const [activeTab, setActiveTab] = useState<'info' | 'previews' | 'vault'>('info');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Direct Upload States
  const [uploadingPreviews, setUploadingPreviews] = useState(false);
  const [uploadingVaultPhotos, setUploadingVaultPhotos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadVideoProgress, setUploadVideoProgress] = useState(0);

  const previewPhotosInputRef = useRef<HTMLInputElement>(null);
  const vaultPhotosInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFieldChange = (field: keyof AvulsoProductItem, value: any) => {
    if (field === 'modality' && value === 'avulso') {
      setPack((prev) => ({
        ...prev,
        modality: 'avulso',
        previewImages: (prev.previewImages || []).slice(0, 1),
        exclusivePhotos: (prev.exclusivePhotos || []).slice(0, 1),
      }));
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
      const isAvulso = prev.modality === 'avulso';
      const current = isAvulso ? [] : prev.exclusivePhotos || [];
      const merged = isAvulso
        ? urls.slice(0, 1)
        : Array.from(new Set([...current, ...urls]));
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

  // Direct Upload Handlers
  const handleDirectPreviewPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPreviews(true);
    try {
      const uploadedUrls: string[] = [];
      const count = pack.modality === 'avulso' ? 1 : files.length;
      for (let i = 0; i < count; i++) {
        const stored = await optimizeAndStoreImage(files[i]);
        onUploadNew(stored);
        uploadedUrls.push(stored.url);
      }
      handleAddPreviewPhotos(uploadedUrls);
      showToast(pack.modality === 'avulso' ? 'Foto de amostra única atualizada!' : `${uploadedUrls.length} amostra(s) enviada(s) com sucesso!`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao enviar amostras.');
    } finally {
      setUploadingPreviews(false);
      if (previewPhotosInputRef.current) previewPhotosInputRef.current.value = '';
    }
  };

  const handleDirectVaultPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingVaultPhotos(true);
    try {
      const uploadedUrls: string[] = [];
      const count = pack.modality === 'avulso' ? 1 : files.length;
      for (let i = 0; i < count; i++) {
        const stored = await optimizeAndStoreImage(files[i]);
        onUploadNew(stored);
        uploadedUrls.push(stored.url);
      }
      handleAddExclusivePhotos(uploadedUrls);
      showToast(pack.modality === 'avulso' ? 'Foto protegida única anexada!' : `${uploadedUrls.length} foto(s) protegida(s) anexada(s)!`);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao enviar fotos protegidas.');
    } finally {
      setUploadingVaultPhotos(false);
      if (vaultPhotosInputRef.current) vaultPhotosInputRef.current.value = '';
    }
  };

  const handleDirectVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setUploadVideoProgress(5);
    try {
      const stored = await optimizeAndStoreImage(file, (pct) => setUploadVideoProgress(pct));
      onUploadNew(stored);
      const videoEntry = buildVideoItemFromLibrary(stored, stored.url);
      setPack((prev) => ({
        ...prev,
        videos: [...(prev.videos || []), videoEntry],
      }));
      showToast('Vídeo enviado e vinculado ao cofre do pack!');
    } catch (err: any) {
      showToast(err?.message || 'Erro ao enviar arquivo de vídeo.');
    } finally {
      setUploadingVideo(false);
      setUploadVideoProgress(0);
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pack.title.trim()) {
      showToast('Por favor, informe o título do produto.');
      return;
    }
    const slug = pack.slug?.trim() || toSlug(pack.title);
    const formattedPrice = formatBrlPrice(pack.price);
    const parsedPrice = parseBrlPrice(formattedPrice);
    const isAvulso = pack.modality === 'avulso';

    onSave({
      ...pack,
      previewImages: isAvulso ? (pack.previewImages || []).slice(0, 1) : pack.previewImages,
      exclusivePhotos: isAvulso ? (pack.exclusivePhotos || []).slice(0, 1) : pack.exclusivePhotos,
      slug,
      price: formattedPrice,
      numericPrice: parsedPrice,
    });
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

      {/* Hidden Direct Upload Inputs */}
      <input
        ref={previewPhotosInputRef}
        type="file"
        multiple={pack.modality !== 'avulso'}
        accept="image/*"
        className="hidden"
        onChange={handleDirectPreviewPhotosChange}
      />
      <input
        ref={vaultPhotosInputRef}
        type="file"
        multiple={pack.modality !== 'avulso'}
        accept="image/*"
        className="hidden"
        onChange={handleDirectVaultPhotosChange}
      />
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
        className="hidden"
        onChange={handleDirectVideoChange}
      />

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
            onBlurPrice={handlePriceBlur}
            onOpenCoverPicker={() => setPickerTarget({ type: 'cover' })}
          />
        )}

        {activeTab === 'previews' && (
          <PackPreviewsTab
            previewImages={pack.previewImages}
            modality={pack.modality || 'pack'}
            uploading={uploadingPreviews}
            onAddFromLibraryClick={() => setPickerTarget({ type: 'previewPhoto' })}
            onUploadDirectClick={() => previewPhotosInputRef.current?.click()}
            onRemovePhoto={handleRemovePreviewPhoto}
          />
        )}

        {activeTab === 'vault' && (
          <PackVaultTab
            exclusivePhotos={pack.exclusivePhotos}
            modality={pack.modality || 'pack'}
            previewPhotosCount={(pack.previewImages || []).length}
            videos={pack.videos}
            uploadingPhotos={uploadingVaultPhotos}
            uploadingVideo={uploadingVideo}
            uploadVideoProgress={uploadVideoProgress}
            onAddPhotosFromLibrary={() => setPickerTarget({ type: 'exclusivePhoto' })}
            onUploadPhotosDirect={() => vaultPhotosInputRef.current?.click()}
            onCopyPreviewsToVault={handleCopyPreviewsToVault}
            onRemovePhoto={handleRemoveExclusivePhoto}
            onSelectVideosFromLibrary={() => setPickerTarget({ type: 'packVideo' })}
            onUploadVideoDirect={() => videoFileInputRef.current?.click()}
            onSelectVideoPoster={(vIdx) => setPickerTarget({ type: 'videoPoster', videoIndex: vIdx })}
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
              ? 'Escolher Foto de Capa do Pack'
              : pickerTarget.type === 'previewPhoto'
              ? 'Selecionar Fotos de Amostra Gratuita'
              : pickerTarget.type === 'exclusivePhoto'
              ? 'Selecionar Fotos Protegidas do Cofre'
              : pickerTarget.type === 'packVideo'
              ? 'Selecionar Vídeos 4K para o Cofre'
              : pickerTarget.type === 'replaceVideo'
              ? 'Substituir Vídeo do Pack'
              : 'Escolher Foto de Capa do Vídeo'
          }
          subtitle={
            pickerTarget.type === 'previewPhoto'
              ? 'Escolha uma ou várias fotos que aparecerão como amostra na página do pack.'
              : pickerTarget.type === 'exclusivePhoto'
              ? 'Escolha as fotos em alta definição que serão liberadas após a compra.'
              : pickerTarget.type === 'packVideo' || pickerTarget.type === 'replaceVideo'
              ? 'Selecione vídeos autorais da sua Biblioteca ou envie novos arquivos MP4/MOV.'
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
