/**
 * Media Storage Abstraction — Backblaze B2 Object Storage (S3-compatible)
 *
 * Cloudflare Pages Functions atua exclusivamente como Edge Proxy e Deploy.
 * O armazenamento de mídia (fotos, vídeos, áudios) é 100% gerenciado no
 * Backblaze B2 (bucket S3-compatible nuaborges-media).
 *
 * Todas as rotas (/media/..., /api/media/upload, /api/media/delete) operam
 * de forma unificada e transparente em qualquer domínio (pages.dev ou domínio próprio).
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

export const S3_MAX_VALUE_BYTES = 500 * 1024 * 1024; // 500MB para Backblaze B2 / S3

export interface MediaEnv {
  B2_APPLICATION_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  B2_BUCKET_NAME?: string;
  B2_ENDPOINT?: string;
  B2_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_BUCKET_NAME?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  [key: string]: any;
}

export interface StoredMedia {
  body: ArrayBuffer;
  contentType: string;
  size: number;
}

let cachedS3Client: { client: S3Client; bucketName: string; signature: string } | null = null;

function getS3Client(env: MediaEnv): { client: S3Client; bucketName: string } | null {
  const accessKeyId =
    env.B2_APPLICATION_KEY_ID ||
    env.BACKBLAZE_B2_ACCESS_KEY_ID ||
    env.B2_ACCESS_KEY_ID ||
    env.S3_ACCESS_KEY_ID ||
    (typeof process !== 'undefined'
      ? process.env?.B2_APPLICATION_KEY_ID ||
        process.env?.BACKBLAZE_B2_ACCESS_KEY_ID ||
        process.env?.B2_ACCESS_KEY_ID ||
        process.env?.S3_ACCESS_KEY_ID
      : undefined);

  const secretAccessKey =
    env.B2_APPLICATION_KEY ||
    env.BACKBLAZE_B2_SECRET_ACCESS_KEY ||
    env.B2_SECRET_ACCESS_KEY ||
    env.S3_SECRET_ACCESS_KEY ||
    (typeof process !== 'undefined'
      ? process.env?.B2_APPLICATION_KEY ||
        process.env?.BACKBLAZE_B2_SECRET_ACCESS_KEY ||
        process.env?.B2_SECRET_ACCESS_KEY ||
        process.env?.S3_SECRET_ACCESS_KEY
      : undefined);

  const endpoint =
    env.B2_ENDPOINT ||
    env.BACKBLAZE_B2_ENDPOINT ||
    env.B2_S3_ENDPOINT ||
    env.S3_ENDPOINT ||
    (typeof process !== 'undefined'
      ? process.env?.B2_ENDPOINT ||
        process.env?.BACKBLAZE_B2_ENDPOINT ||
        process.env?.B2_S3_ENDPOINT ||
        process.env?.S3_ENDPOINT
      : undefined);

  const region =
    env.B2_REGION ||
    env.BACKBLAZE_B2_REGION ||
    env.S3_REGION ||
    (typeof process !== 'undefined'
      ? process.env?.B2_REGION || process.env?.BACKBLAZE_B2_REGION || process.env?.S3_REGION
      : undefined) ||
    'us-east-005';

  const bucketName =
    env.B2_BUCKET_NAME ||
    env.BACKBLAZE_B2_BUCKET_NAME ||
    env.S3_BUCKET_NAME ||
    env.S3_BUCKET ||
    (typeof process !== 'undefined'
      ? process.env?.B2_BUCKET_NAME ||
        process.env?.BACKBLAZE_B2_BUCKET_NAME ||
        process.env?.S3_BUCKET_NAME ||
        process.env?.S3_BUCKET
      : undefined) ||
    'nuaborges-media';

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    return null;
  }

  const signature = `${accessKeyId}:${region}:${endpoint}:${bucketName}`;
  if (cachedS3Client && cachedS3Client.signature === signature) {
    return cachedS3Client;
  }

  const client = new S3Client({
    region,
    endpoint,
    // O endpoint S3 do Backblaze B2 exige o bucket no caminho da URL.
    // Sem isso, alguns runtimes edge podem montar a requisição em estilo
    // virtual-host e a listagem falha silenciosamente em produção.
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  cachedS3Client = { client, bucketName, signature };
  return cachedS3Client;
}

function hasS3(env: MediaEnv): boolean {
  return Boolean(
    (env.B2_APPLICATION_KEY_ID ||
      env.BACKBLAZE_B2_ACCESS_KEY_ID ||
      env.B2_ACCESS_KEY_ID ||
      env.S3_ACCESS_KEY_ID ||
      (typeof process !== 'undefined' &&
        (process.env?.B2_APPLICATION_KEY_ID ||
          process.env?.BACKBLAZE_B2_ACCESS_KEY_ID ||
          process.env?.B2_ACCESS_KEY_ID ||
          process.env?.S3_ACCESS_KEY_ID))) &&
      (env.B2_APPLICATION_KEY ||
        env.BACKBLAZE_B2_SECRET_ACCESS_KEY ||
        env.B2_SECRET_ACCESS_KEY ||
        env.S3_SECRET_ACCESS_KEY ||
        (typeof process !== 'undefined' &&
          (process.env?.B2_APPLICATION_KEY ||
            process.env?.BACKBLAZE_B2_SECRET_ACCESS_KEY ||
            process.env?.B2_SECRET_ACCESS_KEY ||
            process.env?.S3_SECRET_ACCESS_KEY)))
  );
}

export function isMediaStorageConfigured(env: MediaEnv): boolean {
  return hasS3(env);
}

/** Lista objetos do storage Backblaze B2 sem expor credenciais ao cliente. */
export async function listMediaObjects(
  env: MediaEnv,
  options: { limit?: number } = {}
): Promise<Array<{ key: string; size?: number; uploadedAt?: string; contentType?: string }>> {
  const limit = Math.min(Math.max(options.limit || 500, 1), 1000);
  if (hasS3(env)) {
    const s3 = getS3Client(env);
    if (!s3) return [];

    const objects: Array<{ key: string; size?: number; uploadedAt?: string; contentType?: string }> = [];
    let continuationToken: string | undefined;
    do {
      const listed = await s3.client.send(
        new ListObjectsV2Command({
          Bucket: s3.bucketName,
          ContinuationToken: continuationToken,
          MaxKeys: Math.min(1000, limit - objects.length),
        })
      );

      for (const object of listed.Contents || []) {
        if (!object.Key) continue;
        objects.push({
          key: object.Key,
          size: object.Size,
          uploadedAt: object.LastModified?.toISOString(),
        });
      }

      continuationToken =
        objects.length < limit && listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken && objects.length < limit);

    return objects.slice(0, limit);
  }

  return [];
}

