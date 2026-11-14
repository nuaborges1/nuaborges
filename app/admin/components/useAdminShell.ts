'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import {
  getDraftContent,
  saveDraftContent,
  publishContent,
  hasUnpublishedChanges,
  checkServerSession,
  clearSession,
  fetchPublishedContentFromServer,
  mergePublishedIntoDraft,
} from '@/lib/contentStore';
import { isLocalhost } from '@/lib/env';
import { useAdminOrderNotifications } from '@/hooks/useAdminOrderNotifications';
import { fetchClientInstallments } from '@/lib/services/nua/financeService';
import { applyContentOps, rehydrateLibrary } from '@/lib/nuaAi/contentOps.mjs';
import { AdminModuleId, ModuleBadgeInfo, resolveModuleFromParam } from './types';

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
  const [content, setContent] = useState<SiteContent | null>(null);
  // Espelho síncrono de `content`. Os updaters de estado do React são re-executados
  // (StrictMode) e não podem ter efeitos colaterais — usamos esta referência para
  // calcular o próximo estado fora do updater e disparar o save uma única vez.
  const contentRef = useRef<SiteContent | null>(null);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  const [activeModule, setActiveModule] = useState<AdminModuleId>('conteudos');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'paid' | 'pending' | 'overdue' | 'loading'>('paid');

  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [publishSuccessToast, setPublishSuccessToast] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLocal, setIsLocal] = useState(false);

  // Hook unificado de notificações
  const { orders, unreadCount } = useAdminOrderNotifications();

  // Verificação dinâmica de status de mensalidade
  useEffect(() => {
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
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Badges calculadas a partir dos pedidos reais
  const badges = useMemo(() => {
    const result: Partial<Record<AdminModuleId, ModuleBadgeInfo>> = {};

    const persPending = orders.filter(
      (o) =>
        o.type === 'personalizado' &&
        !o.meta?.isPack &&
        ['pending', 'paid', 'pendente', 'em_producao', 'pending_payment'].includes(o.status)
    ).length;
    if (persPending > 0) {
      result.personalizados = { count: persPending, variant: 'danger' };
    }

    const chamadasPending = orders.filter(
      (o) =>
        o.type === 'appointment' &&
        ['pendente', 'confirmada', 'pending_payment'].includes(o.status)
    ).length;
    if (chamadasPending > 0) {
      result.chamadas = { count: chamadasPending, variant: 'danger' };
    }

    const packSales = orders.filter((o) => o.meta?.isPack).length;
    if (packSales > 0) {
      result.conteudos = { count: packSales, variant: 'info' };
    }

    if (unreadCount > 0) {
      result.alertas = { count: unreadCount, variant: 'danger' };
    }

    return result;
  }, [orders, unreadCount]);

  useEffect(() => {
    setIsLocal(isLocalhost());
    if (typeof window !== 'undefined') {
      const parsedMod = parseModuleFromUrl();
      if (parsedMod) {
        setActiveModule(parsedMod);
        const pathname = window.location.pathname;
        const isSubDomainRoot = !pathname.startsWith('/admin') && !pathname.startsWith('/admingeral');
        const prefix = isSubDomainRoot ? '' : pathname.startsWith('/admingeral') ? '/admingeral' : '/admin';
        const cleanUrl = `${prefix}/${parsedMod}`;
        if (window.location.search.includes('module=')) {
          window.history.replaceState({}, '', cleanUrl);
        }
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
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

  const handleSelectModule = (id: AdminModuleId, subAction?: string) => {
    setActiveModule(id);
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isSubDomainRoot = !pathname.startsWith('/admin') && !pathname.startsWith('/admingeral');
      const prefix = isSubDomainRoot ? '' : pathname.startsWith('/admingeral') ? '/admingeral' : '/admin';
      const cleanUrl = `${prefix}/${id}${subAction ? `?sub=${subAction}` : ''}`;
      window.history.pushState({}, '', cleanUrl);
    }
  };

  useEffect(() => {
    let mounted = true;

    if (isLocalhost()) {
      setAuthenticated(true);
      const draft = getDraftContent();
      setContent(draft);
      setHasUnpublished(hasUnpublishedChanges());
      fetchPublishedContentFromServer()
        .then((remote) => {
          if (remote && mounted) {
            localStorage.setItem('nua_published_content_v1', JSON.stringify(remote));
            const currentDraft = getDraftContent();
            const merged = mergePublishedIntoDraft(currentDraft, remote);
            setContent(merged);
          }
        })
        .catch(() => {});
      return () => {
        mounted = false;
      };
    }

    checkServerSession().then(async (isAuth) => {
      if (!mounted) return;
      setAuthenticated(isAuth);
      if (isAuth) {
        try {
          const remote = await fetchPublishedContentFromServer();
          if (remote && mounted) {
            localStorage.setItem('nua_published_content_v1', JSON.stringify(remote));
            const currentDraft = getDraftContent();
            const merged = mergePublishedIntoDraft(currentDraft, remote);
            setContent(merged);
            setHasUnpublished(hasUnpublishedChanges());
            return;
          }
        } catch {}
        if (!mounted) return;
        const draft = getDraftContent();
        setContent(draft);
        setHasUnpublished(hasUnpublishedChanges());
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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
        // Publicação aprovada pelo cartão da Nua IA: o rascunho virou produção.
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

  const handleUploadNewImage = (img: LibraryImageItem) => {
    handleContentChange((prev) => {
      const existing = (prev.library || []).filter((i) => i.id !== img.id);
      return {
        ...prev,
        library: [img, ...existing],
      };
    });
  };

  const handlePublish = async () => {
    if (!content || isPublishing) return;
    setIsPublishing(true);
    setPublishError(null);
    const result = await publishContent(content, { force: true });
    setIsPublishing(false);

    if (result.success) {
      if (result.updatedAt) {
        setContent((prev) =>
          prev ? { ...prev, _updatedAt: result.updatedAt, _version: result.version } : prev
        );
      }
      setHasUnpublished(false);
      setPublishSuccessToast(true);
      setTimeout(() => setPublishSuccessToast(false), 3500);
      return;
    }

    setPublishError(result.error || 'Não foi possível publicar. Tente novamente.');
    setTimeout(() => setPublishError(null), 7000);
    if (result.sessionExpired) {
      setAuthenticated(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setAuthenticated(false);
  };

  return {
    authenticated,
    setAuthenticated,
    content,
    setContent,
    activeModule,
    setActiveModule,
    handleSelectModule,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isSpotlightOpen,
    setIsSpotlightOpen,
    searchQuery,
    setSearchQuery,
    isPreviewOpen,
    setIsPreviewOpen,
    subscriptionStatus,
    hasUnpublished,
    setHasUnpublished,
    publishSuccessToast,
    setPublishSuccessToast,
    publishError,
    setPublishError,
    isPublishing,
    isLocal,
    unreadCount,
    badges,
    handleContentChange,
    handleUploadNewImage,
    handlePublish,
    handleLogout,
  };
}
