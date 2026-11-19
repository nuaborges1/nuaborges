/**
 * Read-only Backblaze B2 inventory for authorized environments.
 * This script contains no mutating S3 operation and never prints credentials.
 * Run with: node --env-file=.env.local scripts/audit-b2-inventory.mjs
 */
import {
  S3Client,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  ListMultipartUploadsCommand,
  GetBucketVersioningCommand,
  GetBucketLifecycleConfigurationCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';

const accessKeyId = process.env.B2_APPLICATION_KEY_ID || process.env.BACKBLAZE_B2_ACCESS_KEY_ID || process.env.B2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.B2_APPLICATION_KEY || process.env.BACKBLAZE_B2_SECRET_ACCESS_KEY || process.env.B2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
const endpoint = process.env.B2_ENDPOINT || process.env.BACKBLAZE_B2_ENDPOINT || process.env.B2_S3_ENDPOINT || process.env.S3_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';
const region = process.env.B2_REGION || process.env.BACKBLAZE_B2_REGION || process.env.S3_REGION || 'us-east-005';
const mediaBucket = process.env.B2_BUCKET_NAME || process.env.BACKBLAZE_B2_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'nuaborges-media';
const snapshotBucket = process.env.B2_SNAPSHOT_BUCKET_NAME || 'b2-snapshots-2a052ae18938';
const verifyContent = process.argv.includes('--verify-content-sha256');

const sanitizeError = (error) => ({
  name: error?.name || 'UnknownError',
  code: error?.Code || error?.code || error?.$metadata?.httpStatusCode || 'UNKNOWN',
  httpStatus: error?.$metadata?.httpStatusCode || null,
  causes: Array.isArray(error?.errors) ? error.errors.map((cause) => cause?.code || cause?.name || 'UNKNOWN').slice(0, 8) : undefined,
});

async function collectAllPages(client, commandFactory, contentsSelector, nextToken) {
  const items = [];
  let token;
  do {
    const result = await client.send(commandFactory(token));
    items.push(...contentsSelector(result));
    token = result.IsTruncated ? nextToken(result) : undefined;
  } while (token);
  return items;
}

async function scanBucket(client, bucket) {
  const result = { bucket, status: 'ok', objects: [], versions: [], multipartUploads: [], versioning: null, lifecycleRuleCount: null };
  try {
    result.objects = await collectAllPages(
      client,
      (token) => new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token?.ContinuationToken, MaxKeys: 1000 }),
      (page) => (page.Contents || []).map((entry) => ({ key: entry.Key, sizeBytes: entry.Size, lastModified: entry.LastModified?.toISOString(), etag: entry.ETag })),
      (page) => ({ ContinuationToken: page.NextContinuationToken })
    );

    // Hash metadata only when present. ETags are recorded as hints and are not
    // treated as cryptographic proof of duplicate content.
    for (let i = 0; i < result.objects.length; i += 10) {
      await Promise.all(result.objects.slice(i, i + 10).map(async (object) => {
        try {
          const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: object.key }));
          object.contentType = head.ContentType || null;
          object.sha256 = head.Metadata?.sha256 || null;
          object.cacheControl = head.CacheControl || null;
          if (verifyContent) {
            const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: object.key }));
            const hash = createHash('sha256');
            for await (const chunk of response.Body || []) hash.update(chunk);
            object.verifiedSha256 = hash.digest('hex');
          }
        } catch (error) {
          object.headError = sanitizeError(error);
        }
      }));
    }

    try {
      result.versions = await collectAllPages(
        client,
        (token) => new ListObjectVersionsCommand({ Bucket: bucket, KeyMarker: token?.KeyMarker, VersionIdMarker: token?.VersionIdMarker }),
        (page) => [
          ...(page.Versions || []).map((version) => ({ key: version.Key, versionId: version.VersionId, sizeBytes: version.Size, isLatest: version.IsLatest, lastModified: version.LastModified?.toISOString(), deleteMarker: false })),
          ...(page.DeleteMarkers || []).map((marker) => ({ key: marker.Key, versionId: marker.VersionId, isLatest: marker.IsLatest, lastModified: marker.LastModified?.toISOString(), deleteMarker: true })),
        ],
        (page) => ({ KeyMarker: page.NextKeyMarker, VersionIdMarker: page.NextVersionIdMarker })
      );
    } catch (error) { result.versionsError = sanitizeError(error); }

    try {
      result.multipartUploads = await collectAllPages(
        client,
        (token) => new ListMultipartUploadsCommand({ Bucket: bucket, KeyMarker: token?.KeyMarker, UploadIdMarker: token?.UploadIdMarker }),
        (page) => (page.Uploads || []).map((upload) => ({ key: upload.Key, uploadId: upload.UploadId, initiated: upload.Initiated?.toISOString() })),
        (page) => ({ KeyMarker: page.NextKeyMarker, UploadIdMarker: page.NextUploadIdMarker })
      );
    } catch (error) { result.multipartError = sanitizeError(error); }

    try {
      const versioning = await client.send(new GetBucketVersioningCommand({ Bucket: bucket }));
      result.versioning = { status: versioning.Status || 'Disabled', mfaDelete: versioning.MFADelete || 'Disabled' };
    } catch (error) { result.versioningError = sanitizeError(error); }

    try {
      const lifecycle = await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }));
      result.lifecycleRuleCount = lifecycle.Rules?.length || 0;
      result.lifecycleRules = lifecycle.Rules || [];
    } catch (error) { result.lifecycleError = sanitizeError(error); }
  } catch (error) {
    result.status = 'error';
    result.error = sanitizeError(error);
  }

  result.objectCount = result.objects.length;
  result.totalBytes = result.objects.reduce((sum, object) => sum + (object.sizeBytes || 0), 0);
  const shaCounts = new Map();
  for (const object of result.objects) {
    if (object.sha256) shaCounts.set(object.sha256, (shaCounts.get(object.sha256) || 0) + 1);
  }
  const verifiedCounts = new Map();
  for (const object of result.objects) {
    if (object.verifiedSha256) verifiedCounts.set(object.verifiedSha256, [...(verifiedCounts.get(object.verifiedSha256) || []), object.key]);
  }
  result.matchingDeclaredSha256Groups = [...shaCounts].filter(([, count]) => count > 1).length;
  result.confirmedDuplicateContentGroups = verifyContent
    ? [...verifiedCounts].filter(([, keys]) => keys.length > 1).map(([sha256, keys]) => ({ sha256, keys }))
    : null;
  return result;
}

if (!accessKeyId || !secretAccessKey) {
  process.stdout.write(`${JSON.stringify({ status: 'credentials_missing', message: 'Credenciais B2 ausentes no ambiente. Nenhuma conexão foi tentada.', buckets: [mediaBucket, snapshotBucket] }, null, 2)}\n`);
  process.exitCode = 2;
} else {
  const client = new S3Client({ region, endpoint, forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } });
  const report = {
    generatedAt: new Date().toISOString(),
    mode: verifyContent ? 'read-only-full-content-hash' : 'read-only-inventory',
    endpointHost: new URL(endpoint).host,
    note: verifyContent
      ? 'Além do inventário, os objetos foram lidos integralmente em streaming para confirmação SHA-256; nenhuma gravação ou exclusão foi executada.'
      : 'Nenhuma operação de gravação, exclusão, lifecycle update ou multipart abort foi executada. SHA-256 em metadata é declarado e não equivale a hash confirmado do conteúdo.',
    buckets: await Promise.all([scanBucket(client, mediaBucket), scanBucket(client, snapshotBucket)]),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  await client.destroy();
}
