/**
 * Cloudflare Pages Function: /api/media/presign
 *
 * Security Level 5 Hardened Presign Endpoint:
 * - Anti-IDOR key validation
 * - Strict MIME allowlist
 * - Masked errors
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { headMedia, type MediaEnv } from '../_mediaStore';
import { storageObjectMatches } from '../_mediaRecovery.mjs';
import { isValidObjectKey, ALLOWED_MIME_TYPES } from '../_security';

interface Env extends MediaEnv {
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
  NEXT_PUBLIC_MEDIA_CDN_URL?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      key?: string;
      mimeType?: string;
      sizeBytes?: number;
      objectSha256?: string;
    };

    const { key, mimeType, sizeBytes, objectSha256 } = body;

    // 1. Key Validation
    if (!key || !isValidObjectKey(key)) {
      return new Response(
        JSON.stringify({ error: 'Nome ou destino do arquivo inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. MIME Validation
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType as any)) {
      return new Response(
        JSON.stringify({ error: 'Tipo de arquivo não permitido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (key.startsWith('media/objects/') && (!objectSha256 || !/^[a-f0-9]{64}$/i.test(objectSha256))) {
      return Response.json({ error: 'Impressão digital do objeto obrigatória.' }, { status: 400 });
    }

    // Para arquivos de até 25MB (fotos e vídeos médios), o upload direto via proxy
    // (/api/media/upload) é o caminho preferido, mais rápido e imune a restrições de CORS no bucket.
    if (sizeBytes && (sizeBytes as number) <= 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ uploadUrl: '', fallback: 'direct', reason: 'proxy-preferred' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const accessKeyId =
      env.B2_APPLICATION_KEY_ID ||
      (env as any).BACKBLAZE_B2_ACCESS_KEY_ID ||
      (env as any).B2_ACCESS_KEY_ID ||
      env.S3_ACCESS_KEY_ID;

    const secretAccessKey =
      env.B2_APPLICATION_KEY ||
      (env as any).BACKBLAZE_B2_SECRET_ACCESS_KEY ||
      (env as any).B2_SECRET_ACCESS_KEY ||
      env.S3_SECRET_ACCESS_KEY;

    const endpoint =
      env.B2_ENDPOINT ||
      (env as any).BACKBLAZE_B2_ENDPOINT ||
      (env as any).B2_S3_ENDPOINT ||
      env.S3_ENDPOINT ||
      'https://s3.us-east-005.backblazeb2.com';

    const region =
      env.B2_REGION ||
      (env as any).BACKBLAZE_B2_REGION ||
      env.S3_REGION ||
      'us-east-005';

    const bucket =
      env.B2_BUCKET_NAME ||
      (env as any).BACKBLAZE_B2_BUCKET_NAME ||
      env.S3_BUCKET_NAME ||
      (env as any).S3_BUCKET ||
      'nuaborges-media';

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      // Sem credenciais B2 configuradas no ambiente: usa upload direto via /api/media/upload
      return new Response(
        JSON.stringify({ uploadUrl: '', fallback: 'multipart', reason: 'presign-unavailable' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const s3 = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });

    const isPrivate = key.split('/').includes('private');
    const cacheControl = isPrivate
      ? 'private, no-store, max-age=0'
      : 'public, max-age=31536000, immutable';

    const cdnBase = (env.NEXT_PUBLIC_MEDIA_CDN_URL || '').replace(/\/$/, '');
    const publicUrl = !isPrivate && cdnBase ? `${cdnBase}/${key}` : `/${key}`;
    if (key.startsWith('media/objects/') && objectSha256 &&
        storageObjectMatches(await headMedia(env, key), sizeBytes, objectSha256.toLowerCase())) {
      return Response.json({ alreadyExists: true, objectKey: key, publicUrl });
    }

    const metadata: Record<string, string> = {};
    if (objectSha256 && /^[a-f0-9]{64}$/i.test(objectSha256)) {
      metadata.sha256 = objectSha256.toLowerCase();
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
      CacheControl: cacheControl,
      ...(Object.keys(metadata).length > 0 ? { Metadata: metadata } : {}),
    });

    const unhoistableHeaders = new Set(['content-type']);
    if (metadata.sha256) {
      unhoistableHeaders.add('x-amz-meta-sha256');
    }

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
      unhoistableHeaders,
    });

    return new Response(
      JSON.stringify({
        uploadUrl,
        objectKey: key,
        publicUrl,
        cacheControl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.warn('[Presign] Não foi possível gerar URL assinada; usando fallback direto:', err?.message || err);
    return new Response(
      JSON.stringify({
        uploadUrl: '',
        fallback: 'direct',
        reason: 'presign-fallback',
        error: 'Upload direto indisponível no momento; utilizando envio via servidor.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
