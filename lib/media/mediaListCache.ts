import { LibraryImageItem } from '@/lib/types';
import { privatePath } from './vaultPath';
import { getPublicApiUrl } from '../sessionToken';

const MEDIA_LIST_STORAGE_KEY = 'nua_media_list_cache_v2';
const MEDIA_LIST_TTL_MS = 20 * 1000; // 20 segundos para evitar defasagem no admin

interface CachedMediaList {
  items: LibraryImageItem[];
  timestamp: number;
}

let memoryCache: CachedMediaList | null = null;
let inFlightPromise: Promise<LibraryImageItem[]> | null = null;

export function getCachedStorageMedia(): LibraryImageItem[] | null {
  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < MEDIA_LIST_TTL_MS) {
    return memoryCache.items;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(MEDIA_LIST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedMediaList;
        if (parsed && Array.isArray(parsed.items) && now - parsed.timestamp < MEDIA_LIST_TTL_MS) {
          memoryCache = parsed;
          return parsed.items;
        }
      }
    } catch {}
  }

  return null;
}

function saveStorageMediaCache(items: LibraryImageItem[]): void {
  const entry: CachedMediaList = { items, timestamp: Date.now() };
  memoryCache = entry;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(MEDIA_LIST_STORAGE_KEY, JSON.stringify(entry));
    } catch {}
  }
}

export function invalidateMediaListCache(): void {
  memoryCache = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(MEDIA_LIST_STORAGE_KEY);
    } catch {}
  }
}

export async function fetchCachedStorageMedia(options?: { force?: boolean }): Promise<LibraryImageItem[]> {
  if (!options?.force) {
    const cached = getCachedStorageMedia();
    if (cached) {
      return cached;
    }
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const remoteItems = await fetchStorageInventory();
      saveStorageMediaCache(remoteItems);
      return remoteItems;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Não foi possível carregar o inventário de mídias.');
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

function mapStorageItems(storageItems: any[]): LibraryImageItem[] {
  const groups = new Map<string, any[]>();

  for (const item of storageItems) {
    const key = String(item.key || item.url || '');
    const mediaKey = key.match(/^(media\/objects\/(?:public|private)\/[^/]+)/i)?.[1]
      || key.match(/^(media\/.+?)\/(?:full|mobile|thumb|original|video|poster)[.-][^/]+$/i)?.[1]
      || key;
    const group = groups.get(mediaKey) || [];
    group.push(item);
    groups.set(mediaKey, group);
  }

  const remoteItems: LibraryImageItem[] = [];
  for (const [groupKey, variants] of groups) {
    const originals = variants.filter((item) => !item.isThumbnail && !/\/(?:thumb|mobile|poster)[.-][^/]+$/i.test(String(item.key)));
    const groupIsVideo = originals.some(
      (item: any) => item.isVideo || item.type === 'video' || /\/(video-|video\.)/i.test(String(item.key)) || /\.(mp4|webm|mov|mkv|m4v)$/i.test(String(item.key))
    );
    const preferred = [...originals].sort((a, b) => {
      const rank = (item: any) => {
        const key = String(item.key);
        if (groupIsVideo && /\/(video-|video\.)/i.test(key)) return 0;
        if (!groupIsVideo && /\/(full|original)(-|\.|\/)/i.test(key)) return 0;
        return 1;
      };
      return rank(a) - rank(b);
    })[0];
    if (!preferred?.url) continue;

    const findVariant = (pattern: RegExp) => variants.find((item) => pattern.test(String(item.key)));
    const asVariant = (item?: { key: string; url: string; sizeBytes?: number; format?: string }) =>
      item ? {
        key: item.key,
        url: item.url,
        sizeBytes: item.sizeBytes || 0,
        width: 0,
        height: 0,
        format: item.format || item.key.split('.').pop() || '',
      } : undefined;
    const poster = findVariant(/\/poster[.-][^/]+$/i);
    const isVideo = groupIsVideo;
    const itemId = `storage:${groupKey}`;
    remoteItems.push({
      id: itemId,
      name: String(preferred.name || groupKey.split('/').pop() || 'Mídia do Backblaze'),
      url: preferred.url,
      objectKey: preferred.key,
      uploadedAt: preferred.uploadedAt || new Date().toISOString(),
      sizeBytes: preferred.sizeBytes,
      provider: 'backblaze-b2',
      isVideo,
      posterUrl: poster?.url,
      variants: {
        thumb: asVariant(findVariant(/\/thumb[.-][^/]+$/i)),
        mobile: asVariant(findVariant(/\/mobile[.-][^/]+$/i)),
        full: asVariant(findVariant(/\/full[.-][^/]+$/i)),
        original: asVariant(findVariant(/\/(?:video|original)[.-][^/]+$/i)),
      },
    });
  }

  return remoteItems;
}

/** Load the same complete storage inventory for the library and all selectors. */
async function fetchStorageInventory(): Promise<LibraryImageItem[]> {
  const originals: any[] = [];
  const seenCursors = new Set<string>();
  let cursor = '';
  do {
    const params = new URLSearchParams({ limit: '500' });
    if (cursor) params.set('cursor', cursor);
    const response = await fetch(getPublicApiUrl() + '/api/media/list?' + params, {
      credentials: 'include',
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok || data.success === false || data.storageError || !Array.isArray(data.items)) {
      throw new Error('Não foi possível consultar o acervo.');
    }
    for (const item of data.items) {
      const key = privatePath(item.key) || privatePath(item.url);
      if (item.isBroken || item.inStorage === false || item.type === 'audio') continue;
      if (item.origin !== 'b2_storage' && item.origin !== 'storage_upload') continue;
      originals.push(key ? { ...item, key: 'media/' + key, url: '/media/' + key } : item);
    }
    cursor = typeof data.nextCursor === 'string' ? data.nextCursor : '';
    if (cursor && seenCursors.has(cursor)) throw new Error('Não foi possível concluir a consulta ao acervo.');
    if (cursor) seenCursors.add(cursor);
  } while (cursor);
  return mapStorageItems(originals);
}
