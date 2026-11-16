'use client';

import { useState, useEffect } from 'react';
import { SiteContent, LibraryImageItem } from './types';
import { DEFAULT_SITE_CONTENT } from './defaultContent';
import { isLocalhost } from './env';
import {
  STORAGE_KEYS,
  getPublicApiUrl,
  getStoredSessionToken,
  setStoredSessionToken,
  clearStoredSessionToken,
} from './sessionToken';
import { normalizeSiteContent } from './content/normalize';
import { diffContentChanges, getModifiedSections, type ModifiedSectionInfo } from './content/diff';
import {
  verifyAdminPassword,
  setAdminPassword,
  checkServerSession,
  isSessionActive,
  setSessionActive,
  clearSession,
} from './content/auth';
import { optimizeAndStoreImage, deleteStoredMedia } from './content/mediaUpload';

export type { ModifiedSectionInfo };
export {
  STORAGE_KEYS,
  getPublicApiUrl,
  getStoredSessionToken,
  setStoredSessionToken,
  clearStoredSessionToken,
  normalizeSiteContent,
  diffContentChanges,
  getModifiedSections,
  verifyAdminPassword,
  setAdminPassword,
  checkServerSession,
  isSessionActive,
  setSessionActive,
  clearSession,
  optimizeAndStoreImage,
  deleteStoredMedia,
};

export function getPublishedContent(): SiteContent {
  if (typeof window === 'undefined') return DEFAULT_SITE_CONTENT;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PUBLISHED);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeSiteContent(parsed);
    }
    // NUNCA fazer fallback para STORAGE_KEYS.DRAFT no site público!
    return DEFAULT_SITE_CONTENT;
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export function getDraftContent(): SiteContent {
  if (typeof window === 'undefined') return DEFAULT_SITE_CONTENT;
  try {
    const draftRaw = localStorage.getItem(STORAGE_KEYS.DRAFT);
    if (draftRaw) {
      const parsed = JSON.parse(draftRaw);
      return normalizeSiteContent(parsed);
    }
    return getPublishedContent();
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export function mergePublishedIntoDraft(draft: SiteContent, remote: SiteContent): SiteContent {
  if (!remote) return draft;

  const remoteVer = Number(remote._version || 0);
  const draftVer = Number(draft._version || 0);

  // Se o servidor possui uma versão mais nova ou se não há alterações não publicadas, converge para a verdade oficial
  if (!hasUnpublishedChanges() || remoteVer > draftVer) {
    try {
      localStorage.setItem(STORAGE_KEYS.PUBLISHED, JSON.stringify(remote));
      localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(remote));
    } catch {}
    return remote;
  }

  // Se há edições locais em andamento, garante que o acervo/biblioteca e álbuns oficiais
  // não fiquem defasados ou vazios caso novas mídias tenham sido sincronizadas no servidor
  const mergedDraft: SiteContent = {
    ...draft,
    library:
      Array.isArray(remote.library) && remote.library.length > (draft.library?.length || 0)
        ? remote.library
        : draft.library || remote.library || [],
    albums:
      Array.isArray(remote.albums) && remote.albums.length > (draft.albums?.length || 0)
        ? remote.albums
        : draft.albums || remote.albums || [],
  };

  try {
    localStorage.setItem(STORAGE_KEYS.PUBLISHED, JSON.stringify(remote));
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(mergedDraft));
  } catch {}
  return mergedDraft;
}

