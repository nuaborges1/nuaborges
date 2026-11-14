'use client';

import React from 'react';
import {
  Menu,
  X,
  Search,
  CreditCard,
  Bell,
  ExternalLink,
  Send,
} from 'lucide-react';
import { AdminModuleId } from './types';

interface AdminHeaderProps {
  isMobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  onOpenSpotlight: () => void;
  activeModule: AdminModuleId;
  onSelectModule: (id: AdminModuleId) => void;
  subscriptionStatus: 'paid' | 'pending' | 'overdue' | 'loading';
  unreadCount: number;
  onOpenPreview: () => void;
  hasUnpublished: boolean;
  isPublishing: boolean;
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
  onPublish,
}: AdminHeaderProps) {
  return (
    <header className="w-full h-14 shrink-0 bg-[#101116] border-b border-white/[0.08] px-4 flex items-center justify-between z-40 select-none">
      {/* Esquerda: Identidade & Menu Mobile */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
          aria-label="Abrir menu"
        >
          {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2">
          <span className="font-serif font-medium text-white tracking-[0.14em] text-base">
            NUA BORGES
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
            ADMIN
          </span>
        </div>
      </div>

      {/* Centro: Barra de Busca Spotlight Inteligente (⌘K / Ctrl+K) */}
      <div className="hidden md:flex items-center flex-1 max-w-lg mx-6">
        <button
          type="button"
          onClick={onOpenSpotlight}
          className="w-full relative flex items-center justify-between h-9 bg-[#171821] hover:bg-[#1e1f2b] border border-white/[0.08] hover:border-[#f4a7b9]/30 rounded-full px-4 transition-all duration-200 cursor-pointer group text-left shadow-inner"
          title="Abrir Spotlight Inteligente (⌘K ou Ctrl+K)"
        >
          <div className="flex items-center gap-2.5 text-xs text-zinc-400 group-hover:text-zinc-200 min-w-0">
            <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#f4a7b9] transition-colors shrink-0" />
            <span className="font-light truncate">O que você procura? Buscar no painel...</span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-zinc-500 group-hover:text-zinc-300 bg-white/[0.04] group-hover:bg-white/[0.08] border border-white/[0.08] px-1.5 py-0.5 rounded shadow-sm transition-colors shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Direita: Ações Rápidas Executivas */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Botão de Busca Mobile */}
        <button
          type="button"
          onClick={onOpenSpotlight}
          className="md:hidden relative h-8 w-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          title="Buscar no Admin (Spotlight)"
          aria-label="Abrir Spotlight Inteligente"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* MENSALIDADE DO SITE (no Navbar) */}
        <button
          type="button"
          onClick={() => onSelectModule('mensalidade')}
          className={`h-8 px-3 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-2 ${
            activeModule === 'mensalidade'
              ? 'bg-[#f4a7b9] text-zinc-950 font-semibold shadow-sm'
              : 'bg-[#171821] hover:bg-[#20222d] text-zinc-300 border border-white/[0.08] hover:border-white/15'
          }`}
          title="Faturas técnicas de hospedagem (Mercado Pago)"
        >
          <CreditCard className={`w-3.5 h-3.5 ${activeModule === 'mensalidade' ? 'text-zinc-950' : 'text-[#f4a7b9]'}`} />
          <span className="hidden sm:inline">Mensalidade:</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                subscriptionStatus === 'overdue'
                  ? 'bg-rose-500 animate-pulse'
                  : subscriptionStatus === 'pending'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span>
              {subscriptionStatus === 'overdue'
                ? 'Vencida'
                : subscriptionStatus === 'pending'
                ? 'Pendente'
                : 'Em dia'}
            </span>
          </span>
        </button>

        {/* Central de Alertas */}
        <button
          type="button"
          onClick={() => onSelectModule('alertas')}
          className={`relative h-8 w-8 rounded-full flex items-center justify-center transition cursor-pointer ${
            activeModule === 'alertas'
              ? 'bg-white/10 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Central de Alertas e Notificações"
          aria-label="Ver pedidos recebidos"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>

        {/* Link Ver Site */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#171821] hover:bg-[#20222d] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
          title="Abrir site público em nova aba"
        >
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          <span>Ver Site</span>
        </a>

        {/* Status de Publicação / Botão Publicar */}
        {hasUnpublished ? (
          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="h-8 px-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition cursor-pointer disabled:opacity-50 shadow-sm flex items-center gap-1.5"
            title="Colocar no ar as alterações que estão no rascunho"
          >
            <Send className="w-3 h-3" />
            <span>{isPublishing ? 'Publicando...' : 'Publicar alterações'}</span>
          </button>
        ) : (
          <div className="hidden lg:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Site atualizado</span>
          </div>
        )}

        {/* Avatar Monograma de Usuário */}
        <div className="w-8 h-8 rounded-full bg-[#171821] border border-white/10 flex items-center justify-center font-serif text-xs font-bold text-[#f4a7b9] shadow-inner shrink-0 ml-1">
          NB
        </div>
      </div>
    </header>
  );
}
