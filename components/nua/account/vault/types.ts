export interface VaultFileItem {
  label: string;
  hasCustomLabel?: boolean;
  url: string;
  previewUrl?: string;
  posterUrl?: string;
  duration?: string;
  video: boolean;
  download?: string;
}

export interface VaultMetaItem {
  label: string;
  value: string;
}

export function resolveAssetHref(apiBase: string, rawUrl: string | undefined | null): string {
  if (!rawUrl) return '';
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('data:')) return rawUrl;
  return `${apiBase}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
}