export function discardDraftChanges(): SiteContent {
  if (typeof window === 'undefined') return DEFAULT_SITE_CONTENT;
  try {
    const published = getPublishedContent();
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(published));
    window.dispatchEvent(new CustomEvent('nua-draft-updated', { detail: { type: 'discard' } }));
    window.dispatchEvent(new CustomEvent('nua_draft_updated', { detail: { type: 'discard' } }));
    return published;
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export function getPendingChangesSummary(): {
  hasChanges: boolean;
  modifiedSections: ModifiedSectionInfo[];
  changesList: string[];
} {
  if (typeof window === 'undefined') {
    return { hasChanges: false, modifiedSections: [], changesList: [] };
  }
  try {
    const published = getPublishedContent();
    const draft = getDraftContent();
    if (!draft) {
      return { hasChanges: false, modifiedSections: [], changesList: [] };
    }
    const modifiedSections = getModifiedSections(published, draft);
    if (modifiedSections.length === 0) {
      return { hasChanges: false, modifiedSections: [], changesList: [] };
    }
    return {
      hasChanges: true,
      modifiedSections,
      changesList: [],
    };
  } catch {
    return { hasChanges: false, modifiedSections: [], changesList: [] };
  }
}

// === Granular Diff & Audit Tracker ===
let draftDebounceTimer: any = null;
let previousContentSnapshot: SiteContent | null = null;
// Conteúdo cujo `prev` ainda não foi fechado pelo debounce. Evita que a segunda
// invocação de um updater de estado (React StrictMode) leia um rascunho já gravado
// e calcule um diff vazio — o evento de auditoria real seria perdido.
let pendingPreviousSnapshot: SiteContent | null = null;

export function saveDraftContent(content: SiteContent): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = pendingPreviousSnapshot || previousContentSnapshot || getDraftContent();
    pendingPreviousSnapshot = prev;
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(content));
    window.dispatchEvent(new CustomEvent('nua-draft-updated', { detail: content }));

    if (draftDebounceTimer) clearTimeout(draftDebounceTimer);
    draftDebounceTimer = setTimeout(() => {
      const diffList = diffContentChanges(prev, content);
      previousContentSnapshot = content;
      pendingPreviousSnapshot = null;
      draftDebounceTimer = null;

      // Nada mudou de fato (ex.: updater invocado duas vezes): não registra
      // evento de auditoria vazio nem faz requisição inútil.
      if (diffList.length === 0) return;

      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();

      // Auditoria é opcional: falha aqui não pode afetar o rascunho já gravado.
      // Sem retentativa — 4xx/404 são permanentes e apenas poluiriam o console.
      fetch(`${apiUrl}/api/audit/event`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'CONTENT_DRAFT_SAVE',
          severity: 'info',
          summary: `Edição no painel: ${diffList.join(' • ')}`,
          details: {
            changes: diffList,
            heroTitle: content.hero?.title,
            aboutBioPreview: (content.about?.paragraph1 || '')?.substring(0, 100),
            photosCount: (content.gallery?.photos?.length || 0) + (content.hero?.photos?.length || 0),
          },
        }),
      })
        .then((res) => {
          if (res.status === 404 || res.status === 405) {
            console.warn('[ContentStore] Endpoint de auditoria indisponível; evento descartado.');
          }
        })
        .catch(() => {
          // Offline / servidor local parado: rascunho já persistido localmente.
        });
    }, 1500);
  } catch (err) {
    console.error('Falha ao salvar rascunho:', err);
  }
}

export interface PublishResult {
  success: boolean;
  error?: string;
  sessionExpired?: boolean;
  conflict?: boolean;
  serverUpdatedAt?: string;
  updatedAt?: string;
  version?: number;
}

export async function persistAdministrativeContent(
  content: SiteContent,
  options?: { summary?: string; force?: boolean }
): Promise<PublishResult> {
  if (typeof window === 'undefined') return { success: false, error: 'Indisponível no servidor.' };

  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();

  try {
    const res = await fetch(`${apiUrl}/api/content/sync`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        content,
        summary: options?.summary || 'Operação administrativa executada diretamente',
        editorName: 'Painel Oficial do Cliente (Admin)',
        isAdministrative: true,
        force: true,
      }),
    });

    if (res.status === 401) {
      if (!isLocalhost()) {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        return {
          success: false,
          sessionExpired: true,
          error: 'Sua sessão expirou. Entre novamente para salvar.',
        };
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Não foi possível persistir no banco de dados (erro ${res.status}).`,
      };
    }

    const data = await res.json().catch(() => ({}));
    if (data.updatedAt) {
      (content as any)._updatedAt = data.updatedAt;
      (content as any)._version = data.version;
    }
  } catch (err: any) {
    if (!isLocalhost()) {
      return {
        success: false,
        error: err?.message || 'Sem conexão com o servidor. Verifique sua conexão e tente novamente.',
      };
    }
  }

  // Atualiza os caches locais de forma consistente
  try {
    const currentPublished = getPublishedContent() || DEFAULT_SITE_CONTENT;
    
    // Atualiza o publicado com a parte administrativa
    const mergedPublished: SiteContent = {
      ...currentPublished,
      library: content.library || currentPublished.library,
      albums: content.albums || currentPublished.albums,
      // Se a galeria ou avulsos foram reorganizados ou tiveram itens removidos administrativamente:
      gallery: {
        ...currentPublished.gallery,
        photos: (content.gallery?.photos || []).filter((p) => !p.isPendingPublish),
      },
      avulsos: content.avulsos,
      adminUi: content.adminUi || currentPublished.adminUi,
      _updatedAt: (content as any)._updatedAt || new Date().toISOString(),
      _version: (content as any)._version,
    };

    localStorage.setItem(STORAGE_KEYS.PUBLISHED, JSON.stringify(mergedPublished));
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(content));
  } catch (err) {
    console.warn('[ContentStore] Cache local cheio:', err);
  }

  window.dispatchEvent(new CustomEvent('nua-content-updated', { detail: content }));
  window.dispatchEvent(new CustomEvent('nua_admin_persisted', { detail: content }));

  return {
    success: true,
    updatedAt: (content as any)._updatedAt,
    version: (content as any)._version,
  };
}

export async function publishContent(
  content: SiteContent,
  options?: { baseUpdatedAt?: string; force?: boolean }
): Promise<PublishResult> {
  if (typeof window === 'undefined') return { success: false, error: 'Indisponível no servidor.' };

  // Ao publicar oficialmente, remove as flags de pendência de publicação das fotos da galeria
  const cleanPhotos = (content.gallery?.photos || []).map((p) => {
    if (p.isPendingPublish) {
      const { isPendingPublish, ...rest } = p;
      return { ...rest, active: true };
    }
    return p;
  });

  const cleanContent: SiteContent = {
    ...content,
    gallery: {
      ...content.gallery,
      photos: cleanPhotos,
    },
  };

  const prev = getPublishedContent();
  const diffList = diffContentChanges(prev, cleanContent);
  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();

  try {
    const res = await fetch(`${apiUrl}/api/content/sync`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        content: cleanContent,
        summary: `Publicação Oficial de Conteúdo: ${diffList.join(' • ')}`,
        editorName: 'Painel Oficial do Cliente',
        baseUpdatedAt: options?.baseUpdatedAt || (cleanContent as any)._updatedAt,
        force: options?.force ?? true,
      }),
    });

    if (res.status === 401) {
      if (!isLocalhost()) {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        return {
          success: false,
          sessionExpired: true,
          error: 'Sua sessão expirou. Entre novamente para publicar (seu rascunho foi mantido).',
        };
      }
    }

    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      if (data.updatedAt) {
        (cleanContent as any)._updatedAt = data.updatedAt;
        (cleanContent as any)._version = data.version;
      }
    }

    if (!res.ok && !isLocalhost()) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Não foi possível publicar (erro ${res.status}). Tente novamente.`,
      };
    }

    const data = await res.json().catch(() => ({}));
    if (data.updatedAt) {
      (cleanContent as any)._updatedAt = data.updatedAt;
      (cleanContent as any)._version = data.version;
    }
  } catch {
    if (!isLocalhost()) {
      return {
        success: false,
        error: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
      };
    }
  }

  try {
    localStorage.setItem(STORAGE_KEYS.PUBLISHED, JSON.stringify(cleanContent));
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(cleanContent));
  } catch (err) {
    console.warn('[ContentStore] Cache local cheio; conteúdo já publicado no servidor.', err);
  }
  window.dispatchEvent(new CustomEvent('nua-content-updated', { detail: cleanContent }));

  return {
    success: true,
    updatedAt: (cleanContent as any)._updatedAt,
    version: (cleanContent as any)._version,
  };
}

