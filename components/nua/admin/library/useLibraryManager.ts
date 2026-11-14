import { useState, useRef, useMemo, useEffect } from 'react';
import { SiteContent, LibraryImageItem, MediaAlbum } from '@/lib/types';
import { optimizeAndStoreImage, deleteStoredMedia } from '@/lib/contentStore';
import { isMediaVideo, mediaService } from '@/lib/media';
import {
  fetchCachedStorageMedia,
  getCachedStorageMedia,
} from '@/lib/media/mediaListCache';
import { deduplicateLibraryItems } from '@/lib/mediaUsage';
import { MediaFilterType, ViewMode, SortOrder, EMPTY_LIBRARY, EMPTY_ALBUMS } from './types';

interface UseLibraryManagerOptions {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

export function useLibraryManager({ content, onChange, onUploadNew }: UseLibraryManagerOptions) {
  const [filterType, setFilterType] = useState<MediaFilterType>('all');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [storageMedia, setStorageMedia] = useState<LibraryImageItem[]>(
    () => getCachedStorageMedia() || []
  );

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadSuccessCount, setUploadSuccessCount] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [libraryNotice, setLibraryNotice] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [deleteAlbumConfirm, setDeleteAlbumConfirm] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [viewingMedia, setViewingMedia] = useState<LibraryImageItem | null>(null);
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<MediaAlbum | null>(null);
  const [albumMediaSelectorOpen, setAlbumMediaSelectorOpen] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  const contentLibrary = content.library || EMPTY_LIBRARY;

