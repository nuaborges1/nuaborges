'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  Camera,
  Film,
  LogOut,
  Receipt,
  RefreshCw,
  User,
  Video,
  X,
} from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { usePublishedContent } from '@/lib/contentStore';
import { sanitizeUrl } from '@/lib/security';
import {
  AccountTab,
  buildAccountPath,
  buildLibrarySlugLookup,
  buildPersonalizadoSlugLookup,
  parseAccountLocation,
  resolveTabForOrderId,
} from '@/lib/accountRoutes';
import {
  fetchCustomerSession,
  fetchOverview,
  logoutCustomer,
  NuaIdAppointment,
  NuaIdLibraryItem,
  NuaIdOverviewResponse,
  NuaIdPersonalizado,
  NuaIdProfile,
  NuaIdUnifiedOrder,
} from '@/lib/nuaIdClient';
import { NuaIdLoginView } from './NuaIdLoginView';
import { LibrarySection, LibraryViewState } from './LibrarySection';
import { AppointmentsSection } from './AppointmentsSection';
import { PersonalizadosSection } from './PersonalizadosSection';
import { OrdersSection } from './OrdersSection';
import { ProfileSection } from './ProfileSection';
import { VaultContentViewer } from './VaultContentViewer';

export type { AccountTab };
export type AccountSubTab = 'compras' | 'perfil';

function resolveSafeNextRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = (new URLSearchParams(window.location.search).get('next') || '').trim();
    if (raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/admin')) {
      return raw;
    }
  } catch {}
  return null;
}