export function hasUnpublishedChanges(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const published = getPublishedContent() || DEFAULT_SITE_CONTENT;
    const draft = getDraftContent();
    if (!draft) return false;

    // 1. Fotos na galeria aguardando publicação
    const hasPendingPhotos = (draft.gallery?.photos || []).some((p) => p.isPendingPublish);
    if (hasPendingPhotos) return true;

    // 2. Seções editoriais modificadas
    const modified = getModifiedSections(published, draft);
    return modified.length > 0;
  } catch {
    return false;
  }
}

export function resetContentToDefault(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
    localStorage.removeItem(STORAGE_KEYS.PUBLISHED);
    window.dispatchEvent(new CustomEvent('nua-content-updated', { detail: DEFAULT_SITE_CONTENT }));
  } catch (err) {
    console.error('Falha ao resetar conteúdo:', err);
  }
}

export async function fetchPublishedContentFromServer(forceAdmin = false): Promise<SiteContent | null> {
  if (typeof window === 'undefined') return null;
  try {
    const apiUrl = getPublicApiUrl();
    const token = getStoredSessionToken();
    const hostname = window.location.hostname || '';
    const pathname = window.location.pathname || '';
    const isDomainAdmin = hostname.includes('admin') || hostname.includes('admingeral');
    const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/admingeral') || pathname.includes('/admin');
    const isAdmin = forceAdmin || !!token || isDomainAdmin || isAdminPath;
    const endpoint = `${apiUrl}/api/content/sync${isAdmin ? '?mode=admin' : ''}`;
    const headers: Record<string, string> = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && !data.error && data.exists !== false) {
        const remote = data.content || data;
        if (remote && typeof remote === 'object') {
          const normalized = normalizeSiteContent(remote);
          if (data.updatedAt || remote._updatedAt) {
            normalized._updatedAt = data.updatedAt || remote._updatedAt;
          }
          if (data.version || remote._version) {
            normalized._version = data.version || remote._version;
          }
          return normalized;
        }
      }
    }
  } catch {}
  return null;
}

export function usePublishedContent(): SiteContent {
  const [content, setContent] = useState<SiteContent>(() => {
    if (typeof window !== 'undefined') {
      try {
        return getPublishedContent();
      } catch {}
    }
    return DEFAULT_SITE_CONTENT;
  });

  useEffect(() => {
    try {
      setContent(getPublishedContent());
    } catch {}

    const apiUrl = getPublicApiUrl();
    fetch(`${apiUrl}/api/content/sync`, {
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === 'object' && !data.error && data.exists !== false) {
          const remote = data.content || data;
          if (remote && typeof remote === 'object') {
            const normalized = normalizeSiteContent(remote);
            localStorage.setItem(STORAGE_KEYS.PUBLISHED, JSON.stringify(normalized));
            setContent(normalized);
          }
        }
      })
      .catch(() => {});

    const handleUpdate = () => {
      setContent(getPublishedContent());
    };

    window.addEventListener('nua-content-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('nua-content-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return content;
}
