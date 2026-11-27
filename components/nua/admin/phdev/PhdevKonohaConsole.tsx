'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FolderArchive,
  LayoutGrid,
  LogOut,
  Menu,
  RefreshCw,
  ShieldAlert,
  Sliders,
  X,
} from 'lucide-react';
import type { ContainmentProtocol } from '@/functions/api/_central/containment';
import type { SiteContent } from '@/lib/types';
import { getPublicApiUrl } from '@/lib/contentStore';
import type { AdminModuleId } from '@/app/admin/components/types';
import {
  HAGOROMO_AUTHORITY,
  KONOHA_ASSETS,
  OFFICIAL_PROTOCOLS,
  SEMANTIC_STATUS_STYLES,
  getOfficialProtocolById,
} from '@/lib/phdev/konohagakure/protocols';
import {
  deriveOperationalBanner,
  deriveProtocolRuntime,
  formatBrTimestamp,
  getShinobiGreeting,
} from '@/lib/phdev/konohagakure/verbalIdentity';
import type {
  OfficialProtocolId,
  PhdevNavSectionId,
  ProtocolActivityFeed,
  ProtocolPageId,
  ProtocolVisualIdentity,
  SystemControlSnapshot,
} from '@/lib/phdev/konohagakure/types';
import { ConfiguracoesModule } from '../ConfiguracoesModule';
import { PrelaunchFeedbackModule } from '../PrelaunchFeedbackModule';
import { HelpModalProvider } from '../help/HelpModalContext';
import { KonohaBackdrop } from './KonohaBackdrop';
import { KonohaOperationalBanner } from './KonohaOperationalBanner';
import { HagoromoAuthorityCard } from './HagoromoAuthorityCard';
import { ProtocolCard } from './ProtocolCard';
import { PhdevMonitoringView } from './PhdevMonitoringView';
import { PhdevContainmentHub } from './PhdevContainmentHub';
import { PhdevMediaArchiveView } from './PhdevMediaArchiveView';
import { ProtocolDetailPage } from './ProtocolDetailPage';
import { HagoromoDetailPage } from './HagoromoDetailPage';
import './konohagakure.css';

interface PhdevKonohaConsoleProps {
  content: SiteContent;
  activeModule: AdminModuleId;
  onSelectModule: (id: AdminModuleId, subAction?: string) => void;
  onLogout: () => void;
  adminNotice?: { type: 'success' | 'error'; message: string } | null;
  nuaPresence?: {
    online: boolean;
    module?: string;
    moduleLabel?: string;
    pathname?: string;
  } | null;
}

const NAV_ITEMS: ReadonlyArray<{
  id: Exclude<PhdevNavSectionId, 'protocol'>;
  label: string;
  slug: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Protocolos', slug: 'protocolos', icon: LayoutGrid },
  { id: 'containment', label: 'Contenções', slug: 'contencoes', icon: ShieldAlert },
  { id: 'monitoring', label: 'Monitoramento', slug: 'diagnostico', icon: Activity },
  { id: 'library', label: 'Biblioteca', slug: 'biblioteca', icon: FolderArchive },
  { id: 'avaliacoes', label: 'Avaliações', slug: 'avaliacoes', icon: ClipboardCheck },
  { id: 'configuracoes', label: 'Configurações', slug: 'configuracoes', icon: Sliders },
];

const PROTOCOL_GROUPS: ReadonlyArray<{
  id: string;
  title: string;
  subtitle: string;
  ids: readonly OfficialProtocolId[];
}> = [
  {
    id: 'core',
    title: 'Defesa, Acesso & Finanças',
    subtitle: 'Proteção de borda, separação NUA × PHDEV e integridade comercial',
    ids: ['kakashi', 'minato', 'kakuzu'],
  },
  {
    id: 'ops',
    title: 'Observabilidade, Engenharia & Recuperação',
    subtitle: 'Diagnóstico 360°, publicação e filas automáticas do Cofre',
    ids: ['neji', 'tobirama', 'naruto'],
  },
  {
    id: 'containment',
    title: 'Contenção & Resposta a Incidentes',
    subtitle: 'Operam de forma independente · encerrar um preserva os demais',
    ids: ['itachi', 'madara', 'kaguya'],
  },
];

function resolveProtocolId(raw?: string | null): ProtocolPageId | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (clean === 'hagoromo') return 'hagoromo';
  return getOfficialProtocolById(clean)?.id ?? null;
}

