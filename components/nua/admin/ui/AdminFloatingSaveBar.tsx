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
            className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 max-w-4xl sm:w-auto pointer-events-auto"
          >
            <div className="relative rounded-2xl bg-[#111218]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] px-5 py-3 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 md:gap-8">

              {/* Grupo Esquerdo — Informações e Destaque de Áreas Alteradas */}
              <div className="flex items-center gap-3 sm:gap-3.5 flex-wrap min-w-0">
                {/* Indicador e Texto Principal */}
                <div className="flex items-center gap-2 shrink-0">
                  {publishSuccess ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  ) : isPublishing ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#f4a7b9] animate-spin" />
                  ) : (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                    </span>
                  )}

                  <span className="text-xs font-semibold tracking-wide text-zinc-100 whitespace-nowrap">
                    {publishSuccess
                      ? 'Publicado no site com sucesso!'
                      : isPublishing
                        ? 'Publicando no ar...'
                        : 'Alterações pendentes no rascunho'}
                  </span>
                </div>

                {/* Identificação das áreas modificadas */}
                {!publishSuccess && !isPublishing && modifiedSections.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-zinc-600 font-light hidden lg:inline">•</span>
                    <span className="text-xs text-zinc-400 font-normal whitespace-nowrap">
                      Onde foi alterado:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {modifiedSections.map((sec, idx) => (
                        <button
                          key={`${sec.moduleId}-${sec.selector || idx}`}
                          type="button"
                          onClick={() => onNavigateToModule?.(sec.moduleId, sec.selector)}
                          title={`Clique para ir diretamente até ${sec.label}`}
                          className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 hover:text-amber-100 text-xs font-medium transition-colors cursor-pointer shrink-0"
                        >
                          <span>{sec.label}</span>
                          <ArrowRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alerta de Sub-edição em aberto (ex: pack não concluído) */}
                {isEditingSubView && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-medium bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{subViewWarning || 'Salve ou conclua a edição aberta antes de publicar'}</span>
                  </div>
                )}

                {/* Mensagem de Erro de Publicação se houver */}
                {publishError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-300 font-medium bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{publishError}</span>
                  </div>
                )}
              </div>

              {/* Grupo Direito — Ações (Sem botão de prévia) */}
              <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                {/* Botão Descartar Alterações */}
                {hasUnpublished && !isPublishing && !publishSuccess && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmDiscardOpen(true)}
                    className="h-9 px-4 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-zinc-300 hover:text-rose-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="Descartar rascunho e restaurar conteúdo ao estado atual publicado no site"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Descartar</span>
                  </button>
                )}

                {/* Botão Principal: Salvar e Publicar no Site */}
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={isPublishing || isEditingSubView || (!hasUnpublished && !publishSuccess)}
                  className={`h-9 px-5 rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-2 transition duration-200 shadow-md select-none shrink-0 ${publishSuccess
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                    : isPublishing || isEditingSubView
                      ? 'bg-white/10 text-zinc-400 border border-white/10 cursor-not-allowed opacity-60'
                      : 'bg-[#f4a7b9] hover:bg-[#ffb8c9] active:scale-[0.98] text-zinc-950 shadow-[#f4a7b9]/20 cursor-pointer'
                    }`}
                  title={
                    isEditingSubView
                      ? 'Salve a edição atual antes de publicar'
                      : 'Salvar e publicar todas as alterações no site público'
                  }
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                      <span>Publicando no ar...</span>
                    </>
                  ) : publishSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Publicado no ar!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Salvar e Publicar no Site</span>
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
