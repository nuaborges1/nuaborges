/* Vinho maduro / Nua Borges */
'use client';

import React, { useState } from 'react';
import {
  Trash2,
  ArrowLeft,
  ArrowRight,
  ImageIcon,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  ChevronUp,
  Film,
} from 'lucide-react';
import { GalleryPhotoItem } from '@/lib/types';
import { resolveMediaUrl, isMediaVideo } from '@/lib/media';

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
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  return (
    <div
      className={`rounded-xl border overflow-hidden flex flex-col transition-all ${
        photo.active !== false
          ? 'bg-[#101116] border-white/[0.07] hover:border-white/[0.15]'
          : 'bg-[#0c0d12] border-white/[0.04] opacity-60'
      }`}
    >
      {/* Visual Thumbnail */}
      <div
        onClick={() => onPreview(photo.imageUrl)}
        className="relative aspect-[4/5] w-full bg-black overflow-hidden cursor-pointer group/img"
        title="Clique para visualizar em tela cheia"
      >
        {isMediaVideo(photo.imageUrl) ? (
          <video
            src={`${resolveMediaUrl(photo.imageUrl)}#t=0.001`}
            muted
            playsInline
            preload="metadata"
            className={`w-full h-full object-cover pointer-events-none group-hover/img:scale-105 transition-transform duration-300 ${
              photo.blurred ? 'blur-md scale-105' : ''
            }`}
          />
        ) : (
          <img
            src={resolveMediaUrl(photo.imageUrl)}
            alt={photo.title || 'Foto do ensaio'}
            className={`w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300 ${
              photo.blurred ? 'blur-md scale-105' : ''
            }`}
            loading="lazy"
          />
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-mono font-semibold text-white border border-white/10">
            #{String(index + 1).padStart(2, '0')}
          </span>

          <div className="flex items-center gap-1">
            {isMediaVideo(photo.imageUrl) && (
              <span className="px-2 py-0.5 rounded-md bg-[#843C52]/25 text-[#843C52] text-[10px] font-semibold flex items-center gap-1 border border-[#843C52]/40 shadow-sm backdrop-blur-md">
                <Film className="w-2.5 h-2.5" />
                Vídeo
              </span>
            )}
            {photo.blurred && (
              <span className="px-2 py-0.5 rounded-md bg-[#843C52]/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow">
                <Lock className="w-2.5 h-2.5" />
                VIP
              </span>
            )}
            {photo.isPendingPublish && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 text-[10px] font-semibold flex items-center gap-1 border border-amber-500/40 shadow-sm backdrop-blur-md">
                Pendente
              </span>
            )}
            {photo.active === false && !photo.isPendingPublish && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-900/90 text-zinc-400 text-[10px] font-mono border border-white/10">
                Oculto
              </span>
            )}
          </div>
        </div>

        {/* Bottom Gradient Preview */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8 pointer-events-none">
          <p className="text-xs font-semibold text-white truncate">
            {photo.title || 'Sem título'}
          </p>
          <p className="text-[11px] text-zinc-300 truncate mt-0.5">
            {photo.caption || 'Sem legenda'}
          </p>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-2.5 bg-[#14151c] border-t border-white/[0.06] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white disabled:opacity-25 transition cursor-pointer border border-white/[0.06]"
              title="Mover para trás"
              aria-label="Mover para trás"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === totalCount - 1}
              onClick={onMoveDown}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white disabled:opacity-25 transition cursor-pointer border border-white/[0.06]"
              title="Mover para frente"
              aria-label="Mover para frente"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ blurred: !photo.blurred })}
              className={`h-7 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium transition cursor-pointer border ${
                photo.blurred
                  ? 'bg-[#843C52]/15 text-[#843C52] border-[#843C52]/30'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.06]'
              }`}
              title={photo.blurred ? 'Remover desfoque VIP' : 'Aplicar desfoque VIP'}
            >
              <Lock className="w-3 h-3" />
              <span>Blur</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenPicker}
              className="h-7 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-[11px] font-medium transition cursor-pointer border border-white/[0.06] flex items-center gap-1"
              title="Trocar foto"
            >
              <ImageIcon className="w-3 h-3 text-[#843C52]" />
              <span>Trocar</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdate({ active: photo.active === false ? true : false })}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition cursor-pointer border border-white/[0.06]"
              title={photo.active !== false ? 'Visível no site (clique para ocultar)' : 'Oculto no site (clique para exibir)'}
              aria-label="Alternar visibilidade"
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
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition cursor-pointer border border-white/[0.06]"
              title="Remover da galeria"
              aria-label="Remover da galeria"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Toggle On-Demand Caption & Link Editor */}
        <button
          type="button"
          onClick={() => setIsEditingDetails((prev) => !prev)}
          className={`w-full h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center justify-between transition cursor-pointer border ${
            isEditingDetails
              ? 'bg-[#843C52]/10 text-[#843C52] border-[#843C52]/25'
              : 'bg-[#0e0f14] text-zinc-400 hover:text-white border-white/[0.05]'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Pencil className="w-3 h-3" />
            <span>{isEditingDetails ? 'Fechar Edição de Legenda' : 'Editar Legenda e Link'}</span>
          </span>
          {isEditingDetails && <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {isEditingDetails && (
          <div className="pt-2 space-y-2.5 border-t border-white/[0.06]">
            <div>
              <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                Título do Ensaio
              </label>
              <input
                type="text"
                value={photo.title || ''}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Ex: Luz & Silhueta"
                className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-[#843C52]/60 transition"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                Legenda Curta
              </label>
              <input
                type="text"
                value={photo.caption || ''}
                onChange={(e) => onUpdate({ caption: e.target.value })}
                placeholder="Ex: Ensaio autoral"
                className="w-full bg-[#0c0d12] border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-[#843C52]/60 transition"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-zinc-400 block mb-1">
                Link ao Clicar (Opcional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-500">
                  <LinkIcon className="w-3 h-3" />
                </div>
                <input
                  type="url"
                  value={photo.linkUrl || ''}
                  onChange={(e) => onUpdate({ linkUrl: e.target.value })}
                  placeholder="https://onlyfans.com/nuaborges"
                  className="w-full bg-[#0c0d12] border border-white/10 rounded-lg pl-7 pr-2.5 py-1.5 text-white text-xs outline-none focus:border-[#843C52]/60 transition"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
