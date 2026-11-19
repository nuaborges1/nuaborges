/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  Menu,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sun,
} from 'lucide-react';
import { AdminModuleId } from './types';
import { NotificationCenter } from '@/components/nua/admin/NotificationCenter';

interface AdminHeaderProps {
  isMobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  onOpenSpotlight: () => void;
  activeModule: AdminModuleId;
  onSelectModule: (id: AdminModuleId, subAction?: string) => void;
  subscriptionStatus: 'paid' | 'pending' | 'overdue' | 'loading';
  unreadCount: number;
  hasUnpublished: boolean;
  isPublishing: boolean;
  isEditingSubView?: boolean;
  onPublish: () => void;
}

export function AdminHeader({
  isMobileNavOpen,
  onToggleMobileNav,
  onOpenSpotlight,
  activeModule,
  onSelectModule,
  subscriptionStatus,
  unreadCount,
  hasUnpublished,
  isPublishing,
  isEditingSubView = false,
  onPublish,
}: AdminHeaderProps) {
  const isSubActive = activeModule === 'mensalidade' || activeModule === 'contratos';

  return (
    <header className="w-full h-14 shrink-0 bg-[#101116] border-b border-white/[0.08] px-3 sm:px-4 flex items-center justify-between gap-2 z-40 select-none relative">
      {/* Esquerda: Menu Mobile & Identidade */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden w-8 h-8 rounded-lg text-zinc-300 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition cursor-pointer shrink-0"
          aria-label="Abrir menu"
        >
          {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => onSelectModule('dashboard')}
          className="flex items-center gap-2 text-left cursor-pointer group min-w-0"
          title="Ir para a Dashboard"
        >
          <span className="font-serif font-medium text-white group-hover:text-[#843C52] transition-colors tracking-[0.12em] sm:tracking-[0.14em] text-sm sm:text-base whitespace-nowrap">
            NUA BORGES
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 sm:px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-400 border border-white/[0.08] shrink-0">
            ADMIN
          </span>
        </button>
      </div>

      {/* Centro: Barra de Busca Spotlight (⌘K / Ctrl+K) */}
      <div className="hidden md:flex items-center flex-1 max-w-md lg:max-w-lg mx-4">
        <button
          type="button"
          onClick={onOpenSpotlight}
          className="w-full relative flex items-center justify-between h-9 bg-[#171821] hover:bg-[#1e1f2b] border border-white/[0.08] hover:border-[#843C52]/30 rounded-full px-3.5 transition-all duration-200 cursor-pointer group text-left shadow-inner"
          title="Busca rápida no painel (⌘K ou Ctrl+K)"
        >
          <div className="flex items-center gap-2.5 text-xs text-zinc-400 group-hover:text-zinc-200 min-w-0">
            <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#843C52] transition-colors shrink-0" />
            <span className="font-light truncate">
              Buscar conteúdos, mídias, pedidos, clientes...
            </span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-zinc-500 group-hover:text-zinc-300 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Direita: Controles Operacionais (responsivos, sem overflow em 390px) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Busca Mobile */}
        <button
          type="button"
          onClick={onOpenSpotlight}
          className="md:hidden h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          title="Buscar no painel"
          aria-label="Abrir busca rápida"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Mensalidade do Site (Visível sempre que pendente/vencida no mobile, e sempre no desktop) */}
        <button
          type="button"
          onClick={() => onSelectModule('mensalidade')}
          className={`${
            subscriptionStatus === 'overdue' || subscriptionStatus === 'pending'
              ? 'inline-flex'
              : 'hidden sm:inline-flex'
          } h-8 px-2.5 sm:px-3 rounded-full text-xs font-medium transition cursor-pointer items-center gap-1.5 ${
            isSubActive
              ? 'bg-white/[0.12] text-white border border-white/20'
              : subscriptionStatus === 'overdue'
              ? 'bg-rose-500/15 text-rose-200 border border-rose-500/30 hover:bg-rose-500/25'
              : subscriptionStatus === 'pending'
              ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 hover:bg-amber-500/25'
              : 'bg-[#171821] hover:bg-[#20222d] text-zinc-300 border border-white/[0.08]'
          }`}
          title="Mensalidade do site e contrato"
        >
          {subscriptionStatus === 'overdue' || subscriptionStatus === 'pending' ? (
            <AlertCircle
              className={`w-3.5 h-3.5 shrink-0 ${
                subscriptionStatus === 'overdue' ? 'text-rose-400' : 'text-amber-400'
              }`}
            />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <span className="text-[11px] whitespace-nowrap">
            {subscriptionStatus === 'overdue'
              ? 'Mensalidade vencida'
              : subscriptionStatus === 'pending'
              ? 'Mensalidade pendente'
              : 'Mensalidade em dia'}
          </span>
        </button>

        {/* Briefing Diário Matinal da Nay */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open_daily_briefing'))}
          className="hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full bg-[#171821] hover:bg-[#20222d] border border-white/[0.08] hover:border-[#843C52]/30 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
          title="Ver o Briefing do Dia da Nay"
        >
          <Sun className="w-3.5 h-3.5 text-[#843C52]" />
          <span className="text-[11px] whitespace-nowrap">Briefing do Dia</span>
        </button>

        {/* Ver Site */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#171821] hover:bg-[#20222d] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
          title="Abrir site público em nova aba"
        >
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          <span>Ver site</span>
        </a>

        {/* Central de Pedidos e Alertas (Sininho Interativo com Popover de Luxo) */}
        <NotificationCenter
          onNavigateTab={(tab, subAction) => onSelectModule(tab as AdminModuleId, subAction)}
        />
      </div>
    </header>
  );
}
