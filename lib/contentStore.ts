'use client';

import { useState, useEffect, useCallback } from 'react';
import { SiteContent, LibraryImageItem } from './types';
import { DEFAULT_SITE_CONTENT } from './defaultContent';
import { mediaService, resolveMediaUrl } from './media';

const STORAGE_KEYS = {
  PUBLISHED: 'nua_published_content_v1',
  DRAFT: 'nua_draft_content_v1',
  SESSION: 'nua_admin_session_v1',
  PASSWORD_HASH: 'nua_admin_pwd_hash_v1',
};

// Default master password hash for "nuaborges2026"
// SHA-256 of "nuaborges2026" = "36ddbcfd890e5cf09c6715800095228998b41c29525d995a7c65a21ec9a610e6"
const DEFAULT_PWD_HASH = '36ddbcfd890e5cf09c6715800095228998b41c29525d995a7c65a21ec9a610e6';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeSiteContent(parsed: any): SiteContent {
  if (!parsed || typeof parsed !== 'object') return DEFAULT_SITE_CONTENT;

  const onlyfansTags = Array.isArray(parsed.channels?.onlyfans?.tags)
    ? parsed.channels.onlyfans.tags
    : typeof parsed.channels?.onlyfans?.tags === 'string'
    ? parsed.channels.onlyfans.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
    : DEFAULT_SITE_CONTENT.channels.onlyfans.tags;

  const instagramTags = Array.isArray(parsed.channels?.instagram?.tags)
    ? parsed.channels.instagram.tags
    : typeof parsed.channels?.instagram?.tags === 'string'
    ? parsed.channels.instagram.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
    : DEFAULT_SITE_CONTENT.channels.instagram.tags;

  const contactSubjects = Array.isArray(parsed.contact?.subjects)
    ? parsed.contact.subjects
    : typeof parsed.contact?.subjects === 'string'
    ? parsed.contact.subjects.split('\n').map((s: string) => s.trim()).filter(Boolean)
    : DEFAULT_SITE_CONTENT.contact.subjects;

  return {
    ...DEFAULT_SITE_CONTENT,
    ...parsed,
    seo: {
      ...DEFAULT_SITE_CONTENT.seo,
      ...(parsed.seo || {}),
    },
    header: {
      ...DEFAULT_SITE_CONTENT.header,
      ...(parsed.header || {}),
    },
    hero: {
      ...DEFAULT_SITE_CONTENT.hero,
      ...(parsed.hero || {}),
      photos: Array.isArray(parsed.hero?.photos) && parsed.hero.photos.length > 0
        ? parsed.hero.photos
        : DEFAULT_SITE_CONTENT.hero.photos,
    },
    gallery: {
      ...DEFAULT_SITE_CONTENT.gallery,
      ...(parsed.gallery || {}),
      photos: Array.isArray(parsed.gallery?.photos)
        ? parsed.gallery.photos
        : DEFAULT_SITE_CONTENT.gallery.photos,
    },
    about: {
      ...DEFAULT_SITE_CONTENT.about,
      ...(parsed.about || {}),
    },
    channels: {
      ...DEFAULT_SITE_CONTENT.channels,
      ...(parsed.channels || {}),
      onlyfans: {
        ...DEFAULT_SITE_CONTENT.channels.onlyfans,
        ...(parsed.channels?.onlyfans || {}),
        tags: onlyfansTags,
      },
      instagram: {
        ...DEFAULT_SITE_CONTENT.channels.instagram,
        ...(parsed.channels?.instagram || {}),
        tags: instagramTags,
      },
      contactBanner: {
        ...DEFAULT_SITE_CONTENT.channels.contactBanner,
        ...(parsed.channels?.contactBanner || {}),
      },
    },
    contact: {
      ...DEFAULT_SITE_CONTENT.contact,
      ...(parsed.contact || {}),
      subjects: contactSubjects,
    },
    footer: {
      ...DEFAULT_SITE_CONTENT.footer,
      ...(parsed.footer || {}),
    },
    institutional: {
      sectionTitle:
        typeof parsed.institutional?.sectionTitle === 'string'
          ? parsed.institutional.sectionTitle
          : DEFAULT_SITE_CONTENT.institutional?.sectionTitle || 'Institucional',
      description:
        typeof parsed.institutional?.description === 'string'
          ? parsed.institutional.description
          : DEFAULT_SITE_CONTENT.institutional?.description || '',
      links:
        Array.isArray(parsed.institutional?.links) && parsed.institutional.links.length > 0
          ? parsed.institutional.links.map((link: any, idx: number) => ({
              id: link.id || `inst-${idx}-${Date.now()}`,
              name: link.name || link.label || 'Link Institucional',
              label: link.label || link.name || 'Link Institucional',
              description: link.description || '',
              url: link.url || '/',
              iconName: link.iconName || 'fileText',
              active: typeof link.active === 'boolean' ? link.active : true,
              order: typeof link.order === 'number' ? link.order : idx + 1,
              openInNewTab: Boolean(link.openInNewTab),
            }))
          : DEFAULT_SITE_CONTENT.institutional?.links || [],
    },
    albums: (() => {
      const parsedAlbums = Array.isArray(parsed.albums) ? parsed.albums : [];
      const albumIds = new Set(parsedAlbums.map((a: any) => a.id));
      const mergedAlbums = [...parsedAlbums];
      (DEFAULT_SITE_CONTENT.albums || []).forEach((defAlb) => {
        if (!albumIds.has(defAlb.id)) {
          mergedAlbums.push(defAlb);
        }
      });
      return mergedAlbums;
    })(),
    library: (() => {
      const baseLibrary: LibraryImageItem[] = Array.isArray(parsed.library) ? [...parsed.library] : [];
      const knownUrls = new Set(baseLibrary.map((item) => item.url));
      const knownIds = new Set(baseLibrary.map((item) => item.id));

      // 1. Ensure all default official photos are in the library
      (DEFAULT_SITE_CONTENT.library || []).forEach((defItem) => {
        if (!knownUrls.has(defItem.url) && !knownIds.has(defItem.id)) {
          baseLibrary.push(defItem);
          knownUrls.add(defItem.url);
          knownIds.add(defItem.id);
        }
      });

      // 2. Ensure all active photos across Hero, Gallery, and About exist in Library
      const heroPhotos = Array.isArray(parsed.hero?.photos) && parsed.hero.photos.length > 0
        ? parsed.hero.photos
        : DEFAULT_SITE_CONTENT.hero.photos;

      heroPhotos.forEach((slide: any, idx: number) => {
        if (slide?.imageUrl && !knownUrls.has(slide.imageUrl)) {
          baseLibrary.push({
            id: slide.id || `lib-hero-${Date.now()}-${idx}`,
            name: slide.title ? `Capa — ${slide.title}` : `Foto da Capa 0${idx + 1}`,
            url: slide.imageUrl,
            uploadedAt: 'Oficial',
            favorite: false,
            albumIds: ['album-retratos'],
            usedIn: ['Hero'],
          });
          knownUrls.add(slide.imageUrl);
        }
      });

      const galleryPhotos = Array.isArray(parsed.gallery?.photos) && parsed.gallery.photos.length > 0
        ? parsed.gallery.photos
        : DEFAULT_SITE_CONTENT.gallery.photos;

      galleryPhotos.forEach((item: any, idx: number) => {
        if (item?.imageUrl && !knownUrls.has(item.imageUrl)) {
          baseLibrary.push({
            id: item.id || `lib-gal-${Date.now()}-${idx}`,
            name: item.title ? `Galeria — ${item.title}` : `Ensaio Autoral 0${idx + 1}`,
            url: item.imageUrl,
            uploadedAt: 'Oficial',
            favorite: false,
            albumIds: ['album-ensaios'],
            usedIn: ['Galeria'],
          });
          knownUrls.add(item.imageUrl);
        }
      });

      const aboutPhoto = parsed.about?.photoUrl || DEFAULT_SITE_CONTENT.about.photoUrl;
      if (aboutPhoto && !knownUrls.has(aboutPhoto)) {
        baseLibrary.push({
          id: `lib-about-${Date.now()}`,
          name: 'Sobre Mim — Retrato Autoral',
          url: aboutPhoto,
          uploadedAt: 'Oficial',
          favorite: true,
          albumIds: ['album-retratos', 'album-profissionais'],
          usedIn: ['Sobre Mim'],
        });
        knownUrls.add(aboutPhoto);
      }

      return baseLibrary;
    })(),
  };
}

