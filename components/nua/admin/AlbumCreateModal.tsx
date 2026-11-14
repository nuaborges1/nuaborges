'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { X, Folder, Image as ImageIcon, Check } from 'lucide-react';
import { MediaAlbum, LibraryImageItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { useScrollLock } from '@/hooks/useScrollLock';

interface AlbumCreateModalProps {
  isOpen: boolean;
  library: LibraryImageItem[];
  albumToEdit?: MediaAlbum | null;
  onSave: (album: MediaAlbum) => void;
  onClose: () => void;
}

export function AlbumCreateModal({
  isOpen,
  library,
  albumToEdit,
  onSave,
  onClose,
}: AlbumCreateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(albumToEdit ? albumToEdit.name : '');
  const [description, setDescription] = useState(albumToEdit?.description || '');
  const [coverMediaId, setCoverMediaId] = useState<string | undefined>(albumToEdit?.coverMediaId);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Sync state if albumToEdit changes
  useEffect(() => {
    setErrorMsg(null);
    if (albumToEdit) {
      setName(albumToEdit.name);
      setDescription(albumToEdit.description || '');
      setCoverMediaId(albumToEdit.coverMediaId);
    } else {
      setName('');
      setDescription('');
      setCoverMediaId(undefined);
    }
  }, [albumToEdit, isOpen]);

  if (!isOpen || !mounted) return null;

  const selectedCoverItem = library.find((item) => item.id === coverMediaId) || library[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Por favor, informe um nome para o álbum.');
      return;
    }

    const savedAlbum: MediaAlbum = {
      id: albumToEdit ? albumToEdit.id : 'album-' + Date.now(),
      name: trimmed,
      description: description.trim() || undefined,
      coverMediaId: coverMediaId || (selectedCoverItem ? selectedCoverItem.id : undefined),
      coverUrl: selectedCoverItem ? selectedCoverItem.url : undefined,
      mediaIds: albumToEdit ? albumToEdit.mediaIds : [],
      createdAt: albumToEdit ? albumToEdit.createdAt : new Date().toISOString().split('T')[0],
    };

    onSave(savedAlbum);
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
          className="relative w-full max-w-lg bg-[#171821] border border-white/[0.08] rounded-xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto overscroll-contain"
          style={{ touchAction: 'pan-y' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#f4a7b9]/15 text-[#f4a7b9] flex items-center justify-center">
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-white">
                  {albumToEdit ? 'Editar Álbum' : 'Criar Novo Álbum'}
                </h3>
                <p className="text-zinc-400 text-[11px] font-light">
                  Organize suas fotos e vídeos em coleções personalizadas.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#0e0f14] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-3.5">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
                Nome do Álbum *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ex: Ensaio Setembro, Bastidores, Redes..."
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#f4a7b9] transition-colors"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
                Descrição (Opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve anotação sobre as mídias deste álbum..."
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#f4a7b9] transition-colors resize-none"
              />
            </div>

            {/* Cover Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-zinc-400 text-[10px] font-semibold tracking-wider uppercase">
                  Foto de Capa do Álbum
                </label>
                {library.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCoverPicker(!showCoverPicker)}
                    className="text-[#f4a7b9] hover:text-[#ffb8c9] text-xs font-medium cursor-pointer"
                  >
                    {showCoverPicker ? 'Ocultar opções' : 'Escolher outra foto'}
                  </button>
                )}
              </div>

              {selectedCoverItem ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#101116] border border-white/[0.06]">
                  <div className="relative w-14 h-18 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                    <Image
                      src={resolveMediaUrl(selectedCoverItem.url)}
                      alt={selectedCoverItem.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-xs font-semibold block truncate">
                      {selectedCoverItem.name}
                    </span>
                    <span className="text-zinc-500 text-[11px] block">
                      Foto selecionada como capa visual
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] text-center text-zinc-500 text-xs">
                  Nenhuma foto no acervo ainda.
                </div>
              )}

              {/* Cover Grid Picker */}
              {showCoverPicker && library.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-[#101116] border border-white/[0.06] max-h-52 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 gap-2 pb-2">
                  {library.map((item) => {
                    const isSelected = item.id === coverMediaId;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setCoverMediaId(item.id);
                          setShowCoverPicker(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setCoverMediaId(item.id);
                            setShowCoverPicker(false);
                          }
                        }}
                        className={`group relative rounded-lg overflow-hidden border transition-all cursor-pointer p-1 bg-[#0e0f14] ${
                          isSelected
                            ? 'border-[#f4a7b9] ring-2 ring-[#f4a7b9]/40'
                            : 'border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="relative aspect-[3/4] w-full rounded-md overflow-hidden bg-black">
                          <Image
                            src={resolveMediaUrl(item.url)}
                            alt={item.name}
                            fill
                            className="object-cover pointer-events-none"
                            sizes="80px"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#f4a7b9] text-zinc-950 flex items-center justify-center z-10 pointer-events-none shadow-sm">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3.5 border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-xs font-medium border border-white/10 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-sm"
              >
                {albumToEdit ? 'Salvar Alterações' : 'Criar Álbum'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
