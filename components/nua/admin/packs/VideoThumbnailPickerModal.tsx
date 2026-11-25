/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Film, Image as ImageIcon, Upload, Play } from 'lucide-react';
import { extractVideoThumbnails, VideoThumbnailCandidate } from '@/lib/media/videoThumbnails';

interface VideoThumbnailPickerModalProps {
  isOpen: boolean;
  videoUrl: string;
  videoTitle?: string;
  currentPosterUrl?: string;
  onSelectPoster: (posterUrl: string) => void;
  onOpenLibraryPicker: () => void;
  onClose: () => void;
}

export function VideoThumbnailPickerModal({
  isOpen,
  videoUrl,
  videoTitle,
  currentPosterUrl,
  onSelectPoster,
  onOpenLibraryPicker,
  onClose,
}: VideoThumbnailPickerModalProps) {
  const [candidates, setCandidates] = useState<VideoThumbnailCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentPosterUrl || null);

  useEffect(() => {
    if (!isOpen || !videoUrl) {
      setCandidates([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    extractVideoThumbnails(videoUrl, 4)
      .then((thumbs) => {
        if (!isMounted) return;
        setCandidates(thumbs);
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setCandidates([]);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, videoUrl]);

  if (!isOpen) return null;

  const handleApply = (url: string) => {
    onSelectPoster(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#14151c] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#843C52]/15 flex items-center justify-center text-[#843C52]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Escolher Foto de Capa do Vídeo</h3>
              <p className="text-[11px] text-zinc-400 font-light mt-0.5 truncate max-w-md">
                {videoTitle || 'Selecione uma das miniaturas do vídeo ou escolha uma foto do acervo.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Seção 1: Miniaturas estilo YouTube */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-[#843C52]" />
                Miniaturas sugeridas do vídeo
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">Extração automática</span>
            </div>

            {loading ? (
              <div className="p-8 rounded-xl bg-[#0e0f14] border border-white/[0.06] flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-6 h-6 text-[#843C52] animate-spin" />
                <span className="text-xs text-zinc-300 font-medium">
                  Extraindo as melhores cenas do vídeo...
                </span>
                <span className="text-[11px] text-zinc-500 font-light">
                  Capturando quadros em alta resolução em diferentes momentos da gravação.
                </span>
              </div>
            ) : candidates.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {candidates.map((cand, idx) => {
                  const isSelected = selectedUrl === cand.dataUrl;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedUrl(cand.dataUrl);
                        handleApply(cand.dataUrl);
                      }}
                      className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-black/60 aspect-video flex flex-col ${
                        isSelected
                          ? 'border-[#843C52] shadow-[0_0_15px_rgba(244,167,185,0.3)]'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img
                        src={cand.dataUrl}
                        alt={`Momento ${cand.timeFormatted}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Timestamp Badge */}
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white">
                        {cand.timeFormatted}
                      </span>
                      {/* Selecionado Indicator */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#843C52] text-white flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0e0f14] border border-white/[0.06] text-center space-y-1">
                <span className="text-xs text-zinc-300 block">
                  Miniaturas automáticas indisponíveis para este arquivo.
                </span>
                <span className="text-[11px] text-zinc-500 block font-light">
                  Você pode escolher uma foto do seu acervo ou capa personalizada abaixo.
                </span>
              </div>
            )}
          </div>

          {/* Seção 2: Alternativas (Biblioteca de Mídias) */}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            <span className="text-xs font-semibold text-zinc-300 block">
              Ou selecione uma foto profissional do acervo
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLibraryPicker();
                }}
                className="h-9 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/10 text-xs font-medium inline-flex items-center gap-2 transition cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#843C52]" />
                <span>Escolher da Biblioteca de Fotos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-end gap-2 bg-[#0e0f14]">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-xl text-zinc-400 hover:text-white text-xs transition cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
