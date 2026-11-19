/* Vinho maduro / Nua Borges */
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Images, Upload } from 'lucide-react';
import { LibraryImageItem, MediaAlbum } from '@/lib/types';
import { optimizeAndStoreImage } from '@/lib/contentStore';
import { isMediaVideo } from '@/lib/media';
import { useScrollLock } from '@/hooks/useScrollLock';
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
  uploadVisibility?: 'public' | 'private';
  uploadDestinationLabel?: string;
  confirmActionLabel?: string;
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
  uploadVisibility = 'public',
  uploadDestinationLabel = 'este conteúdo',
  confirmActionLabel,
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
  const [sourceMode, setSourceMode] = useState<'library' | 'upload'>('library');
  const [isDropActive, setIsDropActive] = useState(false);
  const [uploadedItems, setUploadedItems] = useState<LibraryImageItem[]>([]);
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
      setSourceMode('library');
      setIsDropActive(false);
      setUploadedItems([]);
      setSelectedAlbumId('all');
      setOnlyFavorites(false);
      setSortOrder('newest');
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
    let list = sourceMode === 'upload' ? [...uploadedItems] : [...library];

    if (sourceMode === 'library' && selectedAlbumId === 'unassigned') {
      list = list.filter((item) => !assignedMediaIds.has(item.id) && (!item.albumIds || item.albumIds.length === 0));
    } else if (sourceMode === 'library' && selectedAlbumId !== 'all') {
      const album = albums.find((a) => a.id === selectedAlbumId);
      if (album) {
        const idSet = new Set(album.mediaIds);
        list = list.filter((item) => idSet.has(item.id));
      }
    }

    if (sourceMode === 'library' && onlyFavorites) list = list.filter((item) => item.favorite);
    const activeTypeFilter = sourceMode === 'upload' ? allowedMediaType : mediaTypeFilter;
    if (activeTypeFilter === 'photos') list = list.filter((item) => !isMediaVideo(item));
    else if (activeTypeFilter === 'videos') list = list.filter((item) => isMediaVideo(item));
    if (sortOrder === 'oldest') list.reverse();
    else if (sortOrder === 'name') list.sort((a, b) => (a.customName || a.name).localeCompare(b.customName || b.name));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => (item.name || '').toLowerCase().includes(q) || (item.customName || '').toLowerCase().includes(q));
    }
    return list;
  }, [isOpen, sourceMode, uploadedItems, library, albums, assignedMediaIds, selectedAlbumId, onlyFavorites, mediaTypeFilter, allowedMediaType, sortOrder, search]);

  const totalPhotosCount = useMemo(() => library.filter((i) => !isMediaVideo(i)).length, [library]);
  const totalVideosCount = useMemo(() => library.filter((i) => isMediaVideo(i)).length, [library]);
  const selectedLibraryCount = selectedUrls.filter((url) =>
    library.some((item) => item.url === url || item.objectKey === url || item.id === url) &&
    !uploadedItems.some((item) => item.url === url || item.objectKey === url || item.id === url)
  ).length;
  const selectedUploadedCount = selectedUrls.filter((url) =>
    uploadedItems.some((item) => item.url === url || item.objectKey === url || item.id === url)
  ).length;

  if (!isOpen) return null;

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const getMediaKind = (file: File) => {
      const type = file.type.toLowerCase();
      const name = file.name.toLowerCase();
      if (type.startsWith('image/') || /\.(avif|gif|jpe?g|png|webp|heic|heif)$/.test(name)) return 'photo';
      if (type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv)$/.test(name)) return 'video';
      return null;
    };
    const acceptedFiles = Array.from(files).filter((file) => {
      const kind = getMediaKind(file);
      if (allowedMediaType === 'photos') return kind === 'photo';
      if (allowedMediaType === 'videos') return kind === 'video';
      return kind !== null;
    });
    if (acceptedFiles.length !== files.length) {
      setErrorMessage(
        allowedMediaType === 'photos'
          ? 'Este espaço aceita somente fotos.'
          : allowedMediaType === 'videos'
          ? 'Este espaço aceita somente vídeos.'
          : 'Escolha arquivos de foto ou vídeo.'
      );
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }
    const filesArray = acceptedFiles.slice(0, isMultiSelect ? undefined : 1);
    setUploading(true);
    setErrorMessage(null);
    const newUploadedUrls: string[] = [];
    const newUploadedItems: LibraryImageItem[] = [];
    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        setUploadProgressText('Enviando ' + (i + 1) + ' de ' + filesArray.length + '...');
        const newImg = await optimizeAndStoreImage(
          file,
          (pct) => setUploadProgressText('Enviando ' + (i + 1) + ' de ' + filesArray.length + ' (' + Math.round(pct) + '%)...'),
          uploadVisibility
        );
        onUploadNew?.(newImg);
        newUploadedUrls.push(newImg.url);
        newUploadedItems.push(newImg);
      }
      setUploadedItems((current) => [...current, ...newUploadedItems]);
      if (isMultiSelect) {
        setSelectedUrls((prev) => Array.from(new Set([...prev, ...newUploadedUrls])));
      } else if (newUploadedUrls.length > 0) {
        setSelectedUrls([newUploadedUrls[0]]);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Não foi possível enviar alguns arquivos. Confira o formato e tente novamente.');
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

  const handleSelectAllVisible = () => {
    const visibleUrls = filteredLibrary.map((i) => i.url);
    setSelectedUrls((prev) => Array.from(new Set([...prev, ...visibleUrls])));
  };

  const handleConfirmSelection = () => {
    if (selectedUrls.length === 0 && !allowEmptySelection) return;

    const availableItems = [...library, ...uploadedItems.filter((item) => !library.some((existing) => existing.id === item.id))];
    const selectedItems = selectedUrls
      .map((url) =>
        availableItems.find(
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

  const resolvedSubtitle =
    subtitle ||
    (mediaTypeFilter === 'videos'
      ? 'Selecione os vídeos que farão parte deste conteúdo.'
      : mediaTypeFilter === 'photos'
      ? 'Selecione as fotos que farão parte deste conteúdo.'
      : 'Selecione as mídias que farão parte deste conteúdo.');

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md select-none overflow-hidden">
        <div className="absolute inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl bg-[#12131a] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col h-[92vh] sm:h-[88vh] max-h-[860px] overflow-hidden"
        >
          {/* Top Header & Mode Toggle Bar */}
          <div className="px-4 sm:px-6 pt-3.5 pb-2.5 border-b border-white/[0.06] shrink-0 space-y-2.5 bg-[#14151e]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg text-white font-semibold tracking-tight truncate">
                  {title}
                </h3>
                <p className="text-zinc-400 text-xs mt-0.5 leading-tight truncate">{resolvedSubtitle}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                  aria-label="Fechar seletor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between">
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

            {/* Segmented Source Mode Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-[#0a0b0e] border border-white/[0.06] w-full sm:w-auto">
                <button
                  type="button"
                  disabled={uploading}
                  aria-pressed={sourceMode === 'library'}
                  onClick={() => {
                    setSourceMode('library');
                    setIsDropActive(false);
                    setSearch('');
                    setSelectedAlbumId('all');
                    setOnlyFavorites(false);
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    sourceMode === 'library'
                      ? 'bg-white/[0.14] text-white shadow-sm border border-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Images className="h-3.5 w-3.5 text-[var(--color-adm-accent)]" />
                  <span>Mídia já enviada</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-300 font-mono">
                    {library.length}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={uploading}
                  aria-pressed={sourceMode === 'upload'}
                  onClick={() => {
                    setSourceMode('upload');
                    setIsDropActive(false);
                    setSearch('');
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    sourceMode === 'upload'
                      ? 'bg-[var(--color-adm-accent)]/20 text-[var(--color-adm-accent)] shadow-sm border border-[var(--color-adm-accent)]/30'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Enviar do dispositivo</span>
                  {uploadedItems.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--color-adm-accent)]/30 text-white font-mono">
                      {uploadedItems.length}
                    </span>
                  )}
                </button>
              </div>

              {((sourceMode === 'library' && selectedUploadedCount > 0) ||
                (sourceMode === 'upload' && selectedLibraryCount > 0)) && (
                <p className="text-[11px] text-zinc-400" role="status">
                  {sourceMode === 'library'
                    ? `${selectedUploadedCount} novo(s) arquivo(s) selecionado(s).`
                    : `${selectedLibraryCount} mídia(s) do acervo selecionada(s).`}
                </p>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple={isMultiSelect}
            accept={
              allowedMediaType === 'videos'
                ? 'video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm'
                : allowedMediaType === 'photos'
                ? 'image/*'
                : 'image/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm'
            }
            className="hidden"
            onChange={(e) => handleUploadFiles(e.currentTarget.files || [])}
          />

          {/* Compact Filters Toolbar (When in library mode) */}
          {sourceMode === 'library' && (
            <div className="px-4 sm:px-6 py-2 shrink-0 border-b border-white/[0.04] bg-[#0f1017]">
              <ImagePickerFilterBar
                search={search}
                setSearch={setSearch}
                allowedMediaType={allowedMediaType}
                mediaTypeFilter={mediaTypeFilter}
                setMediaTypeFilter={setMediaTypeFilter}
                library={library}
                totalPhotosCount={totalPhotosCount}
                totalVideosCount={totalVideosCount}
                onlyFavorites={onlyFavorites}
                setOnlyFavorites={setOnlyFavorites}
                selectedAlbumId={selectedAlbumId}
                setSelectedAlbumId={setSelectedAlbumId}
                albums={albums}
              />
            </div>
          )}

          {/* Upload Dropzone (When in upload mode) */}
          {sourceMode === 'upload' && (
            <div className="px-4 sm:px-6 py-3 shrink-0 border-b border-white/[0.04] bg-[#0f1017]">
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDropActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDropActive(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                    setIsDropActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDropActive(false);
                  handleUploadFiles(e.dataTransfer.files);
                }}
                className={`rounded-xl border-2 border-dashed p-4 sm:p-5 text-center transition ${
                  isDropActive
                    ? 'border-[var(--color-adm-accent)] bg-[var(--color-adm-accent)]/10'
                    : 'border-white/15 bg-[#101116]'
                }`}
              >
                <p className="text-sm font-semibold text-white">
                  Envie novas mídias do seu dispositivo
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Os arquivos serão enviados, salvos no acervo e selecionados para {uploadDestinationLabel}.
                </p>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 h-8.5 px-4 rounded-lg bg-[var(--color-adm-accent)] text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {uploading
                    ? uploadProgressText || 'Enviando…'
                    : 'Escolher arquivos do computador / celular'}
                </button>
              </div>

              {uploadedItems.length > 0 && (
                <div className="flex items-center justify-between gap-2 text-xs pt-2">
                  <span className="text-zinc-300">Arquivos enviados nesta sessão</span>
                  <span className="text-[var(--color-adm-accent)] font-semibold">
                    {uploadedItems.filter((item) => selectedUrls.includes(item.url)).length}{' '}
                    selecionados
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Main Gallery Area (Scrollable with maximum vertical space) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 scrollbar-thin scrollbar-thumb-white/15">
            {filteredLibrary.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center bg-[#0e0f14]/60 rounded-xl border border-white/[0.05]">
                <ImageIcon className="w-10 h-10 text-zinc-600 mb-2.5" />
                <p className="text-sm font-medium text-white mb-1">
                  {search
                    ? `Nenhuma mídia encontrada para "${search}"`
                    : sourceMode === 'upload'
                    ? 'Nenhum arquivo enviado ainda'
                    : selectedAlbumId === 'all'
                    ? 'Nenhuma mídia encontrada no acervo'
                    : 'Nenhuma mídia neste álbum'}
                </p>
                <p className="text-xs text-zinc-400 max-w-xs mb-3">
                  {sourceMode === 'upload'
                    ? 'Use o botão acima para escolher arquivos do seu computador ou celular.'
                    : 'Escolha outro álbum ou altere o filtro para encontrar outras mídias.'}
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="text-xs text-[var(--color-adm-accent)] hover:underline cursor-pointer"
                  >
                    Limpar termo de busca
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 pb-2">
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
          </div>

          {/* Sticky Footer Bar - ALWAYS VISIBLE */}
          <div className="shrink-0 border-t border-white/[0.08] bg-[#0c0d12] px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              {selectedUrls.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[var(--color-adm-accent)] text-white text-[11px] font-bold">
                    {selectedUrls.length}
                  </span>
                  <span className="text-white text-xs font-semibold">
                    {selectedUrls.length === 1
                      ? '1 selecionada'
                      : `${selectedUrls.length} selecionadas`}
                  </span>
                </div>
              ) : (
                <span className="text-zinc-400 text-xs">
                  {isMultiSelect
                    ? 'Toque nas fotos ou vídeos para marcar'
                    : 'Toque na foto ou vídeo para selecionar'}
                </span>
              )}

              {/* Bulk select / deselect helpers */}
              {isMultiSelect && (
                <div className="flex items-center gap-2.5 text-xs">
                  {filteredLibrary.length > 0 && selectedUrls.length < filteredLibrary.length && (
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="text-[11px] text-[var(--color-adm-accent)] hover:underline cursor-pointer font-medium"
                    >
                      Marcar todas desta tela ({filteredLibrary.length})
                    </button>
                  )}
                  {selectedUrls.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUrls([])}
                      className="text-[11px] text-zinc-400 hover:text-white underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      Desmarcar todas
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {backText}
              </button>
              <button
                type="button"
                disabled={selectedUrls.length === 0 && !allowEmptySelection}
                onClick={handleConfirmSelection}
                className="inline-flex items-center justify-center h-9 px-5 rounded-lg bg-[var(--color-adm-accent)] hover:brightness-110 text-white text-xs font-semibold transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {confirmActionLabel ||
                  (selectedUrls.length > 1
                    ? `Adicionar ${selectedUrls.length} mídias`
                    : selectedUrls.length === 1
                    ? `Usar mídia selecionada`
                    : 'Confirmar seleção')}
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
