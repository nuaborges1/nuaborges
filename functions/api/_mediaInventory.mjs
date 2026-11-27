import { mediaIdentity, objectKind, objectRole, normalizeObjectKey } from '../../lib/media/objectKeys.mjs';

const RETENTION = 'phdev-archive/';
const archiveUrl = (key, download = false) => `/api/control/archive?${download ? 'download' : 'preview'}=${encodeURIComponent(key)}`;
const newestFirst = (a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')) || a.key.localeCompare(b.key);

export async function listArchiveInventory(list) {
  const rows = [];
  let cursor;
  do {
    const page = await list({ limit: 1000, cursor });
    rows.push(...page.objects);
    if (page.nextCursor && page.nextCursor === cursor) throw new Error('Cursor repetido no inventário B2.');
    cursor = page.nextCursor;
  } while (cursor);
  return rows;
}

/** @param {Array<{key: string, size?: number, uploadedAt?: string | null, eTag?: string}>} rawObjects
 * @param {Set<string> | null} references
 */
export function buildArchiveInventory(rawObjects, references = null) {
  const backups = new Set(rawObjects.filter(obj => obj.key.startsWith(RETENTION)).map(obj => obj.key.slice(RETENTION.length)));
  const objects = rawObjects.map(obj => {
    const isArchiveCopy = obj.key.startsWith(RETENTION);
    const sourceKey = isArchiveCopy ? obj.key.slice(RETENTION.length) : obj.key;
    const { folder, scope } = mediaIdentity(sourceKey);
    return {
      key: obj.key,
      sourceKey,
      assetKey: folder,
      name: sourceKey.split('/').pop() || sourceKey,
      url: archiveUrl(obj.key),
      downloadUrl: archiveUrl(obj.key, true),
      size: obj.size ?? 0,
      uploadedAt: obj.uploadedAt ?? null,
      eTag: obj.eTag?.replace(/^"|"$/g, '') || null,
      kind: objectKind(sourceKey),
      isPrivate: scope === 'private',
      isArchiveCopy,
      hasArchiveBackup: isArchiveCopy || backups.has(sourceKey),
    };
  }).sort(newestFirst);

  const groups = new Map();
  for (const obj of objects) {
    const group = groups.get(obj.assetKey) || { originals: [], retained: [] };
    (obj.isArchiveCopy ? group.retained : group.originals).push(obj);
    groups.set(obj.assetKey, group);
  }

  const assets = Array.from(groups, ([key, { originals, retained }]) => {
    const display = originals.length ? originals : retained;
    const pick = (role) => display.find(obj => objectRole(obj.sourceKey) === role);
    const playback = pick('original');
    const commercial = pick('commercialOriginal');
    const full = pick('full');
    const video = playback || commercial;
    const media = video || full || display[0];
    const preview = video ? pick('poster') : pick('mobile') || pick('thumb') || media;
    const download = commercial || media;
    const fingerprintObject = commercial || playback || full || (display.length === 1 && !objectRole(media.sourceKey) ? media : null);
    const all = [...originals, ...retained];
    const referenced = references?.has(key);
    return {
      ...media,
      key,
      name: key.split('/').pop() || key,
      previewUrl: preview?.url || null,
      fullUrl: media.url,
      downloadUrl: download.downloadUrl,
      kind: video ? 'video' : media.kind,
      sha256: mediaIdentity(key).sha256 ?? null,
      eTag: fingerprintObject?.eTag ?? null,
      fingerprintSize: fingerprintObject?.size ?? 0,
      fingerprintKey: fingerprintObject?.key ?? null,
      size: all.reduce((sum, obj) => sum + obj.size, 0),
      variantCount: display.length,
      objectKeys: originals.map(obj => obj.key),
      retentionKeys: retained.map(obj => obj.key),
      hasArchiveBackup: retained.length > 0,
      usage: references === null ? 'unknown' : referenced ? 'in_use' : 'orphan',
      duplicateOf: null,
      duplicateCount: 0,
    };
  }).sort(newestFirst);

  const matches = new Map();
  for (const asset of assets) {
    if (!asset.objectKeys.length || !['image', 'video'].includes(asset.kind) ||
        !asset.fingerprintSize || !/^[a-f0-9]{32}$/i.test(asset.eTag || '')) continue;
    const fingerprint = `${asset.isPrivate}:${asset.kind}:${asset.fingerprintSize}:${asset.eTag.toLowerCase()}`;
    const group = matches.get(fingerprint) || [];
    group.push(asset);
    matches.set(fingerprint, group);
  }
  let duplicateGroups = 0;
  for (const group of matches.values()) {
    if (group.length < 2) continue;
    duplicateGroups++;
    group.sort((a, b) => Number(b.usage === 'in_use') - Number(a.usage === 'in_use') ||
      Number(Boolean(b.sha256)) - Number(Boolean(a.sha256)) || newestFirst(a, b));
    const [keeper, ...duplicates] = group;
    keeper.duplicateCount = group.length;
    for (const duplicate of duplicates) {
      duplicate.duplicateOf = keeper.key;
      duplicate.duplicateCount = group.length;
    }
  }

  return {
    totalObjects: objects.length,
    archivedCopies: backups.size,
    totalBytes: objects.reduce((sum, obj) => sum + obj.size, 0),
    referencesVerified: references !== null,
    duplicateGroups,
    assets,
    objects,
  };
}

export function referenceKeys(values) {
  const found = new Set();
  const visit = (value) => {
    if (typeof value === 'string') {
      let key = normalizeObjectKey(value);
      if (key.startsWith('objects/') || key.startsWith('private/')) key = `media/${key}`;
      if (!key || !key.includes('/')) return;
      const isRetained = key.startsWith(RETENTION);
      const source = isRetained ? key.slice(RETENTION.length) : key;
      found.add(mediaIdentity(source).folder);
    } else if (value && typeof value === 'object') {
      for (const child of Object.values(value)) visit(child);
    }
  };
  for (const value of values) visit(value);
  return found;
}

export async function loadArchiveReferences(supabase) {
  if (!supabase) return null;
  const content = await supabase.from('site_content').select('key,content')
    .in('key', ['published_content', 'private_admin_content']);
  if (content.error || !['published_content', 'private_admin_content'].every(key =>
    content.data?.some(row => row.key === key && row.content && typeof row.content === 'object')
  )) return null;

  const documents = content.data.map(row => row.content);
  const pageSize = 250;
  let cursor = null;
  for (;;) {
    let query = supabase.from('personalizados_orders').select('id,vault_files')
      .not('vault_files', 'is', null).order('id', { ascending: true }).limit(pageSize);
    if (cursor !== null) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return null;
    if (!data.length) break;
    documents.push(...data.map(row => row.vault_files));
    const next = data[data.length - 1]?.id;
    if (next == null || next === cursor) return null;
    cursor = next;
  }
  return referenceKeys(documents);
}

export function referenceSafetyStatus(references, keys) {
  if (references === null) return 503;
  return keys.some(key => {
    const source = key.startsWith(RETENTION) ? key.slice(RETENTION.length) : key;
    return references.has(mediaIdentity(source).folder);
  }) ? 409 : 200;
}

export const archiveActions = new Set(['delete_objects', 'delete_assets', 'delete_duplicates']);

export function resolveArchiveDeletion(inventory, action, ids, includeRetention) {
  if (!inventory.referencesVerified) return { status: 503, error: 'Não foi possível confirmar os vínculos com o site e o Cofre. Tente novamente.' };
  const assets = new Map(inventory.assets.map(asset => [asset.key, asset]));
  const objects = new Map(inventory.objects.map(obj => [obj.key, obj]));
  const keys = new Set();
  const duplicatePairs = [];
  for (const id of ids) {
    const object = action === 'delete_objects' ? objects.get(id) : null;
    const asset = action === 'delete_objects' ? assets.get(object?.assetKey) : assets.get(id);
    if (!asset) return { status: 409, error: 'Os arquivos mudaram. Atualize a tabela do B2 e selecione novamente.' };
    if (asset.usage !== 'orphan') return { status: 409, error: 'A seleção contém mídia vinculada ao site, à biblioteca ou ao Cofre. Atualize os vínculos antes de apagar.' };
    if (action === 'delete_duplicates') {
      const keeper = assets.get(asset.duplicateOf);
      if (!asset.fingerprintKey || !keeper?.fingerprintKey) {
        return { status: 409, error: 'A duplicata ou a cópia a manter mudou. Atualize a lista antes de apagar.' };
      }
      duplicatePairs.push([asset.fingerprintKey, keeper.fingerprintKey]);
    }

    if (object) {
      keys.add(object.key);
      if (includeRetention && !object.isArchiveCopy && object.hasArchiveBackup) keys.add(RETENTION + object.key);
    } else {
      for (const key of asset.objectKeys) keys.add(key);
      if (includeRetention || !asset.objectKeys.length) {
        for (const key of asset.retentionKeys) keys.add(key);
      }
    }
  }
  if (!keys.size) return { status: 400, error: 'Selecione ao menos uma mídia para apagar.' };
  return { keys: [...keys], duplicatePairs };
}
