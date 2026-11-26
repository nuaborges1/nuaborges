const FIRST_PARTY_MEDIA_HOSTS = new Set([
  'nuaborges.com.br',
  'www.nuaborges.com.br',
  'admin.nuaborges.com.br',
  'localhost',
  '127.0.0.1',
]);

/** Returns the path under /media/ for a legacy or indexed private object. */
export function privatePath(raw: unknown, allowedOrigin?: string): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('//') || /[%\\#\x00-\x1f\x7f]/.test(trimmed)) return '';

  let pathname = trimmed.split('?')[0];
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(pathname)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      if (!FIRST_PARTY_MEDIA_HOSTS.has(url.hostname) && url.hostname !== configuredHostname(allowedOrigin)) return '';
      pathname = url.pathname;
    } catch {
      return '';
    }
  }

  const path = pathname.replace(/^\//, '').replace(/^media\//, '');
  const segments = path.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return '';
  const legacy = segments[0] === 'private' && segments.length >= 2;
  const indexed = segments[0] === 'objects' && segments[1] === 'private' && segments.length >= 4;
  return legacy || indexed ? path : '';
}

/**
 * Retorna o caminho relativo normalizado de uma mídia legítima (privada ou de acervo)
 * para entrega segura e sem bloqueios no Cofre do cliente.
 */
export function vaultMediaPath(raw: unknown, allowedOrigin?: string): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('//') || /[%\\#\x00-\x1f\x7f]/.test(trimmed)) return '';

  let pathname = trimmed.split('?')[0];
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(pathname)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
      if (!FIRST_PARTY_MEDIA_HOSTS.has(url.hostname) && url.hostname !== configuredHostname(allowedOrigin)) return '';
      pathname = url.pathname;
    } catch {
      return '';
    }
  }

  const path = pathname.replace(/^\//, '').replace(/^media\//, '');
  const segments = path.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return '';
  return path;
}

function configuredHostname(origin?: string): string {
  if (!origin) return '';
  try {
    return new URL(origin).hostname;
  } catch {
    return '';
  }
}

export interface VaultFileDescriptor {
  path: string;
  label: string;
  hasCustomLabel: boolean;
  video: boolean;
  duration?: string;
  posterPath?: string;
  posterUrl?: string;
  previewPath?: string;
}

function isGenericFileLabel(raw: string): boolean {
  const s = raw.trim();
  if (!s) return true;
  if (/^(arquivo|file|foto|photo|video|vid|img|image|dsc|pxl|mvimg)[\s_-]*\d*$/i.test(s)) return true;
  if (/\.(jpe?g|png|webp|avif|gif|mp4|webm|mov|m4v)$/i.test(s)) return true;
  if (/^[a-f0-9_-]{12,}$/i.test(s)) return true;
  return false;
}

function resolveSafePublicMediaUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('//') || /[%\\#\x00-\x1f\x7f]/.test(trimmed)) return undefined;
  const pathOnly = trimmed.split('?')[0];
  if (pathOnly.toLowerCase().includes('/private/') || pathOnly.toLowerCase().startsWith('private/')) {
    return undefined;
  }
  if (pathOnly.startsWith('/media/') || pathOnly.startsWith('/images/')) {
    return pathOnly;
  }
  return undefined;
}

export function vaultFiles(items: Array<{ raw: any; video: boolean }>): VaultFileDescriptor[] {
  const files = new Map<string, VaultFileDescriptor>();
  let photoIndex = 0;
  let videoIndex = 0;

  for (const { raw, video } of items) {
    const rawVal = typeof raw === 'string' ? raw : raw?.path || raw?.url || raw?.storageKey;
    const path = privatePath(rawVal);
    if (path && !files.has(path)) {
      const isVideo = video || /\.(mp4|webm|mov|m4v)$/i.test(path);
      if (isVideo) videoIndex += 1;
      else photoIndex += 1;

      const rawLabel =
        typeof raw === 'object' && raw
          ? String(raw.label || raw.title || raw.name || '').trim()
          : '';
      const hasCustomLabel = Boolean(rawLabel) && !isGenericFileLabel(rawLabel);
      const label = hasCustomLabel
        ? rawLabel
        : isVideo
          ? `Vídeo ${videoIndex}`
          : `Foto ${photoIndex}`;

      const duration =
        typeof raw === 'object' && typeof raw?.duration === 'string' && raw.duration.trim()
          ? raw.duration.trim().slice(0, 32)
          : undefined;

      const rawPoster = typeof raw === 'object' && raw ? raw.posterUrl || raw.poster : undefined;
      const posterPath = privatePath(rawPoster) || undefined;
      const posterUrl = !posterPath ? resolveSafePublicMediaUrl(rawPoster) : undefined;

      const rawPreview =
        !isVideo && typeof raw === 'object' && raw
          ? raw?.variants?.mobile?.key || raw?.variants?.mobile?.url || raw?.previewPath
          : undefined;
      const candidatePreview = privatePath(rawPreview);
      const previewPath = candidatePreview && candidatePreview !== path ? candidatePreview : undefined;

      files.set(path, {
        path,
        label,
        hasCustomLabel,
        video: isVideo,
        ...(duration ? { duration } : {}),
        ...(posterPath ? { posterPath } : {}),
        ...(posterUrl ? { posterUrl } : {}),
        ...(previewPath ? { previewPath } : {}),
      });
    }
  }
  return [...files.values()];
}

export function packVaultFiles(pack: any): VaultFileDescriptor[] {
  const entries = (items: unknown, video: (item: any) => boolean) =>
    (Array.isArray(items) ? items : []).map((raw) => ({ raw, video: video(raw) }));
  return vaultFiles([
    ...entries(pack?.exclusivePhotos, () => false),
    ...entries(pack?.videos, () => true),
    ...entries(pack?.protectedMedia || pack?.privateFiles || pack?.files, (item) => item?.type === 'video'),
  ]);
}

