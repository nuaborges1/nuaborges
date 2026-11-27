import { createHash } from 'node:crypto';
import { DeleteObjectsCommand, GetObjectCommand, ListObjectVersionsCommand } from '@aws-sdk/client-s3';

/**
 * @param {any} client
 * @param {string} bucket
 * @param {string[]} keys
 * @param {{expected?: Map<string, {eTag?: string | null, size: number}>, duplicatePairs?: string[][], checkReferences?: () => Promise<void>}} options
 */
export async function deletePhysicalMedia(client, bucket, keys, options = {}) {
  const checksums = new Map();
  const checksum = async (key) => {
    if (checksums.has(key)) return checksums.get(key);
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const expected = options.expected?.get(key);
    if (!object.Body || !expected || object.ContentLength !== expected.size ||
        object.ETag?.replace(/^"|"$/g, '') !== expected.eTag) {
      throw new Error('ARCHIVE_DUPLICATE_CHANGED');
    }
    const hash = createHash('sha256');
    const stream = object.Body.transformToWebStream();
    const reader = stream.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        hash.update(value);
      }
    } finally {
      reader.releaseLock();
    }
    const digest = hash.digest('hex');
    checksums.set(key, digest);
    return digest;
  };
  for (const [candidate, keeper] of options.duplicatePairs || []) {
    if (await checksum(candidate) !== await checksum(keeper)) throw new Error('ARCHIVE_DUPLICATE_CHANGED');
  }

  const selected = new Set(keys);
  const versions = new Map(keys.map(key => [key, []]));
  let keyMarker;
  let versionMarker;
  for (;;) {
    const page = await client.send(new ListObjectVersionsCommand({
      Bucket: bucket,
      KeyMarker: keyMarker,
      VersionIdMarker: versionMarker,
      MaxKeys: 1000,
    }));
    for (const entry of [...(page.Versions || []), ...(page.DeleteMarkers || [])]) {
      if (!selected.has(entry.Key)) continue;
      if (!entry.VersionId) throw new Error('O B2 não informou a versão de um objeto selecionado.');
      versions.get(entry.Key).push({ Key: entry.Key, VersionId: entry.VersionId, latest: entry.IsLatest, eTag: entry.ETag?.replace(/^"|"$/g, ''), size: entry.Size });
    }
    if (!page.IsTruncated) break;
    if (!page.NextKeyMarker || (page.NextKeyMarker === keyMarker && page.NextVersionIdMarker === versionMarker)) {
      throw new Error('A paginação de versões do B2 não pôde ser concluída.');
    }
    keyMarker = page.NextKeyMarker;
    versionMarker = page.NextVersionIdMarker;
  }

  const failures = new Map();
  for (const key of keys) {
    const latest = versions.get(key).filter(version => version.latest);
    const expected = options.expected?.get(key);
    if (latest.length !== 1 || (expected && (expected.size !== latest[0].size || (expected.eTag && expected.eTag !== latest[0].eTag)))) {
      failures.set(key, { key, code: 'InventoryChanged', message: 'O B2 não confirmou a versão atual deste arquivo.' });
    }
  }

  await options.checkReferences?.();

  // Preserve the latest version or marker if deleting an older version failed.
  for (const latest of [false, true]) {
    const entries = [...versions.values()].flat().filter(entry => Boolean(entry.latest) === latest && !failures.has(entry.Key));
    for (let offset = 0; offset < entries.length; offset += 1000) {
      const objects = entries.slice(offset, offset + 1000).map(({ Key, VersionId }) => ({ Key, VersionId }));
      try {
        const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: false } }));
        const confirmed = new Set((result.Deleted || []).map(entry => `${entry.Key}\0${entry.VersionId || entry.DeleteMarkerVersionId}`));
        for (const entry of objects) {
          if (confirmed.has(`${entry.Key}\0${entry.VersionId}`)) continue;
          const error = (result.Errors || []).find(item => item.Key === entry.Key && (!item.VersionId || item.VersionId === entry.VersionId));
          failures.set(entry.Key, { key: entry.Key, code: error?.Code || 'DeletionNotConfirmed', message: 'O B2 não confirmou a exclusão de uma versão.' });
        }
      } catch {
        for (const { Key } of objects) {
          failures.set(Key, { key: Key, code: 'S3_DELETE_FAILED', message: 'Falha ao excluir versões do Backblaze B2.' });
        }
      }
    }
  }
  return { deleted: keys.filter(key => !failures.has(key)), failures: [...failures.values()] };
}
