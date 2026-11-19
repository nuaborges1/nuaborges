import React, { useState, useRef } from 'react';
import { AvulsoProductItem, AvulsoVideoItem, LibraryImageItem } from '@/lib/types';
import { optimizeAndStoreImage } from '@/lib/contentStore';

interface UseAvulsoUploadsParams {
  editingItemData: AvulsoProductItem | null;
  setEditingItemData: React.Dispatch<React.SetStateAction<AvulsoProductItem | null>>;
  onUploadNew?: (img: LibraryImageItem) => void;
}

export function useAvulsoUploads({
  editingItemData,
  setEditingItemData,
  onUploadNew,
}: UseAvulsoUploadsParams) {
  const [uploadingState, setUploadingState] = useState<{
    isUploading: boolean;
    progress: number;
    statusText: string;
  } | null>(null);

  const [uploadTargetVideoIndex, setUploadTargetVideoIndex] = useState<number | null>(null);

  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const previewPhotosInputRef = useRef<HTMLInputElement>(null);
  const vaultPhotosInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerNewVideoUpload = () => {
    setUploadTargetVideoIndex(null);
    videoFileInputRef.current?.click();
  };

  const handleTriggerReplaceVideoUpload = (vIdx: number) => {
    setUploadTargetVideoIndex(vIdx);
    videoFileInputRef.current?.click();
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingState({
      isUploading: true,
      progress: 5,
      statusText: `Preparando vídeo "${file.name}"...`,
    });

    try {
      const uploadedMedia = await optimizeAndStoreImage(file, (percent) => {
        const safePct = Math.min(Math.round(percent), 98);
        setUploadingState({
          isUploading: true,
          progress: safePct,
          statusText: `Enviando vídeo para o cofre B2 (${safePct}%)...`,
        });
      }, 'private');

      if (onUploadNew) {
        onUploadNew(uploadedMedia);
      }

      setEditingItemData((prev) => {
        if (!prev) return prev;
        const currentVideos = [...(prev.videos || [])];
        const newVideoObj: AvulsoVideoItem = {
          id: `vid-${Date.now()}`,
          title: uploadedMedia.name
            ? uploadedMedia.name.replace(/\.[^/.]+$/, '')
            : `Vídeo ${currentVideos.length + 1} — ${prev.title || 'Produção'}`,
          url: uploadedMedia.url,
          posterUrl: uploadedMedia.posterUrl || uploadedMedia.url,
          duration: uploadedMedia.duration || 'Vídeo 4K UHD',
        };

        if (uploadTargetVideoIndex !== null && currentVideos[uploadTargetVideoIndex]) {
          currentVideos[uploadTargetVideoIndex] = {
            ...currentVideos[uploadTargetVideoIndex],
            url: uploadedMedia.url,
            posterUrl:
              uploadedMedia.posterUrl ||
              currentVideos[uploadTargetVideoIndex].posterUrl ||
              uploadedMedia.url,
            duration:
              uploadedMedia.duration ||
              currentVideos[uploadTargetVideoIndex].duration ||
              'Vídeo 4K UHD',
            title: currentVideos[uploadTargetVideoIndex].title || newVideoObj.title,
          };
        } else {
          currentVideos.push(newVideoObj);
        }

        return {
          ...prev,
          videos: currentVideos,
        };
      });

      setUploadingState({
        isUploading: true,
        progress: 100,
        statusText: 'Vídeo carregado com sucesso!',
      });
      setTimeout(() => setUploadingState(null), 1500);
    } catch (err: any) {
      alert(err?.message || 'Falha ao processar o vídeo. Certifique-se de que o arquivo seja MP4, MOV ou WebM.');
      setUploadingState(null);
    } finally {
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      setUploadTargetVideoIndex(null);
    }
  };

  const handlePreviewPhotosFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const isAvulso = editingItemData?.modality === 'avulso';
    const filesArray = isAvulso ? [files[0]] : Array.from(files);
    setUploadingState({
      isUploading: true,
      progress: 5,
      statusText: isAvulso ? 'Preparando foto de demonstração única...' : `Iniciando upload de ${filesArray.length} prévias...`,
    });

    const newUrls: string[] = [];
    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const pct = Math.round(((i + 1) / filesArray.length) * 100);
        setUploadingState({
          isUploading: true,
          progress: pct,
          statusText: `Enviando prévia ${i + 1} de ${filesArray.length} (${file.name})...`,
        });
        const media = await optimizeAndStoreImage(file);
        if (onUploadNew) onUploadNew(media);
        newUrls.push(media.url);
      }

      setEditingItemData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          previewImages: isAvulso ? [newUrls[0]] : [...(prev.previewImages || []), ...newUrls],
        };
      });

      setUploadingState({
        isUploading: true,
        progress: 100,
        statusText: isAvulso ? 'Foto de demonstração única atualizada!' : `${newUrls.length} prévias adicionadas com sucesso!`,
      });
      setTimeout(() => setUploadingState(null), 1500);
    } catch {
      alert('Ocorreu um erro ao carregar algumas fotos de prévia.');
      setUploadingState(null);
    } finally {
      if (previewPhotosInputRef.current) previewPhotosInputRef.current.value = '';
    }
  };

  const handleVaultPhotosFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const isAvulso = editingItemData?.modality === 'avulso';
    const filesArray = isAvulso ? [files[0]] : Array.from(files);
    setUploadingState({
      isUploading: true,
      progress: 5,
      statusText: isAvulso ? 'Preparando foto 4K protegida única...' : `Iniciando upload de ${filesArray.length} fotos protegidas...`,
    });

    const newUrls: string[] = [];
    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const pct = Math.round(((i + 1) / filesArray.length) * 100);
        setUploadingState({
          isUploading: true,
          progress: pct,
          statusText: `Enviando foto 4K ${i + 1} de ${filesArray.length} (${file.name})...`,
        });
        const media = await optimizeAndStoreImage(file, undefined, 'private');
        if (onUploadNew) onUploadNew(media);
        newUrls.push(media.url);
      }

      setEditingItemData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exclusivePhotos: isAvulso ? [newUrls[0]] : [...(prev.exclusivePhotos || []), ...newUrls],
        };
      });

      setUploadingState({
        isUploading: true,
        progress: 100,
        statusText: isAvulso ? 'Foto protegida única salva no cofre!' : `${newUrls.length} fotos salvas no cofre!`,
      });
      setTimeout(() => setUploadingState(null), 1500);
    } catch {
      alert('Ocorreu um erro ao carregar fotos para o cofre.');
      setUploadingState(null);
    } finally {
      if (vaultPhotosInputRef.current) vaultPhotosInputRef.current.value = '';
    }
  };

  return {
    uploadingState,
    videoFileInputRef,
    previewPhotosInputRef,
    vaultPhotosInputRef,
    handleTriggerNewVideoUpload,
    handleTriggerReplaceVideoUpload,
    handleVideoFileChange,
    handlePreviewPhotosFileChange,
    handleVaultPhotosFileChange,
  };
}
