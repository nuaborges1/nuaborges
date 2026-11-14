'use client';

import React from 'react';
import {
  ShoppingBag,
  Camera,
  Video,
  Home,
  Share2,
  Search,
  TrendingUp,
  FileText,
  KeyRound,
  Sliders,
  Bell,
  Film,
  Music,
  Brain,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AdminModuleId, ModuleBadgeInfo } from '@/types/admin';
import type { SiteContent } from '@/lib/types';

export type { AdminModuleId, ModuleBadgeInfo };

interface AdminSidebarProps {
  content?: SiteContent | null;
  activeModule: AdminModuleId;
  onSelectModule: (moduleId: AdminModuleId) => void;
  badges?: Partial<Record<AdminModuleId, ModuleBadgeInfo>>;
  onNewContent?: () => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
}

export function AdminSidebar({
  content,
  activeModule,
  onSelectModule,
  badges = {},
  onLogout,
  isMobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const configuredModules = content?.adminUi?.modules ?? [];
  const configuredLabel = (id: AdminModuleId, fallback: string): string =>
    configuredModules.find((module) => module.id === id)?.label || fallback;
  const handleNavClick = (id: AdminModuleId) => {
    onSelectModule(id);
    onCloseMobile();
  };

  const commercialModules: { id: AdminModuleId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'conteudos',
      label: configuredLabel('conteudos', 'Conteúdos & Packs'),
      icon: ShoppingBag,
    },
    {
      id: 'personalizados',
      label: configuredLabel('personalizados', 'Pedidos personalizados'),
      icon: Camera,
    },
    {
      id: 'chamadas',
      label: configuredLabel('chamadas', 'Chamadas VIP'),
      icon: Video,
    },
  ];

  const siteModules: { id: AdminModuleId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'vitrine',
      label: configuredLabel('vitrine', 'Editar meu site'),
      icon: Home,
    },
    {
      id: 'seo',
      label: configuredLabel('seo', 'Divulgação & SEO'),
      icon: Search,
    },
    {
      id: 'conexoes',
      label: configuredLabel('conexoes', 'Redes e contato'),
      icon: Share2,
    },
  ];

  const managementModules: { id: AdminModuleId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'financeiro',
      label: configuredLabel('financeiro', 'Financeiro'),
      icon: TrendingUp,
    },
    {
      id: 'contratos',
      label: configuredLabel('contratos', 'Contratos'),
      icon: FileText,
    },
    {
      id: 'cofre',
      label: configuredLabel('cofre', 'Acessos e senhas'),
      icon: KeyRound,
    },
    {
      id: 'configuracoes',
      label: configuredLabel('configuracoes', 'Configurações'),
      icon: Sliders,
    },
    {
      id: 'mensalidade',
      label: configuredLabel('mensalidade', 'Mensalidade do site'),
      icon: FileText,
    },
  ];

  const betaModules: { id: AdminModuleId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'beta_player',
      label: configuredLabel('beta_player', 'Player de Áudio'),
      icon: Music,
    },
    {
      id: 'beta_ia',
      label: configuredLabel('beta_ia', 'Assistente Nua IA'),
      icon: Brain,
    },
  ];

  const renderNavGroup = (
    title: string,
    items: typeof commercialModules,
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
              BETA
            </span>
          )}
        </div>

        <div className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            const badge = badges[item.id];

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNavClick(item.id)}
                className={`w-full group text-left px-3 h-10 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-white/[0.08] text-white font-medium border border-white/[0.06] shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#f4a7b9]' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                  <span className={`truncate text-xs ${isActive ? 'text-white font-semibold' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                    {item.label}
                  </span>
                </div>

                {badge && (badge.count !== undefined || badge.label) ? (
                  <div className="shrink-0 ml-2">
                    {badge.count !== undefined && badge.count > 0 && (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          badge.variant === 'danger'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/25'
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
                ) : isBetaGroup ? (
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-400 shrink-0 ml-2">
                    DEV
                  </span>
                ) : (
                  isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] shadow-[0_0_6px_rgba(244,167,185,0.7)] shrink-0 ml-2" />
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const sidebarBody = (
    <div className="flex flex-col h-full bg-[#101116] select-none text-white px-3 py-4 overflow-hidden">
      {/* Grupos de Navegação com scroll suave para nunca cortar itens em nenhuma tela */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {renderNavGroup('COMECE AQUI', [
          { id: 'alertas', label: configuredLabel('alertas', 'Pedidos recebidos'), icon: Bell },
        ])}
        {renderNavGroup('VENDER E ATENDER', commercialModules)}
        <div className="border-t border-white/[0.04] pt-2">
          {renderNavGroup('MEU SITE', siteModules)}
        </div>
        <div className="border-t border-white/[0.04] pt-2">
          {renderNavGroup('GESTÃO & SISTEMA', managementModules)}
        </div>
        <div className="border-t border-white/[0.04] pt-2">
          {renderNavGroup('FERRAMENTAS DEV', betaModules, true)}
        </div>
      </div>

      {/* Rodapé Fixo do Sidebar */}
      <div className="pt-3 border-t border-white/[0.06] mt-auto shrink-0">
        <button
          type="button"
          onClick={onLogout}
          className="w-full h-10 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center gap-3 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-zinc-500 group-hover:text-rose-400" />
          <span>Sair do Painel</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar Fixo (Sem scroll) */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 h-full border-r border-white/[0.06] bg-[#101116] overflow-hidden select-none">
        {sidebarBody}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Drawer Content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10 overflow-hidden"
            >
              {sidebarBody}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

