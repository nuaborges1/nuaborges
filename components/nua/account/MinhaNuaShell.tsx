'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { usePublishedContent } from '@/lib/contentStore';
import { sanitizeUrl } from '@/lib/security';
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
import { LibrarySection } from './LibrarySection';
import { AppointmentsSection } from './AppointmentsSection';
import { PersonalizadosSection } from './PersonalizadosSection';
import { OrdersSection } from './OrdersSection';
import { ProfileSection } from './ProfileSection';
import { VaultContentViewer } from './VaultContentViewer';

export type AccountTab = 'biblioteca' | 'chamadas' | 'personalizados' | 'conta' | 'perfil';
export type AccountSubTab = 'compras' | 'perfil';

function resolveTabForOrderId(orderId: string | null): AccountTab | null {
  if (!orderId) return null;
  const lower = orderId.toLowerCase();
  if (lower.startsWith('ped_') || lower.startsWith('pers_')) return 'personalizados';
  if (lower.startsWith('book_') || lower.startsWith('apt_') || lower.startsWith('app_')) return 'chamadas';
  return 'biblioteca';
}

function resolveInitialTab(rawTab: string | null, itemOrder?: string | null): {
  tab: AccountTab;
  subTab: AccountSubTab;
  explicit: boolean;
} {
  switch (rawTab) {
    case 'chamadas':
      return { tab: 'chamadas', subTab: 'compras', explicit: true };
    case 'personalizados':
      return { tab: 'personalizados', subTab: 'compras', explicit: true };
    case 'compras':
    case 'conta':
      return { tab: 'conta', subTab: 'compras', explicit: true };
    case 'perfil':
      return { tab: 'perfil', subTab: 'perfil', explicit: true };
    case 'biblioteca':
    case 'inicio':
      return { tab: 'biblioteca', subTab: 'compras', explicit: true };
    default: {
      const inferred = resolveTabForOrderId(itemOrder || null);
      if (inferred) {
        return { tab: inferred, subTab: 'compras', explicit: true };
      }
      return { tab: 'biblioteca', subTab: 'compras', explicit: false };
    }
  }
}

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
  const [contaSubTab, setContaSubTab] = useState<AccountSubTab>('compras');
  const [selectedItemOrder, setSelectedItemOrder] = useState<string | null>(null);
  const [openClaimOnOrders, setOpenClaimOnOrders] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ order: string; token: string } | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [dismissedNotices, setDismissedNotices] = useState<Record<string, true>>({});
  const explicitTabRef = useRef(false);
  const autoTabPickedRef = useRef(false);
  const accountContentRef = useRef<HTMLDivElement>(null);

  const [overview, setOverview] = useState<NuaIdOverviewResponse['summary'] | null>(null);
  const [library, setLibrary] = useState<NuaIdLibraryItem[]>([]);
  const [appointments, setAppointments] = useState<NuaIdAppointment[]>([]);
  const [personalizados, setPersonalizados] = useState<NuaIdPersonalizado[]>([]);
  const [orders, setOrders] = useState<NuaIdUnifiedOrder[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [dataUnavailable, setDataUnavailable] = useState(false);
  const accountRequest = useRef<AbortController | null>(null);

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

        // Abertura inteligente: prioriza Seu Acervo; só alterna se não houver conteúdos ativos e houver serviço ativo em andamento
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

  useEffect(() => () => {
    accountRequest.current?.abort();
    accountRequest.current = null;
  }, []);

  const syncUrlState = useCallback(
    (tab: AccountTab, subTab: AccountSubTab, itemOrder: string | null, mode: 'push' | 'replace' = 'push') => {
      if (typeof window === 'undefined') return;
      try {
        const url = new URL(window.location.href);
        url.hash = '';
        url.searchParams.set('tab', tab === 'conta' && subTab === 'perfil' ? 'perfil' : tab);
        if (itemOrder && (tab === 'biblioteca' || tab === 'personalizados')) {
          url.searchParams.set('item', itemOrder);
        } else {
          url.searchParams.delete('item');
        }
        url.searchParams.delete('order');
        if (url.toString() !== window.location.href) {
          if (mode === 'push') {
            window.history.pushState({ tab, subTab, itemOrder }, '', url.toString());
          } else {
            window.history.replaceState({ tab, subTab, itemOrder }, '', url.toString());
          }
        }
      } catch {}
    },
    []
  );

  useEffect(() => {
    checkSession();
    try {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const confirmTok = (hashParams.get('confirm') || '').trim();
      const rawItem =
        (url.searchParams.get('item') ||
          url.searchParams.get('order') ||
          hashParams.get('order') ||
          '').trim() || null;

      const resolved = resolveInitialTab(url.searchParams.get('tab'), rawItem);
      explicitTabRef.current = resolved.explicit;
      setActiveTab(resolved.tab);
      setContaSubTab(resolved.subTab);
      setSelectedItemOrder(rawItem);

      if (confirmTok && rawItem) {
        setPendingConfirm({ order: rawItem, token: confirmTok });
        // Remove o token de uso único do fragmento da URL imediatamente
        syncUrlState(resolved.tab, resolved.subTab, rawItem, 'replace');
      } else if (url.searchParams.has('order') && rawItem) {
        syncUrlState(resolved.tab, resolved.subTab, rawItem, 'replace');
      }
    } catch {}
  }, [checkSession, syncUrlState]);

  useEffect(() => {
    const onPopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const rawItem = (params.get('item') || params.get('order') || '').trim() || null;
        const resolved = resolveInitialTab(params.get('tab'), rawItem);
        explicitTabRef.current = true;
        setActiveTab(resolved.tab);
        setContaSubTab(resolved.subTab);
        setSelectedItemOrder(rawItem);
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

  // Polling leve (30s) APENAS para itens vivos: pagamento pendente, reagendamento, personalizado em produção ou chamada nas próximas 2 horas
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

  const handleSelectTab = (tab: AccountTab, subTab?: AccountSubTab, itemOrder?: string | null) => {
    explicitTabRef.current = true;
    const resolvedTab = tab === 'conta' && subTab === 'perfil' ? 'perfil' : tab;
    const nextSubTab = resolvedTab === 'perfil' ? 'perfil' : 'compras';
    const nextItem = itemOrder !== undefined ? itemOrder : null;
    if (resolvedTab !== 'conta') setOpenClaimOnOrders(false);
    setActiveTab(resolvedTab);
    setContaSubTab(nextSubTab);
    setSelectedItemOrder(nextItem);
    syncUrlState(resolvedTab, nextSubTab, nextItem, 'push');
    focusAccountContent();
  };

  function focusAccountContent() {
    const panel = accountContentRef.current;
    panel?.focus({ preventScroll: true });
    if (panel && panel.getBoundingClientRect().top < 0) {
      panel.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }

  const handleSelectItemOrder = (order: string | null) => {
    setSelectedItemOrder(order);
    syncUrlState(activeTab, contaSubTab, order, 'push');
    focusAccountContent();
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
    setSelectedItemOrder(null);
    setPendingConfirm(null);
    setActiveTab('biblioteca');
    setContaSubTab('compras');
    syncUrlState('biblioteca', 'compras', null, 'replace');
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
      badge: activeLibraryCount,
    },
    {
      id: 'personalizados',
      label: 'Personalizados',
      icon: Camera,
      badge: activePersCount,
      highlight: pendingPersCount > 0,
    },
    {
      id: 'chamadas',
      label: 'Chamadas VIP',
      icon: Video,
      badge: upcomingCallsCount,
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

  const viewingContent = Boolean(selectedItemOrder) && (activeTab === 'biblioteca' || activeTab === 'personalizados');

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-clip bg-black text-white selection:bg-wine selection:text-white">
      <Header activeSection="conta" onOpenContact={() => setContactOpen(true)} customHeaderData={content.header} />

      <main className="relative flex-1 pt-28 pb-20 sm:pt-36 sm:pb-28">
        <PublicBackground />
        <div className="relative">
          {checkingSession ? (
            <div className="mx-auto max-w-md space-y-4 px-4">
              <div className="h-8 w-44 mx-auto animate-pulse rounded-full bg-[#08080c] border border-white/[0.06]" />
              <div className="h-72 animate-pulse rounded-[28px] border border-white/[0.08] bg-[#08080c]" />
            </div>
          ) : !profile ? (
            pendingConfirm ? (
              <div className="mx-auto max-w-3xl px-4 sm:px-8">
                <VaultContentViewer
                  order={pendingConfirm.order}
                  initialConfirmToken={pendingConfirm.token}
                  backLabel="Voltar para o login"
                  contextBadge="Confirmação de Navegador"
                  onBack={() => {
                    setPendingConfirm(null);
                    setSelectedItemOrder(null);
                    syncUrlState('biblioteca', 'compras', null, 'replace');
                  }}
                  onAuthenticatedByConfirm={() => {
                    const targetOrder = pendingConfirm.order;
                    const targetTab = resolveTabForOrderId(targetOrder) || 'biblioteca';
                    setPendingConfirm(null);
                    setActiveTab(targetTab);
                    setSelectedItemOrder(targetOrder);
                    syncUrlState(targetTab, 'compras', targetOrder, 'replace');
                    void checkSession();
                  }}
                />
              </div>
            ) : (
              <div className="px-4 sm:px-8">
                <NuaIdLoginView
                  title="Entre na sua conta"
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
            <div>
              <PublicPageHero title="Minha conta" />
              <div className="mx-auto max-w-[72rem] px-4 sm:px-8 md:px-10 lg:px-12">
                <div className="mb-4 flex min-w-0 items-center justify-between gap-3 sm:mb-5">
                  <p className="truncate text-sm text-zinc-400" title={profile.email}>{profile.email}</p>
                  <div className="flex shrink-0 items-center gap-1 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => void loadAccountData()}
                      disabled={dataLoading}
                      aria-label="Atualizar conta"
                      title="Atualizar conta"
                      className="inline-flex size-11 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                    >
                      <RefreshCw aria-hidden className={`size-4 ${dataLoading ? 'motion-safe:animate-spin' : ''}`} />
                    </button>
                    <button type="button" onClick={handleLogout} className="btn-ghost px-4">
                      <LogOut aria-hidden className="size-3.5" />
                      Sair
                    </button>
                  </div>
                </div>

                <nav
                  aria-label="Navegação da Minha Conta"
                  className="grid grid-cols-6 gap-1 rounded-2xl border border-white/[0.08] bg-[#08080c] p-1.5 [&>button]:col-span-2 [&>button:nth-last-child(-n+2)]:col-span-3 md:flex"
                >
                  {tabs.map(({ id, label, icon: Icon, badge, highlight }) => {
                    const active = activeTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        onClick={() => handleSelectTab(id)}
                        className={`flex min-h-12 min-w-0 flex-1 flex-wrap items-center justify-center gap-x-1.5 rounded-lg px-1 py-1.5 text-center text-[11px] font-semibold transition-colors md:min-h-11 md:flex-nowrap md:gap-2 md:px-2 md:text-sm ${
                          active
                            ? 'bg-wine-deep text-[#F5EEE9] ring-1 ring-inset ring-wine-highlight/50'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon aria-hidden className="size-4 shrink-0" />
                        <span className="order-last w-full md:order-none md:w-auto">{label}</span>
                        {Boolean(badge) && (
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] leading-none tabular-nums md:text-[11px] ${
                            highlight ? 'bg-amber-400/15 text-amber-200' : 'bg-white/10 text-[#F5EEE9]'
                          }`}>
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div ref={accountContentRef} tabIndex={-1} role="region" aria-label={tabs.find((tab) => tab.id === activeTab)?.label} className="min-w-0 space-y-6 pt-5 outline-none sm:space-y-8 sm:pt-8">
                  {visibleNotices.length > 0 && !viewingContent && (
                    <div className="space-y-2">
                      {visibleNotices.map((n) => {
                        const isHighlight = n.tone === 'highlight';
                        const isWarning = n.tone === 'warning';
                        const isInfo = n.tone === 'info';
                        return (
                          <div
                            key={n.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${
                              isHighlight
                                ? 'border-[#533443] bg-[#241720] text-[#f5eee9]'
                                : isWarning
                                ? 'border-amber-500/25 bg-amber-950/20 text-amber-200'
                                : 'border-white/[0.08] bg-[#08080c] text-zinc-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isHighlight ? (
                                <Bell className="h-4 w-4 shrink-0 text-[#C97A8D]" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                              )}
                              <span className="leading-relaxed">{n.text}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {n.actionHref ? (
                                <a
                                  href={sanitizeUrl(n.actionHref, '#')}
                                  rel="noreferrer"
                                  className="inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-[#661C30] hover:bg-[#7A293D] hover:border-white/25 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#F5EEE9] transition-all duration-200 shadow-[0_4px_16px_rgba(102,28,48,0.4)]"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  <span>{n.actionLabel || 'Entrar na sala'}</span>
                                </a>
                              ) : n.actionTab && activeTab !== n.actionTab ? (
                                <button
                                  type="button"
                                  onClick={() => handleSelectTab(n.actionTab!, n.actionTab === 'conta' ? 'compras' : undefined)}
                                  className={`inline-flex min-h-[36px] shrink-0 items-center justify-center rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition-colors duration-200 cursor-pointer ${
                                    isHighlight
                                      ? 'border-[#90364B]/60 bg-[#661C30]/40 text-[#F5EEE9] hover:bg-[#661C30]/70 hover:border-white/25'
                                      : 'border-amber-400/35 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25'
                                  }`}
                                >
                                  {n.actionLabel || 'Ver detalhes'}
                                </button>
                              ) : null}
                              {isInfo && (
                                <button
                                  type="button"
                                  onClick={() => setDismissedNotices((prev) => ({ ...prev, [n.id]: true }))}
                                  aria-label="Dispensar aviso"
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200 cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {dataUnavailable && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                      <p>Não conseguimos atualizar suas compras e reservas agora. Tente novamente em instantes.</p>
                      <button type="button" onClick={() => void loadAccountData()} disabled={dataLoading}
                        className="min-h-[44px] rounded-full border border-amber-500/30 px-4 text-xs font-medium hover:bg-amber-500/15 disabled:opacity-50">
                        Tentar novamente
                      </button>
                    </div>
                  )}

                  {canShowAccountData && activeTab === 'biblioteca' && (
                    <LibrarySection
                      items={library}
                      loading={waitingForAccount}
                      selectedOrder={selectedItemOrder}
                      confirmToken={pendingConfirm?.order === selectedItemOrder ? pendingConfirm?.token : ''}
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
                      selectedOrder={selectedItemOrder}
                      confirmToken={pendingConfirm?.order === selectedItemOrder ? pendingConfirm?.token : ''}
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
