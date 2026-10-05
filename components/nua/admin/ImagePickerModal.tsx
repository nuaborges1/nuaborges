'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Check,
  Image as ImageIcon,
  Search,
  Heart,
  Folder,
  Film,
} from 'lucide-react';
import { LibraryImageItem, MediaAlbum } from '@/lib/types';
import { optimizeAndStoreImage } from '@/lib/contentStore';
import { resolveMediaUrl } from '@/lib/media';

interface ImagePickerModalProps {
  isOpen: boolean;
  library: LibraryImageItem[];
  albums?: MediaAlbum[];
  currentImageUrl?: string;
  title?: string;
  onSelect: (imageUrl: string) => void;
  onUploadNew: (newImage: LibraryImageItem) => void;
  onClose: () => void;
}

export function ImagePickerModal({
  isOpen,
  library,
  albums = [],
  currentImageUrl,
  title = 'Escolher da Biblioteca',
  onSelect,
  onUploadNew,
  onClose,
}: ImagePickerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | undefined>(currentImageUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyPhotos, setOnlyPhotos] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selected url when modal opens or currentImageUrl changes
  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentImageUrl);
      setSearch('');
    }
  }, [isOpen, currentImageUrl]);

  // Filter media based on search, album and favorites
  const filteredLibrary = useMemo(() => {
    if (!isOpen) return [];
    let list = [...library];

    if (selectedAlbumId !== 'all') {
      const album = albums.find((a) => a.id === selectedAlbumId);
      if (album) {
        const idSet = new Set(album.mediaIds);
        list = list.filter((item) => idSet.has(item.id));
      }
    }

    if (onlyFavorites) {
      list = list.filter((item) => item.favorite);
    }

    if (onlyPhotos) {
      list = list.filter((item) => !item.isVideo);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.customName || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [isOpen, library, albums, selectedAlbumId, onlyFavorites, onlyPhotos, search]);

  if (!isOpen) return null;

  const handleUploadSingle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadPercent(10);
    setErrorMessage(null);

    try {
      const file = files[0];
      const newImg = await optimizeAndStoreImage(file, (p) => setUploadPercent(p));
      onUploadNew(newImg);
      setSelectedUrl(newImg.url);
      onSelect(newImg.url);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Não foi possível carregar a imagem. Tente uma foto em formato JPG, PNG ou WebP.'
      );
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setUploading(false);
      setUploadPercent(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const selectedItem = library.find((m) => m.url === selectedUrl);

  const handleChooseItem = (url: string) => {
    setSelectedUrl(url);
    onSelect(url);
    onClose();
  };

  const handleConfirmSelection = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/85 backdrop-blur-md">
        <div className="absolute inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          className="relative w-full max-w-4xl bg-[#09090c] border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-2xl text-white font-medium">{title}</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[#f4a7b9]">
                  Acervo
                </span>
              </div>
              <p className="text-zinc-400 text-xs sm:text-sm font-light mt-0.5 leading-relaxed">
                Toque na foto desejada para aplicá-la imediatamente ao site ou envie uma foto nova.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer border border-zinc-800"
              aria-label="Fechar seletor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* In-app error notice */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white text-xs ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Actions: Upload New & Search & Filters */}
          <div className="py-3 space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm"
                className="hidden"
                onChange={handleUploadSingle}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all min-h-[42px] cursor-pointer shadow-[0_2px_14px_rgba(244,167,185,0.25)] shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? `Enviando (${uploadPercent}%)...` : '+ Enviar Nova Foto'}</span>
              </button>

              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Procurar foto pelo nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-900/70 border border-zinc-800 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
                />
              </div>
            </div>

            {/* Quick Filter Pills (Albums & Favorites) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedAlbumId('all');
                  setOnlyFavorites(false);
                }}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[32px] ${
                  selectedAlbumId === 'all' && !onlyFavorites
                    ? 'bg-white text-zinc-950'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white'
                }`}
              >
                Todas ({library.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setOnlyFavorites(!onlyFavorites);
                  setSelectedAlbumId('all');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[32px] ${
                  onlyFavorites
                    ? 'bg-rose-500 text-white'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white'
                }`}
              >
                <Heart className={`w-3 h-3 ${onlyFavorites ? 'fill-white' : ''}`} />
                <span>Favoritos</span>
              </button>

              {albums.map((alb) => (
                <button
                  key={alb.id}
                  type="button"
                  onClick={() => {
                    setSelectedAlbumId(alb.id);
                    setOnlyFavorites(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[32px] ${
                    selectedAlbumId === alb.id
                      ? 'bg-white text-zinc-950'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Folder className="w-3 h-3 text-[#f4a7b9]" />
                  <span>{alb.name} ({alb.mediaIds.length})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Images */}
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 pt-2 pb-4">
            {filteredLibrary.length === 0 ? (
              <div className="col-span-full py-16 text-center text-zinc-500 text-xs">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-500" />
                <p className="text-zinc-400 text-sm font-medium mb-1">Nenhuma foto encontrada</p>
                <p className="text-zinc-500 text-xs max-w-xs mx-auto">
                  {search ? `Não encontramos nenhuma foto com o nome "${search}".` : 'Não há fotos nesta categoria.'}
                </p>
              </div>
            ) : (
              filteredLibrary.map((item) => {
                const isSelected = selectedUrl === item.url;
                const isCurrentInSite = currentImageUrl === item.url;
                const displayUrl = resolveMediaUrl(item.url);

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleChooseItem(item.url)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleChooseItem(item.url);
                      }
                    }}
                    className={`group relative rounded-2xl border transition-all cursor-pointer text-left select-none bg-zinc-900/40 p-2.5 flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#f4a7b9] ring-2 ring-[#f4a7b9]/50 shadow-[0_0_20px_rgba(244,167,185,0.25)]'
                        : 'border-zinc-800/80 hover:border-[#f4a7b9]/60 hover:scale-[1.01]'
                    }`}
                  >
                    {/* Dedicated thumbnail container with guaranteed in-flow aspect ratio */}
                    <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black mb-2">
                      <Image
                        src={displayUrl}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 180px, 240px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                      {/* Hover visual cue */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-20">
                        <span className="px-3 py-1.5 rounded-full bg-[#f4a7b9] text-zinc-950 font-bold text-xs shadow-xl flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Usar Foto</span>
                        </span>
                      </div>

                      {/* Top status badges */}
                      <div className="absolute top-2 inset-x-2 flex items-start justify-between pointer-events-none z-10">
                        {item.isVideo ? (
                          <div className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[9px] font-mono text-white flex items-center gap-1 border border-zinc-800">
                            <Film className="w-3 h-3 text-[#f4a7b9]" />
                            <span>Vídeo</span>
                          </div>
                        ) : <div />}

                        {isSelected ? (
                          <div className="w-7 h-7 rounded-full bg-[#f4a7b9] text-zinc-950 flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : isCurrentInSite ? (
                          <div className="px-2 py-0.5 rounded-full bg-black/80 border border-zinc-700 text-[10px] text-zinc-300 font-medium">
                            Em uso
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Dedicated metadata below thumbnail */}
                    <div className="w-full min-w-0 px-0.5 pointer-events-none">
                      <span className="text-white text-xs font-medium block truncate" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-zinc-500 text-[10px] font-mono block mt-0.5">
                        {item.uploadedAt || 'Recente'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Footer Bar with instant confirmation */}
          <div className="pt-3.5 mt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {selectedItem ? (
                <>
                  <div className="relative w-9 h-11 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-700">
                    <Image
                      src={resolveMediaUrl(selectedItem.url)}
                      alt={selectedItem.name}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-zinc-400 block">Foto selecionada:</span>
                    <span className="text-white text-xs font-medium truncate block">
                      {selectedItem.name}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-zinc-500 text-xs">
                  Toque em uma foto da grade para escolher
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedUrl}
                onClick={handleConfirmSelection}
                className="flex-[2] sm:flex-none px-6 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_2px_14px_rgba(244,167,185,0.25)] disabled:opacity-40 min-h-[44px]"
              >
                Usar esta Foto
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
