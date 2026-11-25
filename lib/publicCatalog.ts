import type { AvulsoProductItem } from './types';
import { parseBrlPrice } from './formatters';

export const catalogFallbackSlug = '__catalogo-em-atualizacao';

// Registro de teste já publicado antes de existir a regra de elegibilidade.
const previewOnlyPackId = 'pack_1795216277530';
const publicSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PublicPack = AvulsoProductItem & { slug: string };

export function packMediaCounts(
  pack: Pick<AvulsoProductItem, 'exclusivePhotos' | 'exclusivePhotosCount' | 'previewImages' | 'videos'>
): { photos: number; videos: number } {
  const explicitPhotos = Number(pack.exclusivePhotosCount || 0);
  const exclusiveListLen = Array.isArray(pack.exclusivePhotos) ? pack.exclusivePhotos.length : 0;
  const previewLen = Array.isArray(pack.previewImages) ? pack.previewImages.length : 0;
  const photos = Math.max(explicitPhotos, exclusiveListLen) || previewLen;
  const videos = Array.isArray(pack.videos) ? pack.videos.length : 0;
  return { photos, videos };
}

export function isRealTimeDuration(duration?: string): boolean {
  const raw = (duration || '').trim();
  return Boolean(raw && /\d+\s*(min|seg|h|:)/i.test(raw) && !/foto|v[ií]deo/i.test(raw));
}

export function packPurchasePrice(pack: Pick<AvulsoProductItem, 'numericPrice' | 'price'>): number | null {
  const price = Number(pack.numericPrice) || parseBrlPrice(pack.price);
  return Number.isFinite(price) && price >= 1 ? price : null;
}

export function isPublicPack(item: AvulsoProductItem | null | undefined): item is PublicPack {
  return Boolean(item && item.active !== false && !item.isDraft && item.modality !== 'avulso' &&
    typeof item.id === 'string' && item.id !== previewOnlyPackId &&
    typeof item.title === 'string' && item.title.trim() &&
    typeof item.slug === 'string' && item.slug.length <= 120 && publicSlugPattern.test(item.slug));
}

export function packAliases(item: PublicPack): string[] {
  const id = item.id.trim().toLowerCase();
  const checkoutSlug = /^\/avulsos\/([a-z0-9_-]+)\/?$/i.exec(item.checkoutUrl || '')?.[1]?.toLowerCase() || '';
  return [...new Set([id, id.replace(/^avulso-/, ''), checkoutSlug])]
    .filter(alias => alias !== item.slug && /^[a-z0-9][a-z0-9_-]{0,119}$/.test(alias));
}

export function findPublicPack(items: PublicPack[], slug: string): PublicPack | undefined {
  return items.find(item => item.slug === slug) || items.find(item => packAliases(item).includes(slug));
}
