'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Images,
  Upload,
  Trash2,
  Film,
  Copy,
  ChevronDown,
  Camera,
} from 'lucide-react';
import { AvulsoVideoItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface PackVaultTabProps {
  exclusivePhotos?: string[];
  previewPhotosCount?: number;
  videos?: AvulsoVideoItem[];
  modality?: 'avulso' | 'pack';
  uploadingPhotos?: boolean;
  uploadingVideo?: boolean;
  uploadVideoProgress?: number;
  onAddPhotosFromLibrary: () => void;
  onUploadPhotosDirect: () => void;
  onCopyPreviewsToVault?: () => void;
  onRemovePhoto: (idx: number) => void;
  onSelectVideosFromLibrary: () => void;
  onUploadVideoDirect: () => void;
  onSelectVideoPoster: (videoIdx: number) => void;
  onReplaceVideoFromLibrary: (videoIdx: number) => void;
  onUpdateVideo: (idx: number, patch: Partial<AvulsoVideoItem>) => void;
  onRemoveVideo: (idx: number) => void;
}

export function PackVaultTab({
  exclusivePhotos,
  previewPhotosCount = 0,
  videos,
  modality = 'pack',
  uploadingPhotos = false,
  uploadingVideo = false,
  uploadVideoProgress = 0,
  onAddPhotosFromLibrary,
  onUploadPhotosDirect,
  onCopyPreviewsToVault,
  onRemovePhoto,
  onSelectVideosFromLibrary,
  onUploadVideoDirect,
  onSelectVideoPoster,
  onReplaceVideoFromLibrary,
  onUpdateVideo,
  onRemoveVideo,
}: PackVaultTabProps) {
  const isAvulso = modality === 'avulso';
  const photos = (exclusivePhotos || []).slice(0, isAvulso ? 1 : undefined);
  const videoList = videos || [];

  return (
    <div className="space-y-5">
      {/* 1. Fotos Exclusivas do Cofre */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white tracking-wide">
                {isAvulso ? 'Foto em Alta Resolução Protegida (Foto Única)' : `Fotos em Alta Resolução Protegidas (${photos.length})`}
              </h3>
              {isAvulso && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
                  Limite: 1 Foto
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              {isAvulso
                ? 'A modalidade Conteúdo Avulso contempla apenas 1 foto única entregue ao cliente pós-pagamento.'
                : 'Liberadas exclusivamente para clientes que concluírem o pagamento deste pack.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {!isAvulso && previewPhotosCount > 0 && onCopyPreviewsToVault && (
              <button
                type="button"
                onClick={onCopyPreviewsToVault}
                className="h-8 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Incluir também as fotos da aba de amostras no cofre"
              >
                <Copy className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>Incluir amostras ({previewPhotosCount})</span>
              </button>
            )}

            <button
              type="button"
              disabled={uploadingPhotos}
              onClick={onUploadPhotosDirect}
              className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-200 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>{uploadingPhotos ? 'Enviando...' : isAvulso ? (photos.length > 0 ? 'Substituir Foto' : 'Enviar Foto Única') : 'Enviar Fotos'}</span>
            </button>

            <button
              type="button"
              onClick={onAddPhotosFromLibrary}
              className="h-8 px-3.5 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-xs text-zinc-950 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Images className="w-3.5 h-3.5" />
              <span>{isAvulso && photos.length > 0 ? 'Substituir da Biblioteca' : 'Escolher da Biblioteca'}</span>
            </button>
          </div>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {photos.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#101116] border border-white/10 group"
              >
                <Image
                  src={resolveMediaUrl(url, 'thumb')}
                  alt={`Exclusiva ${idx + 1}`}
                  fill
                  className="object-cover"
                />
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 text-[10px] font-mono text-emerald-300">
                  #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemovePhoto(idx)}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/80 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors cursor-pointer"
                  title="Remover foto do cofre"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-[#101116] border border-dashed border-white/10 space-y-2.5">
            <p className="text-zinc-300 text-xs font-medium">
              Nenhuma foto exclusiva anexada a este pack
            </p>
            <p className="text-zinc-500 text-[11px] max-w-sm mx-auto">
              Selecione fotos da sua Biblioteca de Mídias ou envie diretamente do celular ou computador.
            </p>
            <button
              type="button"
              onClick={onAddPhotosFromLibrary}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 font-semibold text-xs transition cursor-pointer"
            >
              <Images className="w-3.5 h-3.5" />
              <span>Escolher Fotos da Biblioteca</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Vídeos Completos em Streaming 4K do Pack */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide">
              Vídeos Protegidos em Streaming 4K ({videoList.length})
            </h3>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Escolha vídeos já enviados para a Biblioteca ou envie novos arquivos MP4/MOV com geração automática de capa e duração.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={uploadingVideo}
              onClick={onUploadVideoDirect}
              className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>
                {uploadingVideo
                  ? `Enviando vídeo (${uploadVideoProgress}%)...`
                  : 'Enviar Vídeo do Dispositivo'}
              </span>
            </button>

            <button
              type="button"
              onClick={onSelectVideosFromLibrary}
              className="h-8 px-3.5 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Escolher Vídeo da Biblioteca</span>
            </button>
          </div>
        </div>

        {uploadingVideo && (
          <div className="p-3 rounded-xl bg-[#101116] border border-white/10">
            <div className="flex items-center justify-between text-xs text-zinc-300 mb-1.5">
              <span>Enviando e preparando vídeo protegido...</span>
              <span className="font-mono text-[#f4a7b9] font-semibold">{uploadVideoProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f4a7b9] transition-all duration-300"
                style={{ width: `${uploadVideoProgress}%` }}
              />
            </div>
          </div>
        )}

        {videoList.length > 0 ? (
          <div className="space-y-3">
            {videoList.map((vid, vIdx) => {
              return (
                <div
                  key={vid.id || vIdx}
                  className="p-3.5 rounded-xl bg-[#101116] border border-white/[0.07] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Thumbnail / Poster do Vídeo */}
                      <button
                        type="button"
                        onClick={() => onSelectVideoPoster(vIdx)}
                        className="relative w-16 h-20 rounded-lg overflow-hidden bg-black border border-white/10 hover:border-[#f4a7b9]/50 shrink-0 flex items-center justify-center group cursor-pointer"
                        title="Trocar capa deste vídeo"
                      >
                        {vid.posterUrl ? (
                          <Image
                            src={resolveMediaUrl(vid.posterUrl)}
                            alt={vid.title || 'Capa do vídeo'}
                            fill
                            className="object-cover"
                          />
                        ) : vid.url ? (
                          <video
                            src={`${resolveMediaUrl(vid.url)}#t=0.001`}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <Film className="w-5 h-5 text-[#f4a7b9]" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f4a7b9]/15 text-[#f4a7b9] font-semibold">
                            Vídeo #{vIdx + 1}
                          </span>
                          {vid.url ? (
                            <span className="text-[10px] font-mono text-emerald-400">
                              Arquivo vinculado
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-amber-400">
                              Selecione o vídeo
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-white truncate mt-1">
                          {vid.title || `Vídeo Exclusivo #${vIdx + 1}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => onReplaceVideoFromLibrary(vIdx)}
                            className="text-[11px] text-[#f4a7b9] hover:underline cursor-pointer"
                          >
                            Trocar vídeo na Biblioteca
                          </button>
                          <span className="text-zinc-600">•</span>
                          <button
                            type="button"
                            onClick={() => onSelectVideoPoster(vIdx)}
                            className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                          >
                            Escolher foto de capa
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveVideo(vIdx)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer self-end sm:self-center"
                      title="Remover este vídeo do pack"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.05]">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-zinc-400 font-medium">
                        Título Exibido ao Cliente
                      </label>
                      <input
                        type="text"
                        value={vid.title}
                        onChange={(e) => onUpdateVideo(vIdx, { title: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
                        placeholder="Ex: Ensaio Completo em 4K"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-zinc-400 font-medium">
                        Duração Exibida
                      </label>
                      <input
                        type="text"
                        value={vid.duration}
                        onChange={(e) => onUpdateVideo(vIdx, { duration: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
                        placeholder="Ex: 05:20"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-[#101116] border border-dashed border-white/10 space-y-2.5">
            <Film className="w-7 h-7 text-zinc-600 mx-auto" />
            <p className="text-zinc-300 text-xs font-medium">
              Nenhum vídeo anexado a este pack ainda
            </p>
            <p className="text-zinc-500 text-[11px] max-w-sm mx-auto">
              Escolha vídeos já salvos na sua Biblioteca de Mídias ou envie um novo arquivo de vídeo agora mesmo.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={onSelectVideosFromLibrary}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 font-semibold text-xs transition cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Escolher Vídeo da Biblioteca</span>
              </button>
              <button
                type="button"
                onClick={onUploadVideoDirect}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-200 text-xs font-medium transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>Enviar Vídeo do Dispositivo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
