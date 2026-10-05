'use client';

import React from 'react';
import Link from 'next/link';
import { Send, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { HeartOutlineIcon } from '@/components/Icons';

interface AdminHeaderProps {
  hasUnpublished: boolean;
  onPublish: () => void;
  onLogout: () => void;
  isPublishing?: boolean;
}

export function AdminHeader({
  hasUnpublished,
  onPublish,
  onLogout,
  isPublishing = false,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-zinc-800/80 px-3.5 sm:px-8 py-3 select-none">
      <div className="max-w-[76rem] mx-auto flex items-center justify-between gap-3">
        {/* Brand & Status */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 shrink-0 group"
            aria-label="Nua Borges Admin"
          >
            <span className="font-script text-[1.5rem] sm:text-[1.75rem] text-[#f4a7b9] tracking-wide">
              Nua Borges
            </span>
            <HeartOutlineIcon className="w-3.5 h-3.5 text-[#f4a7b9] mb-0.5" />
          </Link>

          <div className="hidden sm:block h-4 w-[1px] bg-zinc-800" />

          {/* Status Indicator */}
          <div className="flex items-center shrink-0">
            {hasUnpublished ? (
              <span
                className="inline-flex items-center gap-1.5 text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide"
                title="Rascunho salvo no seu navegador. Clique em 'Publicar no Site' quando quiser que os visitantes vejam as mudanças."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Rascunho salvo • Alterações pendentes</span>
                <span className="sm:hidden">Rascunho salvo</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide"
                title="Seu site público está 100% atualizado com todas as alterações."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="hidden sm:inline">Site no ar atualizado</span>
                <span className="sm:hidden">No ar</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] active:bg-[#df8fa1] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_2px_16px_rgba(244,167,185,0.25)] min-h-[42px] cursor-pointer disabled:opacity-50"
            title="Enviar todas as alterações para o site público no ar"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPublishing ? 'Publicando...' : 'Publicar no Site'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-rose-300 text-xs font-medium transition-colors cursor-pointer shrink-0 min-h-[42px]"
            title="Sair do painel administrativo com segurança"
            aria-label="Sair do painel administrativo"
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
