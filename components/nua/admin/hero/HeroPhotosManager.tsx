/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Trash2, ArrowLeft, ArrowRight, ImageIcon } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface HeroPhotosManagerProps {
  photos: SiteContent['hero']['photos'];
  onAddNewSlide: () => void;
  onOpenPickerForSlide: (index: number) => void;
  onRemoveSlide: (index: number) => void;
  onMoveSlide: (index: number, direction: 'prev' | 'next') => void;
  onPreviewPhoto: (url: string) => void;
}

export function HeroPhotosManager({
  photos,
  onAddNewSlide,
  onOpenPickerForSlide,
  onRemoveSlide,
  onMoveSlide,
  onPreviewPhoto,
}: HeroPhotosManagerProps) {
  return (
    <div data-field="hero.photos" className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Fotos da Capa ({photos.length})
          </h3>
          <p className="text-zinc-400 text-xs font-light mt-0.5">
            Imagens que alternam no fundo da página inicial.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddNewSlide}
          className="h-9 px-3.5 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm self-start sm:self-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar Foto</span>
        </button>
      </div>

      {/* Empty state if no photos */}
      {photos.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-white/10 bg-[#0e1015]">
          <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" strokeWidth={1.5} />
          <h4 className="text-sm text-zinc-300 font-medium">Ainda não há fotos na capa</h4>
          <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">
            Adicione pelo menos uma foto para receber seus visitantes na página inicial.
          </p>
          <button
            type="button"
            onClick={onAddNewSlide}
            className="mt-3.5 h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Primeira Foto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {photos.map((photo, index) => (
            <div
              key={`${photo.id || index}-${photo.imageUrl}`}
              className="relative rounded-xl bg-[#0e1015] border border-white/[0.06] p-3 flex flex-col justify-between group hover:border-white/[0.12] transition-colors"
            >
              <div
                onClick={() => onPreviewPhoto(photo.imageUrl)}
                className="relative aspect-[3/4] w-full rounded-lg overflow-hidden bg-black mb-2.5 cursor-pointer group/img"
                title="Clique para visualizar em alta resolução"
              >
                <Image
                  src={resolveMediaUrl(photo.imageUrl)}
                  alt={`Foto ${index + 1}`}
                  fill
                  className="object-cover group-hover/img:scale-105 transition-transform duration-300"
                  sizes="260px"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-zinc-200 border border-white/10">
                  Foto 0{index + 1} {index === 0 && '· Principal'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] gap-2">
                <button
                  type="button"
                  onClick={() => onOpenPickerForSlide(index)}
                  className="h-8 px-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-zinc-200 hover:text-white font-medium transition cursor-pointer flex-1 flex items-center justify-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#843C52]" />
                  <span>Trocar</span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMoveSlide(index, 'prev')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white disabled:opacity-20 transition cursor-pointer border border-white/[0.08]"
                    title="Mover para a esquerda"
                    aria-label="Mover para a esquerda"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === photos.length - 1}
                    onClick={() => onMoveSlide(index, 'next')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white disabled:opacity-20 transition cursor-pointer border border-white/[0.08]"
                    title="Mover para a direita"
                    aria-label="Mover para a direita"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveSlide(index)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition cursor-pointer border border-white/[0.08]"
                    title="Remover foto da capa"
                    aria-label="Remover foto da capa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
