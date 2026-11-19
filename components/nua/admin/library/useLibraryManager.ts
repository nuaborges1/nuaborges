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
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onUploadNew: (img: LibraryImageItem) => void;
}

function isAudioOrNonVisualMedia(item: LibraryImageItem | any): boolean {
  if (!item) return false;
  const key = (item.objectKey || item.url || item.name || '').toLowerCase();
  const mime = ((item.mimeType || item.type) || '').toLowerCase();
  if (mime.startsWith('audio/') || mime.includes('json')) return true;
  if (key.includes('/audio/') || key.startsWith('audio/')) return true;
  if (key.endsWith('.mp3') || key.endsWith('.wav') || key.endsWith('.ogg') || key.endsWith('.m4a') || key.endsWith('.flac') || key.endsWith('.aac')) return true;
  if (key.includes('music/library.json') || key.endsWith('.json')) return true;
  if (key.includes('test-audit') || key.includes('/audit/')) return true;
  return false;
}

export function useLibraryManager({
  content,
  onChange,
  onAdministrativeChange,
  onUploadNew,
}: UseLibraryManagerOptions) {
  const [filterType, setFilterType] = useState<MediaFilterType>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [storageMedia, setStorageMedia] = useState<LibraryImageItem[]>(
    () => getCachedStorageMedia() || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !getCachedStorageMedia() && (!content.library || content.library.length === 0)
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
      .catch((error) => {
        if (!cancelled) {
          setStorageMedia([]);
          setLibraryNotice({
            message: error instanceof Error ? error.message : 'Não foi possível carregar o inventário de mídias.',
            type: 'error',
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const library = useMemo(() => {
    return deduplicateLibraryItems(contentLibrary).filter((item) => !isAudioOrNonVisualMedia(item));
  }, [contentLibrary]);
  const albums = content.albums || EMPTY_ALBUMS;

  useEffect(() => {
    if (activeAlbumId && !albums.some((album) => album.id === activeAlbumId)) {
      setActiveAlbumId(null);
    }
  }, [activeAlbumId, albums]);

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
    const knownHashes = new Set(
      library.flatMap((item) => [item.fileHash, item.fingerprint].filter((hash): hash is string => Boolean(hash)))
    );

    try {
      for (let i = 0; i < total; i++) {
        const file = files[i];
        const preHash = await mediaService.getFileFingerprint(file);

        if (preHash && knownHashes.has(preHash)) {
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
        if (itemHash && knownHashes.has(itemHash)) {
          skippedDuplicates++;
          continue;
        }
        if (itemHash) knownHashes.add(itemHash);

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

        if (onAdministrativeChange) {
          const result = await onAdministrativeChange((prev) => ({
            ...prev,
            library: [...newItems, ...(prev.library || [])],
            albums: updatedAlbums,
          }), {
            summary: `Upload de ${newItems.length} nova(s) mídia(s) ao acervo`,
            feedbackMessage: `${newItems.length} foto(s)/vídeo(s) otimizados e adicionados com sucesso!`,
          });
          if (!result.success) {
            throw new Error(result.error || 'O upload terminou, mas não foi possível salvar as mídias na biblioteca.');
          }
        } else {
          onChange({
            ...content,
            library: [...newItems, ...library],
            albums: updatedAlbums,
          });
        }

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
    if (onAdministrativeChange) {
      onAdministrativeChange((prev) => ({
        ...prev,
        library: (prev.library || []).map((img) =>
          img.id === item.id ? { ...img, favorite: isFav } : img
        ),
      }), {
        summary: isFav ? `Mídia "${item.name}" favoritada` : `Mídia "${item.name}" desfavoritada`,
        feedbackMessage: isFav ? 'Marcada como favorita' : 'Removida dos favoritos',
      });
    } else {
      const updatedLibrary = library.map((img) =>
        img.id === item.id ? { ...img, favorite: isFav } : img
      );
      onChange({ ...content, library: updatedLibrary });
    }
  };

  const handleSaveAlbum = async (savedAlbum: MediaAlbum) => {
    const exists = albums.some((a) => a.id === savedAlbum.id);
    const updatedAlbums = exists
      ? albums.map((a) => (a.id === savedAlbum.id ? savedAlbum : a))
      : [savedAlbum, ...albums];

    if (onAdministrativeChange) {
      const result = await onAdministrativeChange((prev) => {
        const prevAlbums = prev.albums || EMPTY_ALBUMS;
        const albumExists = prevAlbums.some((a) => a.id === savedAlbum.id);
        return {
          ...prev,
          albums: albumExists
            ? prevAlbums.map((a) => (a.id === savedAlbum.id ? savedAlbum : a))
            : [savedAlbum, ...prevAlbums],
        };
      }, {
        summary: `Álbum "${savedAlbum.name}" salvo`,
        feedbackMessage: 'Álbum salvo com sucesso.',
      });
      if (!result.success) throw new Error(result.error || 'Não foi possível salvar o álbum.');
    } else {
      onChange({ ...content, albums: updatedAlbums });
    }
  };

  const handleDeleteAlbum = (albumId: string, albumName: string) => {
    setDeleteAlbumConfirm({ id: albumId, name: albumName });
  };

  const handleConfirmDeleteAlbum = async () => {
    if (!deleteAlbumConfirm) return;
    const { id: albumId } = deleteAlbumConfirm;
    const updatedAlbums = albums.filter((a) => a.id !== albumId);
    const updatedLibrary = library.map((item) => ({
      ...item,
      albumIds: (item.albumIds || []).filter((id) => id !== albumId),
    }));

    if (onAdministrativeChange) {
      const result = await onAdministrativeChange((prev) => ({
        ...prev,
        albums: (prev.albums || []).filter((a) => a.id !== albumId),
        library: (prev.library || []).map((item) => ({
          ...item,
          albumIds: (item.albumIds || []).filter((id) => id !== albumId),
        })),
      }), {
        summary: `Álbum "${deleteAlbumConfirm.name}" excluído`,
        feedbackMessage: 'Álbum removido. As fotos continuam salvas no acervo normalmente.',
      });
      if (!result.success) {
        showNotice(result.error || 'Não foi possível excluir o álbum.', 'error');
        return;
      }
    } else {
      onChange({
        ...content,
        albums: updatedAlbums,
        library: updatedLibrary,
      });
    }

    if (activeAlbumId === albumId) {
      setActiveAlbumId(null);
    }
    setDeleteAlbumConfirm(null);
    showNotice('Álbum removido. As fotos continuam salvas no acervo normalmente.', 'success');
  };

  const handleSetAlbumCover = async (mediaId: string, mediaUrl: string) => {
    if (!activeAlbumId) return;
    const updatedAlbums = albums.map((alb) =>
      alb.id === activeAlbumId
        ? { ...alb, coverMediaId: mediaId, coverUrl: mediaUrl }
        : alb
    );
    if (onAdministrativeChange) {
      const result = await onAdministrativeChange((prev) => ({
        ...prev,
        albums: (prev.albums || []).map((alb) =>
          alb.id === activeAlbumId
            ? { ...alb, coverMediaId: mediaId, coverUrl: mediaUrl }
            : alb
        ),
      }), {
        summary: 'Capa do álbum atualizada',
        feedbackMessage: 'Capa do álbum atualizada.',
      });
      if (!result.success) showNotice(result.error || 'Não foi possível salvar a capa do álbum.', 'error');
    } else {
      onChange({ ...content, albums: updatedAlbums });
    }
  };

  const handleRemoveFromAlbum = async (e: React.MouseEvent, mediaId: string) => {
    e.stopPropagation();
    if (!activeAlbumId) return;
    const removedMedia = library.find((item) => item.id === mediaId);
    const isRemovedCover = (album: MediaAlbum) =>
      album.coverMediaId === mediaId || Boolean(
        removedMedia && album.coverUrl &&
        [removedMedia.url, ...(removedMedia.aliasUrls || [])].includes(album.coverUrl)
      );
    const updatedAlbums = albums.map((alb) =>
      alb.id === activeAlbumId
        ? {
            ...alb,
            mediaIds: alb.mediaIds.filter((id) => id !== mediaId),
            coverMediaId: isRemovedCover(alb) ? undefined : alb.coverMediaId,
            coverUrl: isRemovedCover(alb) ? undefined : alb.coverUrl,
          }
        : alb
    );
    if (onAdministrativeChange) {
      const result = await onAdministrativeChange((prev) => ({
        ...prev,
        albums: (prev.albums || []).map((alb) =>
          alb.id === activeAlbumId
            ? {
                ...alb,
                mediaIds: alb.mediaIds.filter((id) => id !== mediaId),
                coverMediaId: isRemovedCover(alb) ? undefined : alb.coverMediaId,
                coverUrl: isRemovedCover(alb) ? undefined : alb.coverUrl,
              }
            : alb
        ),
        library: (prev.library || []).map((item) =>
          item.id === mediaId
            ? { ...item, albumIds: (item.albumIds || []).filter((id) => id !== activeAlbumId) }
            : item
        ),
      }), {
        summary: 'Mídia removida do álbum',
        feedbackMessage: 'Mídia removida do álbum.',
      });
      if (!result.success) showNotice(result.error || 'Não foi possível remover a mídia do álbum.', 'error');
    } else {
      onChange({
        ...content,
        albums: updatedAlbums,
        library: library.map((item) =>
          item.id === mediaId
            ? { ...item, albumIds: (item.albumIds || []).filter((id) => id !== activeAlbumId) }
            : item
        ),
      });
    }
  };

  const handleMoveMediaInAlbum = async (index: number, direction: 'prev' | 'next') => {
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
    if (onAdministrativeChange) {
      const result = await onAdministrativeChange((prev) => ({
        ...prev,
        albums: (prev.albums || []).map((alb) =>
          alb.id === currentAlbum.id ? { ...alb, mediaIds: newMediaIds } : alb
        ),
      }), {
        summary: 'Ordem da mídia alterada no álbum',
        feedbackMessage: 'Ordem alterada.',
      });
      if (!result.success) showNotice(result.error || 'Não foi possível salvar a ordem das mídias.', 'error');
    } else {
      onChange({ ...content, albums: updatedAlbums });
    }
  };

  const handleSaveAlbumMediaIds = async (mediaIds: string[]) => {
    if (!currentAlbum) return;
    const uniqueMediaIds = Array.from(new Set(mediaIds));
    const updateAlbumMembership = (album: MediaAlbum): MediaAlbum => {
      if (album.id !== currentAlbum.id) return album;
      const coverMedia = library.find((item) => item.id === album.coverMediaId) ||
        library.find((item) => item.url === album.coverUrl || item.aliasUrls?.includes(album.coverUrl || ''));
      const coverIsStillInAlbum = album.coverMediaId
        ? uniqueMediaIds.includes(album.coverMediaId)
        : !coverMedia || uniqueMediaIds.includes(coverMedia.id);
      return {
        ...album,
        mediaIds: uniqueMediaIds,
        coverMediaId: coverIsStillInAlbum ? album.coverMediaId : undefined,
        coverUrl: coverIsStillInAlbum ? album.coverUrl : undefined,
      };
    };
    const updatedAlbums = albums.map(updateAlbumMembership);
    if (onAdministrativeChange) {
      const result = await onAdministrativeChange((prev) => ({
        ...prev,
        albums: (prev.albums || []).map(updateAlbumMembership),
        library: (prev.library || []).map((item) => {
          const belongsToAlbum = uniqueMediaIds.includes(item.id);
          const albumIds = new Set(item.albumIds || []);
          if (belongsToAlbum) albumIds.add(currentAlbum.id);
          else albumIds.delete(currentAlbum.id);
          return { ...item, albumIds: Array.from(albumIds) };
        }),
      }), {
        summary: 'Mídias do álbum atualizadas',
        feedbackMessage: 'Álbum atualizado.',
      });
      if (!result.success) throw new Error(result.error || 'Não foi possível salvar a organização do álbum.');
    } else {
      onChange({
        ...content,
        albums: updatedAlbums,
        library: library.map((item) => {
          const belongsToAlbum = uniqueMediaIds.includes(item.id);
          const albumIds = new Set(item.albumIds || []);
          if (belongsToAlbum) albumIds.add(currentAlbum.id);
          else albumIds.delete(currentAlbum.id);
          return { ...item, albumIds: Array.from(albumIds) };
        }),
      });
    }
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

  const displayedMedia = useMemo(() => {
    let result = [...library];
    if (currentAlbum) {
      result = currentAlbum.mediaIds.map((id) => library.find((m) => m.id === id)).filter(Boolean) as LibraryImageItem[];
    } else if (filterType === 'favorites') {
      result = result.filter((m) => m.favorite);
    } else if (filterType === 'unassigned') {
      result = result.filter((item) => !assignedMediaIds.has(item.id) && (!item.albumIds || item.albumIds.length === 0));
    } else if (filterType === 'photos') {
      result = result.filter((m) => !isMediaVideo(m));
    } else if (filterType === 'videos') {
      result = result.filter((m) => isMediaVideo(m));
    }
    if (mediaTypeFilter === 'photos') result = result.filter((m) => !isMediaVideo(m));
    else if (mediaTypeFilter === 'videos') result = result.filter((m) => isMediaVideo(m));
    if (!currentAlbum) {
      if (sortOrder === 'oldest') result.reverse();
      else if (sortOrder === 'name') result.sort((a, b) => (a.customName || a.name).localeCompare(b.customName || b.name));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item) => (item.name || '').toLowerCase().includes(q) || (item.customName || '').toLowerCase().includes(q));
    }
    return result;
  }, [library, currentAlbum, filterType, mediaTypeFilter, sortOrder, searchTerm, assignedMediaIds]);

  const totalPhotos = library.filter((m) => !isMediaVideo(m)).length;
  const totalVideos = library.filter((m) => isMediaVideo(m)).length;
  const totalFavorites = library.filter((m) => m.favorite).length;
  const totalUnassigned = useMemo(
    () => library.filter((item) => !assignedMediaIds.has(item.id) && (!item.albumIds || item.albumIds.length === 0)).length,
    [library, assignedMediaIds]
  );

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
    if (onAdministrativeChange) {
      onAdministrativeChange((prev) => ({
        ...prev,
        library: (prev.library || []).map((img) =>
          idSet.has(img.id) ? { ...img, favorite: true } : img
        ),
      }), {
        summary: `${selectedMediaIds.length} mídia(s) marcadas como favoritas`,
        feedbackMessage: `${selectedMediaIds.length} mídia(s) marcadas como favoritas.`,
      });
    } else {
      onChange({ ...content, library: updatedLibrary });
    }
    showNotice(`${selectedMediaIds.length} mídia(s) marcadas como favoritas!`, 'success');
    setSelectedMediaIds([]);
  };

  const handleBatchAddToAlbum = async (albumId: string) => {
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

    if (onAdministrativeChange) {
      const result = await onAdministrativeChange((prev) => ({
        ...prev,
        albums: (prev.albums || []).map((alb) =>
          alb.id === albumId
            ? {
                ...alb,
                mediaIds: Array.from(new Set([...alb.mediaIds, ...selectedMediaIds])),
              }
            : alb
        ),
        library: (prev.library || []).map((img) =>
          idSet.has(img.id)
            ? {
                ...img,
                albumIds: Array.from(new Set([...(img.albumIds || []), albumId])),
              }
            : img
        ),
      }), {
        summary: `${selectedMediaIds.length} mídia(s) adicionadas ao álbum "${targetAlbum.name}"`,
        feedbackMessage: `${selectedMediaIds.length} mídia(s) adicionadas ao álbum.`,
      });
      if (!result.success) {
        showNotice(result.error || 'Não foi possível adicionar as mídias ao álbum.', 'error');
        return;
      }
    } else {
      onChange({ ...content, albums: updatedAlbums, library: updatedLibrary });
    }
    showNotice(
      `${selectedMediaIds.length} mídia(s) adicionadas ao álbum "${targetAlbum.name}".`,
      'success'
    );
    setSelectedMediaIds([]);
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedMediaIds.length === 0) return;
    const idSet = new Set(selectedMediaIds);
    const itemsToDelete = library.filter((item) => idSet.has(item.id));
    setBatchDeleteConfirm(false);
    showNotice('Verificando quais mídias podem ser excluídas…', 'info');

    const results = await Promise.all(
      itemsToDelete.map(async (item) => ({
        item,
        deleted: await deleteStoredMedia(item).catch(() => false),
      }))
    );
    const successfullyDeleted = results.filter((result) => result.deleted).map((result) => result.item);
    const blockedOrFailed = results.filter((result) => !result.deleted).map((result) => result.item);
    const deletedIds = new Set(successfullyDeleted.map((item) => item.id));
    const deletedUrls = new Set(successfullyDeleted.map((item) => item.url));
    let persistenceFailed = false;

    if (successfullyDeleted.length > 0) {
      let persisted = true;
      if (onAdministrativeChange) {
        const result = await onAdministrativeChange((prev) => ({
          ...prev,
          library: (prev.library || []).filter((img) => !deletedIds.has(img.id) && !deletedUrls.has(img.url)),
          albums: (prev.albums || []).map((album) => ({
            ...album,
            mediaIds: album.mediaIds.filter((id) => !deletedIds.has(id)),
            coverMediaId:
              album.coverMediaId && deletedIds.has(album.coverMediaId) ? undefined : album.coverMediaId,
            coverUrl: album.coverUrl && deletedUrls.has(album.coverUrl) ? undefined : album.coverUrl,
          })),
        }), {
          summary: `Exclusão em lote de ${successfullyDeleted.length} mídia(s)`,
          feedbackMessage: `${successfullyDeleted.length} mídia(s) excluída(s) com sucesso.`,
        });
        persisted = result.success;
      } else {
        onChange({
          ...content,
          library: (content.library || []).filter((img) => !deletedIds.has(img.id) && !deletedUrls.has(img.url)),
          albums: (content.albums || []).map((album) => ({
            ...album,
            mediaIds: album.mediaIds.filter((id) => !deletedIds.has(id)),
            coverMediaId:
              album.coverMediaId && deletedIds.has(album.coverMediaId) ? undefined : album.coverMediaId,
            coverUrl: album.coverUrl && deletedUrls.has(album.coverUrl) ? undefined : album.coverUrl,
          })),
        });
      }

      setStorageMedia((prev) => prev.filter((item) => !deletedIds.has(item.id) && !deletedUrls.has(item.url)));
      if (!persisted) {
        persistenceFailed = true;
        showNotice('O arquivo foi removido do armazenamento, mas a biblioteca não confirmou a gravação. Atualize o acervo antes de tentar novamente.', 'error');
      }
    }

    setSelectedMediaIds([]);
    if (persistenceFailed) return;
    if (blockedOrFailed.length > 0) {
      showNotice(
        successfullyDeleted.length > 0
          ? `${successfullyDeleted.length} mídia(s) excluída(s); ${blockedOrFailed.length} não foram removidas porque ainda estão em uso ou houve falha.`
          : 'Nenhuma mídia foi excluída. Os arquivos selecionados ainda podem estar em uso ou houve uma falha ao verificar.',
        successfullyDeleted.length > 0 ? 'info' : 'error'
      );
    } else if (successfullyDeleted.length > 0) {
      showNotice(`${successfullyDeleted.length} mídia(s) excluída(s) com sucesso.`, 'success');
    }
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
    mediaTypeFilter,
    setMediaTypeFilter,
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
    isLoading,
  };
}
