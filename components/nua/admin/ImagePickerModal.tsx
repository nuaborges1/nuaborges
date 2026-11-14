'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeft, Image as ImageIcon, Upload } from 'lucide-react';
import { LibraryImageItem, MediaAlbum } from '@/lib/types';
import { optimizeAndStoreImage } from '@/lib/contentStore';
import { isMediaVideo } from '@/lib/media';
import { useScrollLock } from '@/hooks/useScrollLock';
import { HelpTriggerButton } from './help/HelpTriggerButton';
import { ImagePickerVideoPreview } from './picker/ImagePickerVideoPreview';
import { ImagePickerFilterBar } from './picker/ImagePickerFilterBar';
import { ImagePickerGridItem } from './picker/ImagePickerGridItem';

interface ImagePickerModalProps {
  isOpen: boolean;
  library: LibraryImageItem[];
  albums?: MediaAlbum[];
  currentImageUrl?: string;
  initialSelectedUrls?: string[];
  title?: string;
  subtitle?: string;
  backText?: string;
  allowedMediaType?: 'all' | 'photos' | 'videos';
  selectionMode?: 'single' | 'multiple';
  allowEmptySelection?: boolean;
  onSelect: (imageUrl: string, mediaItem?: LibraryImageItem) => void;
  onSelectMultiple?: (imageUrls: string[], mediaItems?: LibraryImageItem[]) => void;
  onUploadNew?: (newImage: LibraryImageItem) => void;
  onClose: () => void;
}