export function getPublishedContent(): SiteContent {
  if (typeof window === 'undefined') return DEFAULT_SITE_CONTENT;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PUBLISHED);
    if (!raw) return DEFAULT_SITE_CONTENT;
    const parsed = JSON.parse(raw);
    return normalizeSiteContent(parsed);
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

// === Granular Diff & Audit Tracker ===
let draftDebounceTimer: any = null;
let previousContentSnapshot: SiteContent | null = null;

export function diffContentChanges(
  prev: SiteContent | null,
  next: SiteContent
): string[] {
  if (!prev) return ['Edição inicial de rascunho'];
  const changes: string[] = [];

  // Hero
  if (prev.hero?.title !== next.hero?.title) {
    changes.push(`Hero: título alterado para "${next.hero?.title?.substring(0, 40) || ''}"`);
  }
  if (prev.hero?.eyebrow !== next.hero?.eyebrow) {
    changes.push(`Hero: eyebrow alterado`);
  }
  if (prev.hero?.tagline !== next.hero?.tagline) {
    changes.push(`Hero: tagline alterada`);
  }
  if (prev.hero?.description !== next.hero?.description) {
    changes.push(`Hero: descrição alterada`);
  }
  if (prev.hero?.photos?.length !== next.hero?.photos?.length) {
    changes.push(`Hero: carrossel agora com ${next.hero?.photos?.length || 0} fotos`);
  }

  // Galeria
  if (prev.gallery?.photos?.length !== next.gallery?.photos?.length) {
    changes.push(`Galeria: fotos alteradas para ${next.gallery?.photos?.length || 0} itens`);
  }
  if (prev.gallery?.title !== next.gallery?.title) {
    changes.push(`Galeria: título alterado`);
  }

  // Sobre Mim
  if (prev.about?.headline !== next.about?.headline) {
    changes.push(`Sobre Mim: manchete alterada`);
  }
  if (prev.about?.paragraph1 !== next.about?.paragraph1 || prev.about?.paragraph2 !== next.about?.paragraph2) {
    changes.push(`Sobre Mim: texto da biografia editado`);
  }
  if (prev.about?.photoUrl !== next.about?.photoUrl) {
    changes.push(`Sobre Mim: foto de perfil alterada`);
  }

  // Canais
  if (prev.channels?.onlyfans?.description !== next.channels?.onlyfans?.description) {
    changes.push(`Canais: OnlyFans atualizado`);
  }
  if (prev.channels?.instagram?.description !== next.channels?.instagram?.description) {
    changes.push(`Canais: Instagram atualizado`);
  }

  // Contato
  if (prev.contact?.officialEmail !== next.contact?.officialEmail) {
    changes.push(`Contato: e-mail oficial alterado para "${next.contact?.officialEmail}"`);
  }

  // SEO
  if (prev.seo?.title !== next.seo?.title) {
    changes.push(`SEO: título da página alterado`);
  }
  if (prev.seo?.description !== next.seo?.description) {
    changes.push(`SEO: meta description editada`);
  }

  return changes.length > 0 ? changes : ['Ajuste de formatação / metadados'];
}

