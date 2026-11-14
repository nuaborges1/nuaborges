'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Trash2 } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';

interface PackPreviewsTabProps {
  previewImages?: string[];
  onAddClick: () => void;
  onRemovePhoto: (idx: number) => void;
}

export function PackPreviewsTab({
  previewImages,
  onAddClick,
  onRemovePhoto,
}: PackPreviewsTabProps) {
  const images = previewImages || [];

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div>
          <h3 className="text-xs font-semibold text-white tracking-wide">
            Fotos de Amostra Públicas (Degustação)
          </h3>
          <p className="text-[11px] text-zinc-400 font-light mt-0.5">
            Fotos com marca d&apos;água que qualquer visitante pode ver antes de comprar.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddClick}
          className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-[#f4a7b9]" />
          <span>Adicionar Amostra</span>
        </button>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {images.map((url: string, idx: number) => (
            <div
              key={idx}
              className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#101116] border border-white/10 group"
            >
              <Image
                src={resolveMediaUrl(url, 'thumb')}
                alt={`Amostra ${idx + 1}`}
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => onRemovePhoto(idx)}
                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Remover amostra"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl bg-[#101116] border border-white/[0.04] text-zinc-400 text-xs">
          Nenhuma foto de degustação adicionada ainda.
        </div>
      )}
    </div>
  );
}
