import { LibraryImageItem } from '@/lib/types';

const MEDIA_LIST_STORAGE_KEY = 'nua_media_list_cache_v1';
const MEDIA_LIST_TTL_MS = 10 * 60 * 1000; // 10 minutos

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
      const response = await fetch('/api/media/list?limit=500', {
        credentials: 'include',
      });
      if (!response.ok) return [];
      const data = await response.json();
      if (!Array.isArray(data?.items)) return [];

      const storageItems = data.items.filter((item: any) => item?.origin === 'storage_upload');
      const groups = new Map<string, any[]>();

      for (const item of storageItems) {
        const key = String(item.key || item.url || '');
        const mediaKey = key.match(/^(media\/[^/]+)(?:\/[^/]+)?$/i)?.[1] || key;
        const group = groups.get(mediaKey) || [];
        group.push(item);
        groups.set(mediaKey, group);
      }

      const remoteItems: LibraryImageItem[] = [];
      for (const [groupKey, variants] of groups) {
        const preferred = [...variants].sort((a, b) => {
          const rank = (item: any) => (/\/(full|original)\./i.test(String(item.key)) ? 0 : 1);
          return rank(a) - rank(b);
        })[0];
        if (!preferred?.url) continue;

        const isVideo = variants.some(
          (item: any) => item.isVideo || /\.(mp4|webm|mov)$/i.test(String(item.key))
        );
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
        });
      }

      saveStorageMediaCache(remoteItems);
      return remoteItems;
    } catch {
      return [];
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}