export function saveDraftContent(content: SiteContent): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = previousContentSnapshot || getDraftContent();
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(content));
    window.dispatchEvent(new CustomEvent('nua-draft-updated', { detail: content }));

    // Disparo com debounce (1.5s) para auditoria e monitoramento no Master Admin
    if (draftDebounceTimer) clearTimeout(draftDebounceTimer);
    draftDebounceTimer = setTimeout(() => {
      const diffList = diffContentChanges(prev, content);
      previousContentSnapshot = content;

      fetch('/api/audit/event', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
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
      }).catch(() => {});
    }, 1500);
  } catch (err) {
    console.error('Falha ao salvar rascunho:', err);
  }
}

export function publishContent(content: SiteContent): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = getPublishedContent();
    const diffList = diffContentChanges(prev, content);

    localStorage.setItem(STORAGE_KEYS.PUBLISHED, JSON.stringify(content));
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(content));
    window.dispatchEvent(new CustomEvent('nua-content-updated', { detail: content }));

    // Sincroniza com o Cloudflare R2 e grava log no monitoramento de auditoria
    fetch('/api/content/sync', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        summary: `Publicação Oficial de Conteúdo: ${diffList.join(' • ')}`,
        editorName: 'Painel Oficial do Cliente',
      }),
    }).catch((err) => {
      console.warn('[ContentStore] Sincronização em segundo plano:', err);
    });
  } catch (err) {
    console.error('Falha ao publicar conteúdo:', err);
  }
}

