'use client';

/**
 * CopyProvider — Provedor global de Identidade Verbal da Nua Borges
 *
 * Estratégia de hidratação segura e estável (Next.js Static Export + Cloudflare Pages):
 * 1. Hidrata inicialmente em `'original'` (100% alinhado ao HTML estático gerado no build,
 *    eliminando qualquer React Hydration Mismatch).
 * 2. Sem telas pretas, sem telas brancas e sem ocultar a página: em `useLayoutEffect`,
 *    lê sincronamente `<meta name="nua-copy-mode">` injetada no edge por
 *    `functions/_middleware.ts` (zero script inline, zero impacto na CSP).
 * 3. Em desenvolvimento local (sem edge middleware) ou no retorno a uma aba após
 *    >= 15s (`visibilitychange`), faz uma única revalidação leve via `GET /api/site/copy-mode`.
 * 4. Mantém `<title>`, `<meta name="description">` e tags OG/Twitter sincronizadas
 *    nas navegações client-side (RSC) e restaura os valores originais ao desativar.
 * 5. Qualquer falha de rede mantém silenciosamente `'original'`.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { getPublicApiUrl } from '@/lib/contentStore';
import {
  DEFAULT_COPY_MODE,
  normalizeCopyMode,
  resolveCmsText,
  resolveCopyDictionary,
  resolveRouteSeo,
} from './resolver';
import type { CmsStockOverrideKey, CopyDictionary, CopyMode } from './types';

const COPY_MODE_META_NAME = 'nua-copy-mode';
const COPY_MODE_SESSION_KEY = 'nua_copy_mode_hint_v1';
const REVALIDATE_MIN_INTERVAL_MS = 15_000;

export const COPY_MODE_UPDATED_EVENT = 'nua_copy_mode_updated';

interface CopyContextValue {
  mode: CopyMode;
  isExperimental: boolean;
  copy: CopyDictionary;
  cms: (
    publishedValue: string | null | undefined,
    key: CmsStockOverrideKey,
    fallbackOriginal?: string
  ) => string;
  refreshMode: () => Promise<CopyMode>;
}

const defaultContextValue: CopyContextValue = {
  mode: DEFAULT_COPY_MODE,
  isExperimental: false,
  copy: resolveCopyDictionary(DEFAULT_COPY_MODE),
  cms: (publishedValue, key, fallbackOriginal) =>
    resolveCmsText(publishedValue, key, DEFAULT_COPY_MODE, fallbackOriginal),
  refreshMode: async () => DEFAULT_COPY_MODE,
};

const CopyContext = createContext<CopyContextValue>(defaultContextValue);

const useSafeLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function isExcludedCopySurface(pathname: string | null): boolean {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.startsWith('admin.') || host.startsWith('admingeral.')) {
      return true;
    }
  }
  if (!pathname) return false;
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/admingeral') ||
    pathname.startsWith('/contrato') ||
    pathname.startsWith('/avaliacao')
  );
}

function readEdgeMetaMode(): CopyMode | null {
  if (typeof document === 'undefined') return null;
  const meta = document.querySelector(`meta[name="${COPY_MODE_META_NAME}"]`);
  const content = meta?.getAttribute('content');
  if (content === 'original' || content === 'nua_autoral_experimental') {
    return content;
  }
  return null;
}

function readSessionHintMode(): CopyMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(COPY_MODE_SESSION_KEY);
    if (raw === 'original' || raw === 'nua_autoral_experimental') {
      return raw;
    }
  } catch {
    // Ignora storage bloqueado (modo privado restrito)
  }
  return null;
}

function writeSessionHintMode(mode: CopyMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(COPY_MODE_SESSION_KEY, mode);
  } catch {
    // Ignora storage bloqueado
  }
}

function updateMetaTag(selector: string, attr: 'content', value: string): void {
  const el = document.querySelector(selector);
  if (el) {
    el.setAttribute(attr, value);
  }
}

export function CopyProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mode, setMode] = useState<CopyMode>(DEFAULT_COPY_MODE);
  const lastFetchedAtRef = useRef<number>(0);
  const hasEdgeMetaRef = useRef<boolean>(false);
  const appliedExperimentalSeoRef = useRef<boolean>(false);

  const excluded = isExcludedCopySurface(pathname);

  const applyMode = useCallback((nextMode: CopyMode) => {
    setMode((prev) => (prev === nextMode ? prev : nextMode));
    writeSessionHintMode(nextMode);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.copyMode = nextMode;
    }
  }, []);

  const refreshMode = useCallback(async (): Promise<CopyMode> => {
    if (excluded || typeof window === 'undefined') {
      return DEFAULT_COPY_MODE;
    }
    try {
      const apiBase = getPublicApiUrl();
      const res = await fetch(`${apiBase}/api/site/copy-mode`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return mode;
      const data = await res.json();
      const resolved = normalizeCopyMode(data?.mode ?? (data?.enabled ? 'nua_autoral_experimental' : 'original'));
      lastFetchedAtRef.current = Date.now();
      applyMode(resolved);
      return resolved;
    } catch {
      return mode;
    }
  }, [applyMode, excluded, mode]);

  // 1. Leitura síncrona pós-hidratação (sem mismatch e sem esconder a página)
  useSafeLayoutEffect(() => {
    if (excluded) {
      setMode(DEFAULT_COPY_MODE);
      return;
    }
    const edgeMode = readEdgeMetaMode();
    if (edgeMode) {
      hasEdgeMetaRef.current = true;
      lastFetchedAtRef.current = Date.now();
      applyMode(edgeMode);
      return;
    }
    const sessionHint = readSessionHintMode();
    if (sessionHint) {
      applyMode(sessionHint);
    }
  }, [excluded, applyMode]);

  // 2. Sincronização inicial (quando sem meta do edge, ex.: localhost) e retorno à aba
  useEffect(() => {
    if (excluded) return;

    if (!hasEdgeMetaRef.current) {
      void refreshMode();
    }

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchedAtRef.current < REVALIDATE_MIN_INTERVAL_MS) return;
      void refreshMode();
    };

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: CopyMode }>).detail;
      if (detail?.mode) {
        applyMode(normalizeCopyMode(detail.mode));
      } else {
        void refreshMode();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(COPY_MODE_UPDATED_EVENT, handleCustomEvent);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(COPY_MODE_UPDATED_EVENT, handleCustomEvent);
    };
  }, [excluded, refreshMode, applyMode]);

  // 3. Coerência de SEO client-side (<title>, description, OG e Twitter)
  // No modo original intacto, preserva literalmente o HTML/Metadata do build Next.js;
  // no modo experimental (e ao reverter dele), sincroniza após o AsyncMetadataOutlet.
  useEffect(() => {
    if (excluded || typeof document === 'undefined' || !pathname) return;
    if (mode !== 'nua_autoral_experimental' && !appliedExperimentalSeoRef.current) {
      return;
    }
    const seo = resolveRouteSeo(pathname, mode);
    if (!seo) return;
    if (mode === 'nua_autoral_experimental') {
      appliedExperimentalSeoRef.current = true;
    }

    let applying = false;
    const syncSeo = () => {
      if (applying) return;
      applying = true;
      try {
        if (document.title !== seo.title) {
          document.title = seo.title;
        }
        updateMetaTag('meta[name="description"]', 'content', seo.description);
        updateMetaTag('meta[property="og:title"]', 'content', seo.title);
        updateMetaTag('meta[property="og:description"]', 'content', seo.description);
        updateMetaTag('meta[name="twitter:title"]', 'content', seo.title);
        updateMetaTag('meta[name="twitter:description"]', 'content', seo.description);
      } finally {
        applying = false;
      }
    };

    syncSeo();
    const rafId = window.requestAnimationFrame(syncSeo);

    // Observa mutações pontuais no <head> apenas enquanto modo experimental estiver ativo
    const observer =
      mode === 'nua_autoral_experimental' && typeof MutationObserver !== 'undefined' && document.head
        ? new MutationObserver(() => {
            if (!applying && document.title !== seo.title) {
              syncSeo();
            }
          })
        : null;
    observer?.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [excluded, pathname, mode]);

  const effectiveMode: CopyMode = excluded ? DEFAULT_COPY_MODE : mode;

  const value = useMemo<CopyContextValue>(() => {
    const dictionary = resolveCopyDictionary(effectiveMode);
    return {
      mode: effectiveMode,
      isExperimental: effectiveMode === 'nua_autoral_experimental',
      copy: dictionary,
      cms: (publishedValue, key, fallbackOriginal) =>
        resolveCmsText(publishedValue, key, effectiveMode, fallbackOriginal),
      refreshMode,
    };
  }, [effectiveMode, refreshMode]);

  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

export function useCopy(): CopyContextValue {
  return useContext(CopyContext);
}

export function useCopyMode(): CopyMode {
  return useContext(CopyContext).mode;
}