export function ImagePickerModal({
  isOpen,
  library,
  albums = [],
  currentImageUrl,
  initialSelectedUrls,
  title = 'Escolher da Biblioteca',
  subtitle,
  backText = 'Fechar',
  allowedMediaType = 'all',
  selectionMode,
  allowEmptySelection = false,
  onSelect,
  onSelectMultiple,
  onUploadNew,
  onClose,
}: ImagePickerModalProps) {
  const isMultiSelect = selectionMode ? selectionMode === 'multiple' : Boolean(onSelectMultiple);
  const [mounted, setMounted] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<string[]>(
    initialSelectedUrls && initialSelectedUrls.length > 0
      ? initialSelectedUrls
      : currentImageUrl
      ? [currentImageUrl]
      : []
  );
  const [previewingVideoItem, setPreviewingVideoItem] = useState<LibraryImageItem | null>(null);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'photos' | 'videos'>(allowedMediaType);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewingVideoItem) {
          setPreviewingVideoItem(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, previewingVideoItem, onClose]);

  useEffect(() => {
    if (isOpen) {
      if (initialSelectedUrls && initialSelectedUrls.length > 0) {
        setSelectedUrls(initialSelectedUrls);
      } else {
        setSelectedUrls(currentImageUrl ? [currentImageUrl] : []);
      }
      setSearch('');
      setMediaTypeFilter(allowedMediaType);
    }
  }, [isOpen, currentImageUrl, initialSelectedUrls, allowedMediaType]);

  const assignedMediaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const alb of albums) {
      for (const id of alb.mediaIds) {
        ids.add(id);
      }
    }
    return ids;
  }, [albums]);

  const filteredLibrary = useMemo(() => {
    if (!isOpen) return [];
    let list = [...library];

    if (selectedAlbumId === 'unassigned') {
      list = list.filter(
        (item) => !assignedMediaIds.has(item.id) && (!item.albumIds || item.albumIds.length === 0)
      );
    } else if (selectedAlbumId !== 'all') {
      const album = albums.find((a) => a.id === selectedAlbumId);
      if (album) {
        const idSet = new Set(album.mediaIds);
        list = list.filter((item) => idSet.has(item.id));
      }
    }

    if (onlyFavorites) {
      list = list.filter((item) => item.favorite);
    }

    if (mediaTypeFilter === 'photos') {
      list = list.filter((item) => !isMediaVideo(item));
    } else if (mediaTypeFilter === 'videos') {
      list = list.filter((item) => isMediaVideo(item));
    }

    if (sortOrder === 'oldest') {
      list.reverse();
    } else if (sortOrder === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          (item.name || '').toLowerCase().includes(q) ||
          (item.customName || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [
    isOpen,
    library,
    albums,
    assignedMediaIds,
    selectedAlbumId,
    onlyFavorites,
    mediaTypeFilter,
    sortOrder,
    search,
  ]);

  const totalPhotosCount = useMemo(() => library.filter((i) => !isMediaVideo(i)).length, [library]);
  const totalVideosCount = useMemo(() => library.filter((i) => isMediaVideo(i)).length, [library]);

  if (!isOpen) return null;

  const handleUploadMultipleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    const filesArray = Array.from(filesList);
    setUploading(true);
    setErrorMessage(null);

    const newUploadedUrls: string[] = [];
    const newUploadedItems: LibraryImageItem[] = [];

    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        setUploadProgressText(`Enviando ${i + 1} de ${filesArray.length}...`);
        const newImg = await optimizeAndStoreImage(file);
        onUploadNew?.(newImg);
        newUploadedUrls.push(newImg.url);
        newUploadedItems.push(newImg);
      }

      if (isMultiSelect) {
        setSelectedUrls((prev) => Array.from(new Set([...prev, ...newUploadedUrls])));
      } else if (newUploadedUrls.length > 0) {
        setSelectedUrls([newUploadedUrls[0]]);
        onSelect(newUploadedUrls[0], newUploadedItems[0]);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Não foi possível carregar alguns arquivos. Verifique se estão no formato JPG, PNG, WebP ou MP4.'
      );
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setUploading(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleSelectUrl = (url: string) => {
    if (!isMultiSelect) {
      setSelectedUrls((prev) => (prev[0] === url ? [] : [url]));
      return;
    }
    setSelectedUrls((prev) => {
      if (prev.includes(url)) {
        return prev.filter((u) => u !== url);
      }
      return [...prev, url];
    });
  };

  const handleConfirmSelection = () => {
    if (selectedUrls.length === 0 && !allowEmptySelection) return;

    const selectedItems = selectedUrls
      .map((url) =>
        library.find(
          (m) =>
            m.url === url ||
            m.objectKey === url ||
            m.posterUrl === url ||
            m.id === url ||
            (m.variants && Object.values(m.variants).some((v) => v?.url === url || v?.key === url))
        )
      )
      .filter(Boolean) as LibraryImageItem[];

    if (onSelectMultiple) {
      onSelectMultiple(selectedUrls, selectedItems);
    } else {
      onSelect(selectedUrls[0], selectedItems[0]);
    }
    onClose();
  };

  const handleSelectAllFiltered = () => {
    const allFilteredUrls = filteredLibrary.map((item) => item.url);
    const isAllSelected = allFilteredUrls.every((url) => selectedUrls.includes(url));

    if (isAllSelected) {
      setSelectedUrls((prev) => prev.filter((url) => !allFilteredUrls.includes(url)));
    } else {
      setSelectedUrls((prev) => Array.from(new Set([...prev, ...allFilteredUrls])));
    }
  };

  const resolvedSubtitle =
    subtitle ||
    (mediaTypeFilter === 'videos'
      ? 'Escolha vídeos do seu acervo central ou envie novos arquivos do seu dispositivo.'
      : mediaTypeFilter === 'photos'
      ? 'Escolha fotos do seu acervo central ou envie novas imagens do seu dispositivo.'
      : 'Escolha fotos ou vídeos do seu acervo central ou envie novos arquivos do seu dispositivo.');

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/85 backdrop-blur-md overscroll-contain select-none">
        <div className="absolute inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          className="relative w-full max-w-4xl bg-[#14151c] border border-white/[0.08] rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overscroll-contain"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg text-white font-semibold tracking-tight">
                  {title}
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 text-[#f4a7b9]">
                  {isMultiSelect ? 'Seleção Múltipla' : 'Seleção Única'}
                </span>
                <HelpTriggerButton helpId="modal_seletor_midia" compact />
              </div>
              <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">{resolvedSubtitle}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {backText && backText !== 'Fechar' && (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer font-medium"
                  title="Voltar sem alterar"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{backText}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                aria-label="Fechar seletor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* In-app error notice */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white text-xs ml-2 cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Top Actions & Filters */}
          <input
            ref={fileInputRef}
            type="file"
            multiple={isMultiSelect}
            accept={
              allowedMediaType === 'videos'
                ? 'video/mp4,video/webm,video/quicktime'
                : allowedMediaType === 'photos'
                ? 'image/*'
                : 'image/*,video/mp4,video/webm,video/quicktime'
            }
            className="hidden"
            onChange={handleUploadMultipleFiles}
          />
          <ImagePickerFilterBar
            uploading={uploading}
            uploadProgressText={uploadProgressText}
            onUploadClick={() => fileInputRef.current?.click()}
            search={search}
            setSearch={setSearch}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            filteredLibrary={filteredLibrary}
            selectedUrls={selectedUrls}
            allowMultiSelect={isMultiSelect}
            onSelectAllFiltered={handleSelectAllFiltered}
            allowedMediaType={allowedMediaType}
            mediaTypeFilter={mediaTypeFilter}
            setMediaTypeFilter={setMediaTypeFilter}
            libraryLength={library.length}
            totalPhotosCount={totalPhotosCount}
            totalVideosCount={totalVideosCount}
            onlyFavorites={onlyFavorites}
            setOnlyFavorites={setOnlyFavorites}
            selectedAlbumId={selectedAlbumId}
            setSelectedAlbumId={setSelectedAlbumId}
            albums={albums}
          />

          {/* Grid of Images / Videos */}
          {filteredLibrary.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-[#101116] rounded-xl border border-white/[0.05] my-2">
              <ImageIcon className="w-9 h-9 text-zinc-600 mb-2.5" />
              <p className="text-sm font-medium text-white mb-1">
                {search ? `Nenhuma mídia encontrada para "${search}"` : 'Nenhuma mídia neste filtro'}
              </p>
              <p className="text-xs text-zinc-400 max-w-xs mb-4">
                Você pode enviar novas fotos ou vídeos agora mesmo do seu computador ou celular.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 h-8 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 font-semibold text-xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Enviar Mídias Agora</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 pt-2 pb-4">
              {filteredLibrary.map((item) => (
                <ImagePickerGridItem
                  key={item.id}
                  item={item}
                  isSelected={selectedUrls.includes(item.url)}
                  selectionIndex={selectedUrls.indexOf(item.url) + 1}
                  showMultiIndex={isMultiSelect && selectedUrls.length > 1}
                  isHovered={hoveredVideoId === item.id}
                  onHoverStart={() => setHoveredVideoId(item.id)}
                  onHoverEnd={() => setHoveredVideoId(null)}
                  onToggleSelect={() => toggleSelectUrl(item.url)}
                  onPreviewVideo={() => setPreviewingVideoItem(item)}
                />
              ))}
            </div>
          )}

          {/* Sticky Footer Bar */}
          <div className="pt-3 mt-2 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-zinc-300 text-xs font-medium">
                {selectedUrls.length > 0 ? (
                  <span className="text-[#f4a7b9] font-semibold">
                    {selectedUrls.length}{' '}
                    {selectedUrls.length === 1 ? 'mídia selecionada' : 'mídias selecionadas'}
                  </span>
                ) : (
                  <span className="text-zinc-500">
                    {isMultiSelect
                      ? 'Toque nas fotos ou vídeos para selecionar um ou vários de uma só vez'
                      : 'Toque na foto ou vídeo desejado para selecionar'}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <span>{backText}</span>
              </button>
              <button
                type="button"
                disabled={selectedUrls.length === 0 && !allowEmptySelection}
                onClick={handleConfirmSelection}
                className="flex-[2] sm:flex-none h-8 px-5 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-40"
              >
                {selectedUrls.length > 1
                  ? `Confirmar ${selectedUrls.length} Mídias`
                  : 'Confirmar Seleção'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Modal de Preview de Vídeo em Alta Definição */}
        <ImagePickerVideoPreview
          item={previewingVideoItem}
          isSelected={Boolean(
            previewingVideoItem && selectedUrls.includes(previewingVideoItem.url)
          )}
          onToggleSelect={() => {
            if (previewingVideoItem) toggleSelectUrl(previewingVideoItem.url);
          }}
          onClose={() => setPreviewingVideoItem(null)}
        />
      </div>
    </AnimatePresence>,
    document.body
  );
}
