'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Search, Film, Plus } from 'lucide-react';
import { LibraryImageItem, MediaAlbum } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

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
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
        <div className="absolute inset-0 -z-10" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-3xl bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
            <div>
              <h3 className="font-serif text-lg sm:text-xl text-white font-medium">
                Adicionar Fotos ao Álbum: {album.name}
              </h3>
              <p className="text-zinc-400 text-xs font-light mt-0.5">
                Escolha quais fotos do seu acervo você deseja incluir neste álbum.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Buscar foto por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800"
              >
                {selectedIds.length === library.length ? 'Desmarcar Todas' : 'Marcar Todas'}
              </button>
              <span className="text-zinc-500 font-mono">
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
                    className={`group relative rounded-2xl border transition-all cursor-pointer text-left bg-zinc-900/40 p-2 select-none flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#f4a7b9] ring-2 ring-[#f4a7b9]/40'
                        : 'border-zinc-800 hover:border-zinc-600 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black mb-1.5">
                      <Image
                        src={resolveMediaUrl(item.url)}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />

                      {/* Top badges */}
                      <div className="absolute top-1.5 inset-x-1.5 flex items-start justify-between pointer-events-none z-10">
                        {item.isVideo ? (
                          <div className="px-1.5 py-0.5 rounded-full bg-black/80 text-[9px] font-mono text-white flex items-center gap-1">
                            <Film className="w-3 h-3 text-[#f4a7b9]" />
                          </div>
                        ) : <div />}

                        {/* Selection Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-[#f4a7b9] text-zinc-950 shadow-md'
                              : 'bg-black/60 border border-zinc-700 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
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
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="text-zinc-500 text-xs">
              {selectedIds.length} foto(s) farão parte deste álbum
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer min-h-[42px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_2px_12px_rgba(244,167,185,0.25)] min-h-[42px]"
              >
                Confirmar Seleção ({selectedIds.length})
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