export function maxUploadBytes(env: MediaEnv): number {
  return S3_MAX_VALUE_BYTES;
}

export async function putMedia(
  env: MediaEnv,
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<void> {
  if (hasS3(env)) {
    const s3 = getS3Client(env);
    if (s3) {
      const uint8 = body instanceof Uint8Array ? body : new Uint8Array(body);
      await s3.client.send(
        new PutObjectCommand({
          Bucket: s3.bucketName,
          Key: key,
          Body: uint8,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      return;
    }
  }

  throw new Error('MEDIA_STORAGE_NOT_CONFIGURED');
}

export async function getMedia(env: MediaEnv, key: string): Promise<StoredMedia | null> {
  if (hasS3(env)) {
    const s3 = getS3Client(env);
    if (s3) {
      try {
        const res = await s3.client.send(
          new GetObjectCommand({
            Bucket: s3.bucketName,
            Key: key,
          })
        );
        if (res.Body) {
          const bytes = await res.Body.transformToByteArray();
          const buffer = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          ) as ArrayBuffer;
          return {
            body: buffer,
            contentType: res.ContentType || 'application/octet-stream',
            size: buffer.byteLength,
          };
        }
      } catch (err: any) {
        if (err.name !== 'NoSuchKey' && err.Code !== 'NoSuchKey') {
          console.error('[MediaStore] S3 GetObject error:', err);
        }
      }
    }
  }

  return null;
}

export async function deleteMedia(env: MediaEnv, keys: string[]): Promise<void> {
  if (hasS3(env)) {
    const s3 = getS3Client(env);
    if (s3 && keys.length > 0) {
      try {
        await s3.client.send(
          new DeleteObjectsCommand({
            Bucket: s3.bucketName,
            Delete: {
              Objects: keys.map((k) => ({ Key: k })),
              Quiet: true,
            },
          })
        );
      } catch (err) {
        console.error('[MediaStore] S3 delete error:', err);
      }
    }
  }
}

