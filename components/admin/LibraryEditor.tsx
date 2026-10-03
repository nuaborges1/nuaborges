'use client';

import React, { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import {
  Upload,
  Trash2,
  Search,
  Check,
  Copy,
  Film,
  Zap,
  Heart,
  Folder,
  FolderPlus,
  Grid,
  List,
  ArrowUpDown,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Edit2,
  Plus,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { SiteContent, LibraryImageItem, MediaAlbum } from '@/lib/types';
import { optimizeAndStoreImage, deleteStoredMedia } from '@/lib/contentStore';
import { resolveMediaUrl } from '@/lib/media';
import { getMediaUsage } from '@/lib/mediaUsage';
import { MediaViewerModal } from './MediaViewerModal';
import { AlbumCreateModal } from './AlbumCreateModal';
import { AlbumMediaSelectorModal } from './AlbumMediaSelectorModal';
import { ConfirmModal } from './ConfirmModal';

interface LibraryEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

type MediaFilterType = 'all' | 'photos' | 'videos' | 'favorites' | 'albums';
type ViewMode = 'grid' | 'list';
type SortOrder = 'newest' | 'oldest' | 'name';

export function LibraryEditor({ content, onChange, onUploadNew }: LibraryEditorProps) {
  // Navigation & Filtering
  const [filterType, setFilterType] = useState<MediaFilterType>('all');
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadSuccessCount, setUploadSuccessCount] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [libraryNotice, setLibraryNotice] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [deleteAlbumConfirm, setDeleteAlbumConfirm] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLibraryNotice({ message, type });
    setTimeout(() => setLibraryNotice(null), 4000);
  };

  // Modals state
  const [viewingMedia, setViewingMedia] = useState<LibraryImageItem | null>(null);
  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<MediaAlbum | null>(null);
  const [albumMediaSelectorOpen, setAlbumMediaSelectorOpen] = useState(false);

  const library = content.library || [];
  const albums = content.albums || [];

  // Active album if any
  const currentAlbum = useMemo(() => {
    return activeAlbumId ? albums.find((a) => a.id === activeAlbumId) || null : null;
  }, [activeAlbumId, albums]);

  // Handle Multi-File Upload
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

        // Duplicate Detection (same name and size)
        const isDuplicate = library.some(
          (item) =>
            item.name.toLowerCase() === file.name.toLowerCase() &&
            item.sizeBytes === file.size
        );

        if (isDuplicate) {
          skippedDuplicates++;
          continue;
        }

        setUploadStatusText(`Preparando ${file.name} (${i + 1}/${total})...`);

        const item = await optimizeAndStoreImage(file, (percent) => {
          const overall = Math.round(((i + percent / 100) / total) * 100);
          setUploadProgress(overall);
        });

        // If inside an album, automatically tag new upload with this album
        if (activeAlbumId) {
          item.albumIds = [activeAlbumId];
        }

        newItems.push(item);
      }

      if (newItems.length > 0) {
        let updatedAlbums = albums;
        if (activeAlbumId) {
          updatedAlbums = albums.map((alb) =>
            alb.id === activeAlbumId
              ? {
                  ...alb,
                  mediaIds: [...alb.mediaIds, ...newItems.map((n) => n.id)],
                  coverMediaId: alb.coverMediaId || newItems[0].id,
                  coverUrl: alb.coverUrl || newItems[0].url,
                }
              : alb
          );
        }

        onChange({
          ...content,
          library: [...newItems, ...library],
          albums: updatedAlbums,
        });

        setUploadSuccessCount(newItems.length);
        setTimeout(() => setUploadSuccessCount(null), 4000);
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

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (e: React.MouseEvent, item: LibraryImageItem) => {
    e.stopPropagation();
    const isFav = !item.favorite;
    const updatedLibrary = library.map((img) =>
      img.id === item.id ? { ...img, favorite: isFav } : img
    );
    onChange({ ...content, library: updatedLibrary });
  };

  // Album Management
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

  // Reorder media within current album
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

  // Save updated media list for current album from selector modal
  const handleSaveAlbumMediaIds = (mediaIds: string[]) => {
    if (!currentAlbum) return;
    const updatedAlbums = albums.map((alb) =>
      alb.id === currentAlbum.id ? { ...alb, mediaIds } : alb
    );
    onChange({ ...content, albums: updatedAlbums });
  };

  // Filtering & Sorting
  const displayedMedia = useMemo(() => {
    let result = [...library];

    // If inside an album
    if (currentAlbum) {
      const albumIdSet = new Set(currentAlbum.mediaIds);
      // Retain album ordered sequence
      result = currentAlbum.mediaIds
        .map((id) => library.find((m) => m.id === id))
        .filter(Boolean) as LibraryImageItem[];
    } else {
      // General filter
      if (filterType === 'photos') {
        result = result.filter((m) => !m.isVideo);
      } else if (filterType === 'videos') {
        result = result.filter((m) => m.isVideo);
      } else if (filterType === 'favorites') {
        result = result.filter((m) => m.favorite);
      }

      // Sort
      if (sortOrder === 'newest') {
        // already newest first
      } else if (sortOrder === 'oldest') {
        result.reverse();
      } else if (sortOrder === 'name') {
        result.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.customName || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [library, currentAlbum, filterType, sortOrder, searchTerm]);

  // Counts
  const totalPhotos = library.filter((m) => !m.isVideo).length;
  const totalVideos = library.filter((m) => m.isVideo).length;
  const totalFavorites = library.filter((m) => m.favorite).length;

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => handleUploadFiles(e.target.files)}
      />

      {/* In-app Notice Banner */}
      {libraryNotice && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs flex items-center justify-between transition-all ${
            libraryNotice.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              : libraryNotice.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
          }`}
        >
          <span>{libraryNotice.message}</span>
          <button
            type="button"
            onClick={() => setLibraryNotice(null)}
            className="text-zinc-400 hover:text-white text-xs ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-[#09090c] border rounded-3xl p-5 sm:p-8 transition-all ${
          isDragging
            ? 'border-[#f4a7b9] ring-4 ring-[#f4a7b9]/20 bg-zinc-900/90'
            : 'border-zinc-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.2em] uppercase">
                ACERVO CENTRAL
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
                <Zap className="w-3 h-3 text-[#f4a7b9]" /> Otimização Automática Ativa
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-white font-medium">
              Biblioteca de Mídia ({library.length})
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 max-w-2xl leading-relaxed">
              Adicione fotos e vídeos uma única vez e use onde quiser no site: na Capa, no Sobre Mim e na Galeria, sem duplicar arquivos.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setEditingAlbum(null);
                setAlbumModalOpen(true);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer min-h-[44px]"
            >
              <FolderPlus className="w-4 h-4 text-[#f4a7b9]" />
              <span>Criar Álbum</span>
            </button>

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_2px_16px_rgba(244,167,185,0.25)] disabled:opacity-50 min-h-[44px]"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Guardando no acervo...' : '+ Adicionar Fotos ou Vídeos'}</span>
            </button>
          </div>
        </div>

        {/* Drag and Drop Zone Hint (Visible on desktop/tablet) */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 hidden sm:block border-2 border-dashed border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-colors bg-zinc-950/40"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-zinc-400 text-xs">
            <Upload className="w-4 h-4 text-[#f4a7b9]" />
            <span>
              Arraste fotos e vídeos aqui ou toque para{' '}
              <strong className="text-white font-medium">escolher do celular ou computador</strong>.
            </span>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="mt-4 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-2">
              <span className="truncate max-w-[280px] sm:max-w-md">
                {uploadStatusText || 'Processando e guardando mídia...'}
              </span>
              <span className="font-mono text-[#f4a7b9] font-semibold">{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#f4a7b9] to-[#efa0b3] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Banner */}
        {uploadSuccessCount !== null && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {uploadSuccessCount} {uploadSuccessCount === 1 ? 'mídia adicionada' : 'mídias adicionadas'} ao seu acervo com sucesso.
            </span>
          </div>
        )}
      </div>

      {/* Inside Album View Header */}
      {currentAlbum ? (
        <div className="bg-[#0c0c10] border border-zinc-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setActiveAlbumId(null)}
              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-800"
              title="Voltar para todas as mídias"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#f4a7b9] font-semibold">
                  ÁLBUM
                </span>
                <span className="text-zinc-500 text-xs">• {displayedMedia.length} mídias</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">
                {currentAlbum.name}
              </h3>
              {currentAlbum.description && (
                <p className="text-zinc-400 text-xs font-light mt-0.5 max-w-xl">
                  {currentAlbum.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              type="button"
              onClick={() => setAlbumMediaSelectorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar do Acervo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingAlbum(currentAlbum);
                setAlbumModalOpen(true);
              }}
              className="p-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800"
              title="Editar dados do álbum"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteAlbum(currentAlbum.id, currentAlbum.name)}
              className="p-2.5 rounded-full bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer border border-zinc-800"
              title="Excluir álbum"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Albums Horizontal Shelf */
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="font-serif text-base sm:text-lg text-white flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#f4a7b9]" />
              <span>Álbuns & Coleções ({albums.length})</span>
            </h4>
            <button
              type="button"
              onClick={() => {
                setEditingAlbum(null);
                setAlbumModalOpen(true);
              }}
              className="text-[#f4a7b9] hover:text-[#efa0b3] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Álbum</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {/* All Photos Quick Card */}
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[110px] ${
                filterType === 'all' && !activeAlbumId
                  ? 'bg-zinc-900 border-[#f4a7b9] ring-2 ring-[#f4a7b9]/25'
                  : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 mb-2">
                <ImageIcon className="w-4 h-4 text-[#f4a7b9]" />
              </div>
              <div>
                <span className="text-white text-xs font-semibold block">Todas as Fotos</span>
                <span className="text-zinc-500 text-[10px] font-mono">{library.length} arquivos</span>
              </div>
            </button>

            {/* Favorites Quick Card */}
            <button
              type="button"
              onClick={() => setFilterType('favorites')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[110px] ${
                filterType === 'favorites' && !activeAlbumId
                  ? 'bg-zinc-900 border-[#f4a7b9] ring-2 ring-[#f4a7b9]/25'
                  : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400 mb-2">
                <Heart className="w-4 h-4 fill-rose-400" />
              </div>
              <div>
                <span className="text-white text-xs font-semibold block">Favoritos</span>
                <span className="text-zinc-500 text-[10px] font-mono">
                  {totalFavorites} {totalFavorites === 1 ? 'favorita' : 'favoritas'}
                </span>
              </div>
            </button>

            {/* Custom User Albums */}
            {albums.map((album) => {
              const count = album.mediaIds.length;
              const coverItem = library.find((m) => m.id === album.coverMediaId) || library.find((m) => m.url === album.coverUrl);
              const coverUrl = coverItem ? resolveMediaUrl(coverItem.url) : (album.coverUrl ? resolveMediaUrl(album.coverUrl) : null);

              return (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => setActiveAlbumId(album.id)}
                  className="group relative rounded-2xl border border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80 overflow-hidden text-left transition-all cursor-pointer flex flex-col justify-between p-2.5 min-h-[110px]"
                >
                  <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-black mb-2">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={album.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="160px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                        <Folder className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-white text-xs font-semibold block truncate" title={album.name}>
                      {album.name}
                    </span>
                    <span className="text-zinc-500 text-[10px] font-mono">
                      {count} {count === 1 ? 'mídia' : 'mídias'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & View Toolbar */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Pills */}
        {!currentAlbum && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/60'
              }`}
            >
              Todos ({library.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('photos')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'photos'
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/60'
              }`}
            >
              Fotos ({totalPhotos})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('videos')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'videos'
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/60'
              }`}
            >
              Vídeos ({totalVideos})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('favorites')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterType === 'favorites'
                  ? 'bg-white text-zinc-950'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/60'
              }`}
            >
              Favoritos ({totalFavorites})
            </button>
          </div>
        )}

        {/* Search & Layout Toggles */}
        <div className="flex items-center gap-2.5 flex-1 md:justify-end">
          <div className="relative flex-1 md:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Buscar mídia por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          {/* Sort Dropdown */}
          {!currentAlbum && (
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="bg-zinc-900 border border-zinc-800 rounded-full px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer focus:border-[#f4a7b9]"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="name">Nome (A-Z)</option>
            </select>
          )}

          {/* Grid / List View Toggle */}
          <div className="flex items-center rounded-full bg-zinc-900 border border-zinc-800 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Exibição em Grade"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Exibição em Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Media Content */}
      {displayedMedia.length === 0 ? (
        <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-12 text-center">
          <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h4 className="font-serif text-lg text-white font-medium mb-1">
            {searchTerm
              ? 'Nenhuma mídia encontrada para sua busca'
              : currentAlbum
              ? 'Este álbum ainda não possui fotos'
              : 'Seu acervo de fotos está vazio'}
          </h4>
          <p className="text-zinc-500 text-xs font-light max-w-sm mx-auto mb-5 leading-relaxed">
            {searchTerm
              ? `Não encontramos nenhum arquivo com o nome "${searchTerm}". Tente buscar por outro termo.`
              : currentAlbum
              ? 'Adicione fotos do seu acervo a este álbum ou envie novos arquivos do celular ou computador.'
              : 'Adicione suas primeiras fotos ou vídeos para começar a montar o seu site.'}
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Adicionar Fotos Agora</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {displayedMedia.map((item, index) => {
            const displayUrl = resolveMediaUrl(item.url);
            const usages = getMediaUsage(item, content);

            return (
              <div
                key={item.id}
                onClick={() => setViewingMedia(item)}
                className="group relative rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 overflow-hidden flex flex-col justify-between p-2.5 transition-all cursor-pointer"
              >
                {/* Visual Thumbnail */}
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black mb-2">
                  <Image
                    src={displayUrl}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 160px, (max-width: 1024px) 220px, 260px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                  {/* Video Badge */}
                  {item.isVideo && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[9px] font-mono text-white flex items-center gap-1">
                      <Film className="w-3 h-3 text-[#f4a7b9]" />
                      <span>Vídeo</span>
                    </div>
                  )}

                  {/* Favorite Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, item)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
                    title={item.favorite ? 'Remover dos favoritos' : 'Favoritar'}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        item.favorite
                          ? 'fill-rose-400 text-rose-400'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    />
                  </button>

                  {/* Site Presence Badge */}
                  {usages.length > 0 && (
                    <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[9px] font-semibold text-[#f4a7b9] uppercase tracking-wider">
                        {usages.length === 1 ? usages[0].label : `${usages.length} locais`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Friendly Title & Meta */}
                <div className="px-1">
                  <span
                    className="text-white text-xs font-medium block truncate"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono mt-0.5">
                    <span>{item.uploadedAt || 'Recente'}</span>
                    <span>
                      {item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : 'Otimizado'}
                    </span>
                  </div>
                </div>

                {/* Album Reorder Controls (if inside an album) */}
                {currentAlbum && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/80"
                  >
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveMediaInAlbum(index, 'prev')}
                      className="p-1 rounded-lg text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Mover para a esquerda"
                    >
                      <ArrowUp className="w-3.5 h-3.5 -rotate-90" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetAlbumCover(item.id, item.url)}
                      className={`text-[10px] font-semibold transition-colors cursor-pointer ${
                        currentAlbum.coverMediaId === item.id
                          ? 'text-[#f4a7b9]'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                      title="Definir foto como capa deste álbum"
                    >
                      {currentAlbum.coverMediaId === item.id ? 'Capa do Álbum' : 'Tornar Capa'}
                    </button>

                    <button
                      type="button"
                      disabled={index === displayedMedia.length - 1}
                      onClick={() => handleMoveMediaInAlbum(index, 'next')}
                      className="p-1 rounded-lg text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Mover para a direita"
                    >
                      <ArrowDown className="w-3.5 h-3.5 -rotate-90" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveFromAlbum(e, item.id)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 cursor-pointer"
                      title="Remover deste álbum (não apaga a foto do acervo)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-[#09090c] border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800/70">
          {displayedMedia.map((item) => {
            const displayUrl = resolveMediaUrl(item.url);
            const usages = getMediaUsage(item, content);

            return (
              <div
                key={item.id}
                onClick={() => setViewingMedia(item)}
                className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-zinc-900/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-16 rounded-xl overflow-hidden bg-black shrink-0">
                    <Image
                      src={displayUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="60px"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs sm:text-sm font-medium truncate block">
                        {item.name}
                      </span>
                      {item.isVideo && (
                        <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-[9px] text-[#f4a7b9] font-mono shrink-0">
                          Vídeo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-zinc-500 text-[11px] font-mono mt-0.5">
                      <span>{item.uploadedAt || 'Recente'}</span>
                      <span>
                        {item.sizeBytes ? `${Math.round(item.sizeBytes / 1024)} KB` : 'Otimizado'}
                      </span>
                      {usages.length > 0 && (
                        <span className="text-[#f4a7b9] font-sans font-medium">
                          Usada em: {usages.map((u) => u.label).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, item)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        item.favorite ? 'fill-rose-400 text-rose-400' : 'text-zinc-500'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingMedia(item)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-medium cursor-pointer"
                  >
                    Detalhes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Media Viewer Modal */}
      <MediaViewerModal
        isOpen={Boolean(viewingMedia)}
        item={viewingMedia}
        content={content}
        onChangeContent={(updated) => {
          onChange(updated);
          // Keep current viewing media updated
          if (viewingMedia) {
            const nextItem = updated.library.find((i) => i.id === viewingMedia.id) || null;
            setViewingMedia(nextItem);
          }
        }}
        onClose={() => setViewingMedia(null)}
      />

      {/* Album Create / Edit Modal */}
      <AlbumCreateModal
        isOpen={albumModalOpen}
        library={library}
        albumToEdit={editingAlbum}
        onSave={handleSaveAlbum}
        onClose={() => {
          setAlbumModalOpen(false);
          setEditingAlbum(null);
        }}
      />

      {/* Album Media Selector Modal */}
      <AlbumMediaSelectorModal
        isOpen={albumMediaSelectorOpen}
        album={currentAlbum}
        library={library}
        onSave={handleSaveAlbumMediaIds}
        onClose={() => setAlbumMediaSelectorOpen(false)}
      />

      {/* Custom Confirmation Modal for Deleting Albums */}
      <ConfirmModal
        isOpen={Boolean(deleteAlbumConfirm)}
        title={deleteAlbumConfirm ? `Excluir o Álbum "${deleteAlbumConfirm.name}"?` : 'Excluir Álbum'}
        description="Deseja excluir este álbum? As fotos continuarão guardadas no seu acervo e não serão apagadas — apenas o agrupamento deste álbum será removido."
        confirmText="Excluir Álbum"
        cancelText="Manter Álbum"
        variant="danger"
        onConfirm={handleConfirmDeleteAlbum}
        onCancel={() => setDeleteAlbumConfirm(null)}
      />
    </div>
  );
}
