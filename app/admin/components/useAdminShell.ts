'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import {
  getDraftContent,
  saveDraftContent,
  publishContent,
  persistAdministrativeContent,
  hasUnpublishedChanges,
  discardDraftChanges,
  getPendingChangesSummary,
  checkServerSessionInfo,
  clearSession,
  fetchPublishedContentFromServer,
  mergePublishedIntoDraft,
  getPublicApiUrl,
  type AdminPanelProfile,
} from '@/lib/contentStore';
import { isLocalhost } from '@/lib/env';
import { useAdminOrderNotifications } from '@/hooks/useAdminOrderNotifications';
import { computeSidebarBadges } from '@/lib/admin/sidebarBadges';
import { fetchClientInstallments } from '@/lib/services/nua/financeService';
import { applyContentOps, rehydrateLibrary } from '@/lib/nuaAi/contentOps.mjs';
import {
  ADMIN_MAIL_ENABLED,
  AdminModuleId,
  MODULE_METADATA,
  ModuleBadgeInfo,
  resolveModuleFromParam,
} from './types';

function parseModuleFromUrl(): AdminModuleId | null {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname;
  const p = new URLSearchParams(window.location.search);
  const modParam = p.get('module') || p.get('tab');

  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length >= 2 && (pathSegments[0] === 'admin' || pathSegments[0] === 'admingeral')) {
    return resolveModuleFromParam(pathSegments[1]);
  }
  if (pathSegments.length === 1 && pathSegments[0] !== 'admin' && pathSegments[0] !== 'admingeral') {
    return resolveModuleFromParam(pathSegments[0]);
  }

  if (modParam) {
    return resolveModuleFromParam(modParam);
  }

  return null;
}

