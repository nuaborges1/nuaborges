'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, HelpCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const isDanger = variant === 'danger';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
        <div className="absolute inset-0 -z-10" onClick={onCancel} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden"
        >
          {/* Top icon and close button */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                isDanger
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  : 'bg-[#f4a7b9]/10 border-[#f4a7b9]/25 text-[#f4a7b9]'
              }`}
            >
              {isDanger ? (
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <AlertCircle className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-800"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Description */}
          <h3 className="font-serif text-xl sm:text-2xl text-white font-medium mb-2">
            {title}
          </h3>
          <p className="text-zinc-400 text-sm font-light leading-relaxed mb-6">
            {description}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-full border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer min-h-[46px]"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 rounded-full font-bold text-xs tracking-wider uppercase transition-all cursor-pointer min-h-[46px] shadow-lg ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                  : 'bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 shadow-[0_2px_14px_rgba(244,167,185,0.25)]'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
