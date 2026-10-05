'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Link as LinkIcon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { SiteContent, GalleryPhotoItem, LibraryImageItem } from '@/lib/types';
import { ImagePickerModal } from './ImagePickerModal';
import { ConfirmModal } from './ConfirmModal';
import { resolveMediaUrl } from '@/lib/media';

interface GalleryEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

export function GalleryEditor({ content, onChange, onUploadNew }: GalleryEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const gallery = content.gallery;

  const updateGallery = (
    updater: Partial<typeof gallery> | ((prevGallery: typeof gallery) => Partial<typeof gallery>)
  ) => {
    onChange((prev) => {
      const currentGallery = prev.gallery;
      const fields = typeof updater === 'function' ? updater(currentGallery) : updater;
      return {
        ...prev,
        gallery: { ...currentGallery, ...fields },
      };
    });
  };

  const handleOpenPickerForPhoto = (index: number) => {
    setEditingPhotoIndex(index);
    setPickerOpen(true);
  };

  const handleAddNewPhoto = () => {
    setEditingPhotoIndex(gallery.photos.length);
    setPickerOpen(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    if (editingPhotoIndex === null) return;
    const targetIdx = editingPhotoIndex;

    updateGallery((currentGallery) => {
      const updated = [...(currentGallery.photos || [])];
      if (targetIdx < updated.length) {
        updated[targetIdx] = {
          ...updated[targetIdx],
          id: 'gal-' + Date.now(),
          imageUrl,
        };
      } else {
        updated.push({
          id: 'gal-' + Date.now(),
          title: 'Novo Ensaio',
          caption: 'Ensaio fotográfico autoral',
          imageUrl,
          linkUrl: content.hero?.ctaUrl || 'https://onlyfans.com/nuaborges',
          active: true,
        });
      }
      return { photos: updated };
    });

    setPickerOpen(false);
    setEditingPhotoIndex(null);
  };

  const handleUpdateItem = (index: number, fields: Partial<GalleryPhotoItem>) => {
    updateGallery((currentGallery) => {
      const updated = [...(currentGallery.photos || [])];
      updated[index] = { ...updated[index], ...fields };
      return { photos: updated };
    });
  };

  const handleRemovePhoto = (index: number) => {
    setDeleteConfirmIndex(index);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmIndex === null) return;
    const idxToRemove = deleteConfirmIndex;
    updateGallery((currentGallery) => ({
      photos: (currentGallery.photos || []).filter((_, i) => i !== idxToRemove),
    }));
    setDeleteConfirmIndex(null);
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= gallery.photos.length) return;
    const updated = [...gallery.photos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updateGallery({ photos: updated });
  };

  const currentPhotoUrl =
    editingPhotoIndex !== null && editingPhotoIndex < gallery.photos.length
      ? gallery.photos[editingPhotoIndex].imageUrl
      : undefined;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Info */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="mb-6">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-wider uppercase block mb-1">
            PORTFÓLIO VISUAL
          </span>
          <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">Galeria de Ensaios</h3>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 leading-relaxed">
            Aqui você gerencia os ensaios exibidos na galeria principal. As fotos são organizadas verticalmente, perfeitas para a experiência no celular dos seus fãs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto Pequeno no Topo
            </label>
            <input
              type="text"
              value={gallery.eyebrow}
              onChange={(e) => updateGallery({ eyebrow: e.target.value })}
              placeholder="Ex: GALERIA DE ENSAIOS"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              Aparece em letras menores logo acima do título.
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Título da Seção
            </label>
            <input
              type="text"
              value={gallery.title}
              onChange={(e) => updateGallery({ title: e.target.value })}
              placeholder="Ex: Acervo Autoral"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              O título principal que dá nome a este espaço.
            </span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto de Apresentação
            </label>
            <input
              type="text"
              value={gallery.subtitle}
              onChange={(e) => updateGallery({ subtitle: e.target.value })}
              placeholder="Ex: Produções independentes sob luz natural, revelando a estética e a verdade do corpo."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              Uma frase curta convidando o visitante a explorar seus ensaios.
            </span>
          </div>
        </div>
      </div>

      {/* Ensaios List */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">
              Ensaios no Site ({gallery.photos.length})
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-0.5">
              Toque em &quot;Trocar Foto&quot; para escolher qualquer imagem do seu acervo ou defina para onde o fã vai ao clicar.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddNewPhoto}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer min-h-[44px] shadow-[0_2px_14px_rgba(244,167,185,0.2)]"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Novo Ensaio</span>
          </button>
        </div>

        {gallery.photos.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <div className="w-12 h-12 rounded-full bg-[#f4a7b9]/10 text-[#f4a7b9] flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h4 className="text-white font-medium text-base mb-1">Ainda não há ensaios na galeria</h4>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto mb-5 leading-relaxed">
              Adicione fotos dos seus ensaios autorais para que os visitantes possam conhecer o seu trabalho.
            </p>
            <button
              type="button"
              onClick={handleAddNewPhoto}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Primeiro Ensaio</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {gallery.photos.map((photo, index) => (
              <div
                key={`${photo.id || index}-${photo.imageUrl}`}
                className={`rounded-2xl border p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center gap-4 sm:gap-6 transition-all ${
                  photo.active !== false
                    ? 'bg-zinc-900/40 border-zinc-800/90'
                    : 'bg-zinc-950 border-zinc-900 opacity-60'
                }`}
              >
                {/* Thumbnail + Change Action */}
                <div className="flex flex-row md:flex-col items-center gap-3 shrink-0">
                  <div className="relative w-20 h-28 sm:w-28 sm:h-36 rounded-xl overflow-hidden bg-black shrink-0 border border-zinc-800">
                    <Image
                      src={resolveMediaUrl(photo.imageUrl)}
                      alt={photo.title || 'Foto do ensaio'}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-zinc-300">
                      0{index + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPickerForPhoto(index)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] text-xs font-semibold transition-colors min-h-[40px] cursor-pointer flex-1 md:flex-none w-full"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Trocar Foto</span>
                  </button>
                </div>

                {/* Editable Fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
                      Título do Ensaio
                    </label>
                    <input
                      type="text"
                      value={photo.title}
                      onChange={(e) => handleUpdateItem(index, { title: e.target.value })}
                      placeholder="Ex: Luz & Silhueta"
                      className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
                      Legenda Curta
                    </label>
                    <input
                      type="text"
                      value={photo.caption}
                      onChange={(e) => handleUpdateItem(index, { caption: e.target.value })}
                      placeholder="Ex: Estudo autoral sobre contorno e naturalidade"
                      className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
                      Link de Destino ao Clicar (ex: seu OnlyFans ou link externo)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <LinkIcon className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="url"
                        value={photo.linkUrl || ''}
                        onChange={(e) => handleUpdateItem(index, { linkUrl: e.target.value })}
                        placeholder="https://onlyfans.com/nuaborges"
                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white text-base sm:text-xs outline-none focus:border-[#f4a7b9] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Order & Delete Actions */}
                <div className="flex md:flex-col items-center justify-between md:justify-center gap-1.5 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-800/80 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMovePhoto(index, 'up')}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-colors cursor-pointer border border-zinc-800"
                      title="Mover para cima"
                      aria-label="Mover para cima"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === gallery.photos.length - 1}
                      onClick={() => handleMovePhoto(index, 'down')}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-colors cursor-pointer border border-zinc-800"
                      title="Mover para baixo"
                      aria-label="Mover para baixo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItem(index, { active: photo.active === false ? true : false })
                      }
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800"
                      title={photo.active !== false ? 'Visível no site (toque para ocultar)' : 'Oculto no site (toque para exibir)'}
                      aria-label="Ocultar ou exibir foto"
                    >
                      {photo.active !== false ? (
                        <Eye className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-zinc-500" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer border border-zinc-800"
                      title="Remover da galeria"
                      aria-label="Remover da galeria"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ImagePickerModal
        isOpen={pickerOpen}
        library={content.library}
        albums={content.albums}
        currentImageUrl={currentPhotoUrl}
        title={
          editingPhotoIndex !== null && editingPhotoIndex < gallery.photos.length
            ? `Trocar Foto do Ensaio: ${gallery.photos[editingPhotoIndex].title || 'Ensaio'}`
            : 'Adicionar Foto para Novo Ensaio'
        }
        onSelect={handleSelectImage}
        onUploadNew={onUploadNew}
        onClose={() => {
          setPickerOpen(false);
          setEditingPhotoIndex(null);
        }}
      />

      {/* Custom Confirmation Modal for Deleting Gallery Photo */}
      <ConfirmModal
        isOpen={deleteConfirmIndex !== null}
        title="Remover Ensaio da Galeria"
        description="Deseja remover este ensaio da galeria do site? A foto continuará guardada no seu acervo para você reutilizar quando quiser."
        confirmText="Remover Ensaio"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmIndex(null)}
      />
    </div>
  );
}
