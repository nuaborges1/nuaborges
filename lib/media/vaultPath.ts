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

export function vaultFiles(items: Array<{ raw: any; video: boolean }>) {
  const files = new Map<string, { path: string; label: string; video: boolean }>();
  for (const { raw, video } of items) {
    const rawVal = typeof raw === 'string' ? raw : raw?.path || raw?.url || raw?.storageKey;
    const path = privatePath(rawVal) || vaultMediaPath(rawVal);
    if (path && !files.has(path)) {
      files.set(path, { path, label: raw?.label || raw?.title || raw?.name || `Arquivo ${files.size + 1}`, video: video || /\.(mp4|webm|mov)$/i.test(path) });
    }
  }
  return [...files.values()];
}

export function packVaultFiles(pack: any) {
  const entries = (items: unknown, video: (item: any) => boolean) =>
    (Array.isArray(items) ? items : []).map((raw) => ({ raw, video: video(raw) }));
  return vaultFiles([
    ...entries(pack?.exclusivePhotos, () => false),
    ...entries(pack?.videos, () => true),
    ...entries(pack?.protectedMedia || pack?.privateFiles || pack?.files, (item) => item?.type === 'video'),
  ]);
}