export function useAdminShell() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminPanelProfile>('nua');
  const [nuaPresence, setNuaPresence] = useState<{
    online: boolean;
    module?: string;
    moduleLabel?: string;
    pathname?: string;
  } | null>(null);
  const [isContentLoading, setIsContentLoading] = useState<boolean>(true);
  const [content, setContent] = useState<SiteContent | null>(null);
  // Espelho síncrono de `content`. Os updaters de estado do React são re-executados
  // (StrictMode) e não podem ter efeitos colaterais — usamos esta referência para
  // calcular o próximo estado fora do updater e disparar o save uma única vez.
  const contentRef = useRef<SiteContent | null>(null);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  const [activeModule, setActiveModule] = useState<AdminModuleId>('dashboard');
  const [subAction, setSubAction] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mailInitialSearch, setMailInitialSearch] = useState('');
  const [customerInitialSearch, setCustomerInitialSearch] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'paid' | 'pending' | 'overdue' | 'loading'>('paid');

  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [publishSuccessToast, setPublishSuccessToast] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [isEditingSubView, setIsEditingSubView] = useState(false);
  const [subViewWarning, setSubViewWarning] = useState<string | undefined>(undefined);

  const [adminNotice, setAdminNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const adminNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showAdminNotice = (type: 'success' | 'error', message: string) => {
    if (adminNoticeTimeoutRef.current) {
      clearTimeout(adminNoticeTimeoutRef.current);
    }
    setAdminNotice({ type, message });
    adminNoticeTimeoutRef.current = setTimeout(() => {
      setAdminNotice(null);
    }, 3500);
  };

  // Registro de alterações em módulos com persistência dedicada (ex: Chamadas e Personalizados)
  const [externalDirtyModules, setExternalDirtyModules] = useState<
    Map<string, { moduleId: AdminModuleId; label: string; onSave?: () => Promise<void> | void }>
  >(new Map());

  useEffect(() => {
    const handler = (e: any) => {
      setIsEditingSubView(Boolean(e.detail?.isDirty));
      setSubViewWarning(e.detail?.label || undefined);
    };
    window.addEventListener('nua_subview_dirty', handler);
    return () => window.removeEventListener('nua_subview_dirty', handler);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const { moduleId, label, isDirty, onSave } = e.detail || {};
      if (!moduleId) return;
      setExternalDirtyModules((prev) => {
        const next = new Map(prev);
        if (isDirty) {
          next.set(moduleId, { moduleId, label: label || moduleId, onSave });
        } else {
          next.delete(moduleId);
        }
        return next;
      });
    };
    window.addEventListener('nua_module_dirty', handler);
    return () => window.removeEventListener('nua_module_dirty', handler);
  }, []);

  // Instância ÚNICA global de monitoramento de pedidos (compartilhada via Provider no AdminPage)
  const notifications = useAdminOrderNotifications(
    (tab, sub) => handleSelectModule(tab as AdminModuleId, sub),
    {
      enabled: authenticated === true,
      adminProfile,
    }
  );
  const {
    orders,
    unreadCount,
    readOrderIds,
    showPermissionBanner,
    requestWindowsPermission,
    dismissPermissionBanner,
  } = notifications;

  // Verificação dinâmica de status de mensalidade (só consulta após login)
  useEffect(() => {
    if (authenticated !== true) return;
    let active = true;
    fetchClientInstallments()
      .then((res) => {
        if (!active || !res.success || !res.summary) return;
        if (res.summary.isUpToDate) {
          setSubscriptionStatus('paid');
        } else {
          const today = new Date().toISOString().split('T')[0];
          const isOverdue =
            res.summary.currentInstallment?.dueDate &&
            res.summary.currentInstallment.dueDate < today;
          setSubscriptionStatus(isOverdue ? 'overdue' : 'pending');
        }
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [authenticated]);

  // Badges calculadas a partir dos pedidos reais (Novo vs Visualizado vs Pendente, sem duplicação)
  const badges = useMemo(
    () => computeSidebarBadges(orders, readOrderIds),
    [orders, readOrderIds]
  );

  useEffect(() => {
    setIsLocal(isLocalhost());
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const initialSub = p.get('sub');
      if (initialSub) setSubAction(initialSub);
      const parsedMod = parseModuleFromUrl();
      if (parsedMod) {
        setActiveModule(parsedMod);
        const pathname = window.location.pathname;
        const isSubDomainRoot = !pathname.startsWith('/admin') && !pathname.startsWith('/admingeral');
        const prefix = isSubDomainRoot ? '' : pathname.startsWith('/admingeral') ? '/admingeral' : '/admin';
        const cleanUrl = `${prefix}/${parsedMod}${initialSub ? `?sub=${initialSub}` : ''}`;
        if (window.location.search.includes('module=')) {
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const p = new URLSearchParams(window.location.search);
      setSubAction(p.get('sub'));
      const parsedMod = parseModuleFromUrl();
      if (parsedMod) {
        setActiveModule(parsedMod);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Atalho global ⌘K / Ctrl+K e evento customizado para acionar o Spotlight Inteligente
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSpotlightOpen((prev) => !prev);
      }
    };
    const handleOpenSpotlight = () => setIsSpotlightOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open_spotlight', handleOpenSpotlight);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open_spotlight', handleOpenSpotlight);
    };
  }, []);

  const handleSelectModule = (id: AdminModuleId, nextSubAction?: string) => {
    const safeId: AdminModuleId =
      (!ADMIN_MAIL_ENABLED && id === 'mail') ||
      (id === 'avaliacoes' && adminProfile !== 'phdev')
        ? 'dashboard'
        : id;
    setActiveModule(safeId);
    const isMailSearch = safeId === 'mail' && Boolean(nextSubAction);
    const isCustomerSearch = safeId === 'clientes' && Boolean(nextSubAction);
    setMailInitialSearch(isMailSearch ? String(nextSubAction) : '');
    setCustomerInitialSearch(isCustomerSearch ? String(nextSubAction) : '');
    setSubAction(safeId === 'mail' || safeId === 'clientes' ? null : nextSubAction || null);
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isSubDomainRoot = !pathname.startsWith('/admin') && !pathname.startsWith('/admingeral');
      const prefix = isSubDomainRoot ? '' : pathname.startsWith('/admingeral') ? '/admingeral' : '/admin';
      const urlSubAction = safeId === 'mail' || safeId === 'clientes' ? '' : nextSubAction ? `?sub=${encodeURIComponent(nextSubAction)}` : '';
      const cleanUrl = `${prefix}/${safeId}${urlSubAction}`;
      window.history.pushState({}, '', cleanUrl);
    }
  };

  // Suporte a navegação programática entre módulos (ex: "Ver no Histórico" nas Chamadas VIP ou atalhos de Clientes)
  useEffect(() => {
    const handleAdminNavigate = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (!detail?.module) return;
      const resolved = resolveModuleFromParam(String(detail.module));
      if (!resolved) return;
      const nextSub = detail.subAction || detail.sub || undefined;
      handleSelectModule(resolved, nextSub ? String(nextSub) : undefined);
    };
    window.addEventListener('nua_admin_navigate', handleAdminNavigate);
    return () => window.removeEventListener('nua_admin_navigate', handleAdminNavigate);
  }, []);

  const refreshAdminSessionInfo = async () => {
    const info = await checkServerSessionInfo();
    if (info.authenticated) {
      setAdminProfile(info.profile);
      if (info.profile !== 'phdev') {
        setActiveModule((prev) => (prev === 'avaliacoes' ? 'dashboard' : prev));
      }
    } else {
      setAdminProfile('nua');
      setNuaPresence(null);
    }
    return info;
  };

  useEffect(() => {
    let mounted = true;

    if (isLocalhost()) {
      setAuthenticated(true);
      checkServerSessionInfo()
        .then((info) => {
          if (mounted && info.authenticated) {
            setAdminProfile(info.profile);
            if (info.profile !== 'phdev') {
              setActiveModule((prev) => (prev === 'avaliacoes' ? 'dashboard' : prev));
            }
          }
        })
        .catch(() => {});
      const draft = getDraftContent();
      setContent(draft);
      setHasUnpublished(hasUnpublishedChanges());
      fetchPublishedContentFromServer(true)
        .then((remote) => {
          if (remote && mounted) {
            localStorage.setItem('nua_published_content_v1', JSON.stringify(remote));
            const currentDraft = getDraftContent();
            const merged = mergePublishedIntoDraft(currentDraft, remote);
            setContent(merged);
            setHasUnpublished(hasUnpublishedChanges());
          }
        })
        .catch(() => { })
        .finally(() => {
          if (mounted) setIsContentLoading(false);
        });
      return () => {
        mounted = false;
      };
    }

    checkServerSessionInfo().then(async (sessionInfo) => {
      if (!mounted) return;
      const isAuth = sessionInfo.authenticated;
      setAuthenticated(isAuth);
      const resolvedProfile = isAuth ? sessionInfo.profile : 'nua';
      setAdminProfile(resolvedProfile);
      if (isAuth && resolvedProfile !== 'phdev') {
        setActiveModule((prev) => (prev === 'avaliacoes' ? 'dashboard' : prev));
      }
      if (isAuth) {
        try {
          const remote = await fetchPublishedContentFromServer(true);
          if (remote && mounted) {
            localStorage.setItem('nua_published_content_v1', JSON.stringify(remote));
            const currentDraft = getDraftContent();
            const merged = mergePublishedIntoDraft(currentDraft, remote);
            setContent(merged);
            setHasUnpublished(hasUnpublishedChanges());
            setIsContentLoading(false);
            return;
          }
        } catch { }
        if (!mounted) return;
        const draft = getDraftContent();
        setContent(draft);
        setHasUnpublished(hasUnpublishedChanges());
        setIsContentLoading(false);
      } else {
        setIsContentLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Heartbeat silencioso de presença quando a sessão autenticada é da Nua Borges
  const lastActivityMsRef = useRef<number>(Date.now());
  const activeModuleRef = useRef<AdminModuleId>(activeModule);
  useEffect(() => {
    activeModuleRef.current = activeModule;
  }, [activeModule]);

  useEffect(() => {
    if (authenticated !== true || adminProfile !== 'nua' || typeof window === 'undefined') return;

    const apiUrl = getPublicApiUrl();
    const INACTIVITY_LIMIT_MS = 3 * 60 * 1000;
    const HEARTBEAT_INTERVAL_MS = 15 * 1000;

    const markActivity = () => {
      lastActivityMsRef.current = Date.now();
    };

    const sendHeartbeat = (options?: { offline?: boolean; forceActive?: boolean }) => {
      const now = Date.now();
      const mod = activeModuleRef.current;
      const isVisible = document.visibilityState === 'visible';
      const isRecentlyActive = options?.forceActive || now - lastActivityMsRef.current <= INACTIVITY_LIMIT_MS;

      if (!options?.offline && (!isVisible || !isRecentlyActive)) {
        return;
      }

      fetch(`${apiUrl}/api/admin/presence`, {
        method: 'POST',
        credentials: 'include',
        keepalive: Boolean(options?.offline),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          options?.offline
            ? { offline: true }
            : {
                module: mod,
                moduleLabel: MODULE_METADATA[mod]?.label || mod,
                pathname: window.location.pathname,
                active: isRecentlyActive,
                lastActivityAt: new Date(lastActivityMsRef.current).toISOString(),
              }
        ),
      }).catch(() => {});
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        markActivity();
        sendHeartbeat({ forceActive: true });
      }
    };

    const handlePageHide = () => {
      sendHeartbeat({ offline: true });
    };

    const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const evt of activityEvents) {
      window.addEventListener(evt, markActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);

    markActivity();
    sendHeartbeat({ forceActive: true });
    const timer = window.setInterval(() => sendHeartbeat(), HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      for (const evt of activityEvents) {
        window.removeEventListener(evt, markActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [authenticated, adminProfile]);

  // Atualização imediata da página quando a Nua troca de módulo
  useEffect(() => {
    if (authenticated !== true || adminProfile !== 'nua' || typeof window === 'undefined') return;
    if (document.visibilityState !== 'visible') return;
    lastActivityMsRef.current = Date.now();
    const apiUrl = getPublicApiUrl();
    fetch(`${apiUrl}/api/admin/presence`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: activeModule,
        moduleLabel: MODULE_METADATA[activeModule]?.label || activeModule,
        pathname: window.location.pathname,
        active: true,
        lastActivityAt: new Date(lastActivityMsRef.current).toISOString(),
      }),
    }).catch(() => {});
  }, [authenticated, adminProfile, activeModule]);

  // Leitura discreta de presença da Nua — EXCLUSIVA do perfil PHDEV
  useEffect(() => {
    if (authenticated !== true || adminProfile !== 'phdev' || typeof window === 'undefined') {
      setNuaPresence(null);
      return;
    }

    let active = true;
    const apiUrl = getPublicApiUrl();
    const POLL_INTERVAL_MS = 8 * 1000;

    const pollPresence = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`${apiUrl}/api/admin/presence`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        if (!active) return;
        if (!res.ok) {
          setNuaPresence({ online: false });
          return;
        }
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (data?.online === true) {
          setNuaPresence({
            online: true,
            module: typeof data.module === 'string' ? data.module : undefined,
            moduleLabel: typeof data.moduleLabel === 'string' ? data.moduleLabel : undefined,
            pathname: typeof data.pathname === 'string' ? data.pathname : undefined,
          });
        } else {
          setNuaPresence({ online: false });
        }
      } catch {
        // Silencioso em caso de oscilação de rede
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollPresence();
      }
    };

    pollPresence();
    const timer = window.setInterval(pollPresence, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [authenticated, adminProfile]);

  useEffect(() => {
    /**
     * Aplica uma mudança de conteúdo FORA do updater de estado.
     *
     * `setContent(prev => { ...efeitoColateral... })` é impuro: o React (StrictMode)
     * executa o updater mais de uma vez, o que duplicava chamadas de rede e gravava
     * eventos de auditoria a cada re-execução. Aqui o próximo estado é calculado uma
     * única vez, a partir de `contentRef`, e o save só ocorre se algo mudou de fato.
     */
    const applyContentState = (updater: (prev: SiteContent) => SiteContent): void => {
      const prev = contentRef.current;
      if (!prev) return;
      const next = updater(prev);
      if (next === prev) return;
      contentRef.current = next;
      setContent(next);
      saveDraftContent(next);
      setHasUnpublished(true);
    };

    const handleDraftUpdated = (e: any) => {
      const detail = e?.detail;
      if (!detail) {
        const fresh = getDraftContent();
        if (fresh) {
          setContent(fresh);
          setHasUnpublished(true);
        }
        return;
      }

      if (detail.type === 'replace_draft' && detail.data?.content) {
        const incoming = detail.data.content;
        const prev = contentRef.current;
        // A biblioteca trafega enxuta pela IA: reidratar com os campos completos
        // locais (variants, métricas) para não degradar as imagens do acervo.
        if (Array.isArray(incoming.library)) {
          incoming.library = rehydrateLibrary(incoming.library, prev?.library);
        } else if (Array.isArray(prev?.library)) {
          // Blindagem: conteúdo sem biblioteca NUNCA pode substituir o acervo local.
          incoming.library = prev.library;
        }
        contentRef.current = incoming;
        setContent(incoming);
        saveDraftContent(incoming);
        setHasUnpublished(true);
      } else if (detail.type === 'published') {
        // Publicação aprovada pelo cartão da Nay: o rascunho virou produção.
        if (detail.version || detail.updatedAt) {
          setContent((prev) =>
            prev
              ? {
                ...prev,
                ...(detail.version ? { _version: detail.version } : {}),
                ...(detail.updatedAt ? { _updatedAt: detail.updatedAt } : {}),
              }
              : prev
          );
        }
        setHasUnpublished(false);
        setPublishSuccessToast(true);
        setTimeout(() => setPublishSuccessToast(false), 3500);
      } else if (detail.type === 'apply_content_ops' && Array.isArray(detail.ops)) {
        applyContentState((prev) => {
          const res = applyContentOps(prev, detail.ops);
          return res.ok && res.content ? res.content : prev;
        });
      } else if (detail.type === 'update_admin_content_fields' && detail.section && detail.fields) {
        applyContentState((prev) => ({
          ...prev,
          [detail.section]: {
            ...(prev as any)[detail.section],
            ...detail.fields,
          },
        }));
      } else if (detail.type === 'create_pack_draft' && detail.pack) {
        applyContentState((prev) => {
          const currentPacks = prev.avulsos?.items || [];
          return {
            ...prev,
            avulsos: {
              eyebrow: prev.avulsos?.eyebrow || 'CONTEÚDOS AVULSOS',
              title: prev.avulsos?.title || 'Acervo Sob Demanda',
              subtitle: prev.avulsos?.subtitle || 'Produções autorais sob demanda.',
              active: prev.avulsos?.active !== false,
              items: [detail.pack, ...currentPacks],
            },
          };
        });
      } else if (detail.type === 'update_pack_draft' && detail.fields) {
        applyContentState((prev) => {
          if (!prev?.avulsos?.items?.length) return prev;
          const items = prev.avulsos.items;
          let idx = detail.id ? items.findIndex((p: any) => p.id === detail.id) : -1;
          if (idx < 0 && detail.implicitTarget) idx = 0;
          if (idx < 0) return prev;
          const { addPhotos, addVideos, ...plain } = detail.fields;
          const cur: any = items[idx];
          const next: any = { ...cur, ...plain };
          if (addPhotos?.length) {
            next.previewImages = Array.from(new Set([...(cur.previewImages || []), ...addPhotos]));
          }
          if (addVideos?.length) next.videos = [...(cur.videos || []), ...addVideos];
          const newItems = items.map((p: any, i: number) => (i === idx ? next : p));
          return { ...prev, avulsos: { ...prev.avulsos, items: newItems } };
        });
      } else {
        const fresh = getDraftContent();
        if (fresh) {
          contentRef.current = fresh;
          setContent(fresh);
          setHasUnpublished(true);
        }
      }
    };

    window.addEventListener('nua_draft_updated', handleDraftUpdated);
    return () => window.removeEventListener('nua_draft_updated', handleDraftUpdated);
  }, []);

  const handleContentChange = (
    updated: SiteContent | ((prev: SiteContent) => SiteContent)
  ) => {
    const prev = contentRef.current;
    if (!prev) return;
    const next = typeof updated === 'function' ? updated(prev) : updated;
    if (next === prev) return;
    contentRef.current = next;
    setContent(next);
    saveDraftContent(next);
    setHasUnpublished(true);
  };

  /**
   * Executa operações administrativas imediatas:
   * Persiste diretamente no Supabase sem necessidade de aprovação editorial ou publicação.
   * Não altera o status de rascunho de áreas publicadas nem exibe pendências indevidas.
   */
  const handleAdministrativeChange = async (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    const prev = contentRef.current || getDraftContent() || ({} as SiteContent);
    const next = updater(prev);
    if (next === prev) return { success: true };

    // Aplica estado local imediatamente para feedback reativo
    contentRef.current = next;
    setContent(next);

    try {
      const res = await persistAdministrativeContent(next, {
        summary: options?.summary || 'Alteração administrativa',
        force: true,
      });

      if (!res.success) {
        contentRef.current = prev;
        setContent(prev);
        const errorMsg = res.error || 'Não foi possível salvar a alteração. Tente novamente em instantes.';
        showAdminNotice('error', errorMsg);
        return { success: false, error: errorMsg };
      }

      setHasUnpublished(hasUnpublishedChanges());
      showAdminNotice('success', options?.feedbackMessage || 'Alteração salva com sucesso.');
      return { success: true };
    } catch {
      contentRef.current = prev;
      setContent(prev);
      const errorMsg = 'Não foi possível salvar a alteração. Tente novamente em instantes.';
      showAdminNotice('error', errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const handleUploadNewImage = (img: LibraryImageItem) => {
    return handleAdministrativeChange((prev) => {
      const current = prev.library || [];
      if (current.some((item) => item.id === img.id)) return prev;
      return {
        ...prev,
        library: [img, ...current],
      };
    }, { summary: 'Mídia adicionada ao acervo', feedbackMessage: 'Arquivo salvo no acervo.' });
  };

  const handlePublish = async () => {
    if ((!content && externalDirtyModules.size === 0) || isPublishing) return;
    if (isEditingSubView) {
      setPublishError(subViewWarning || 'Salve ou feche a edição atual antes de publicar no site.');
      setTimeout(() => setPublishError(null), 5000);
      return;
    }
    setIsPublishing(true);
    setPublishError(null);

    try {
      // 1. Persiste módulos dedicados que estiverem com pendências (ex: Chamadas e Personalizados)
      for (const item of externalDirtyModules.values()) {
        if (item.onSave) {
          await item.onSave();
        }
      }
      setExternalDirtyModules(new Map());

      // 2. Se houver alterações no rascunho do site (CMS), publica na nuvem
      if (content && hasUnpublished) {
        const result = await publishContent(content, { force: true });
        if (!result.success) {
          setIsPublishing(false);
          setPublishError(result.error || 'Não foi possível publicar. Tente novamente.');
          setTimeout(() => setPublishError(null), 7000);
          if (result.sessionExpired) {
            setAuthenticated(false);
          }
          return;
        }
        if (result.updatedAt) {
          setContent((prev) =>
            prev ? { ...prev, _updatedAt: result.updatedAt, _version: result.version } : prev
          );
        }
        setHasUnpublished(false);
      }

      setIsPublishing(false);
      setPublishSuccessToast(true);
      setTimeout(() => setPublishSuccessToast(false), 3500);
    } catch {
      setIsPublishing(false);
      setPublishError('Não foi possível salvar e publicar as alterações. Tente novamente em instantes.');
      setTimeout(() => setPublishError(null), 7000);
    }
  };

  const handleLogout = () => {
    clearSession();
    setAdminProfile('nua');
    setNuaPresence(null);
    setAuthenticated(false);
  };

  const pendingSummary = useMemo(() => {
    return getPendingChangesSummary();
  }, [content]);

  const allModifiedSections = useMemo(() => {
    const list = [...pendingSummary.modifiedSections];
    for (const [modId, item] of externalDirtyModules.entries()) {
      if (!list.some((s) => s.moduleId === modId)) {
        list.push({
          moduleId: item.moduleId as any,
          label: item.label,
          selector: (item as any).selector,
        });
      }
    }
    return list;
  }, [pendingSummary.modifiedSections, externalDirtyModules]);

  const hasAnyUnpublished = useMemo(() => {
    return allModifiedSections.length > 0;
  }, [allModifiedSections]);

  const modifiedModuleIds = useMemo(
    () => allModifiedSections.map((s) => s.moduleId),
    [allModifiedSections]
  );

  const handleNavigateToModule = (moduleId: AdminModuleId, selector?: string) => {
    handleSelectModule(moduleId);

    if (typeof window === 'undefined') return;

    const tryHighlight = (attempts = 0) => {
      let targetEl: HTMLElement | null = null;
      if (selector) {
        targetEl = document.querySelector(selector) as HTMLElement | null;
      }
      if (!targetEl) {
        targetEl = document.querySelector('[data-dirty="true"]') as HTMLElement | null;
      }
      if (!targetEl && attempts < 8) {
        setTimeout(() => tryHighlight(attempts + 1), 70);
        return;
      }
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement) {
          try {
            targetEl.focus({ preventScroll: true });
          } catch {}
        }

        targetEl.classList.remove('nua-highlight-field');
        // trigger reflow
        void targetEl.offsetWidth;
        targetEl.classList.add('nua-highlight-field');

        setTimeout(() => {
          targetEl?.classList.remove('nua-highlight-field');
        }, 3500);
      }
    };

    setTimeout(() => tryHighlight(0), 120);
  };

  const handleDiscardDraft = () => {
    const published = discardDraftChanges();
    contentRef.current = published;
    setContent(published);
    setHasUnpublished(false);
    setExternalDirtyModules(new Map());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nua_module_discard'));
    }
  };

  return {
    authenticated,
    setAuthenticated,
    adminProfile,
    nuaPresence,
    refreshAdminSessionInfo,
    isContentLoading,
    content,
    setContent,
    activeModule,
    setActiveModule,
    subAction,
    setSubAction,
    handleSelectModule,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isSpotlightOpen,
    setIsSpotlightOpen,
    searchQuery,
    setSearchQuery,
    mailInitialSearch,
    customerInitialSearch,
    subscriptionStatus,
    hasUnpublished: hasAnyUnpublished,
    setHasUnpublished,
    publishSuccessToast,
    setPublishSuccessToast,
    publishError,
    setPublishError,
    isPublishing,
    isLocal,
    notifications,
    orders,
    unreadCount,
    readOrderIds,
    badges,
    showPermissionBanner,
    requestWindowsPermission,
    dismissPermissionBanner,
    modifiedSections: allModifiedSections,
    modifiedModuleIds,
    isEditingSubView,
    subViewWarning,
    handleNavigateToModule,
    handleDiscardDraft,
    handleContentChange,
    handleAdministrativeChange,
    adminNotice,
    setAdminNotice,
    handleUploadNewImage,
    handlePublish,
    handleLogout,
  };
}
