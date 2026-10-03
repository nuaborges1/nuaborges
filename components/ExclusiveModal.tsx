'use client';

import React from 'react';
import { X, Lock } from 'lucide-react';
import { OnlyFansIcon, HeartOutlineIcon } from './Icons';

interface ExclusiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExclusiveModal({ isOpen, onClose }: ExclusiveModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Conteúdo Exclusivo de Nua Borges"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200 select-none"
    >
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0a0a0d] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800/60 transition-colors focus-visible:outline-none cursor-pointer"
          aria-label="Fechar janela"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 text-[#f4a7b9] mb-4">
          <Lock className="w-5 h-5" />
        </div>

        <div className="flex items-center justify-center gap-2">
          <h3 className="font-serif text-2xl text-white">
            Nua Borges
          </h3>
          <HeartOutlineIcon className="w-4 h-4 text-[#f4a7b9]" />
        </div>

        <p className="text-zinc-400 text-sm mt-3 font-light leading-relaxed">
          Acesse meus ensaios fotográficos e conteúdos autorais exclusivos no OnlyFans oficial.
        </p>

        <div className="mt-6">
          <a
            href="https://onlyfans.com/nuaborges"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-full bg-[#f4a7b9] hover:bg-[#ef94a8] text-zinc-950 font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-lg shadow-[#f4a7b9]/20 hover:scale-[1.02] cursor-pointer"
          >
            <OnlyFansIcon className="w-4 h-4" />
            <span>Acessar OnlyFans</span>
            <span>→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
