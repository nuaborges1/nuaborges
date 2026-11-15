'use client';

import React from 'react';
import Image from 'next/image';
import { Images, Upload, Trash2 } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';

interface PackPreviewsTabProps {
  previewImages?: string[];
  uploading?: boolean;
  modality?: 'avulso' | 'pack';
  onAddFromLibraryClick: () => void;
  onUploadDirectClick: () => void;
  onRemovePhoto: (idx: number) => void;
}

export function PackPreviewsTab({
  previewImages,
  uploading = false,
  modality = 'pack',
  onAddFromLibraryClick,
  onUploadDirectClick,
  onRemovePhoto,
}: PackPreviewsTabProps) {
  const isAvulso = modality === 'avulso';
  const images = (previewImages || []).slice(0, isAvulso ? 1 : undefined);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-white tracking-wide">
              {isAvulso ? 'Foto de Amostra Pública (Foto Única)' : `Fotos de Amostra Públicas (${images.length})`}
            </h3>
            {isAvulso && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
                Limite: 1 Foto
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 font-light mt-0.5">
            {isAvulso
              ? 'A modalidade Conteúdo Avulso permite exclusivamente 1 foto única. O envio ou seleção substituirá a foto atual.'
              : 'Fotos de degustação exibidas na página do pack antes da compra. Você pode selecionar várias de uma só vez.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={uploading}
            onClick={onUploadDirectClick}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>{uploading ? 'Enviando...' : isAvulso ? (images.length > 0 ? 'Substituir Foto' : 'Enviar Foto Única') : 'Enviar Fotos'}</span>
          </button>

          <button
            type="button"
            onClick={onAddFromLibraryClick}
            className="h-8 px-3.5 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-xs text-zinc-950 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Images className="w-3.5 h-3.5" />
            <span>{isAvulso && images.length > 0 ? 'Substituir da Biblioteca' : 'Escolher da Biblioteca'}</span>
          </button>
        </div>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {images.map((url: string, idx: number) => (
            <div
              key={`${url}-${idx}`}
              className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#101116] border border-white/10 group"
            >
              <Image
                src={resolveMediaUrl(url, 'thumb')}
                alt={`Amostra ${idx + 1}`}
                fill
                className="object-cover"
              />
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 text-[10px] font-mono text-zinc-300">
                #{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemovePhoto(idx)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/80 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer"
                title="Remover amostra"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl bg-[#101116] border border-dashed border-white/10 space-y-2.5">
          <p className="text-zinc-300 text-xs font-medium">
            Nenhuma foto de amostra selecionada ainda
          </p>
          <p className="text-zinc-500 text-[11px] max-w-sm mx-auto">
            Escolha uma ou várias fotos da sua Biblioteca de Mídias para mostrar uma prévia deste pack aos visitantes.
          </p>
          <button
            type="button"
            onClick={onAddFromLibraryClick}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 font-semibold text-xs transition cursor-pointer"
          >
            <Images className="w-3.5 h-3.5" />
            <span>Selecionar Amostras da Biblioteca</span>
          </button>
        </div>
      )}
    </div>
  );
}
