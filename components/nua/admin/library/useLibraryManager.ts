import { useState, useRef, useMemo, useEffect } from 'react';
import { SiteContent, LibraryImageItem, MediaAlbum } from '@/lib/types';
import { optimizeAndStoreImage } from '@/lib/contentStore';
import { isMediaVideo } from '@/lib/media';
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
  const [storageMedia, setStorageMedia] = useState<LibraryImageItem[]>([]);

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

  const contentLibrary = content.library || EMPTY_LIBRARY;

  // A biblioteca editorial guarda apenas os itens já cadastrados no conteúdo.
  // O storage, porém, pode conter arquivos ainda não associados a uma seção.
  // Carregamos esses arquivos separadamente para que nenhum upload desapareça
  // só porque ainda não foi usado em uma capa, galeria ou pack.
  useEffect(() => {
    let cancelled = false;

    fetch('/api/media/list?limit=500', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (cancelled || !Array.isArray(data?.items)) return;

        const storageItems = data.items.filter((item: any) => item?.origin === 'storage_upload');
        const groups = new Map<string, any[]>();

        for (const item of storageItems) {
          const key = String(item.key || item.url || '');
          const mediaKey = key.match(/^(media\/[^/]+)(?:\/[^/]+)?$/i)?.[1] || key;
          const group = groups.get(mediaKey) || [];
          group.push(item);
          groups.set(mediaKey, group);
        }

        const remoteItems: LibraryImageItem[] = [];
        for (const [groupKey, variants] of groups) {
          const preferred = [...variants].sort((a, b) => {
            const rank = (item: any) => /\/(full|original)\./i.test(String(item.key)) ? 0 : 1;
            return rank(a) - rank(b);
          })[0];
          if (!preferred?.url) continue;

          const isVideo = variants.some((item: any) => item.isVideo || /\.(mp4|webm|mov)$/i.test(String(item.key)));
          const itemId = `storage:${groupKey}`;
          remoteItems.push({
            id: itemId,
            name: String(preferred.name || groupKey.split('/').pop() || 'Mídia do Backblaze'),
            url: preferred.url,
            objectKey: preferred.key,
            uploadedAt: preferred.uploadedAt || new Date().toISOString(),
            sizeBytes: preferred.sizeBytes,
            provider: 'backblaze-b2',
            isVideo,
          });
        }

        setStorageMedia(remoteItems);
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
      contentLibrary.flatMap((item) => [item.objectKey, item.url].filter(Boolean) as string[])
    );
    const missingStorageItems = storageMedia.filter(
      (item) => !knownKeys.has(item.objectKey || '') && !knownKeys.has(item.url)
    );
    return [...missingStorageItems, ...contentLibrary];
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

        const isDuplicatePre = library.some(
          (item) =>
            item.name.toLowerCase() === file.name.toLowerCase() &&
            item.sizeBytes === file.size
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

        const itemHash = item.fileHash || item.fingerprint;
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
  }, [library, currentAlbum, filterType, sortOrder, searchTerm]);

  const totalPhotos = library.filter((m) => !isMediaVideo(m)).length;
  const totalVideos = library.filter((m) => isMediaVideo(m)).length;
  const totalFavorites = library.filter((m) => m.favorite).length;

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
    fileInputRef,
    viewingMedia,
    setViewingMedia,
    albumModalOpen,
    setAlbumModalOpen,
    editingAlbum,
    setEditingAlbum,
    albumMediaSelectorOpen,
    setAlbumMediaSelectorOpen,
    library,
    albums,
    currentAlbum,
    displayedMedia,
    totalPhotos,
    totalVideos,
    totalFavorites,
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
