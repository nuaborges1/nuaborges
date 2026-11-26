/* Vinho maduro / Nua Borges */
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
  Share2,
  CreditCard,
  Sliders,
  Music,
  LogOut,
  ExternalLink,
  X,
  Mail,
  Users,
  Sun,
  ClipboardCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AdminModuleId, ModuleBadgeInfo } from '@/types/admin';
import { ADMIN_MAIL_ENABLED } from '@/app/admin/components/types';
import type { SiteContent } from '@/lib/types';
import { SITE_DATA } from '@/lib/data';
import { resolveMediaUrl } from '@/lib/media';
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
  adminProfile?: 'nua' | 'phdev';
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
  content,
  activeModule,
  onSelectModule,
  badges = {},
  modifiedModuleIds = [],
  subscriptionStatus = 'paid',
  isLocal = false,
  adminProfile = 'nua',
  onLogout,
  isMobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const [avatarFailed, setAvatarFailed] = React.useState(false);

  const rawAvatarUrl =
    content?.gallery?.photos?.find((p) => p.active !== false && !p.blurred && p.imageUrl)?.imageUrl ||
    content?.gallery?.photos?.find((p) => p.active !== false && p.imageUrl)?.imageUrl ||
    content?.about?.photoUrl ||
    SITE_DATA.photos.gallery[0]?.imageUrl ||
    '';
  const avatarSrc = rawAvatarUrl ? resolveMediaUrl(rawAvatarUrl, 'thumb') : '';
  const handleNavClick = (id: AdminModuleId) => {
    onSelectModule(id);
    onCloseMobile();
  };

  const overviewModules: SidebarNavItem[] = [
    {
      id: 'dashboard',
      label: 'Início',
      icon: LayoutDashboard,
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Users,
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

  const [hidePrelaunchFeedback, setHidePrelaunchFeedback] = React.useState(false);

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        setHidePrelaunchFeedback(localStorage.getItem('nua_prelaunch_hide_sidebar') === '1');
      }
    } catch {}
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (typeof detail?.hideFromSidebar === 'boolean') {
        setHidePrelaunchFeedback(detail.hideFromSidebar);
      }
    };
    window.addEventListener('nua_prelaunch_sidebar_updated', onUpdated);
    return () => window.removeEventListener('nua_prelaunch_sidebar_updated', onUpdated);
  }, []);

  const accountModules: SidebarNavItem[] = [
    {
      id: 'mensalidade',
      matchIds: ['mensalidade', 'contratos'],
      label: 'Mensalidade',
      icon: CreditCard,
    },
    ...(adminProfile === 'phdev' && !hidePrelaunchFeedback
      ? [
          {
            id: 'avaliacoes' as AdminModuleId,
            label: 'Avaliações',
            icon: ClipboardCheck,
          },
        ]
      : []),
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
    ...(ADMIN_MAIL_ENABLED
      ? [
          {
            id: 'mail' as AdminModuleId,
            label: 'E-mails',
            icon: Mail,
          },
        ]
      : []),
  ];

  const renderNavGroup = (
    title: string,
    items: SidebarNavItem[],
    isBetaGroup = false
  ) => {
    return (
      <div className="space-y-1">
        <div className="px-2.5 pt-1.5 pb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 font-semibold select-none truncate">
            {title}
          </span>
          {isBetaGroup && (
            <span className="text-[9px] font-mono font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400 border border-white/[0.08] shrink-0">
              Beta
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
                title={isModified ? `${item.label} — possui alterações não publicadas` : item.label}
                className={`w-full group text-left px-2.5 h-8.5 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#843C52]/22 text-white font-medium border border-[#843C52]/45 shadow-sm'
                    : isModified
                    ? 'text-zinc-200 hover:text-white bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.07]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white'
                        : isModified
                        ? 'text-zinc-200'
                        : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                  <span
                    className={`truncate text-xs ${
                      isActive
                        ? 'text-white font-semibold'
                        : isModified
                        ? 'text-zinc-100 font-medium'
                        : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isModified && (
                    <span
                      aria-label="Possui alterações não publicadas"
                      title="Possui alterações não publicadas"
                      className="w-2 h-2 rounded-full bg-[#843C52] ring-2 ring-[#843C52]/35 shrink-0"
                    />
                  )}

                  {showSubWarning ? (
                    <span
                      className={`text-[9px] font-mono font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0 ${
                        subscriptionStatus === 'overdue'
                          ? 'bg-[#843C52]/35 text-zinc-100 border border-[#843C52]/65'
                          : 'bg-white/[0.08] text-zinc-200 border border-white/15'
                      }`}
                    >
                      {subscriptionStatus === 'overdue' ? 'Vencida' : 'Pendente'}
                    </span>
                  ) : badge && (badge.count !== undefined || badge.label) ? (
                    <div>
                      {badge.count !== undefined && badge.count > 0 && (
                        <span
                          className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${
                            badge.variant === 'danger'
                              ? 'bg-[#843C52]/40 text-white border border-[#843C52]/70'
                              : badge.variant === 'warning'
                              ? 'bg-white/[0.1] text-zinc-100 border border-white/15'
                              : 'bg-[#843C52]/30 text-zinc-100 border border-[#843C52]/50'
                          }`}
                        >
                          {badge.count > 99 ? '99+' : badge.count}
                        </span>
                      )}
                      {badge.label && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-zinc-200">
                          {badge.label}
                        </span>
                      )}
                    </div>
                  ) : isActive && !isModified ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
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
    <div className="flex flex-col h-full bg-[#101116] select-none text-white px-2.5 py-3 overflow-hidden">
      {/* Cabeçalho exclusivo do Drawer Mobile */}
      <div className="lg:hidden flex items-center justify-between px-2 pb-3 mb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="font-serif font-medium text-white tracking-[0.14em] text-sm">
            NUA BORGES
          </span>
          <span className="text-[9px] font-mono uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
            PAINEL
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 pr-0.5 custom-scrollbar">
        {renderNavGroup('VISÃO GERAL', overviewModules)}
        <div className="border-t border-white/[0.05] pt-1.5">
          {renderNavGroup('VENDAS E ATENDIMENTO', salesModules)}
        </div>
        <div className="border-t border-white/[0.05] pt-1.5">
          {renderNavGroup('MEU SITE', siteModules)}
        </div>
        <div className="border-t border-white/[0.05] pt-1.5">
          {renderNavGroup('CONTA E SISTEMA', accountModules)}
        </div>
        {isLocal && (
          <div className="border-t border-white/[0.05] pt-1.5">
            {renderNavGroup('LABORATÓRIO', betaModules, true)}
          </div>
        )}
      </div>

      {/* Atalhos Mobile/Tablet + Identidade e Logout no Rodapé */}
      <div className="pt-2.5 border-t border-white/[0.06] mt-auto shrink-0 space-y-1.5">
        <button
          type="button"
          onClick={() => {
            onCloseMobile();
            window.dispatchEvent(new CustomEvent('open_daily_briefing'));
          }}
          className="xl:hidden w-full h-8.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs text-zinc-200 flex items-center justify-between transition cursor-pointer"
        >
          <span>Resumo do Dia</span>
          <Sun className="w-3.5 h-3.5 text-zinc-400" />
        </button>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="md:hidden w-full h-8.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs text-zinc-200 flex items-center justify-between transition"
        >
          <span>Abrir site público</span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </a>

        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-[#14161d] border border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#843C52]/35 border border-[#843C52]/60 flex items-center justify-center font-serif text-[11px] font-bold text-white shrink-0 overflow-hidden">
              {adminProfile === 'phdev' ? (
                'PH'
              ) : avatarSrc && !avatarFailed ? (
                <img
                  src={avatarSrc}
                  alt="Nua Borges"
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                'NB'
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-white block truncate leading-tight">
                {adminProfile === 'phdev' ? 'PHDEV' : 'Nua Borges'}
              </span>
              <span className="text-[10px] text-zinc-400 block truncate leading-tight">
                {adminProfile === 'phdev' ? 'Desenvolvedor' : 'Administradora'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <HelpTriggerButton helpId="shell_sidebar" compact />
            <button
              type="button"
              onClick={onLogout}
              title="Sair do Painel"
              aria-label="Sair do Painel"
              className="h-7 px-2 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
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
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navegação"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 max-w-[85vw] h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] bg-[#101116] shadow-2xl z-10 overflow-hidden"
            >
              {sidebarBody}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
