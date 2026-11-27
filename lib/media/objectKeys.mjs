const MODERN = /^media\/objects\/(public|private)\/([a-f0-9]{64})(?=\/|$)/;
const LEGACY = /^media\/(?:private\/)?media-[^/]+(?=\/|$)/;

/** @param {unknown} value */
export function normalizeObjectKey(value) {
  if (typeof value !== 'string') return '';
  let input = value.trim().split(/[?#]/, 1)[0];
  if (!input || /^(data|blob):/i.test(input)) return '';
  input = input.replace(/^(?:https?:)?\/\/[^/]+\//i, '').replace(/^\/+/, '');
  try { input = decodeURIComponent(input); } catch { return ''; }
  const mediaIndex = input.indexOf('/media/');
  return mediaIndex < 0 ? input : input.slice(mediaIndex + 1);
}

/** @param {string} key */
export function mediaIdentity(key) {
  const modern = key.match(MODERN);
  return {
    folder: modern?.[0] || key.match(LEGACY)?.[0] || key,
    scope: modern?.[1] || (key.split('/').includes('private') ? 'private' : 'public'),
    sha256: modern?.[2],
  };
}

/** @param {string} key */
export function objectRole(key) {
  const name = key.split('/').pop()?.toLowerCase() || '';
  if (/^(?:thumb|mobile|full|poster)(?:[-.]|$)/.test(name) && /\.(webp|png|jpe?g|avif)$/.test(name)) {
    return name.split(/[-.]/, 1)[0];
  }
  if (name === 'commercial-original') return 'commercialOriginal';
  if (/^video-video-|\.(mp4|webm|mov|m4v|mkv)$/.test(name)) return 'original';
  return '';
}

/** @param {string} key */
export function objectKind(key) {
  const role = objectRole(key);
  if (role === 'original' || role === 'commercialOriginal') return 'video';
  if (/\.(webp|jpe?g|png|gif|avif)$/i.test(key)) return 'image';
  if (/\.(mp3|wav|ogg|m4a)$/i.test(key)) return 'audio';
  return 'other';
}