function getBasePrefix(pathname: string): string {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return '/admin';
  if (pathname === '/admingeral' || pathname.startsWith('/admingeral/')) return '/admingeral';
  return '';
}

function parseRouteFromLocation(activeModule: AdminModuleId): {
  section: PhdevNavSectionId;
  protocolPageId: ProtocolPageId | null;
} {
  if (typeof window === 'undefined') {
    return {
      section: activeModule === 'avaliacoes' ? 'avaliacoes' : 'overview',
      protocolPageId: null,
    };
  }

  const pathname = window.location.pathname;
  const prefix = getBasePrefix(pathname);
  const relative = (prefix ? pathname.slice(prefix.length) : pathname).replace(/^\/+|\/+$/g, '');
  const parts = relative ? relative.split('/') : [];

  // Slug limpo: /admin/protocolos/<slug> ou /protocolos/<slug>
  if (parts[0] === 'protocolos' && parts[1]) {
    const proto = resolveProtocolId(parts[1]);
    if (proto) return { section: 'protocol', protocolPageId: proto };
  }
  if (parts[0] === 'protocolos') return { section: 'overview', protocolPageId: null };
  if (parts[0] === 'contencoes') return { section: 'containment', protocolPageId: null };
  if (parts[0] === 'diagnostico' || parts[0] === 'monitoramento') return { section: 'monitoring', protocolPageId: null };
  if (parts[0] === 'biblioteca') return { section: 'library', protocolPageId: null };
  if (parts[0] === 'avaliacoes') return { section: 'avaliacoes', protocolPageId: null };
  if (parts[0] === 'configuracoes') return { section: 'configuracoes', protocolPageId: null };

  // Compatibilidade caso alguém chegue por ?protocolo= (migra para slug limpo)
  const queryProto = resolveProtocolId(new URLSearchParams(window.location.search).get('protocolo'));
  if (queryProto) return { section: 'protocol', protocolPageId: queryProto };

  if (activeModule === 'avaliacoes') return { section: 'avaliacoes', protocolPageId: null };
  return { section: 'overview', protocolPageId: null };
}

function buildCleanPhdevPath(
  section: PhdevNavSectionId,
  protocolPageId: ProtocolPageId | null,
): string {
  if (typeof window === 'undefined') return '/admin/protocolos';
  const prefix = getBasePrefix(window.location.pathname);
  if (section === 'protocol' && protocolPageId) {
    return `${prefix}/protocolos/${protocolPageId}`;
  }
  const nav = NAV_ITEMS.find((item) => item.id === section);
  return `${prefix}/${nav ? nav.slug : 'protocolos'}`;
}

function syncPhdevUrl(
  section: PhdevNavSectionId,
  protocolPageId: ProtocolPageId | null,
  replace = false,
) {
  if (typeof window === 'undefined') return;
  try {
    const targetPath = buildCleanPhdevPath(section, protocolPageId);
    const currentFull = `${window.location.pathname}${window.location.search}`;
    if (currentFull === targetPath) return;
    if (replace) {
      window.history.replaceState({ phdevSection: section, phdevProtocol: protocolPageId }, '', targetPath);
    } else {
      window.history.pushState({ phdevSection: section, phdevProtocol: protocolPageId }, '', targetPath);
    }
  } catch {
    // Em ambientes de teste sem history mutável, ignora silenciosamente.
  }
}

