'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Copy, Check, Trash2, AlertTriangle } from 'lucide-react';
import { MediaUsageRecord } from '@/lib/mediaUsage';

interface MediaViewerActionsProps {
  isFavorite: boolean;
  copiedLink: boolean;
  showDeleteConfirm: boolean;
  usages: MediaUsageRecord[];
  onToggleFavorite: () => void;
  onCopyLink: () => void;
  onOpenDeleteConfirm: () => void;
  onCancelDeleteConfirm: () => void;
  onConfirmDelete: () => void;
}

export function MediaViewerActions({
  isFavorite,
  copiedLink,
  showDeleteConfirm,
  usages,
  onToggleFavorite,
  onCopyLink,
  onOpenDeleteConfirm,
  onCancelDeleteConfirm,
  onConfirmDelete,
}: MediaViewerActionsProps) {
  return (
    <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`flex-1 inline-flex items-center justify-center gap-2 h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
            isFavorite
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-white/[0.06] border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              isFavorite ? 'fill-rose-400 text-rose-400' : 'text-zinc-400'
            }`}
          />
          <span>{isFavorite ? 'Favoritada' : 'Favoritar'}</span>
        </button>

        <button
          type="button"
          onClick={onCopyLink}
          className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Copiar link"
        >
          {copiedLink ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenDeleteConfirm}
          className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 text-xs font-medium inline-flex items-center transition-colors cursor-pointer"
          title="Excluir do acervo"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Safe Delete Warning Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/20 space-y-2 mt-2"
          >
            <div className="flex items-start gap-2 text-rose-300 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="block font-semibold">Excluir esta foto do acervo?</span>
                {usages.length > 0 ? (
                  <p className="text-zinc-300 text-[11px] mt-1 font-light leading-relaxed">
                    Esta mídia ainda está sendo usada em{' '}
                    <strong className="text-rose-300 font-semibold">
                      {usages.map((u) => u.label).join(', ')}
                    </strong>
                    . Remova-a desses locais primeiro. O arquivo permanece no acervo enquanto estiver em uso.
                  </p>
                ) : (
                  <p className="text-zinc-300 text-[11px] mt-1 font-light leading-relaxed">
                    Ela será removida do acervo. Esta ação também pode apagar o arquivo guardado.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCancelDeleteConfirm}
                className="h-7 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-zinc-300 border border-white/10 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={usages.length > 0}
                className="h-7 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                {usages.length > 0 ? 'Ainda está em uso' : 'Excluir do acervo'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
