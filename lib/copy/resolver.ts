/**
 * Resolvedor Central de Identidade Verbal — Nua Borges
 *
 * Puro (zero dependências de React/DOM), utilizável tanto no navegador
 * quanto em Cloudflare Pages Functions (`functions/_middleware.ts`) e testes.
 */

import { ORIGINAL_COPY, STOCK_CMS_BASELINES } from './original';
import { NUA_AUTORAL_EXPERIMENTAL_COPY } from './nua-autoral.experimental';
import type {
  CmsStockOverrideKey,
  CopyDictionary,
  CopyMode,
  PublicSeoRoute,
  RouteSeoCopy,
  VerbalIdentityConfig,
} from './types';

export const VERBAL_IDENTITY_STORAGE_KEY = 'system:verbal_identity_experiment';
export const DEFAULT_COPY_MODE: CopyMode = 'original';

export function normalizeCopyMode(raw: unknown): CopyMode {
  return raw === 'nua_autoral_experimental' ? 'nua_autoral_experimental' : 'original';
}

export function normalizeVerbalIdentityConfig(raw: unknown): VerbalIdentityConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      mode: DEFAULT_COPY_MODE,
      enabled: false,
      updatedAt: null,
      updatedBy: null,
      version: 0,
    };
  }
  const obj = raw as Record<string, unknown>;
  const enabled = obj.enabled === true || obj.mode === 'nua_autoral_experimental';
  const mode: CopyMode = enabled ? 'nua_autoral_experimental' : 'original';
  return {
    mode,
    enabled,
    updatedAt: typeof obj.updatedAt === 'string' && obj.updatedAt.trim() ? obj.updatedAt : null,
    updatedBy: typeof obj.updatedBy === 'string' && obj.updatedBy.trim() ? obj.updatedBy : null,
    version: typeof obj.version === 'number' && Number.isFinite(obj.version) ? obj.version : 1,
  };
}

export function resolveCopyDictionary(mode: CopyMode): CopyDictionary {
  return mode === 'nua_autoral_experimental'
    ? NUA_AUTORAL_EXPERIMENTAL_COPY
    : ORIGINAL_COPY;
}

function normalizeTextForComparison(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

/**
 * Verifica de forma conservadora se um valor do CMS corresponde a uma string
 * conhecida de fábrica (nunca editada pela criadora).
 *
 * IMPORTANTE:
 * - String vazia `""` retorna `false` (pode ser limpeza intencional da Nua).
 * - Apenas `undefined` ou match exato com `STOCK_CMS_BASELINES[key]` retorna `true`.
 */
export function isStockCmsValue(
  publishedValue: string | null | undefined,
  key: CmsStockOverrideKey
): boolean {
  if (publishedValue === undefined || publishedValue === null) {
    return true;
  }
  const normalized = normalizeTextForComparison(publishedValue);
  if (normalized === '') {
    return false;
  }
  const baselines = STOCK_CMS_BASELINES[key];
  if (!baselines || baselines.length === 0) {
    return false;
  }
  return baselines.some((candidate) => normalizeTextForComparison(candidate) === normalized);
}

/**
 * Resolve um campo textual proveniente do CMS respeitando a autonomia da Nua:
 * - Em modo `original`: devolve sempre o valor publicado (ou o fallback original).
 * - Em modo `nua_autoral_experimental`:
 *   • Se o campo foi editado pela Nua (ou esvaziado intencionalmente por ela),
 *     devolve o valor da Nua intacto.
 *   • Se o campo ainda contém um texto de fábrica conhecido (ou está ausente),
 *     aplica a identidade verbal experimental correspondente.
 */
export function resolveCmsText(
  publishedValue: string | null | undefined,
  key: CmsStockOverrideKey,
  mode: CopyMode,
  fallbackOriginal?: string
): string {
  if (mode !== 'nua_autoral_experimental') {
    if (typeof publishedValue === 'string') {
      return publishedValue || (fallbackOriginal ?? ORIGINAL_COPY.cmsStockOverrides[key] ?? '');
    }
    return fallbackOriginal ?? ORIGINAL_COPY.cmsStockOverrides[key] ?? '';
  }

  // Preserva string vazia explícita (decisão intencional da criadora)
  if (publishedValue === '') {
    return '';
  }

  if (isStockCmsValue(publishedValue, key)) {
    return NUA_AUTORAL_EXPERIMENTAL_COPY.cmsStockOverrides[key];
  }

  return typeof publishedValue === 'string'
    ? publishedValue
    : NUA_AUTORAL_EXPERIMENTAL_COPY.cmsStockOverrides[key];
}

const PUBLIC_SEO_ROUTES = new Set<string>([
  '/',
  '/sobre',
  '/avulsos',
  '/acervo',
  '/chamadas',
  '/personalizados',
  '/contato',
  '/termos',
  '/privacidade',
]);

export function normalizePublicSeoRoute(pathname: string): PublicSeoRoute | null {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  if (PUBLIC_SEO_ROUTES.has(clean)) {
    return clean as PublicSeoRoute;
  }
  return null;
}

export function resolveRouteSeo(pathname: string, mode: CopyMode): RouteSeoCopy | null {
  const route = normalizePublicSeoRoute(pathname);
  if (!route) return null;
  const dict = resolveCopyDictionary(mode);
  return dict.seo[route] ?? ORIGINAL_COPY.seo[route] ?? null;
}
