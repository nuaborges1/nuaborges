'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';

interface CelebrationModalProps {
  modalData: {
    id: string;
    title: string;
    summary?: string;
  } | null;
  onClose: () => void;
}

export function CelebrationModal({ modalData, onClose }: CelebrationModalProps) {
  return (
    <AnimatePresence>
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overscroll-contain">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-zinc-950 border border-emerald-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-[0_10px_50px_rgba(16,185,129,0.3)] relative overflow-hidden"
          >
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
                ✦ Pedido Concluído com Sucesso ✦
              </span>
              <h3 className="text-xl sm:text-2xl font-serif text-white">
                "{modalData.title}"
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 font-light leading-relaxed">
                O desenvolvedor Philippe concluiu, testou e publicou as alterações solicitadas no seu site oficial!
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                Perfeito! Fechar aviso
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
