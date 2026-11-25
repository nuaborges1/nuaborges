/** Read-only comparison of CMS references, B2 objects and the persistent media index. */
import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';
import { headMedia, isMediaStorageConfigured, listMediaObjects, MediaEnv } from '../_mediaStore';

type Context = { request: Request; env: SupabaseEnv & MediaEnv };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

function normalizeKey(value: string): string | undefined {
  let path = value.trim();
  try { if (/^https?:\/\//i.test(path)) path = new URL(path).pathname; } catch { return undefined; }
  try { path = decodeURIComponent(path.split('?')[0]).replace(/^\/+/, ''); } catch { return undefined; }
  const mediaIndex = path.indexOf('media/');
  const audioIndex = path.indexOf('audio/');
  if (mediaIndex >= 0) path = path.slice(mediaIndex);
  else if (audioIndex >= 0) path = path.slice(audioIndex);
  else return undefined;
  return path.includes('..') ? undefined : path;
}

function collectCmsReferences(value: unknown, keys: Set<string>, thumbnailKeys: Set<string>): void {
  if (Array.isArray(value)) { value.forEach((entry) => collectCmsReferences(entry, keys, thumbnailKeys)); return; }
  if (!value || typeof value !== 'object') return;
  for (const [field, child] of Object.entries(value as Record<string, unknown>)) {
    if (typeof child === 'string' && ['key', 'objectKey', 'imageUrl', 'videoUrl', 'posterUrl', 'url', 'posterKey'].includes(field)) {
      const key = normalizeKey(child);
      if (key) {
        keys.add(key);
        if (/thumb|poster/i.test(field) || /\/(thumb|poster)(-|\.|\/)/i.test(key)) thumbnailKeys.add(key);
      }
    } else if (child && typeof child === 'object') {
      collectCmsReferences(child, keys, thumbnailKeys);
    }
  }
}

async function headInBatches(env: MediaEnv, keys: string[], batchSize = 8) {
  const result = new Map<string, Awaited<ReturnType<typeof headMedia>> | 'error'>();
  for (let index = 0; index < keys.length; index += batchSize) {
    await Promise.all(keys.slice(index, index + batchSize).map(async (key) => {
      try { result.set(key, await headMedia(env, key)); } catch { result.set(key, 'error'); }
    }));
  }
  return result;
}

export const onRequestGet = async ({ request, env }: Context) => {
  if (!isMediaStorageConfigured(env)) return json({ error: 'Backblaze B2 não está configurado.' }, 503);
  const supabase = getSupabaseClient(env);
  if (!supabase) return json({ error: 'Supabase não está configurado.' }, 503);
  const url = new URL(request.url);
  const parsedLimit = Number.parseInt(url.searchParams.get('limit') || '100', 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 100;
  const cursor = url.searchParams.get('cursor') || undefined;

  const [{ data: contentRows, error: contentError }, { data: indexedVariants, error: indexError }] = await Promise.all([
    supabase.from('site_content').select('content').in('key', ['private_admin_content', 'published_content']),
    supabase
      .from('b2_media_variants')
      .select('storage_key,variant_name,asset_id')
      .then(
        (r) => r,
        () => ({ data: [] as any[], error: null })
      ),
  ]);
  if (contentError) return json({ error: 'Não foi possível ler os registros de conteúdo do CMS no Supabase.' }, 503);

  const cmsKeys = new Set<string>();
  const cmsThumbnailKeys = new Set<string>();
  for (const row of contentRows || []) collectCmsReferences(row.content, cmsKeys, cmsThumbnailKeys);
  const indexedKeys = new Set((indexedVariants || []).map((entry: any) => String(entry.storage_key)));
  const page = await listMediaObjects(env, { limit, cursor });
  const pageKeys = page.objects.map((item) => item.key);
  const pageHeads = await headInBatches(env, pageKeys);
  const refsOutsidePage = [...cmsKeys].filter((key) => !pageKeys.includes(key));
  const referenceHeads = await headInBatches(env, refsOutsidePage);

  const brokenReferences = [...cmsKeys].filter((key) => {
    const checked = pageHeads.get(key) ?? referenceHeads.get(key);
    return checked === null;
  });
  const headErrors = [...new Set([...pageKeys, ...refsOutsidePage])].filter((key) => {
    return (pageHeads.get(key) ?? referenceHeads.get(key)) === 'error';
  });
  const missingThumbnails = [...cmsThumbnailKeys].filter((key) => {
    const checked = pageHeads.get(key) ?? referenceHeads.get(key);
    return checked === null;
  });
  const unregisteredObjects = page.objects
    .filter((object) => !cmsKeys.has(object.key) && !indexedKeys.has(object.key))
    .map((object) => ({ key: object.key, sizeBytes: object.size, lastModified: object.uploadedAt }));

  const hashes = new Map<string, string[]>();
  for (const [key, head] of pageHeads) {
    if (head && head !== 'error' && head.metadata.sha256) {
      hashes.set(head.metadata.sha256, [...(hashes.get(head.metadata.sha256) || []), key]);
    }
  }
  const duplicateCandidates = [...hashes.entries()].filter(([, keys]) => keys.length > 1)
    .map(([sha256, keys]) => ({ sha256, keys, proof: 'metadado SHA-256 declarado; requer hash integral de leitura para confirmação' }));

  return json({
    mode: 'read-only',
    cursor: cursor || null,
    nextCursor: page.nextCursor || null,
    hasMore: Boolean(page.nextCursor),
    cmsReferenceCount: cmsKeys.size,
    indexedVariantCount: indexedKeys.size,
    indexStatus: indexError ? 'migration_pending' : 'ready',
    inventoryPageCount: page.objects.length,
    registeredMedia: page.objects.filter((object) => cmsKeys.has(object.key) || indexedKeys.has(object.key)).map((object) => object.key),
    unregisteredObjects,
    brokenReferences,
    missingThumbnails,
    duplicateCandidates,
    headErrors,
    note: 'Nenhum registro, associação ou objeto foi criado, alterado ou excluído. Repita a chamada com nextCursor até hasMore=false para revisar todo o inventário.',
  });
};

export const onRequest = onRequestGet;
