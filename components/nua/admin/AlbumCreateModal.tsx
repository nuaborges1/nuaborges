'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { X, Folder, Image as ImageIcon } from 'lucide-react';
import { MediaAlbum, LibraryImageItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { useScrollLock } from '@/hooks/useScrollLock';
import { HelpTriggerButton } from './help/HelpTriggerButton';
import { ImagePickerModal } from './ImagePickerModal';

interface AlbumCreateModalProps {
  isOpen: boolean;
  library: LibraryImageItem[];
  albums?: MediaAlbum[];
  albumToEdit?: MediaAlbum | null;
  onUploadNew?: (newImage: LibraryImageItem) => void;
  onSave: (album: MediaAlbum) => void;
  onClose: () => void;
}

export function AlbumCreateModal({
  isOpen,
  library,
  albums = [],
  albumToEdit,
  onUploadNew,
  onSave,
  onClose,
}: AlbumCreateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(albumToEdit ? albumToEdit.name : '');
  const [description, setDescription] = useState(albumToEdit?.description || '');
  const [coverMediaId, setCoverMediaId] = useState<string | undefined>(albumToEdit?.coverMediaId);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(albumToEdit?.coverUrl);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen || coverPickerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, coverPickerOpen, onClose]);

  useEffect(() => {
    setErrorMsg(null);
    if (albumToEdit) {
      setName(albumToEdit.name);
      setDescription(albumToEdit.description || '');
      setCoverMediaId(albumToEdit.coverMediaId);
      setCoverUrl(albumToEdit.coverUrl);
    } else {
      setName('');
      setDescription('');
      setCoverMediaId(undefined);
      setCoverUrl(undefined);
    }
  }, [albumToEdit, isOpen]);

  if (!isOpen || !mounted) return null;

  const selectedCoverItem =
    library.find((item) => item.id === coverMediaId) ||
    (coverUrl ? library.find((item) => item.url === coverUrl) : undefined) ||
    library[0];

  const resolvedCoverThumb = selectedCoverItem
    ? resolveMediaUrl(selectedCoverItem.posterUrl || selectedCoverItem.url, 'thumb')
    : coverUrl
    ? resolveMediaUrl(coverUrl, 'thumb')
    : null;

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
      coverUrl: coverUrl || (selectedCoverItem ? selectedCoverItem.url : undefined),
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
          className="relative w-full max-w-lg bg-[#14151c] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto overscroll-contain"
          style={{ touchAction: 'pan-y' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#f4a7b9]/15 text-[#f4a7b9] flex items-center justify-center">
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-white">
                    {albumToEdit ? 'Editar Álbum' : 'Criar Novo Álbum'}
                  </h3>
                  <HelpTriggerButton helpId="midias_albuns" compact />
                </div>
                <p className="text-zinc-400 text-[11px] font-light">
                  Organize suas fotos e vídeos em coleções administrativas.
                </p>
              </div>
            </div>

            <button
              type="button"
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

            {/* Cover Selector via Unified ImagePickerModal */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-zinc-400 text-[10px] font-semibold tracking-wider uppercase">
                  Foto de Capa do Álbum
                </label>
                <button
                  type="button"
                  onClick={() => setCoverPickerOpen(true)}
                  className="text-[#f4a7b9] hover:text-[#f9b8c6] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{selectedCoverItem ? 'Escolher outra capa' : 'Escolher capa'}</span>
                </button>
              </div>

              {selectedCoverItem && resolvedCoverThumb ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#101116] border border-white/[0.06]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-14 h-16 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                      <Image
                        src={resolvedCoverThumb}
                        alt={selectedCoverItem.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-white text-xs font-semibold block truncate">
                        {selectedCoverItem.customName || selectedCoverItem.name}
                      </span>
                      <span className="text-zinc-500 text-[11px] block">
                        Miniatura definida como capa do álbum
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoverPickerOpen(true)}
                    className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs text-zinc-200 font-medium shrink-0 cursor-pointer"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCoverPickerOpen(true)}
                  className="w-full p-3.5 rounded-xl bg-[#101116] hover:bg-[#161821] border border-dashed border-white/15 text-center text-zinc-400 hover:text-white text-xs transition cursor-pointer"
                >
                  Clique para escolher ou enviar uma foto de capa
                </button>
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
                className="h-8 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                {albumToEdit ? 'Salvar Alterações' : 'Criar Álbum'}
              </button>
            </div>
          </form>
        </motion.div>

        <ImagePickerModal
          isOpen={coverPickerOpen}
          library={library}
          albums={albums}
          currentImageUrl={selectedCoverItem?.url}
          title="Escolher Capa do Álbum"
          subtitle="Selecione uma foto do acervo ou envie uma nova imagem para ilustrar a capa deste álbum."
          backText="Voltar ao Álbum"
          allowedMediaType="photos"
          selectionMode="single"
          onSelect={(url, item) => {
            setCoverUrl(url);
            if (item) setCoverMediaId(item.id);
          }}
          onUploadNew={onUploadNew}
          onClose={() => setCoverPickerOpen(false)}
        />
      </div>
    </AnimatePresence>,
    document.body
  );
}