export function PhdevKonohaConsole({
  content,
  activeModule,
  onLogout,
  adminNotice,
  nuaPresence,
}: PhdevKonohaConsoleProps) {
  const initialRoute = useMemo(() => parseRouteFromLocation(activeModule), [activeModule]);
  const [activeSection, setActiveSection] = useState<PhdevNavSectionId>(initialRoute.section);
  const [selectedProtocolPage, setSelectedProtocolPage] = useState<ProtocolPageId | null>(
    initialRoute.protocolPageId,
  );
  const [selectedContainment, setSelectedContainment] = useState<ContainmentProtocol>('itachi');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [snapshot, setSnapshot] = useState<SystemControlSnapshot | null>(null);
  const [activityFeed, setActivityFeed] = useState<ProtocolActivityFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string>(() => getShinobiGreeting());

  useEffect(() => {
    setGreeting(getShinobiGreeting(new Date()));
  }, []);

  // Normaliza URL inicial (ex: /admin ou ?protocolo=kakashi -> /admin/protocolos ou /admin/protocolos/kakashi)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasLegacyQuery = new URLSearchParams(window.location.search).has('protocolo');
    const isLegacyConfigPath =
      window.location.pathname.endsWith('/dashboard') ||
      window.location.pathname === '/admin' ||
      window.location.pathname === '/admin/';
    if (hasLegacyQuery || isLegacyConfigPath) {
      syncPhdevUrl(activeSection, selectedProtocolPage, true);
    }
  }, [activeSection, selectedProtocolPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const next = parseRouteFromLocation(activeModule);
      setActiveSection(next.section);
      setSelectedProtocolPage(next.protocolPageId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeModule]);

  const fetchSystemState = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    const apiBase = getPublicApiUrl();
    try {
      const [systemRes, activityRes] = await Promise.all([
        fetch(`${apiBase}/api/control/system`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal,
        }),
        fetch(`${apiBase}/api/control/activity?limit=150`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal,
        }).catch(() => null),
      ]);

      if (!systemRes.ok) {
        const body = await systemRes.json().catch(() => ({}));
        throw new Error(body?.error || `Falha ao consultar /api/control/system (HTTP ${systemRes.status}).`);
      }
      const data: SystemControlSnapshot = await systemRes.json();
      let parsedActivity: ProtocolActivityFeed | null = null;
      if (activityRes && activityRes.ok) {
        parsedActivity = (await activityRes.json().catch(() => null)) as ProtocolActivityFeed | null;
      }

      if (!signal?.aborted) {
        setSnapshot(data);
        if (parsedActivity && Array.isArray(parsedActivity.events)) {
          setActivityFeed(parsedActivity);
        }
        setLastCheckedAt(new Date().toISOString());
      }
    } catch (err) {
      if (!signal?.aborted) {
        setSnapshot(null);
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Consulta ao controle técnico indisponível neste ambiente.',
        );
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchSystemState(controller.signal);
    return () => controller.abort();
  }, [fetchSystemState]);

  const handleSelectProtocolPage = useCallback((pageId: ProtocolPageId) => {
    setSelectedProtocolPage(pageId);
    setActiveSection('protocol');
    if (pageId === 'itachi' || pageId === 'madara' || pageId === 'kaguya') {
      setSelectedContainment(pageId);
    }
    setIsMobileSidebarOpen(false);
    syncPhdevUrl('protocol', pageId);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleNavigate = useCallback(
    (
      section: PhdevNavSectionId,
      protocol?: ContainmentProtocol,
      protocolPageId?: ProtocolPageId,
    ) => {
      if (section === 'protocol' && protocolPageId) {
        handleSelectProtocolPage(protocolPageId);
        return;
      }
      setActiveSection(section);
      setSelectedProtocolPage(null);
      if (protocol) setSelectedContainment(protocol);
      setIsMobileSidebarOpen(false);
      syncPhdevUrl(section, null);
    },
    [handleSelectProtocolPage],
  );

  const handleOpenProtocol = useCallback(
    (protocol: ProtocolVisualIdentity) => {
      handleSelectProtocolPage(protocol.id);
    },
    [handleSelectProtocolPage],
  );

  const banner = useMemo(
    () => deriveOperationalBanner(snapshot, loadError, lastCheckedAt),
    [snapshot, loadError, lastCheckedAt],
  );

  const headerStatus = useMemo(() => {
    const style = SEMANTIC_STATUS_STYLES[banner.tone];
    const label =
      banner.kind === 'pain'
        ? 'Incidente crítico'
        : banner.kind === 'containment'
          ? 'Contenção ativa'
          : banner.kind === 'recovery'
            ? 'Em recuperação'
            : banner.kind === 'peace'
              ? 'Verificado'
              : 'Aguardando verificação';
    return { style, label };
  }, [banner.kind, banner.tone]);

  const activeProtocolMeta = useMemo(() => {
    if (activeSection !== 'protocol' || !selectedProtocolPage) return null;
    if (selectedProtocolPage === 'hagoromo') return null;
    return getOfficialProtocolById(selectedProtocolPage) ?? null;
  }, [activeSection, selectedProtocolPage]);

  const backdropAccentHex =
    activeSection === 'protocol'
      ? selectedProtocolPage === 'hagoromo'
        ? HAGOROMO_AUTHORITY.accentHex
        : activeProtocolMeta?.accentHex
      : undefined;

  const isCriticalMode = banner.kind === 'pain';

  const sidebarContent = (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[#090b11]/90 backdrop-blur-xl border-r border-white/[0.08]">
      {/* Padrão Seigaiha sutil e folhas vermelhas flutuando na base da sidebar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-[0.075]"
        style={{
          backgroundImage: `url('${KONOHA_ASSETS.patterns.seigaiha}')`,
          backgroundSize: '160px 80px',
          maskImage: 'linear-gradient(180deg, transparent 0%, black 78%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 78%)',
        }}
      />
      <img
        src={KONOHA_ASSETS.effects.leafRed}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-24 left-5 w-8 h-8 opacity-30 -rotate-12 select-none"
      />
      <img
        src={KONOHA_ASSETS.effects.leafRed02}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-36 right-6 w-5 h-5 opacity-24 rotate-24 select-none"
      />

      {/* Topo da Sidebar: limpo, respirado e fiel à referência aprovada */}
      <div className="relative z-10 px-4 pt-7 pb-4 space-y-7">
        <button
          type="button"
          onClick={() => handleNavigate('overview')}
          className="w-full flex items-center justify-between gap-2 px-1 text-left cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="phdev-emblem-pulse w-10 h-10 rounded-xl bg-gradient-to-br from-[#dc2626]/34 to-[#140e16] border border-[#ef4444]/48 flex items-center justify-center shrink-0 shadow-[0_0_26px_-4px_rgba(239,68,68,0.68)] transition-transform group-hover:scale-[1.04]">
              <img
                src={KONOHA_ASSETS.icons.konohaEmblem}
                alt=""
                aria-hidden="true"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="block font-sans text-[15.5px] font-semibold tracking-tight text-white leading-tight truncate">
                NUA Protocol
              </span>
              <span className="block text-[10.5px] font-mono text-zinc-400 truncate mt-0.5">
                PHDEV · Konohagakure
              </span>
            </div>
          </div>

          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileSidebarOpen(false);
            }}
            role="button"
            tabIndex={0}
            aria-label="Fechar menu lateral"
            className="lg:hidden rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </span>
        </button>

        {/* Navegação principal limpa (5 itens) com indicador carmesim luminoso */}
        <nav aria-label="Navegação técnica PHDEV" className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeSection === item.id ||
              (item.id === 'overview' && activeSection === 'protocol');
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleNavigate(item.id)}
                className={`relative w-full h-10 flex items-center gap-3 rounded-xl px-3.5 text-[13.5px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#dc2626]/30 via-[#dc2626]/12 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(239,68,68,0.24)]'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.045]'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-2 bottom-2 w-[3.5px] rounded-r-full bg-[#ef4444] shadow-[0_0_16px_rgba(239,68,68,0.9)]"
                  />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#f87171]' : 'text-zinc-500'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Acessos externos reais (sem rotas quebradas) */}
        <div className="pt-5 border-t border-white/[0.07] space-y-1">
          <span className="px-3 text-[9.5px] font-mono uppercase tracking-[0.2em] text-zinc-500 block mb-1.5">
            Acessos Externos
          </span>
          <a
            href="https://nuaborges.com.br/contrato"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 flex items-center justify-between gap-2 rounded-lg px-3 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.045] transition-colors"
          >
            <span className="inline-flex items-center gap-2.5 truncate">
              <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
              <span className="truncate">Contrato</span>
            </span>
            <ExternalLink className="w-3 h-3 text-zinc-600 shrink-0" aria-hidden="true" />
          </a>
          <a
            href="https://nuaborges.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 flex items-center justify-between gap-2 rounded-lg px-3 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.045] transition-colors"
          >
            <span className="inline-flex items-center gap-2.5 truncate">
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
              <span className="truncate">Site Público</span>
            </span>
            <ExternalLink className="w-3 h-3 text-zinc-600 shrink-0" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Rodapé da Sidebar ancorado na base */}
      <div className="relative z-10 px-4 py-4 border-t border-white/[0.07] space-y-2.5 bg-[#090b11]/72">
        {nuaPresence?.online && (
          <div className="rounded-lg border border-emerald-400/22 bg-emerald-500/10 px-2.5 py-1.5 text-[10.5px] text-emerald-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              NUA online{nuaPresence.moduleLabel ? ` · ${nuaPresence.moduleLabel}` : ''}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={KONOHA_ASSETS.icons.kunai}
              alt=""
              aria-hidden="true"
              className="w-4.5 h-4.5 opacity-85 shrink-0"
            />
            <div className="min-w-0">
              <span className="block text-xs font-medium text-zinc-200 leading-tight">木ノ葉</span>
              <span className="block text-[10px] text-zinc-500 truncate">Vila da Folha</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1 h-7 rounded-lg border border-white/12 bg-white/[0.05] hover:bg-white/[0.12] px-2.5 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3 h-3" aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <HelpModalProvider>
    <div
      data-testid="phdev-konoha-console"
      className="relative min-h-dvh w-full bg-[#07080d] text-zinc-100 font-sans overflow-x-clip"
    >
      {/* Layout full-width: sidebar fixa ancorada à esquerda (left = 0) */}
      <div className="relative z-10 flex min-h-dvh w-full">
        <aside className="hidden lg:block w-[240px] shrink-0 sticky top-0 h-dvh z-20">
          {sidebarContent}
        </aside>

        {/* Drawer lateral no tablet/mobile */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/72 backdrop-blur-xs"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative z-10 w-[260px] max-w-[85vw] h-full">
              {sidebarContent}
            </aside>
          </div>
        )}

        {/* Área principal: cenário de Konoha ancorado EXCLUSIVAMENTE NO TOPO */}
        <div className="relative flex-1 min-w-0 flex flex-col bg-[#07080d]">
          <KonohaBackdrop criticalMode={isCriticalMode} accentGlowHex={backdropAccentHex} />

          {/* Cabeçalho panorâmico com respiro para revelar o Monumento dos 4 Hokages e a lua vermelha */}
          <header className="relative z-10 px-4 sm:px-7 lg:px-10 pt-8 sm:pt-10 pb-5">
            <div className="mx-auto max-w-[1240px] flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  aria-label="Abrir menu técnico PHDEV"
                  className="lg:hidden mt-0.5 rounded-lg border border-white/15 bg-black/60 backdrop-blur-md p-2 text-zinc-200 hover:text-white cursor-pointer"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-200/85 drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]">
                    木ノ葉 · PHDEV · NUA PROTOCOL v1.0
                  </p>
                  <h1 className="font-sans text-2xl sm:text-[30px] font-semibold tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.95)] leading-tight mt-0.5">
                    {greeting}
                  </h1>
                  <p className="text-xs text-zinc-200/88 drop-shadow-[0_1px_10px_rgba(0,0,0,0.95)] mt-0.5">
                    Central de controle, segurança, contenção e recuperação
                  </p>
                </div>
              </div>

              {/* Pílulas de estado alinhadas à direita */}
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <div
                  className={`inline-flex items-center gap-1.5 h-8 rounded-full border backdrop-blur-md px-3 text-[11.5px] font-medium shadow-lg shadow-black/40 ${headerStatus.style.badge}`}
                  title="Estado derivado exclusivamente de /api/control/system"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${headerStatus.style.dot}`} aria-hidden="true" />
                  <span>{headerStatus.label}</span>
                </div>

                <button
                  type="button"
                  onClick={() => void fetchSystemState()}
                  disabled={loading}
                  aria-label="Atualizar telemetria do NUA Protocol"
                  className="inline-flex items-center gap-1.5 h-8 rounded-full border border-white/16 bg-black/62 hover:bg-black/82 backdrop-blur-md px-3 text-[11.5px] font-medium text-zinc-200 hover:text-white transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-black/40"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-[#ddd6fe]' : ''}`} aria-hidden="true" />
                  <span>{lastCheckedAt ? formatBrTimestamp(lastCheckedAt) : 'Verificar'}</span>
                </button>

                <div className="inline-flex items-center gap-1.5 h-8 rounded-full border border-[#e3d8be]/34 bg-black/68 backdrop-blur-md pl-1 pr-2.5 text-xs text-zinc-100 shadow-lg shadow-black/40">
                  <span className="w-6 h-6 rounded-full bg-[#1a1824] border border-[#e3d8be]/38 flex items-center justify-center text-[10px] font-mono font-bold text-[#e3d8be]">
                    PH
                  </span>
                  <span className="font-mono text-[11px]">PHDEV</span>
                </div>
              </div>
            </div>
          </header>

          {/* Conteúdo operacional */}
          <main className="relative z-10 flex-1 px-4 sm:px-7 lg:px-10 pb-12 pt-1">
            <div className="mx-auto max-w-[1240px] space-y-4">
              {adminNotice?.type === 'error' && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-rose-950/45 px-4 py-2.5 text-xs text-rose-200"
                >
                  {adminNotice.message}
                </div>
              )}

              {activeSection === 'overview' && (
                <>
                  <KonohaOperationalBanner banner={banner} onNavigate={handleNavigate} />

                  <HagoromoAuthorityCard snapshot={snapshot} onNavigate={handleNavigate} />

                  <section aria-labelledby="phdev-protocols-grid-title" className="space-y-5 pt-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2
                        id="phdev-protocols-grid-title"
                        className="font-sans text-[15px] font-semibold text-white tracking-tight"
                      >
                        Protocolos Oficiais · P01–P09
                      </h2>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {snapshot?.registeredPolicies != null
                          ? `${snapshot.registeredPolicies} políticas ativas no gateway`
                          : 'Selecione qualquer protocolo para abrir sua página'}
                      </span>
                    </div>

                    {PROTOCOL_GROUPS.map((group, groupIdx) => {
                      const items = group.ids
                        .map((id) => OFFICIAL_PROTOCOLS.find((p) => p.id === id))
                        .filter((p): p is ProtocolVisualIdentity => Boolean(p));

                      return (
                        <div key={group.id} className="space-y-2.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
                            <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-zinc-300 font-semibold">
                              {group.title}
                            </h3>
                            <span className="text-[11px] text-zinc-500">{group.subtitle}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                            {items.map((protocol, idx) => (
                              <ProtocolCard
                                key={protocol.id}
                                protocol={protocol}
                                runtime={deriveProtocolRuntime(protocol.id, snapshot, loading)}
                                activityCount={activityFeed?.countsByProtocol?.[protocol.id] ?? 0}
                                onOpen={handleOpenProtocol}
                                index={groupIdx * 3 + idx}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </section>
                </>
              )}

              {activeSection === 'protocol' && selectedProtocolPage === 'hagoromo' && (
                <HagoromoDetailPage
                  snapshot={snapshot}
                  activityEvents={activityFeed?.events ?? []}
                  loading={loading}
                  lastCheckedAt={lastCheckedAt}
                  onRefresh={() => void fetchSystemState()}
                  onBackToOverview={() => handleNavigate('overview')}
                  onSelectProtocolPage={handleSelectProtocolPage}
                  onOpenMonitoring={() => handleNavigate('monitoring')}
                />
              )}

              {activeSection === 'protocol' && activeProtocolMeta && (
                <ProtocolDetailPage
                  protocol={activeProtocolMeta}
                  content={content}
                  snapshot={snapshot}
                  activityEvents={activityFeed?.events ?? []}
                  banner={banner}
                  loading={loading}
                  loadError={loadError}
                  lastCheckedAt={lastCheckedAt}
                  onRefresh={() => void fetchSystemState()}
                  onBackToOverview={() => handleNavigate('overview')}
                  onSelectProtocolPage={handleSelectProtocolPage}
                />
              )}

              {activeSection === 'containment' && (
                <PhdevContainmentHub
                  selectedProtocol={selectedContainment}
                  onSelectProtocol={setSelectedContainment}
                  onOpenProtocolPage={handleSelectProtocolPage}
                  snapshot={snapshot}
                  banner={banner}
                  loading={loading}
                  onStateUpdated={() => void fetchSystemState()}
                />
              )}

              {activeSection === 'monitoring' && (
                <PhdevMonitoringView
                  snapshot={snapshot}
                  activityFeed={activityFeed}
                  loading={loading}
                  error={loadError}
                  lastCheckedAt={lastCheckedAt}
                  onRefresh={() => void fetchSystemState()}
                  onOpenProtocolPage={handleSelectProtocolPage}
                />
              )}

              {activeSection === 'library' && (
                <PhdevMediaArchiveView content={content} />
              )}

              {activeSection === 'avaliacoes' && (
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15]/90 backdrop-blur-md p-4 sm:p-5">
                  <PrelaunchFeedbackModule />
                </div>
              )}

              {activeSection === 'configuracoes' && (
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e15]/90 backdrop-blur-md p-4 sm:p-5">
                  <ConfiguracoesModule content={content} adminProfile="phdev" hideProtocolControl />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
    </HelpModalProvider>
  );
}
