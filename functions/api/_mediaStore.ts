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

// Polyfill global DOMParser / Node for Cloudflare Workers environment if undefined
if (typeof (globalThis as any).DOMParser === 'undefined') {
  (globalThis as any).DOMParser = class DOMParserPolyfill {
    parseFromString() {
      return {
        getElementsByTagName: () => [],
        documentElement: { nodeName: 'xml', childNodes: [], attributes: [] },
      };
    }
  };
}
if (typeof (globalThis as any).Node === 'undefined') {
  (globalThis as any).Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8, DOCUMENT_NODE: 9 };
}

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
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
  contentRange?: string;
}

export interface StoredObjectMetadata {
  size: number;
  contentType: string;
  metadata: Record<string, string>;
}

export interface StoredMediaStream {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength?: number;
  contentRange?: string;
}

export interface DeleteMediaResult {
  deleted: string[];
  failures: Array<{ key: string; code: string; message: string }>;
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
  options: { limit?: number; cursor?: string } = {}
): Promise<{ objects: Array<{ key: string; size?: number; uploadedAt?: string; contentType?: string }>; nextCursor?: string }> {
  const limit = Math.min(Math.max(options.limit || 100, 1), 1000);
  if (hasS3(env)) {
    const s3 = getS3Client(env);
    if (!s3) throw new Error('MEDIA_STORAGE_NOT_CONFIGURED');
    const listed = await s3.client.send(new ListObjectsV2Command({
      Bucket: s3.bucketName,
      ContinuationToken: options.cursor,
      MaxKeys: limit,
    }));
    const objects = (listed.Contents || []).flatMap((object) => object.Key ? [{
      key: object.Key,
      size: object.Size,
      uploadedAt: object.LastModified?.toISOString(),
    }] : []);
    return { objects, nextCursor: listed.IsTruncated ? listed.NextContinuationToken : undefined };
  }

  throw new Error('MEDIA_STORAGE_NOT_CONFIGURED');
}

export function maxUploadBytes(env: MediaEnv): number {
  return S3_MAX_VALUE_BYTES;
}

export async function putMedia(
  env: MediaEnv,
  key: string,
  body: ArrayBuffer,
  contentType: string,
  metadata: Record<string, string> = {}
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
          Metadata: metadata,
          CacheControl: isPrivateObjectKey(key)
            ? 'private, no-store, max-age=0'
            : 'public, max-age=31536000, immutable',
        })
      );
      return;
    }
  }

  throw new Error('MEDIA_STORAGE_NOT_CONFIGURED');
}

async function bodyToUint8Array(body: any): Promise<Uint8Array> {
  if (!body) return new Uint8Array(0);
  if (typeof body.transformToByteArray === 'function') {
    return await body.transformToByteArray();
  }
  if (typeof body.arrayBuffer === 'function') {
    const ab = await body.arrayBuffer();
    return new Uint8Array(ab);
  }
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLength += value.length;
      }
    }
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    return combined;
  }
  const ab = await new Response(body).arrayBuffer();
  return new Uint8Array(ab);
}

export async function getMedia(env: MediaEnv, key: string, range?: string): Promise<StoredMedia | null> {
  if (hasS3(env)) {
    const s3 = getS3Client(env);
    if (s3) {
      try {
        const res = await s3.client.send(
          new GetObjectCommand({
            Bucket: s3.bucketName,
            Key: key,
            ...(range ? { Range: range } : {}),
          })
        );
        if (res.Body) {
          const bytes = await bodyToUint8Array(res.Body);
          const buffer = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength
          ) as ArrayBuffer;
          return {
            body: buffer,
            contentType: res.ContentType || 'application/octet-stream',
            size: buffer.byteLength,
            contentRange: res.ContentRange,
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

/** Fetch a B2 object as a web stream so large videos never become one edge buffer. */
export async function getMediaStream(env: MediaEnv, key: string, range?: string): Promise<StoredMediaStream | null> {
  const s3 = getS3Client(env);
  if (!s3) throw new Error('MEDIA_STORAGE_NOT_CONFIGURED');
  let result;
  try {
    result = await s3.client.send(new GetObjectCommand({
      Bucket: s3.bucketName,
      Key: key,
      ...(range ? { Range: range } : {}),
    }));
  } catch (error: any) {
    if (error?.name === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
  if (!result.Body) return null;
  const sdkBody = result.Body as any;
  let body: ReadableStream<Uint8Array>;
  if (typeof sdkBody.transformToWebStream === 'function') {
    body = sdkBody.transformToWebStream();
  } else if (typeof ReadableStream !== 'undefined' && sdkBody instanceof ReadableStream) {
    body = sdkBody;
  } else {
    // Runtime compatibility fallback; supported Cloudflare runtimes should use
    // transformToWebStream above. This path is not used for normal large media.
    const bytes = await sdkBody.transformToByteArray();
    body = new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
  }
  return {
    body,
    contentType: result.ContentType || 'application/octet-stream',
    contentLength: result.ContentLength,
    contentRange: result.ContentRange,
  };
}

function isPrivateObjectKey(key: string): boolean {
  return key.split('/').includes('private');
}

export async function headMedia(env: MediaEnv, key: string): Promise<StoredObjectMetadata | null> {
  const s3 = getS3Client(env);
  if (!s3) throw new Error('MEDIA_STORAGE_NOT_CONFIGURED');
  let result;
  try {
    result = await s3.client.send(new HeadObjectCommand({ Bucket: s3.bucketName, Key: key }));
  } catch (error: any) {
    if (error?.name === 'NotFound' || error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
  if (typeof result.ContentLength !== 'number') return null;
  return {
    size: result.ContentLength,
    contentType: result.ContentType || 'application/octet-stream',
    metadata: result.Metadata || {},
  };
}

export async function deleteS3Object(env: MediaEnv, key: string): Promise<boolean> {
  const s3 = getS3Client(env);
  if (!s3) return false;
  try {
    await s3.client.send(
      new DeleteObjectCommand({
        Bucket: s3.bucketName,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.error(`[MediaStore] Erro ao excluir objeto ${key}:`, err);
    return false;
  }
}

export async function deleteMedia(env: MediaEnv, keys: string[]): Promise<DeleteMediaResult> {
  const s3 = getS3Client(env);
  if (!s3 || keys.length === 0) {
    return { deleted: [], failures: [] };
  }

  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return { deleted: [], failures: [] };

  try {
    const res = await s3.client.send(
      new DeleteObjectsCommand({
        Bucket: s3.bucketName,
        Delete: {
          Objects: validKeys.map((Key) => ({ Key })),
          Quiet: false,
        },
      })
    );

    const deleted = (res.Deleted || []).map((d) => d.Key || '').filter(Boolean);
    const failures = (res.Errors || []).map((e) => ({
      key: e.Key || '',
      code: e.Code || 'DeleteError',
      message: e.Message || 'Falha ao excluir do B2',
    }));

    const reportedDeleted = deleted.length > 0 ? deleted : validKeys.filter((k) => !failures.some((f) => f.key === k));

    return {
      deleted: reportedDeleted,
      failures,
    };
  } catch (err: any) {
    console.error('[MediaStore] S3 deleteMedia error:', err);
    return {
      deleted: [],
      failures: validKeys.map((key) => ({
        key,
        code: 'S3_DELETE_FAILED',
        message: err?.message || String(err),
      })),
    };
  }
}

