/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { ImageIcon, ExternalLink, X } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';

interface HeroPreviewModalProps {
  photoUrl: string | null;
  onClose: () => void;
}

export function HeroPreviewModal({ photoUrl, onClose }: HeroPreviewModalProps) {
  if (!photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#171821] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl p-4 sm:p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#843C52]" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#843C52] font-semibold">
              VISUALIZAÇÃO DE FOTO DA CAPA • ALTA RESOLUÇÃO
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={resolveMediaUrl(photoUrl, 'full')}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white/[0.06] text-zinc-400 hover:text-white transition cursor-pointer"
              title="Abrir imagem original em nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/[0.06] text-zinc-400 hover:text-white transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative aspect-[4/5] sm:aspect-video max-h-[70vh] w-full rounded-lg overflow-hidden bg-black/60 border border-white/[0.06] flex items-center justify-center">
          <img
            src={resolveMediaUrl(photoUrl, 'full')}
            alt="Foto da Capa"
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500 font-mono pt-1">
          <span className="truncate max-w-md">URL: {photoUrl}</span>
          <span className="text-emerald-400 font-sans font-medium shrink-0">Qualidade Original</span>
        </div>
      </div>
    </div>
  );
}