export function hasUnpublishedChanges(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const draftRaw = localStorage.getItem(STORAGE_KEYS.DRAFT);
    const pubRaw = localStorage.getItem(STORAGE_KEYS.PUBLISHED);
    if (!draftRaw) return false;
    if (!pubRaw) return draftRaw !== JSON.stringify(DEFAULT_SITE_CONTENT);
    return draftRaw !== pubRaw;
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

// === Image & Video Optimization and Storage Handler ===
export async function optimizeAndStoreImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<LibraryImageItem> {
  const media = await mediaService.uploadMedia(file, {
    fileName: file.name,
    mimeType: file.type,
    onProgress,
  });

  const displayUrl =
    media.variants?.full?.url ||
    media.variants?.mobile?.url ||
    media.posterUrl ||
    resolveMediaUrl(media.objectKey);

  const newImage: LibraryImageItem = {
    id: media.id,
    name: media.name,
    url: displayUrl,
    objectKey: media.objectKey,
    uploadedAt: media.uploadedAt,
    usedIn: [],
    sizeBytes: media.sizeBytes,
    width: media.width,
    height: media.height,
    isVideo: media.isVideo,
    posterUrl: media.posterUrl,
    provider: media.provider,
    variants: media.variants,
  };

  return newImage;
}

export async function deleteStoredMedia(item: LibraryImageItem): Promise<boolean> {
  return await mediaService.deleteMedia({
    id: item.id,
    name: item.name,
    objectKey: item.objectKey || item.url,
    mimeType: item.isVideo ? 'video/mp4' : 'image/webp',
    sizeBytes: item.sizeBytes || 0,
    isVideo: Boolean(item.isVideo),
    posterKey: item.posterUrl,
    variants: item.variants || {},
    uploadedAt: item.uploadedAt,
    provider: item.provider || 'default',
  });
}

// === Authentication ===
export async function verifyAdminPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false };
  const trimmed = password.trim();
  if (!trimmed) return { success: false, error: 'A senha é obrigatória.' };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: trimmed }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      setSessionActive();
      return { success: true };
    }

    if (res.status === 429) {
      return {
        success: false,
        error: data.error || 'Muitas tentativas. Aguarde 15 minutos.',
      };
    }

    // In purely static Next.js dev server without Wrangler Pages Functions runtime,
    // fallback to validating against the expected master password:
    if (res.status === 404) {
      if (trimmed === 'nuaborges2026') {
        setSessionActive();
        return { success: true };
      }
    }

    return {
      success: false,
      error: data.error || 'Senha incorreta. Verifique e tente novamente.',
    };
  } catch {
    // Dev server fallback if offline/no backend
    if (trimmed === 'nuaborges2026') {
      setSessionActive();
      return { success: true };
    }
    return {
      success: false,
      error: 'Falha ao conectar com o serviço de autenticação.',
    };
  }
}

export async function setAdminPassword(newPassword: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const hash = await sha256(newPassword);
  localStorage.setItem(STORAGE_KEYS.PASSWORD_HASH, hash);
}

export async function checkServerSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.authenticated === 'boolean') {
        if (!data.authenticated) {
          localStorage.removeItem(STORAGE_KEYS.SESSION);
        }
        return data.authenticated;
      }
    }
  } catch {
    // If backend is unreachable, check local session expiry
  }

  return isSessionActive();
}

export function isSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!session) return false;
    const { expiresAt } = JSON.parse(session);
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

export function setSessionActive(): void {
  if (typeof window === 'undefined') return;
  const session = {
    active: true,
    // 24 hours expiration
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {}
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
}

// === Reactive Hook for Public Site ===
export function usePublishedContent(): SiteContent {
  const [content, setContent] = useState<SiteContent>(() => {
    if (typeof window !== 'undefined') {
      try {
        return getPublishedContent();
      } catch {
        return DEFAULT_SITE_CONTENT;
      }
    }
    return DEFAULT_SITE_CONTENT;
  });

  useEffect(() => {
    // Keep in sync with custom publish events and cross-tab storage changes
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
