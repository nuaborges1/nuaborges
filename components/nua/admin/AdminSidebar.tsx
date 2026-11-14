'use client';

import React from 'react';
import {
  LayoutDashboard,
  PackageCheck,
  ShoppingBag,
  Camera,
  Video,
  TrendingUp,
  Images,
  Home,
  Search,
  Share2,
  CreditCard,
  KeyRound,
  Sliders,
  Music,
  LogOut,
  ExternalLink,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AdminModuleId, ModuleBadgeInfo } from '@/types/admin';
import type { SiteContent } from '@/lib/types';
import { HelpTriggerButton } from './help/HelpTriggerButton';

export type { AdminModuleId, ModuleBadgeInfo };

interface AdminSidebarProps {
  content?: SiteContent | null;
  activeModule: AdminModuleId;
  onSelectModule: (moduleId: AdminModuleId, subAction?: string) => void;
  badges?: Partial<Record<AdminModuleId, ModuleBadgeInfo>>;
  modifiedModuleIds?: AdminModuleId[];
  subscriptionStatus?: 'paid' | 'pending' | 'overdue' | 'loading';
  isLocal?: boolean;
  onNewContent?: () => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
}

interface SidebarNavItem {
  id: AdminModuleId;
  matchIds?: AdminModuleId[];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AdminSidebar({
  activeModule,
  onSelectModule,
  badges = {},
  modifiedModuleIds = [],
  subscriptionStatus = 'paid',
  isLocal = false,
  onLogout,
  isMobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const handleNavClick = (id: AdminModuleId) => {
    onSelectModule(id);
    onCloseMobile();
  };

  const overviewModules: SidebarNavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'historico',
      label: 'Histórico de Pedidos',
      icon: PackageCheck,
    },
  ];

  const salesModules: SidebarNavItem[] = [
    {
      id: 'conteudos',
      label: 'Conteúdos & Packs',
      icon: ShoppingBag,
    },
    {
      id: 'personalizados',
      label: 'Personalizados',
      icon: Camera,
    },
    {
      id: 'chamadas',
      label: 'Chamadas VIP',
      icon: Video,
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: TrendingUp,
    },
  ];

  const siteModules: SidebarNavItem[] = [
    {
      id: 'midias',
      label: 'Biblioteca de Mídias',
      icon: Images,
    },
    {
      id: 'vitrine',
      label: 'Editar Meu Site',
      icon: Home,
    },
    {
      id: 'conexoes',
      label: 'Redes e Contato',
      icon: Share2,
    },
  ];

  const accountModules: SidebarNavItem[] = [
    {
      id: 'mensalidade',
      matchIds: ['mensalidade', 'contratos'],
      label: 'Mensalidade e Contrato',
      icon: CreditCard,
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: Sliders,
    },
  ];

  const betaModules: SidebarNavItem[] = [
    {
      id: 'beta_player',
      label: 'Player de Áudio',
      icon: Music,
    },
  ];

  const renderNavGroup = (
    title: string,
    items: SidebarNavItem[],
    isBetaGroup = false
  ) => {
    return (
      <div className="space-y-1">
        <div className="px-3 pt-2 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-500 font-semibold select-none">
            {title}
          </span>
          {isBetaGroup && (
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
              LOCAL
            </span>
          )}
        </div>

        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchIds
              ? item.matchIds.includes(activeModule)
              : activeModule === item.id;
            const isModified = Boolean(
              modifiedModuleIds.includes(item.id) ||
              (item.matchIds && item.matchIds.some((id) => modifiedModuleIds.includes(id)))
            );
            const badge = badges[item.id];
            const showSubWarning =
              item.id === 'mensalidade' &&
              (subscriptionStatus === 'overdue' || subscriptionStatus === 'pending');

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNavClick(item.id)}
                className={`w-full group text-left px-3 h-9 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-[#f4a7b9]/15 via-white/[0.06] to-transparent text-white font-medium border border-[#f4a7b9]/25 shadow-sm'
                    : isModified
                    ? 'text-zinc-300 hover:text-white hover:bg-white/[0.04] border border-amber-500/20 bg-amber-500/[0.03]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-[#f4a7b9]'
                        : isModified
                        ? 'text-amber-400'
                        : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                  <span
                    className={`truncate text-xs ${
                      isActive
                        ? 'text-white font-semibold'
                        : isModified
                        ? 'text-zinc-200 group-hover:text-white font-medium'
                        : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isModified && (
                    <span
                      title="Possui alterações não publicadas no rascunho"
                      className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Alterado
                    </span>
                  )}

                  {showSubWarning ? (
                    <span
                      className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${
                        subscriptionStatus === 'overdue'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {subscriptionStatus === 'overdue' ? 'Vencida' : 'Pendente'}
                    </span>
                  ) : badge && (badge.count !== undefined || badge.label) ? (
                    <div>
                      {badge.count !== undefined && badge.count > 0 && (
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            badge.variant === 'danger'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : badge.variant === 'warning'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-[#f4a7b9]/20 text-[#f4a7b9] border border-[#f4a7b9]/30'
                          }`}
                        >
                          {badge.count > 99 ? '99+' : badge.count}
                        </span>
                      )}
                      {badge.label && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                          {badge.label}
                        </span>
                      )}
                    </div>
                  ) : isActive && !isModified ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] shadow-[0_0_6px_rgba(244,167,185,0.7)] shrink-0" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const sidebarBody = (
    <div className="flex flex-col h-full bg-[#101116] select-none text-white px-3 py-3.5 overflow-hidden">
      {/* Cabeçalho exclusivo do Drawer Mobile */}
      <div className="lg:hidden flex items-center justify-between px-2 pb-3 mb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="font-serif font-medium text-white tracking-[0.14em] text-sm">
            NUA BORGES
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
            ADMIN
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="w-8 h-8 rounded-lg bg-white/[0.05] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
          aria-label="Fechar menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grupos de Navegação */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {renderNavGroup('VISÃO GERAL', overviewModules)}
        <div className="border-t border-white/[0.04] pt-1.5">
          {renderNavGroup('VENDAS E ATENDIMENTO', salesModules)}
        </div>
        <div className="border-t border-white/[0.04] pt-1.5">
          {renderNavGroup('MEU SITE', siteModules)}
        </div>
        <div className="border-t border-white/[0.04] pt-1.5">
          {renderNavGroup('CONTA E SISTEMA', accountModules)}
        </div>
        {isLocal && (
          <div className="border-t border-white/[0.04] pt-1.5">
            {renderNavGroup('BETA LOCAL', betaModules, true)}
          </div>
        )}
      </div>

      {/* Atalho Ver Site no Mobile + Identidade e Logout no Rodapé */}
      <div className="pt-3 border-t border-white/[0.06] mt-auto shrink-0 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            Menu Principal
          </span>
          <HelpTriggerButton helpId="shell_sidebar" compact />
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="sm:hidden w-full h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs text-zinc-300 flex items-center justify-between transition"
        >
          <span>Abrir site público</span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </a>

        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-[#15161e] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#1e202b] border border-[#f4a7b9]/30 flex items-center justify-center font-serif text-xs font-bold text-[#f4a7b9] shrink-0">
              NB
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-white block truncate">Nua Borges</span>
              <span className="text-[10px] text-zinc-400 block truncate">Administradora</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Sair do Painel"
            aria-label="Sair do Painel"
            className="h-8 px-2.5 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-full border-r border-white/[0.06] bg-[#101116] overflow-hidden select-none">
        {sidebarBody}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-64 max-w-[82vw] h-full shadow-2xl z-10 overflow-hidden"
            >
              {sidebarBody}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
