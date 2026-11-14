'use client';

import React from 'react';
import { X, Check, Plus } from 'lucide-react';
import { LibraryImageItem } from '@/lib/types';
import { resolveVideoPlaySource } from '@/lib/media';

interface ImagePickerVideoPreviewProps {
  item: LibraryImageItem | null;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClose: () => void;
}

export function ImagePickerVideoPreview({
  item,
  isSelected,
  onToggleSelect,
  onClose,
}: ImagePickerVideoPreviewProps) {
  if (!item) return null;

  const { videoUrl, posterUrl } = resolveVideoPlaySource(item);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/92 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#171821] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl flex flex-col p-4 sm:p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#f4a7b9] font-bold px-2 py-0.5 rounded-full bg-[#f4a7b9]/10 border border-[#f4a7b9]/20">
                STREAMING PROTEGIDO • REPRODUÇÃO EM ALTA DEFINIÇÃO
              </span>
              <span className="text-zinc-500 text-xs hidden sm:inline">
                {item.uploadedAt || 'Mídia Autoral'}
              </span>
            </div>
            <h4 className="text-base sm:text-lg text-white font-medium truncate mt-1">
              {item.customName || item.name}
            </h4>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar preview (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Cinema Container */}
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-white/[0.06] shadow-inner flex items-center justify-center">
          <video
            key={videoUrl}
            src={videoUrl}
            poster={posterUrl || undefined}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Range Requests Ativo</span>
            {item.sizeBytes && (
              <span className="text-zinc-500">
                • {Math.round(item.sizeBytes / (1024 * 1024))} MB
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleSelect}
              className={`h-8 px-4 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#f4a7b9] text-zinc-950 font-bold shadow-sm'
                  : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/10'
              }`}
            >
              {isSelected ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Vídeo Selecionado</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Selecionar este Vídeo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium transition-colors cursor-pointer border border-white/10"
            >
              Fechar Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
