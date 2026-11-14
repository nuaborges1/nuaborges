'use client';

import React from 'react';
import Link from 'next/link';
import { Send, LogOut, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { HeartOutlineIcon } from '@/components/Icons';
import { NotificationCenter } from './NotificationCenter';
import { HelpTriggerButton } from './help/HelpTriggerButton';
import type { AdminTab } from '@/types/admin';

interface AdminHeaderProps {
  hasUnpublished: boolean;
  onPublish: () => void;
  onLogout: () => void;
  isPublishing?: boolean;
  onNavigateTab?: (tab: AdminTab) => void;
}

export function AdminHeader({
  hasUnpublished,
  onPublish,
  onLogout,
  isPublishing = false,
  onNavigateTab,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#14151b] backdrop-blur-xl border-b border-white/[0.06] px-3.5 sm:px-8 py-2.5 select-none">
      <div className="max-w-[80rem] mx-auto flex items-center justify-between gap-3">
        {/* Brand & Status */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 shrink-0 group"
            aria-label="Nua Borges Admin"
          >
            <span className="font-script text-[1.4rem] sm:text-[1.6rem] text-[#f4a7b9] tracking-wide">
              Nua Borges
            </span>
            <HeartOutlineIcon className="w-3.5 h-3.5 text-[#f4a7b9] mb-0.5" />
          </Link>

          <div className="hidden sm:block h-4 w-[1px] bg-white/10" />

          {/* Status Indicator */}
          <div className="flex items-center shrink-0">
            {hasUnpublished ? (
              <button
                type="button"
                onClick={onPublish}
                className="h-7 inline-flex items-center gap-1.5 text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 px-3 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm"
                title="Alterações aguardando publicação. Clique aqui para publicar no site agora!"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Rascunho salvo • Publicar</span>
                <span className="sm:hidden">Publicar</span>
              </button>
            ) : (
              <span
                className="h-7 inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 rounded-full text-xs font-medium tracking-wide"
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
        <div className="flex items-center gap-2 shrink-0">
          <HelpTriggerButton helpId="shell_header" compact />

          {onNavigateTab && <NotificationCenter onNavigateTab={onNavigateTab} />}

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
            title="Abrir o site público em uma nova aba para conferir como os visitantes estão vendo"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span>Ver Site</span>
          </a>

          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="h-8 px-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] active:bg-[#df8fa1] text-zinc-950 font-semibold text-xs transition duration-200 shadow-sm cursor-pointer disabled:opacity-50"
            title="Enviar todas as alterações para o site público no ar"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPublishing ? 'Publicando...' : 'Publicar no Site'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-400 hover:text-rose-300 text-xs font-medium transition-colors cursor-pointer shrink-0"
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
