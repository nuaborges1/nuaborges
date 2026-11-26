'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Loader2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import type { AdminModuleId } from '@/types/admin';
import type { ModifiedSectionInfo } from '@/lib/content/diff';
import { ConfirmModal } from '../ConfirmModal';

export interface AdminFloatingSaveBarProps {
  hasUnpublished: boolean;
  isPublishing: boolean;
  modifiedSections: ModifiedSectionInfo[];
  onPublish: () => void;
  onDiscard: () => void;
  onNavigateToModule?: (moduleId: AdminModuleId, selector?: string) => void;
  isEditingSubView?: boolean;
  subViewWarning?: string;
  publishSuccess?: boolean;
  publishError?: string | null;
}

export function AdminFloatingSaveBar({
  hasUnpublished,
  isPublishing,
  modifiedSections,
  onPublish,
  onDiscard,
  onNavigateToModule,
  isEditingSubView = false,
  subViewWarning,
  publishSuccess = false,
  publishError = null,
}: AdminFloatingSaveBarProps) {
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);

  // Exibe a barra sempre que houver alterações pendentes, salvamento/publicação em andamento, feedback ou erro
  const isVisible = hasUnpublished || isPublishing || publishSuccess || Boolean(publishError);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-3 sm:inset-x-auto sm:right-6 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-4 z-40 pointer-events-auto"
          >
            <div className="relative rounded-2xl sm:rounded-full bg-[#111218]/96 backdrop-blur-md border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.85)] px-3.5 py-2 flex items-center justify-between gap-2.5 sm:gap-3 text-xs">

              {/* Informações e Indicador */}
              <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none">
                <div className="flex items-center gap-2 min-w-0">
                  {publishError ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
                  ) : publishSuccess ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0" />
                  ) : isPublishing ? (
                    <Loader2 className="w-3.5 h-3.5 text-zinc-200 animate-spin shrink-0" />
                  ) : (
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                    </span>
                  )}

                  <span className="text-[11px] font-medium tracking-wide text-zinc-200 truncate">
                    {publishError
                      ? 'Falha ao publicar'
                      : publishSuccess
                        ? 'Publicado no site'
                        : isPublishing
                          ? 'Publicando...'
                          : modifiedSections.length > 0
                            ? `${modifiedSections.length} ${modifiedSections.length === 1 ? 'alteração' : 'alterações'}`
                            : 'Rascunho'}
                  </span>
                </div>

                {/* Alerta de Sub-edição em aberto (ex: pack não concluído) */}
                {isEditingSubView && (
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-amber-300 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[120px]">{subViewWarning || 'Edição aberta'}</span>
                  </div>
                )}
              </div>

              {/* Ações Rápidas */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Botão Descartar Alterações */}
                {hasUnpublished && !isPublishing && !publishSuccess && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmDiscardOpen(true)}
                    className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:h-8 px-2.5 rounded-full bg-white/[0.05] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-zinc-300 hover:text-rose-200 text-[11px] font-medium inline-flex items-center justify-center gap-1 transition cursor-pointer touch-manipulation"
                    title="Descartar rascunho e voltar ao que está no ar"
                    aria-label="Descartar alterações"
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">Descartar</span>
                  </button>
                )}

                {/* Botão Principal: Salvar e Publicar no Site */}
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={isPublishing || isEditingSubView || (!hasUnpublished && !publishSuccess && !publishError)}
                  className={`min-h-[40px] sm:min-h-0 sm:h-8 px-4 sm:px-3.5 rounded-full font-medium text-xs sm:text-[11px] inline-flex items-center justify-center gap-1.5 transition duration-200 shadow-sm select-none shrink-0 touch-manipulation ${
                    publishSuccess
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : isPublishing || isEditingSubView
                        ? 'bg-white/10 text-zinc-400 border border-white/10 cursor-not-allowed opacity-60'
                        : 'bg-[#843C52] hover:bg-[#99455E] active:scale-[0.98] text-white font-semibold cursor-pointer border border-[#843C52]'
                  }`}
                  title={
                    isEditingSubView
                      ? 'Salve a edição atual antes de publicar'
                      : 'Salvar e publicar todas as alterações no site público'
                  }
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-white" />
                      <span>Publicando...</span>
                    </>
                  ) : publishSuccess ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>No ar!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Publicar</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Descarte */}
      <ConfirmModal
        isOpen={isConfirmDiscardOpen}
        title="Descartar alterações do rascunho?"
        description="Todas as alterações não publicadas serão canceladas e o rascunho voltará exatamente ao que está no ar no site hoje. Esta ação não pode ser desfeita."
        confirmText="Sim, Descartar Tudo"
        cancelText="Continuar Editando"
        variant="danger"
        onConfirm={() => {
          setIsConfirmDiscardOpen(false);
          onDiscard();
        }}
        onCancel={() => setIsConfirmDiscardOpen(false)}
      />
    </>
  );
}