export function MinhaNuaShell() {
  const content = usePublishedContent();
  const [contactOpen, setContactOpen] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [profile, setProfile] = useState<NuaIdProfile | null>(null);
  const [activeTab, setActiveTab] = useState<AccountTab>('biblioteca');
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [openClaimOnOrders, setOpenClaimOnOrders] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ order: string; token: string } | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [dismissedNotices, setDismissedNotices] = useState<Record<string, true>>({});
  const explicitTabRef = useRef(false);
  const autoTabPickedRef = useRef(false);
  const accountContentRef = useRef<HTMLDivElement>(null);

  // Preserva estado da biblioteca (busca, filtro, ordenação e rolagem) ao entrar e voltar de um conteúdo
  const [libraryViewState, setLibraryViewState] = useState<LibraryViewState>({
    search: '',
    statusFilter: 'all',
    sortBy: 'recent',
  });
  const savedScrollYRef = useRef<number | null>(null);

  // Navegação mobile com indicador sutil de overflow horizontal
  const navScrollRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Partial<Record<AccountTab, HTMLButtonElement | null>>>({});
  const [navOverflow, setNavOverflow] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });

  const [overview, setOverview] = useState<NuaIdOverviewResponse['summary'] | null>(null);
  const [library, setLibrary] = useState<NuaIdLibraryItem[]>([]);
  const [appointments, setAppointments] = useState<NuaIdAppointment[]>([]);
  const [personalizados, setPersonalizados] = useState<NuaIdPersonalizado[]>([]);
  const [orders, setOrders] = useState<NuaIdUnifiedOrder[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [dataUnavailable, setDataUnavailable] = useState(false);
  const accountRequest = useRef<AbortController | null>(null);

  const librarySlugs = useMemo(() => buildLibrarySlugLookup(library), [library]);
  const personalizadosSlugs = useMemo(() => buildPersonalizadoSlugLookup(personalizados), [personalizados]);

  // Resolve a chave da URL (pode ser um slug limpo ou um orderRef legado) para o orderRef real
  const resolvedSelectedOrder = useMemo(() => {
    if (!selectedItemKey) return null;
    if (activeTab === 'biblioteca') {
      if (librarySlugs.orderToSlug.has(selectedItemKey)) return selectedItemKey;
      const fromSlug = librarySlugs.slugToOrder.get(selectedItemKey.toLowerCase());
      if (fromSlug) return fromSlug;
      // Enquanto os dados carregam ou para links legados diretos com ord_...
      return selectedItemKey;
    }
    if (activeTab === 'personalizados') {
      if (personalizadosSlugs.orderToSlug.has(selectedItemKey)) return selectedItemKey;
      const fromSlug = personalizadosSlugs.slugToOrder.get(selectedItemKey.toLowerCase());
      if (fromSlug) return fromSlug;
      return selectedItemKey;
    }
    return null;
  }, [selectedItemKey, activeTab, librarySlugs, personalizadosSlugs]);

  const toCleanSlugForItem = useCallback(
    (tab: AccountTab, orderOrSlug: string | null): string | null => {
      if (!orderOrSlug) return null;
      if (tab === 'biblioteca') {
        return librarySlugs.orderToSlug.get(orderOrSlug) || orderOrSlug;
      }
      if (tab === 'personalizados') {
        return personalizadosSlugs.orderToSlug.get(orderOrSlug) || orderOrSlug;
      }
      return null;
    },
    [librarySlugs, personalizadosSlugs]
  );

  const checkSession = useCallback(async () => {
    setCheckingSession(true);
    try {
      const res = await fetchCustomerSession();
      if (res.ok && res.data?.authenticated && res.data.profile) {
        setProfile(res.data.profile);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    } finally {
      setCheckingSession(false);
    }
  }, []);

  const syncUrlState = useCallback(
    (tab: AccountTab, itemSlugOrOrder: string | null, mode: 'push' | 'replace' = 'push') => {
      if (typeof window === 'undefined') return;
      try {
        const cleanSlug = itemSlugOrOrder ? toCleanSlugForItem(tab, itemSlugOrOrder) : null;
        const nextPath = buildAccountPath(tab, cleanSlug);
        const current = window.location.pathname + window.location.search + window.location.hash;
        if (nextPath !== current) {
          if (mode === 'push') {
            window.history.pushState({ tab, itemKey: cleanSlug }, '', nextPath);
          } else {
            window.history.replaceState({ tab, itemKey: cleanSlug }, '', nextPath);
          }
        }
      } catch {}
    },
    [toCleanSlugForItem]
  );

  // Carrega todos os dados em 1 única requisição agregada (/api/me/overview?full=1)
  const loadAccountData = useCallback(async (silent = false) => {
    if (accountRequest.current) return;
    const request = new AbortController();
    accountRequest.current = request;
    if (!silent) setDataLoading(true);
    try {
      const res = await fetchOverview(true, request.signal);
      if (request.signal.aborted) return;
      if (res.ok && res.data?.success) {
        const nextLib = Array.isArray(res.data.library) ? res.data.library : [];
        const nextApts = Array.isArray(res.data.appointments) ? res.data.appointments : [];
        const nextPers = Array.isArray(res.data.personalizados) ? res.data.personalizados : [];
        const nextOrders = Array.isArray(res.data.orders) ? res.data.orders : [];

        if (res.data.summary) setOverview(res.data.summary);
        setLibrary(nextLib);
        setAppointments(nextApts);
        setPersonalizados(nextPers);
        setOrders(nextOrders);
        setHasLoadedOnce(true);
        setDataUnavailable(false);

        // Abertura inteligente quando nenhuma aba foi pedida explicitamente
        if (!explicitTabRef.current && !autoTabPickedRef.current) {
          autoTabPickedRef.current = true;
          const activeLibCount = nextLib.filter((i) => i.status === 'active').length;
          if (activeLibCount === 0) {
            const hasActivePers = nextPers.some((p) =>
              ['aguardando_pagamento', 'em_producao', 'pronto', 'entregue'].includes(p.operationalStatus)
            );
            const hasUpcomingApts = nextApts.some((a) =>
              ['confirmada', 'aguardando_pagamento', 'reagendamento_pendente'].includes(a.operationalStatus)
            );
            if (hasActivePers) setActiveTab('personalizados');
            else if (hasUpcomingApts) setActiveTab('chamadas');
          }
        }
      } else {
        setDataUnavailable(true);
      }
    } catch {
      if (!request.signal.aborted) setDataUnavailable(true);
    } finally {
      if (accountRequest.current === request) {
        accountRequest.current = null;
        if (!silent) setDataLoading(false);
      }
    }
  }, []);

  useEffect(
    () => () => {
      accountRequest.current?.abort();
      accountRequest.current = null;
    },
    []
  );

  // Leitura inicial da URL (suporta rotas limpas /conta/... e links legados /conta?tab=...&item=ord_...)
  useEffect(() => {
    checkSession();
    try {
      const parsed = parseAccountLocation(
        window.location.pathname,
        window.location.search,
        window.location.hash
      );
      explicitTabRef.current = parsed.explicit;
      setActiveTab(parsed.tab);
      setSelectedItemKey(parsed.itemKey);

      if (parsed.confirmToken && parsed.itemKey) {
        setPendingConfirm({ order: parsed.itemKey, token: parsed.confirmToken });
        // Remove o token de uso único do fragmento da URL imediatamente
        const cleanPath = buildAccountPath(parsed.tab, parsed.itemKey);
        window.history.replaceState({ tab: parsed.tab, itemKey: parsed.itemKey }, '', cleanPath);
      }
    } catch {}
  }, [checkSession]);

  // Normaliza silenciosamente URLs legadas (?tab=...&item=ord_...) para rotas limpas assim que os dados carregam
  useEffect(() => {
    if (!profile || !hasLoadedOnce || typeof window === 'undefined') return;
    try {
      const targetOrder = resolvedSelectedOrder;
      const cleanSlug = targetOrder ? toCleanSlugForItem(activeTab, targetOrder) : null;
      const expectedPath = buildAccountPath(activeTab, cleanSlug);
      const currentFull = window.location.pathname + window.location.search;
      if (currentFull !== expectedPath && !window.location.search.includes('next=')) {
        window.history.replaceState({ tab: activeTab, itemKey: cleanSlug }, '', expectedPath);
      }
    } catch {}
  }, [profile, hasLoadedOnce, activeTab, resolvedSelectedOrder, toCleanSlugForItem]);

  useEffect(() => {
    const onPopState = () => {
      try {
        const parsed = parseAccountLocation(
          window.location.pathname,
          window.location.search,
          window.location.hash
        );
        explicitTabRef.current = true;
        setActiveTab(parsed.tab);
        setSelectedItemKey(parsed.itemKey);
        if (!parsed.itemKey && savedScrollYRef.current !== null) {
          const y = savedScrollYRef.current;
          savedScrollYRef.current = null;
          window.requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }));
        }
      } catch {}
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (profile) {
      loadAccountData(hasLoadedOnce);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, loadAccountData, refreshSignal]);

  // Polling leve (30s) apenas para itens vivos
  const hasLivePendingState = useMemo(() => {
    const nowMs = Date.now();
    const hasPendingApt = appointments.some((a) => {
      if (['aguardando_pagamento', 'reagendamento_pendente'].includes(a.operationalStatus)) return true;
      if (a.operationalStatus === 'confirmada' && a.dateUtc) {
        const startMs = new Date(a.dateUtc).getTime();
        if (Number.isFinite(startMs)) {
          const diffMs = startMs - nowMs;
          return diffMs <= 2 * 60 * 60 * 1000 && diffMs >= -30 * 60 * 1000;
        }
      }
      return false;
    });
    const hasActivePers = personalizados.some((p) =>
      ['aguardando_pagamento', 'em_producao'].includes(p.operationalStatus)
    );
    const hasPendingOrder = Boolean(overview?.notices?.some((n) => n.id === 'pending-payment'));
    return hasPendingApt || hasActivePers || hasPendingOrder;
  }, [appointments, personalizados, overview]);

  useEffect(() => {
    if (!profile) return;
    const syncOnVisible = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadAccountData(true);
    };
    window.addEventListener('focus', syncOnVisible);
    document.addEventListener('visibilitychange', syncOnVisible);

    const interval = hasLivePendingState ? setInterval(syncOnVisible, 30000) : null;
    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('focus', syncOnVisible);
      document.removeEventListener('visibilitychange', syncOnVisible);
    };
  }, [profile, hasLivePendingState, loadAccountData]);

  // Atualiza indicadores sutis de overflow na barra de abas mobile
  const updateNavOverflow = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setNavOverflow({
      left: el.scrollLeft > 6,
      right: maxScroll > 6 && el.scrollLeft < maxScroll - 6,
    });
  }, []);

  useEffect(() => {
    updateNavOverflow();
    window.addEventListener('resize', updateNavOverflow, { passive: true });
    return () => window.removeEventListener('resize', updateNavOverflow);
  }, [updateNavOverflow, profile, activeTab, hasLoadedOnce]);

  useEffect(() => {
    const activeBtn = tabButtonRefs.current[activeTab];
    if (activeBtn && navScrollRef.current && navScrollRef.current.scrollWidth > navScrollRef.current.clientWidth) {
      activeBtn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }, [activeTab]);

  const handleSelectTab = (tab: AccountTab, subTab?: AccountSubTab, itemOrder?: string | null) => {
    explicitTabRef.current = true;
    const resolvedTab = tab === 'conta' && subTab === 'perfil' ? 'perfil' : tab;
    const nextItem = itemOrder !== undefined ? itemOrder : null;
    if (resolvedTab !== 'conta') setOpenClaimOnOrders(false);
    if (nextItem) {
      savedScrollYRef.current = window.scrollY;
    } else {
      savedScrollYRef.current = null;
    }
    setActiveTab(resolvedTab);
    setSelectedItemKey(nextItem);
    syncUrlState(resolvedTab, nextItem, 'push');
    if (nextItem) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } else {
      accountContentRef.current?.focus({ preventScroll: true });
    }
  };

  const handleSelectItemOrder = (order: string | null) => {
    if (order) {
      savedScrollYRef.current = window.scrollY;
      setSelectedItemKey(order);
      syncUrlState(activeTab, order, 'push');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      accountContentRef.current?.focus({ preventScroll: true });
    } else {
      setSelectedItemKey(null);
      syncUrlState(activeTab, null, 'push');
      const restoreY = savedScrollYRef.current;
      savedScrollYRef.current = null;
      if (restoreY !== null) {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: restoreY, behavior: 'instant' as ScrollBehavior });
        });
      }
      accountContentRef.current?.focus({ preventScroll: true });
    }
  };

  const handleLogout = async () => {
    await logoutCustomer();
    accountRequest.current?.abort();
    accountRequest.current = null;
    setProfile(null);
    setOverview(null);
    setLibrary([]);
    setAppointments([]);
    setPersonalizados([]);
    setOrders([]);
    setDismissedNotices({});
    setHasLoadedOnce(false);
    setDataLoading(false);
    setDataUnavailable(false);
    autoTabPickedRef.current = false;
    savedScrollYRef.current = null;
    setLibraryViewState({ search: '', statusFilter: 'all', sortBy: 'recent' });
    setSelectedItemKey(null);
    setPendingConfirm(null);
    setActiveTab('biblioteca');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/conta');
    }
  };

  const triggerRefresh = () => setRefreshSignal((n) => n + 1);
  const waitingForAccount = !hasLoadedOnce && !dataUnavailable;
  const canShowAccountData = hasLoadedOnce || !dataUnavailable;

  const visibleNotices = useMemo(
    () => (overview?.notices || []).filter((n) => !dismissedNotices[n.id]),
    [overview?.notices, dismissedNotices]
  );

  const activeLibraryCount = overview?.counts.libraryActive ?? library.filter((i) => i.status === 'active').length;
  const upcomingCallsCount = overview?.counts.appointmentsUpcoming ?? 0;
  const activePersCount =
    (overview?.counts.personalizadosDelivered ?? 0) + (overview?.counts.personalizadosActive ?? 0);

  const pendingOrdersCount = orders.filter((o) => o.financialStatus === 'pending').length;
  const pendingPersCount = personalizados.filter((p) => p.operationalStatus === 'aguardando_pagamento').length;

  const tabs: Array<{
    id: AccountTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    highlight?: boolean;
  }> = [
    {
      id: 'biblioteca',
      label: 'Biblioteca',
      icon: Film,
      badge: activeLibraryCount || undefined,
    },
    {
      id: 'personalizados',
      label: 'Personalizados',
      icon: Camera,
      badge: activePersCount || undefined,
      highlight: pendingPersCount > 0,
    },
    {
      id: 'chamadas',
      label: 'Chamadas VIP',
      icon: Video,
      badge: upcomingCallsCount || undefined,
      highlight: appointments.some((a) => Boolean(a.proposal) || a.operationalStatus === 'aguardando_pagamento'),
    },
    {
      id: 'conta',
      label: 'Pedidos',
      icon: Receipt,
      badge: pendingOrdersCount || undefined,
      highlight: pendingOrdersCount > 0,
    },
    {
      id: 'perfil',
      label: 'Perfil e segurança',
      icon: User,
    },
  ];

  // Determina se estamos no Modo Foco (conteúdo da Biblioteca ou entrega Personalizada aberta)
  const isPersonalizadoVaultOpen = useMemo(() => {
    if (activeTab !== 'personalizados' || !resolvedSelectedOrder) return false;
    const match = personalizados.find((p) => p.id === resolvedSelectedOrder);
    if (!match) return true;
    return (
      match.deliveryChannel === 'vault' &&
      match.financialStatus === 'paid' &&
      ['pronto', 'entregue'].includes(match.operationalStatus)
    );
  }, [activeTab, resolvedSelectedOrder, personalizados]);

  const viewingContent =
    Boolean(resolvedSelectedOrder) && (activeTab === 'biblioteca' || isPersonalizadoVaultOpen);

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-clip bg-black text-white selection:bg-[#661C30] selection:text-[#F5EEE9]">
      <Header activeSection="conta" onOpenContact={() => setContactOpen(true)} customHeaderData={content.header} />

      <main
        className={`relative flex-1 ${
          viewingContent
            ? 'pt-20 pb-16 sm:pt-24 sm:pb-24'
            : 'pt-20 pb-20 sm:pt-24 sm:pb-24'
        }`}
      >
        <PublicBackground />

        <div className="relative z-10">
          {checkingSession ? (
            <div className="mx-auto max-w-md space-y-4 px-4 pt-10 sm:pt-14">
              <div className="mx-auto h-7 w-40 rounded-full bg-white/[0.04]" />
              <div className="h-72 rounded-[24px] border border-white/[0.08] bg-[#08080c]" />
            </div>
          ) : !profile ? (
            pendingConfirm ? (
              <div className="mx-auto max-w-[72rem] px-4 sm:px-8 md:px-10 lg:px-12 pt-4 sm:pt-6">
                <VaultContentViewer
                  order={pendingConfirm.order}
                  initialConfirmToken={pendingConfirm.token}
                  backLabel="Voltar para o login"
                  onBack={() => {
                    setPendingConfirm(null);
                    setSelectedItemKey(null);
                    if (typeof window !== 'undefined') {
                      window.history.replaceState({}, '', '/conta');
                    }
                  }}
                  onAuthenticatedByConfirm={() => {
                    const targetOrder = pendingConfirm.order;
                    const targetTab = resolveTabForOrderId(targetOrder) || 'biblioteca';
                    setPendingConfirm(null);
                    setActiveTab(targetTab);
                    setSelectedItemKey(targetOrder);
                    syncUrlState(targetTab, targetOrder, 'replace');
                    void checkSession();
                  }}
                />
              </div>
            ) : (
              <div className="px-4 pt-6 sm:px-8 sm:pt-12">
                <NuaIdLoginView
                  title="Minha conta"
                  onOpenContact={() => setContactOpen(true)}
                  onAuthenticated={(prof) => {
                    const nextUrl = resolveSafeNextRedirect();
                    if (nextUrl) {
                      window.location.assign(nextUrl);
                      return;
                    }
                    setProfile(prof);
                  }}
                />
              </div>
            )
          ) : (
            <div className="mx-auto max-w-[72rem] px-4 sm:px-8 md:px-10 lg:px-12">
              {/* Cabeçalho enxuto e navegação editorial — recolhidos naturalmente no Modo Foco */}
              {!viewingContent && (
                <div className="page-enter-fast">
                  <header className="flex flex-col gap-4 pb-6 pt-3 sm:flex-row sm:items-end sm:justify-between sm:pb-7 sm:pt-5">
                    <div className="min-w-0">
                      <h1 className="font-serif text-3xl font-normal leading-[1.08] tracking-tight text-[#F5EEE9] sm:text-4xl">
                        Minha conta
                      </h1>
                      <p className="mt-1.5 truncate text-sm text-zinc-400" title={profile.email}>
                        {profile.email}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-start sm:self-end">
                      <button
                        type="button"
                        onClick={() => void loadAccountData()}
                        disabled={dataLoading}
                        aria-label="Atualizar conta"
                        title="Atualizar conta"
                        className="inline-flex size-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-[#F5EEE9] disabled:opacity-45 cursor-pointer touch-manipulation"
                      >
                        <RefreshCw aria-hidden className={`size-4 ${dataLoading ? 'motion-safe:animate-spin' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="btn-ghost !min-h-[40px] !px-4"
                      >
                        <LogOut aria-hidden className="size-3.5" />
                        <span>Sair</span>
                      </button>
                    </div>
                  </header>

                  {/* Navegação editorial das 5 abas — mesma assinatura visual da Navbar pública */}
                  <div className="relative border-b border-white/[0.08]">
                    {navOverflow.left && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-black via-black/80 to-transparent md:hidden"
                      />
                    )}
                    {navOverflow.right && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black via-black/80 to-transparent md:hidden"
                      />
                    )}
                    <nav
                      ref={navScrollRef}
                      onScroll={updateNavOverflow}
                      aria-label="Seções da Minha Conta"
                      className="no-scrollbar flex items-center gap-5 overflow-x-auto sm:gap-7 md:gap-8"
                    >
                      {tabs.map(({ id, label, icon: Icon, badge, highlight }) => {
                        const active = activeTab === id;
                        return (
                          <button
                            key={id}
                            ref={(el) => {
                              tabButtonRefs.current[id] = el;
                            }}
                            type="button"
                            aria-current={active ? 'page' : undefined}
                            onClick={() => handleSelectTab(id)}
                            className={`relative inline-flex min-h-[46px] shrink-0 items-center gap-2 whitespace-nowrap pb-3 pt-2 text-[13px] tracking-wide transition-colors duration-200 cursor-pointer touch-manipulation ${
                              active
                                ? 'font-medium text-[#F5EEE9]'
                                : 'font-normal text-zinc-400 hover:text-zinc-100'
                            }`}
                          >
                            <Icon
                              aria-hidden
                              className={`size-4 shrink-0 transition-colors ${
                                active ? 'text-[#C97A8D]' : 'text-zinc-500'
                              }`}
                            />
                            <span>{label}</span>
                            {Boolean(badge) && (
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums ${
                                  highlight
                                    ? 'border border-amber-400/30 bg-amber-500/15 text-amber-200'
                                    : active
                                      ? 'bg-white/10 text-[#F5EEE9]'
                                      : 'bg-white/[0.06] text-zinc-400'
                                }`}
                              >
                                {badge}
                              </span>
                            )}
                            {active && (
                              <motion.span
                                layoutId="account-tab-active"
                                className="absolute inset-x-0 bottom-0 h-[1.5px] rounded-full bg-gradient-to-r from-[#661C30] via-[#7A293D] to-[#90364B]"
                                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              )}

              <div
                ref={accountContentRef}
                tabIndex={-1}
                role="region"
                aria-label={tabs.find((tab) => tab.id === activeTab)?.label}
                className={`min-w-0 outline-none ${
                  viewingContent ? 'pt-2 sm:pt-4' : 'space-y-6 pt-7 sm:space-y-8 sm:pt-9'
                }`}
              >
                {/* Avisos acionáveis discretos */}
                {visibleNotices.length > 0 && !viewingContent && (
                  <div className="space-y-2.5">
                    {visibleNotices.map((n) => {
                      const isHighlight = n.tone === 'highlight';
                      const isWarning = n.tone === 'warning';
                      const isInfo = n.tone === 'info';
                      return (
                        <div
                          key={n.id}
                          className={`flex flex-col justify-between gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center ${
                            isHighlight
                              ? 'border-[#7A293D]/45 bg-[#431322]/25 text-[#F5EEE9]'
                              : isWarning
                                ? 'border-amber-500/25 bg-amber-950/20 text-amber-100'
                                : 'border-white/[0.08] bg-[#08080c] text-zinc-300'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            {isHighlight ? (
                              <Bell className="size-4 shrink-0 text-[#C97A8D]" />
                            ) : (
                              <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                            )}
                            <span className="leading-relaxed">{n.text}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {n.actionHref ? (
                              <a
                                href={sanitizeUrl(n.actionHref, '#')}
                                rel="noreferrer"
                                className="btn-primary !min-h-[38px] !px-4 !text-[11px]"
                              >
                                <Video className="size-3.5" />
                                <span>{n.actionLabel || 'Entrar na sala'}</span>
                              </a>
                            ) : n.actionTab && activeTab !== n.actionTab ? (
                              <button
                                type="button"
                                onClick={() => handleSelectTab(n.actionTab!, n.actionTab === 'conta' ? 'compras' : undefined)}
                                className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
                              >
                                {n.actionLabel || 'Ver detalhes'}
                              </button>
                            ) : null}
                            {isInfo && (
                              <button
                                type="button"
                                onClick={() => setDismissedNotices((prev) => ({ ...prev, [n.id]: true }))}
                                aria-label="Dispensar aviso"
                                className="flex size-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200 cursor-pointer"
                              >
                                <X className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {dataUnavailable && !viewingContent && (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-3.5 text-sm text-amber-100"
                  >
                    <p>Não conseguimos atualizar os dados da sua conta agora. Tente novamente em instantes.</p>
                    <button
                      type="button"
                      onClick={() => void loadAccountData()}
                      disabled={dataLoading}
                      className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}

                {canShowAccountData && activeTab === 'biblioteca' && (
                  <LibrarySection
                    items={library}
                    loading={waitingForAccount}
                    selectedOrder={resolvedSelectedOrder}
                    confirmToken={pendingConfirm?.order === resolvedSelectedOrder ? pendingConfirm?.token : ''}
                    viewState={libraryViewState}
                    onViewStateChange={setLibraryViewState}
                    onSelectOrder={handleSelectItemOrder}
                    onClearConfirmToken={() => setPendingConfirm(null)}
                    onOpenClaimOrder={() => {
                      setOpenClaimOnOrders(true);
                      handleSelectTab('conta');
                    }}
                  />
                )}

                {canShowAccountData && activeTab === 'chamadas' && (
                  <AppointmentsSection
                    appointments={appointments}
                    loading={waitingForAccount}
                    onUpdated={triggerRefresh}
                    onOpenContact={() => setContactOpen(true)}
                  />
                )}

                {canShowAccountData && activeTab === 'personalizados' && (
                  <PersonalizadosSection
                    items={personalizados}
                    loading={waitingForAccount}
                    selectedOrder={resolvedSelectedOrder}
                    confirmToken={pendingConfirm?.order === resolvedSelectedOrder ? pendingConfirm?.token : ''}
                    onSelectOrder={handleSelectItemOrder}
                    onClearConfirmToken={() => setPendingConfirm(null)}
                    onUpdated={triggerRefresh}
                    onOpenContact={() => setContactOpen(true)}
                  />
                )}

                {activeTab === 'conta' && (
                  <OrdersSection
                    initialItems={orders}
                    hasInitialData={hasLoadedOnce}
                    refreshSignal={refreshSignal}
                    defaultOpenClaim={openClaimOnOrders}
                    onClaimed={triggerRefresh}
                    onNavigateTab={(tab, orderId) => handleSelectTab(tab, undefined, orderId ?? null)}
                    onOpenContact={() => setContactOpen(true)}
                  />
                )}

                {activeTab === 'perfil' && (
                  <ProfileSection
                    profile={profile}
                    onProfileUpdated={(p) => setProfile(p)}
                    onLoggedOut={handleLogout}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer
        customFooterData={content.footer}
        customInstitutionalData={content.institutional}
        customChannelsData={content.channels}
      />

      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        customContactData={content.contact}
      />
    </div>
  );
}