  // A biblioteca editorial guarda apenas os itens já cadastrados no conteúdo.
  // O storage, porém, pode conter arquivos ainda não associados a uma seção.
  // Carregamos esses arquivos com cache inteligente para evitar chamadas repetidas.
  useEffect(() => {
    let cancelled = false;

    fetchCachedStorageMedia()
      .then((remoteItems) => {
        if (!cancelled) {
          setStorageMedia(remoteItems);
        }
      })
      .catch(() => {
        if (!cancelled) setStorageMedia([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const library = useMemo(() => {
    const knownKeys = new Set(
      contentLibrary.flatMap((item) =>
        [item.objectKey, item.url, ...(item.aliasUrls || [])].filter(Boolean) as string[]
      )
    );
    const missingStorageItems = storageMedia.filter(
      (item) => !knownKeys.has(item.objectKey || '') && !knownKeys.has(item.url)
    );
    return deduplicateLibraryItems([...contentLibrary, ...missingStorageItems]);
  }, [contentLibrary, storageMedia]);
  const albums = content.albums || EMPTY_ALBUMS;

  const showNotice = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLibraryNotice({ message, type });
    setTimeout(() => setLibraryNotice(null), 4000);
  };

  const currentAlbum = useMemo(() => {
    return activeAlbumId ? albums.find((a) => a.id === activeAlbumId) || null : null;
  }, [activeAlbumId, albums]);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(5);
    setUploadSuccessCount(null);

    const total = files.length;
    const newItems: LibraryImageItem[] = [];
    let skippedDuplicates = 0;

    try {
      for (let i = 0; i < total; i++) {
        const file = files[i];
        const preHash = await mediaService.getFileFingerprint(file);

        const isDuplicatePre = library.some(
          (item) =>
            (preHash && (item.fileHash === preHash || item.fingerprint === preHash)) ||
            (item.name.toLowerCase() === file.name.toLowerCase() &&
              item.sizeBytes === file.size)
        );

        if (isDuplicatePre) {
          skippedDuplicates++;
          continue;
        }

        setUploadStatusText(`Otimizando e enviando ${file.name} (${i + 1}/${total})...`);

        const item = await optimizeAndStoreImage(file, (percent) => {
          const overall = Math.round(((i + percent / 100) / total) * 100);
          setUploadProgress(overall);
        });

        const itemHash = item.fileHash || item.fingerprint || preHash;
        if (itemHash && !item.fileHash) {
          item.fileHash = itemHash;
        }
        const isDuplicateHash =
          itemHash &&
          library.some(
            (existing) =>
              (existing.fileHash && existing.fileHash === itemHash) ||
              (existing.fingerprint && existing.fingerprint === itemHash)
          );

        if (isDuplicateHash) {
          skippedDuplicates++;
          continue;
        }

        if (activeAlbumId) {
          item.albumIds = [activeAlbumId];
        }

        newItems.push(item);

        if (i < total - 1) {
          await new Promise((r) => setTimeout(r, 160));
        }
      }

      if (newItems.length > 0) {
        let updatedAlbums = albums;
        if (activeAlbumId) {
          updatedAlbums = albums.map((alb) =>
            alb.id === activeAlbumId
              ? {
                  ...alb,
                  mediaIds: [...new Set([...alb.mediaIds, ...newItems.map((n) => n.id)])],
                }
              : alb
          );
        }

        onChange({
          ...content,
          library: [...newItems, ...library],
          albums: updatedAlbums,
        });

        newItems.forEach((it) => onUploadNew(it));
        setUploadSuccessCount(newItems.length);
        showNotice(
          `${newItems.length} foto(s)/vídeo(s) otimizados e adicionados com sucesso!`,
          'success'
        );
      } else if (skippedDuplicates > 0) {
        showNotice(
          `${skippedDuplicates} arquivo(s) já estavam no seu acervo e foram mantidos sem duplicação.`,
          'info'
        );
      }
    } catch (err: any) {
      showNotice(
        err?.message ||
          'Não foi possível adicionar um ou mais arquivos. Tente novamente ou escolha outro arquivo.',
        'error'
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatusText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent, item: LibraryImageItem) => {
    e.stopPropagation();
    const isFav = !item.favorite;
    const updatedLibrary = library.map((img) =>
      img.id === item.id ? { ...img, favorite: isFav } : img
    );
    onChange({ ...content, library: updatedLibrary });
  };

  const handleSaveAlbum = (savedAlbum: MediaAlbum) => {
    const exists = albums.some((a) => a.id === savedAlbum.id);
    const updatedAlbums = exists
      ? albums.map((a) => (a.id === savedAlbum.id ? savedAlbum : a))
      : [savedAlbum, ...albums];

    onChange({ ...content, albums: updatedAlbums });
  };

  const handleDeleteAlbum = (albumId: string, albumName: string) => {
    setDeleteAlbumConfirm({ id: albumId, name: albumName });
  };

  const handleConfirmDeleteAlbum = () => {
    if (!deleteAlbumConfirm) return;
    const { id: albumId } = deleteAlbumConfirm;
    const updatedAlbums = albums.filter((a) => a.id !== albumId);
    const updatedLibrary = library.map((item) => ({
      ...item,
      albumIds: (item.albumIds || []).filter((id) => id !== albumId),
    }));

    onChange({
      ...content,
      albums: updatedAlbums,
      library: updatedLibrary,
    });

    if (activeAlbumId === albumId) {
      setActiveAlbumId(null);
    }
    setDeleteAlbumConfirm(null);
    showNotice('Álbum removido. As fotos continuam salvas no acervo normalmente.', 'success');
  };

  const handleSetAlbumCover = (mediaId: string, mediaUrl: string) => {
    if (!activeAlbumId) return;
    const updatedAlbums = albums.map((alb) =>
      alb.id === activeAlbumId
        ? { ...alb, coverMediaId: mediaId, coverUrl: mediaUrl }
        : alb
    );
    onChange({ ...content, albums: updatedAlbums });
  };

  const handleRemoveFromAlbum = (e: React.MouseEvent, mediaId: string) => {
    e.stopPropagation();
    if (!activeAlbumId) return;
    const updatedAlbums = albums.map((alb) =>
      alb.id === activeAlbumId
        ? {
            ...alb,
            mediaIds: alb.mediaIds.filter((id) => id !== mediaId),
            coverMediaId: alb.coverMediaId === mediaId ? undefined : alb.coverMediaId,
          }
        : alb
    );
    onChange({ ...content, albums: updatedAlbums });
  };

  const handleMoveMediaInAlbum = (index: number, direction: 'prev' | 'next') => {
    if (!currentAlbum) return;
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentAlbum.mediaIds.length) return;

    const newMediaIds = [...currentAlbum.mediaIds];
    const temp = newMediaIds[index];
    newMediaIds[index] = newMediaIds[targetIndex];
    newMediaIds[targetIndex] = temp;

    const updatedAlbums = albums.map((alb) =>
      alb.id === currentAlbum.id ? { ...alb, mediaIds: newMediaIds } : alb
    );
    onChange({ ...content, albums: updatedAlbums });
  };

  const handleSaveAlbumMediaIds = (mediaIds: string[]) => {
    if (!currentAlbum) return;
    const updatedAlbums = albums.map((alb) =>
      alb.id === currentAlbum.id ? { ...alb, mediaIds } : alb
    );
    onChange({ ...content, albums: updatedAlbums });
  };

  const assignedMediaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const alb of albums) {
      for (const id of alb.mediaIds) {
        ids.add(id);
      }
    }
    return ids;
  }, [albums]);

  const isMediaUnassigned = (item: LibraryImageItem) => {
    return !assignedMediaIds.has(item.id) && (!item.albumIds || item.albumIds.length === 0);
  };

  const displayedMedia = useMemo(() => {
    let result = [...library];

    if (currentAlbum) {
      result = currentAlbum.mediaIds
        .map((id) => library.find((m) => m.id === id))
        .filter(Boolean) as LibraryImageItem[];
    } else {
      if (filterType === 'photos') {
        result = result.filter((m) => !isMediaVideo(m));
      } else if (filterType === 'videos') {
        result = result.filter((m) => isMediaVideo(m));
      } else if (filterType === 'favorites') {
        result = result.filter((m) => m.favorite);
      } else if (filterType === 'unassigned') {
        result = result.filter(isMediaUnassigned);
      }

      if (sortOrder === 'newest') {
        // already newest
      } else if (sortOrder === 'oldest') {
        result.reverse();
      } else if (sortOrder === 'name') {
        result.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.customName || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [library, currentAlbum, filterType, sortOrder, searchTerm, assignedMediaIds]);

  const totalPhotos = library.filter((m) => !isMediaVideo(m)).length;
  const totalVideos = library.filter((m) => isMediaVideo(m)).length;
  const totalFavorites = library.filter((m) => m.favorite).length;
  const totalUnassigned = useMemo(() => library.filter(isMediaUnassigned).length, [library, assignedMediaIds]);

  const toggleSelectMediaId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMediaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearMediaSelection = () => setSelectedMediaIds([]);

  const toggleSelectAllDisplayed = () => {
    const displayedIds = displayedMedia.map((m) => m.id);
    if (displayedIds.length === 0) return;
    const allSelected = displayedIds.every((id) => selectedMediaIds.includes(id));
    if (allSelected) {
      setSelectedMediaIds((prev) => prev.filter((id) => !displayedIds.includes(id)));
    } else {
      setSelectedMediaIds((prev) => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const handleBatchFavorite = () => {
    if (selectedMediaIds.length === 0) return;
    const idSet = new Set(selectedMediaIds);
    const updatedLibrary = library.map((img) =>
      idSet.has(img.id) ? { ...img, favorite: true } : img
    );
    onChange({ ...content, library: updatedLibrary });
    showNotice(`${selectedMediaIds.length} mídia(s) marcadas como favoritas!`, 'success');
    setSelectedMediaIds([]);
  };

  const handleBatchAddToAlbum = (albumId: string) => {
    if (selectedMediaIds.length === 0 || !albumId) return;
    const targetAlbum = albums.find((a) => a.id === albumId);
    if (!targetAlbum) return;

    const idSet = new Set(selectedMediaIds);
    const updatedAlbums = albums.map((alb) =>
      alb.id === albumId
        ? {
            ...alb,
            mediaIds: Array.from(new Set([...alb.mediaIds, ...selectedMediaIds])),
          }
        : alb
    );
    const updatedLibrary = library.map((img) =>
      idSet.has(img.id)
        ? {
            ...img,
            albumIds: Array.from(new Set([...(img.albumIds || []), albumId])),
          }
        : img
    );

    onChange({ ...content, albums: updatedAlbums, library: updatedLibrary });
    showNotice(
      `${selectedMediaIds.length} mídia(s) adicionadas ao álbum "${targetAlbum.name}".`,
      'success'
    );
    setSelectedMediaIds([]);
  };

  const handleConfirmBatchDelete = () => {
    if (selectedMediaIds.length === 0) return;
    const idSet = new Set(selectedMediaIds);
    const itemsToDelete = library.filter((item) => idSet.has(item.id));
    const deletedUrls = new Set(itemsToDelete.map((item) => item.url));

    for (const item of itemsToDelete) {
      deleteStoredMedia(item).catch(() => {});
    }

    const updatedLibrary = library.filter((img) => !idSet.has(img.id));
    const updatedAlbums = albums.map((album) => ({
      ...album,
      mediaIds: album.mediaIds.filter((id) => !idSet.has(id)),
      coverMediaId: album.coverMediaId && idSet.has(album.coverMediaId) ? undefined : album.coverMediaId,
      coverUrl: album.coverUrl && deletedUrls.has(album.coverUrl) ? undefined : album.coverUrl,
    }));

    let updatedGallery = { ...content.gallery };
    if (content.gallery.photos.some((p) => deletedUrls.has(p.imageUrl))) {
      updatedGallery = {
        ...updatedGallery,
        photos: updatedGallery.photos.filter((p) => !deletedUrls.has(p.imageUrl)),
      };
    }

    onChange({
      ...content,
      library: updatedLibrary,
      albums: updatedAlbums,
      gallery: updatedGallery,
    });

    const count = selectedMediaIds.length;
    setSelectedMediaIds([]);
    setBatchDeleteConfirm(false);
    showNotice(`${count} mídia(s) excluídas do acervo.`, 'success');
  };

  const totalStorageBytes = useMemo(
    () => library.reduce((acc, it) => acc + (it.sizeBytes || 0), 0),
    [library]
  );
  const totalOriginalBytes = useMemo(
    () => library.reduce((acc, it) => acc + (it.originalSizeBytes || it.sizeBytes || 0), 0),
    [library]
  );
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalStorageBytes);
  const totalSavedPercent = totalOriginalBytes > 0 ? Math.round((totalSavedBytes / totalOriginalBytes) * 100) : 0;

  return {
    filterType,
    setFilterType,
    activeAlbumId,
    setActiveAlbumId,
    searchTerm,
    setSearchTerm,
    viewMode,
    setViewMode,
    sortOrder,
    setSortOrder,
    hoveredVideoId,
    setHoveredVideoId,
    uploading,
    uploadProgress,
    uploadStatusText,
    uploadSuccessCount,
    isDragging,
    libraryNotice,
    setLibraryNotice,
    deleteAlbumConfirm,
    setDeleteAlbumConfirm,
    batchDeleteConfirm,
    setBatchDeleteConfirm,
    fileInputRef,
    viewingMedia,
    setViewingMedia,
    albumModalOpen,
    setAlbumModalOpen,
    editingAlbum,
    setEditingAlbum,
    albumMediaSelectorOpen,
    setAlbumMediaSelectorOpen,
    selectedMediaIds,
    toggleSelectMediaId,
    toggleSelectAllDisplayed,
    clearMediaSelection,
    handleBatchFavorite,
    handleBatchAddToAlbum,
    handleConfirmBatchDelete,
    library,
    albums,
    currentAlbum,
    displayedMedia,
    totalPhotos,
    totalVideos,
    totalFavorites,
    totalUnassigned,
    totalStorageBytes,
    totalSavedPercent,
    handleUploadFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleToggleFavorite,
    handleSaveAlbum,
    handleDeleteAlbum,
    handleConfirmDeleteAlbum,
    handleSetAlbumCover,
    handleRemoveFromAlbum,
    handleMoveMediaInAlbum,
    handleSaveAlbumMediaIds,
  };
}
