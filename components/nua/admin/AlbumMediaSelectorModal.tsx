'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Search, Film, Plus, Play, Volume2, Image as ImageIcon } from 'lucide-react';
import { LibraryImageItem, MediaAlbum } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { useScrollLock } from '@/hooks/useScrollLock';

interface AlbumMediaSelectorModalProps {
  isOpen: boolean;
  album: MediaAlbum | null;
  library: LibraryImageItem[];
  onSave: (updatedMediaIds: string[]) => void;
  onClose: () => void;
}

export function AlbumMediaSelectorModal({
  isOpen,
  album,
  library,
  onSave,
  onClose,
}: AlbumMediaSelectorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(album ? album.mediaIds : []);
  const [previewingVideoItem, setPreviewingVideoItem] = useState<LibraryImageItem | null>(null);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  // ESC to close preview if open, otherwise close modal
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
    if (album) {
      setSelectedIds(album.mediaIds);
    }
  }, [album, isOpen]);

  if (!isOpen || !album || !mounted) return null;

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === library.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(library.map((m) => m.id));
    }
  };

  const filtered = library.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    onSave(selectedIds);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overscroll-contain">
        <div className="absolute inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-3xl bg-[#171821] border border-white/[0.08] rounded-xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overscroll-contain"
          style={{ touchAction: 'pan-y' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-white">
                Adicionar Fotos ao Álbum: {album.name}
              </h3>
              <p className="text-zinc-400 text-[11px] font-light mt-0.5">
                Escolha quais fotos do seu acervo você deseja incluir neste álbum.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#0e0f14] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                placeholder="Buscar foto por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-zinc-300 hover:text-white transition cursor-pointer h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 font-medium"
              >
                {selectedIds.length === library.length ? 'Desmarcar Todas' : 'Marcar Todas'}
              </button>
              <span className="text-zinc-500 font-mono text-[11px]">
                {selectedIds.length} {selectedIds.length === 1 ? 'selecionada' : 'selecionadas'}
              </span>
            </div>
          </div>

          {/* Media Grid */}
          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <p className="text-zinc-400 text-xs sm:text-sm font-light">
                {search ? `Nenhuma foto encontrada para "${search}".` : 'Ainda não há fotos no seu acervo.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-2 pb-4">
              {filtered.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isVideo = Boolean(
                  item.isVideo ||
                  item.url?.toLowerCase().endsWith('.mp4') ||
                  item.url?.toLowerCase().endsWith('.mov') ||
                  item.url?.toLowerCase().includes('/video.')
                );
                const posterSrc = item.posterUrl ? resolveMediaUrl(item.posterUrl) : null;
                const displayThumbUrl = posterSrc || (!isVideo ? resolveMediaUrl(item.url) : null);

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSelect(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSelect(item.id);
                      }
                    }}
                    className={`group relative rounded-xl border transition-all cursor-pointer text-left bg-[#101116] p-2 select-none flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#f4a7b9] ring-1 ring-[#f4a7b9]/40'
                        : 'border-white/[0.06] hover:border-white/20 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div
                      className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-black mb-1.5"
                      onMouseEnter={() => isVideo && setHoveredVideoId(item.id)}
                      onMouseLeave={() => isVideo && setHoveredVideoId(null)}
                    >
                      {/* Hover auto-preview for video */}
                      {isVideo && hoveredVideoId === item.id ? (
                        <video
                          src={resolveMediaUrl(item.url)}
                          poster={displayThumbUrl || undefined}
                          muted
                          autoPlay
                          loop
                          playsInline
                          className="w-full h-full object-cover transition-opacity duration-300"
                        />
                      ) : displayThumbUrl ? (
                        <Image
                          src={displayThumbUrl}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="160px"
                        />
                      ) : isVideo ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 p-2 text-center border border-[#f4a7b9]/20">
                          <Film className="w-5 h-5 text-[#f4a7b9] mb-1" />
                          <span className="text-[9px] font-mono text-zinc-300">Vídeo</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />

                      {/* Play Button Overlay for video */}
                      {isVideo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewingVideoItem(item);
                          }}
                          className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-black/80 hover:bg-[#f4a7b9] hover:text-zinc-950 text-[#f4a7b9] flex items-center justify-center transition-all duration-200 backdrop-blur-md border border-[#f4a7b9]/40 hover:scale-110 shadow-lg z-20 cursor-pointer opacity-90 group-hover:opacity-100"
                          title="Assistir preview do vídeo"
                          aria-label="Assistir preview do vídeo"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                      )}

                      {/* Top badges */}
                      <div className="absolute top-1.5 inset-x-1.5 flex items-start justify-between pointer-events-none z-10">
                        {isVideo ? (
                          <div className="px-1.5 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[9px] font-mono text-[#f4a7b9] flex items-center gap-1 border border-[#f4a7b9]/30">
                            <Film className="w-2.5 h-2.5 text-[#f4a7b9]" />
                            <span>Vídeo</span>
                          </div>
                        ) : <div />}

                        {/* Selection Checkbox */}
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[#f4a7b9] text-zinc-950 shadow-sm'
                              : 'bg-black/60 border border-white/20 text-transparent'
                          }`}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      </div>
                    </div>

                    {/* Bottom title */}
                    <div className="w-full min-w-0 px-0.5 pointer-events-none">
                      <span className="text-white text-[11px] font-medium block truncate drop-shadow-sm">
                        {item.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="pt-3.5 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-zinc-500 text-xs">
              {selectedIds.length} foto(s) farão parte deste álbum
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-xs font-medium border border-white/10 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-sm"
              >
                Confirmar Seleção ({selectedIds.length})
              </button>
            </div>
          </div>
        </motion.div>

        {/* Modal de Preview de Vídeo em Streaming */}
        {previewingVideoItem && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/92 backdrop-blur-xl animate-in fade-in duration-200"
            onClick={() => setPreviewingVideoItem(null)}
          >
            <div
              className="relative w-full max-w-4xl bg-[#171821] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl flex flex-col p-4 sm:p-5 space-y-3.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#f4a7b9] font-bold px-2 py-0.5 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/20">
                    PREVIEW DE VÍDEO DO ACERVO
                  </span>
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate mt-1">
                    {previewingVideoItem.customName || previewingVideoItem.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewingVideoItem(null)}
                  className="w-8 h-8 rounded-lg bg-[#0e0f14] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                  title="Fechar preview (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-white/10 shadow-inner flex items-center justify-center">
                <video
                  src={resolveMediaUrl(previewingVideoItem.url)}
                  poster={previewingVideoItem.posterUrl ? resolveMediaUrl(previewingVideoItem.posterUrl) : undefined}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Range Requests Ativo</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSelect(previewingVideoItem.id)}
                    className={`h-8 px-3 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      selectedIds.includes(previewingVideoItem.id)
                        ? 'bg-[#f4a7b9] text-zinc-950 font-bold shadow-sm'
                        : 'bg-[#0e0f14] hover:bg-white/[0.08] text-zinc-300 border border-white/10'
                    }`}
                  >
                    {selectedIds.includes(previewingVideoItem.id) ? (
                      <>
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Vídeo Selecionado</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Selecionar este Vídeo</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewingVideoItem(null)}
                    className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-xs font-medium border border-white/10 transition cursor-pointer"
                  >
                    Fechar Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
}
