'use client';

import React from 'react';
import {
  Trash2,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { GalleryPhotoItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface GalleryItemRowProps {
  photo: GalleryPhotoItem;
  index: number;
  totalCount: number;
  onOpenPicker: () => void;
  onPreview: (url: string) => void;
  onUpdate: (fields: Partial<GalleryPhotoItem>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function GalleryItemRow({
  photo,
  index,
  totalCount,
  onOpenPicker,
  onPreview,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
}: GalleryItemRowProps) {
  return (
    <div
      className={`rounded-xl border p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 transition-all ${
        photo.active !== false
          ? 'bg-[#101116] border-white/[0.06] hover:border-white/[0.12]'
          : 'bg-[#0e0f14] border-white/[0.04] opacity-60'
      }`}
    >
      {/* Thumbnail + Change Action */}
      <div className="flex flex-row md:flex-col items-center gap-2.5 shrink-0">
        <div
          onClick={() => onPreview(photo.imageUrl)}
          className="relative w-16 h-22 sm:w-20 sm:h-28 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10 cursor-pointer group/img"
          title="Clique para visualizar em alta resolução"
        >
          <img
            src={resolveMediaUrl(photo.imageUrl)}
            alt={photo.title || 'Foto do ensaio'}
            className={`absolute inset-0 w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 ${
              photo.blurred ? 'blur-sm' : ''
            }`}
            loading="lazy"
          />
          <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded-full bg-black/80 backdrop-blur-md text-[9px] font-mono text-zinc-300">
            0{index + 1}
          </span>
          {photo.blurred && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#f4a7b9]" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenPicker}
          className="h-7 px-2.5 rounded-lg bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1 w-full"
        >
          <ImageIcon className="w-3 h-3" />
          <span>Trocar</span>
        </button>
      </div>

      {/* Editable Fields */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1">
            Título do Ensaio / Registro
          </label>
          <input
            type="text"
            value={photo.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Ex: Luz & Silhueta"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#f4a7b9]/60 transition"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-zinc-400 block mb-1">
            Legenda Curta
          </label>
          <input
            type="text"
            value={photo.caption || ''}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            placeholder="Ex: Estudo autoral sobre contorno e naturalidade"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-[#f4a7b9]/60 transition"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-[11px] font-medium text-zinc-400 block mb-1">
            Link ao Clicar na Foto (Opcional — ex: OnlyFans, Privacy ou deixe vazio)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500">
              <LinkIcon className="w-3.5 h-3.5" />
            </div>
            <input
              type="url"
              value={photo.linkUrl || ''}
              onChange={(e) => onUpdate({ linkUrl: e.target.value })}
              placeholder="https://onlyfans.com/nuaborges"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-white text-xs outline-none focus:border-[#f4a7b9]/60 transition"
            />
          </div>
        </div>
      </div>

      {/* Order, Blur & Delete Actions */}
      <div className="flex md:flex-col items-center justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06] shrink-0">
        <button
          type="button"
          onClick={() => onUpdate({ blurred: !photo.blurred })}
          className={`h-7 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition cursor-pointer border ${
            photo.blurred
              ? 'bg-[#f4a7b9]/20 text-[#f4a7b9] border-[#f4a7b9]/40'
              : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/10'
          }`}
          title={photo.blurred ? 'Desfocada na Home (clique para remover o desfoque)' : 'Clique para desfocar esta imagem na Home'}
        >
          <Lock className="w-3 h-3" />
          <span>{photo.blurred ? 'Desfocada (VIP)' : 'Sem desfoque'}</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white disabled:opacity-20 transition cursor-pointer border border-white/10"
            title="Mover para cima"
            aria-label="Mover para cima"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalCount - 1}
            onClick={onMoveDown}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white disabled:opacity-20 transition cursor-pointer border border-white/10"
            title="Mover para baixo"
            aria-label="Mover para baixo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdate({ active: photo.active === false ? true : false })
            }
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition cursor-pointer border border-white/10"
            title={
              photo.active !== false
                ? 'Visível no site (toque para ocultar)'
                : 'Oculto no site (toque para exibir)'
            }
            aria-label="Ocultar ou exibir foto"
          >
            {photo.active !== false ? (
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
            )}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition cursor-pointer border border-white/10"
            title="Remover da galeria"
            aria-label="Remover da galeria"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
