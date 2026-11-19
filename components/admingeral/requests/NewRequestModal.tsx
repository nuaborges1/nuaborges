/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { Bell, X, Copy } from 'lucide-react';
import { Req } from './types';

interface NewRequestModalProps {
  modalData: Req | null;
  onClose: () => void;
  onOpenAndCopy: (req: Req, e: React.MouseEvent) => void;
  onOpenDetails: (req: Req) => void;
}

export function NewRequestModal({
  modalData,
  onClose,
  onOpenAndCopy,
  onOpenDetails,
}: NewRequestModalProps) {
  if (!modalData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-950 border-2 border-rose-500/60 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-[0_0_50px_rgba(244,63,94,0.35)] relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Atenção Philippe • Nova Demanda Recebida!
              </span>
              <h3 className="text-base font-semibold text-white">
                {modalData.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="font-semibold text-[#843C52]">{modalData.category || 'Geral'}</span>
            <span>•</span>
            <span>Enviado pela Nua Borges agora há pouco</span>
          </div>
          <p className="text-zinc-200 italic line-clamp-3 leading-relaxed">
            "{modalData.originalText}"
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={(e) => onOpenAndCopy(modalData, e)}
            className="flex-1 py-3 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>Abrir & Copiar Prompt de IA</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenDetails(modalData)}
            className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs transition-all cursor-pointer"
          >
            Apenas Ver Detalhes
          </button>
        </div>
      </div>
    </div>
  );
}
