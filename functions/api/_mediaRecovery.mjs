import { mediaIdentity, objectRole } from '../../lib/media/objectKeys.mjs';

function dimensions(key) {
  const match = key.match(/-(\d+)x(\d+)-/);
  return { width: Number(match?.[1] || 0), height: Number(match?.[2] || 0) };
}

export async function recoverStoredMedia(list, head, { storageKey, mimeType, originalName, sizeBytes, processingVersion, assetId }) {
  const prefix = `${storageKey}/`;
  const { objects, nextCursor } = await list({ prefix, limit: 1000 });
  if (nextCursor) throw new Error('Inventário do ativo excede o limite de verificação.');
  const { scope, sha256 } = mediaIdentity(storageKey);
  const video = mimeType.startsWith('video/');
  if (!video && !mimeType.startsWith('image/')) return null;

  const usable = objects.filter(obj => obj.key.startsWith(prefix) && obj.size > 0)
    .sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')) || a.key.localeCompare(b.key));
  const pick = (role) => usable.find(obj => objectRole(obj.key) === role);
  const selected = video
    ? { original: pick('original'), poster: pick('poster') }
    : { full: pick('full'), mobile: pick('mobile'), thumb: pick('thumb') };
  if (Object.values(selected).some(obj => !obj)) return null;

  if (video && scope === 'private') {
    const commercial = pick('commercialOriginal');
    const exact = await head((commercial || selected.original).key);
    if (!exact || exact.metadata?.sha256 !== sha256 || exact.size !== sizeBytes) return null;
    if (commercial) selected.commercialOriginal = commercial;
  }

  const variants = Object.fromEntries(Object.entries(selected).map(([role, obj]) => {
    const format = role === 'original' ? 'video' : role === 'commercialOriginal' ? 'original' : 'webp';
    return [role, {
      key: obj.key,
      url: `/${obj.key}`,
      ...dimensions(obj.key),
      sizeBytes: obj.size,
      format,
      mimeType: format === 'webp' ? 'image/webp' : mimeType,
    }];
  }));
  const primary = video ? selected.original : selected.full;
  const primaryDimensions = dimensions(primary.key);
  return {
    id: assetId ? `media-${assetId}` : `media-${scope}-${sha256}`,
    name: originalName.replace(/\.[^/.]+$/, '') || 'Mídia',
    objectKey: primary.key,
    mimeType: video ? mimeType : 'image/webp',
    sizeBytes: video ? primary.size : Object.values(selected).reduce((total, obj) => total + obj.size, 0),
    originalSizeBytes: sizeBytes,
    width: primaryDimensions.width || undefined,
    height: primaryDimensions.height || undefined,
    isVideo: video,
    posterKey: selected.poster?.key,
    posterUrl: variants.poster?.url,
    variants,
    uploadedAt: primary.uploadedAt || new Date().toISOString(),
    provider: 'http-media-api',
    fingerprint: `sha256:${sha256}`,
    processingVersion,
  };
}

export function storageObjectMatches(head, size, sha256) {
  return Boolean(head && sha256 && head.size === size && head.metadata?.sha256 === sha256);
}
