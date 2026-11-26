/* Vinho maduro / Nua Borges */
'use client';

import Image from 'next/image';
import {
  Images,
  Trash2,
  Film,
  Copy,
  Camera,
} from 'lucide-react';
import { AvulsoVideoItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface PackVaultTabProps {
  exclusivePhotos?: string[];
  previewPhotosCount?: number;
  videos?: AvulsoVideoItem[];
  onAddPhotosFromLibrary: () => void;
  onCopyPreviewsToVault?: () => void;
  onRemovePhoto: (idx: number) => void;
  onSelectVideosFromLibrary: () => void;
  onSelectVideoPoster: (videoIdx: number) => void;
  onReplaceVideoFromLibrary: (videoIdx: number) => void;
  onUpdateVideo: (idx: number, patch: Partial<AvulsoVideoItem>) => void;
  onRemoveVideo: (idx: number) => void;
}

export function PackVaultTab({
  exclusivePhotos,
  previewPhotosCount = 0,
  videos,
  onAddPhotosFromLibrary,
  onCopyPreviewsToVault,
  onRemovePhoto,
  onSelectVideosFromLibrary,
  onSelectVideoPoster,
  onReplaceVideoFromLibrary,
  onUpdateVideo,
  onRemoveVideo,
}: PackVaultTabProps) {
  const photos = exclusivePhotos || [];
  const videoList = videos || [];

  return (
    <div className="space-y-5">
      {/* 1. Fotos Exclusivas do Cofre */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white tracking-wide">
                Fotos entregues após a compra ({photos.length})
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Estas fotos ficam disponíveis para quem comprar este pack.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {previewPhotosCount > 0 && onCopyPreviewsToVault && <button type="button" onClick={onCopyPreviewsToVault} className="h-9 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-300 border border-white/10 inline-flex items-center gap-1.5"><Copy className="w-4 h-4 text-[var(--color-adm-accent)]"/>Incluir amostras ({previewPhotosCount})</button>}
            <button type="button" onClick={onAddPhotosFromLibrary} className="h-10 px-4 rounded-lg bg-[var(--color-adm-accent)] text-sm text-white font-semibold inline-flex items-center gap-2 hover:brightness-110"><Images className="w-4 h-4"/>Adicionar fotos</button>
          </div>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {photos.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#101116] border border-white/10 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveMediaUrl(url, 'thumb')}
                  alt={`Exclusiva ${idx + 1}`}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="w-full h-full object-cover"
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
              Escolha fotos do acervo ou envie novas. O arquivo enviado também fica salvo no acervo.
            </p>
            <button
              type="button"
              onClick={onAddPhotosFromLibrary}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[var(--color-adm-accent)] text-white font-semibold text-sm hover:brightness-110"
            >
              <Images className="w-4 h-4" />
              <span>Adicionar fotos</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Vídeos Completos em Streaming 4K do Pack */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white tracking-wide">
                Vídeos entregues após a compra ({videoList.length})
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Escolha vídeos do acervo ou envie arquivos novos. Eles serão salvos no acervo e adicionados ao pack.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button type="button" onClick={onSelectVideosFromLibrary} className="h-10 px-4 rounded-lg bg-[var(--color-adm-accent)] text-sm text-white font-semibold inline-flex items-center gap-2 hover:brightness-110"><Film className="w-4 h-4"/>Adicionar vídeos</button>
          </div>
        </div>

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
                        className="relative w-16 h-20 rounded-lg overflow-hidden bg-black border border-white/10 hover:border-[#843C52]/50 shrink-0 flex items-center justify-center group cursor-pointer"
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
                          <Film className="w-5 h-5 text-[#843C52]" />
                        )}
                        <div className="absolute inset-0 bg-black/45 lg:bg-black/60 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#843C52]/15 text-[#843C52] font-semibold">
                            Vídeo #{vIdx + 1}
                          </span>
                          {vid.url ? (
                            <span className="text-[10px] font-mono text-emerald-400">
                              Arquivo adicionado
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
                            className="text-[11px] text-[#843C52] hover:underline cursor-pointer"
                          >
                            Trocar vídeo
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
                        Título do vídeo
                      </label>
                      <input
                        type="text"
                        value={vid.title}
                        onChange={(e) => onUpdateVideo(vIdx, { title: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#843C52]"
                        placeholder="Ex: Ensaio Completo em 4K"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-mono text-zinc-400 font-medium">
                        Duração
                      </label>
                      <input
                        type="text"
                        value={vid.duration}
                        onChange={(e) => onUpdateVideo(vIdx, { duration: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#843C52]"
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
              Escolha do acervo ou envie um arquivo novo. O envio salva no acervo e seleciona para este pack.
            </p>
            <button type="button" onClick={onSelectVideosFromLibrary} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[var(--color-adm-accent)] text-white font-semibold text-sm hover:brightness-110"><Film className="w-4 h-4"/>Adicionar vídeo</button>
          </div>
        )}
      </div>
    </div>
  );
}
