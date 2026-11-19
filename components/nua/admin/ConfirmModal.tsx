/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, HelpCircle, X } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';

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

  useScrollLock(isOpen);

  // ESC to cancel
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  const isDanger = variant === 'danger';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none overscroll-contain">
        <div className="absolute inset-0 -z-10" onClick={onCancel} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#171821] border border-white/[0.08] rounded-xl p-5 sm:p-6 shadow-2xl overflow-hidden"
        >
          {/* Top icon and close button */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                isDanger
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                  : 'bg-[#843C52]/10 border-[#843C52]/25 text-[#843C52]'
              }`}
            >
              {isDanger ? (
                <Trash2 className="w-4 h-4 stroke-[2]" />
              ) : (
                <AlertCircle className="w-4 h-4 stroke-[2]" />
              )}
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Description */}
          <h3 className="text-base sm:text-lg text-white font-medium mb-1.5">
            {title}
          </h3>
          <p className="text-zinc-400 text-xs sm:text-sm font-normal leading-relaxed mb-5">
            {description}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-8 px-4 rounded-lg border border-white/10 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs tracking-wider uppercase transition-colors cursor-pointer"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 h-8 px-4 rounded-full font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-sm ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                  : 'bg-[#843C52] hover:bg-[#992b4a] text-white'
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
