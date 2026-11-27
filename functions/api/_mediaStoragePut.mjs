import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { mediaIdentity } from '../../lib/media/objectKeys.mjs';
import { storageObjectMatches } from './_mediaRecovery.mjs';

export async function headStorageObject(client, bucket, key) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { size: head.ContentLength, metadata: head.Metadata, contentType: head.ContentType };
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || ['NotFound', 'NoSuchKey'].includes(error?.name)) return null;
    throw error;
  }
}

const writesByClient = new WeakMap();

export async function assetStoragePut(client, bucket, key, bytes, mime, sha256) {
  let activeWrites = writesByClient.get(client);
  if (!activeWrites) {
    activeWrites = new Map();
    writesByClient.set(client, activeWrites);
  }
  const signature = `${bucket}/${key}`;
  const previous = activeWrites.get(signature) || Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    const retainedKey = `phdev-archive/${key}`;
    const identity = mediaIdentity(key);
    const matches = async (target) => Boolean(identity.sha256) &&
      storageObjectMatches(await headStorageObject(client, bucket, target), bytes.byteLength, sha256);
    const put = (target, retention = false) => client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: target,
      Body: bytes,
      ContentType: mime,
      Metadata: retention ? { sha256, sourcekey: key, archivedat: new Date().toISOString() } : { sha256 },
      CacheControl: retention || identity.scope === 'private'
        ? 'private, no-store, max-age=0'
        : 'public, max-age=31536000, immutable',
    }));

    const reused = await matches(key);
    if (!reused) await put(key);
    let retentionPending = false;
    try {
      if (!(await matches(retainedKey))) await put(retainedKey, true);
    } catch {
      retentionPending = true;
    }
    return { reused, retentionPending };
  });
  activeWrites.set(signature, pending);
  try {
    return await pending;
  } finally {
    if (activeWrites.get(signature) === pending) activeWrites.delete(signature);
  }
}
