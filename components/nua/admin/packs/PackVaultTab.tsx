'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Trash2, Film } from 'lucide-react';
import { AvulsoVideoItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface PackVaultTabProps {
  exclusivePhotos?: string[];
  videos?: AvulsoVideoItem[];
  onAddPhotoClick: () => void;
  onRemovePhoto: (idx: number) => void;
  onAddVideo: () => void;
  onUpdateVideo: (idx: number, patch: Partial<AvulsoVideoItem>) => void;
  onRemoveVideo: (idx: number) => void;
}

export function PackVaultTab({
  exclusivePhotos,
  videos,
  onAddPhotoClick,
  onRemovePhoto,
  onAddVideo,
  onUpdateVideo,
  onRemoveVideo,
}: PackVaultTabProps) {
  const photos = exclusivePhotos || [];
  const videoList = videos || [];

  return (
    <div className="space-y-5">
      {/* Fotos Exclusivas do Cofre */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide">
              Fotos em Alta Resolução (Protegidas)
            </h3>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Entregues exclusivamente para clientes que concluírem o pagamento deste pack.
            </p>
          </div>

          <button
            type="button"
            onClick={onAddPhotoClick}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Anexar Foto do Cofre</span>
          </button>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {photos.map((url, idx) => (
              <div
                key={idx}
                className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#101116] border border-white/10 group"
              >
                <Image
                  src={resolveMediaUrl(url, 'thumb')}
                  alt={`Exclusiva ${idx + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(idx)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Remover foto do cofre"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-[#101116] border border-white/[0.04] text-zinc-400 text-xs">
            Nenhuma foto exclusiva anexada a este pack.
          </div>
        )}
      </div>

      {/* Vídeos em 4K UHD do Pack */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide">
              Vídeos Completos em Streaming 4K
            </h3>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Vídeos autorais completos hospedados no Backblaze B2 com streaming seguro.
            </p>
          </div>

          <button
            type="button"
            onClick={onAddVideo}
            className="h-8 px-3 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Vídeo 4K</span>
          </button>
        </div>

        {videoList.length > 0 ? (
          <div className="space-y-3">
            {videoList.map((vid, vIdx) => (
              <div
                key={vid.id || vIdx}
                className="p-3.5 rounded-xl bg-[#101116] border border-white/[0.06] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase font-mono">
                      Vídeo #{vIdx + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveVideo(vIdx)}
                    className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remover este vídeo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-zinc-400 font-medium">
                      Título do Vídeo:
                    </label>
                    <input
                      type="text"
                      value={vid.title}
                      onChange={(e) => onUpdateVideo(vIdx, { title: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-zinc-400 font-medium">
                      Duração (Ex: 05:20 Min):
                    </label>
                    <input
                      type="text"
                      value={vid.duration}
                      onChange={(e) => onUpdateVideo(vIdx, { duration: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-zinc-400 font-medium">
                      URL do Arquivo MP4:
                    </label>
                    <input
                      type="text"
                      value={vid.url}
                      onChange={(e) => onUpdateVideo(vIdx, { url: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white font-mono outline-none focus:border-[#f4a7b9]"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-[#101116] border border-white/[0.04] text-zinc-400 text-xs">
            Nenhum vídeo anexado a este pack.
          </div>
        )}
      </div>
    </div>
  );
}
