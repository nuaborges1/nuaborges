/**
 * Media Storage Abstraction — Cloudflare Pages Functions
 *
 * Armazena mídias no plano 100% gratuito da Cloudflare:
 * - Preferência: binding R2 nativo (BUCKET), se um dia for habilitado.
 * - Padrão: Workers KV (NUA_MEDIA) — sem cartão de crédito, limite de 25 MiB por arquivo.
 *
 * Ambos os deploys (site e admin) usam o MESMO namespace KV, então uma URL
 * relativa "/media/..." funciona em qualquer domínio (pages.dev ou domínio próprio).
 */

export const KV_MAX_VALUE_BYTES = 25 * 1024 * 1024; // limite do Workers KV por valor

export interface MediaEnv {
  BUCKET?: any;
  NUA_MEDIA?: any;
  [key: string]: any;
}

export interface StoredMedia {
  body: ArrayBuffer;
  contentType: string;
  size: number;
}

function hasR2(env: MediaEnv): boolean {
  return Boolean(env.BUCKET && typeof env.BUCKET.put === 'function');
}

function hasKv(env: MediaEnv): boolean {
  return Boolean(env.NUA_MEDIA && typeof env.NUA_MEDIA.put === 'function');
}

export function isMediaStorageConfigured(env: MediaEnv): boolean {
  return hasR2(env) || hasKv(env);
}

export function maxUploadBytes(env: MediaEnv): number {
  return hasR2(env) ? 50 * 1024 * 1024 : KV_MAX_VALUE_BYTES;
}

export async function putMedia(
  env: MediaEnv,
  key: string,
  body: ArrayBuffer,
  contentType: string
): Promise<void> {
  if (hasR2(env)) {
    await env.BUCKET.put(key, body, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    return;
  }
  if (hasKv(env)) {
    await env.NUA_MEDIA.put(key, body, {
      metadata: { contentType, size: body.byteLength, uploadedAt: new Date().toISOString() },
    });
    return;
  }
  throw new Error('MEDIA_STORAGE_NOT_CONFIGURED');
}

export async function getMedia(env: MediaEnv, key: string): Promise<StoredMedia | null> {
  if (hasR2(env)) {
    const obj = await env.BUCKET.get(key);
    if (obj) {
      const body = await obj.arrayBuffer();
      return {
        body,
        contentType: obj.httpMetadata?.contentType || 'application/octet-stream',
        size: body.byteLength,
      };
    }
  }
  if (env.NUA_MEDIA && typeof env.NUA_MEDIA.getWithMetadata === 'function') {
    const { value, metadata } = await env.NUA_MEDIA.getWithMetadata(key, 'arrayBuffer');
    if (value) {
      return {
        body: value as ArrayBuffer,
        contentType: (metadata as any)?.contentType || 'application/octet-stream',
        size: (value as ArrayBuffer).byteLength,
      };
    }
  }
  return null;
}

export async function deleteMedia(env: MediaEnv, keys: string[]): Promise<void> {
  if (hasR2(env)) {
    await Promise.all(keys.map((k) => env.BUCKET.delete(k)));
  }
  if (env.NUA_MEDIA && typeof env.NUA_MEDIA.delete === 'function') {
    await Promise.all(keys.map((k) => env.NUA_MEDIA.delete(k)));
  }
}
