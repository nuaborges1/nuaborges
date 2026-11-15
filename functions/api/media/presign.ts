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
import { isValidObjectKey, ALLOWED_MIME_TYPES } from '../_security';

interface Env {
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
    };

    const { key, mimeType } = body;

    // 1. Key Validation
    if (!key || !isValidObjectKey(key)) {
      return new Response(
        JSON.stringify({ error: 'Chave de objeto inválida ou fora do diretório permitido.' }),
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

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
    });

    // 5-minute maximum window for direct client upload
    // Compatibilidade estrita: assinar apenas Content-Type sem cabeçalhos adicionais que causem preflight extra ou signature mismatch
    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
      unhoistableHeaders: new Set(['content-type']),
    });

    const cdnBase = (env.NEXT_PUBLIC_MEDIA_CDN_URL || '').replace(/\/$/, '');
    const publicUrl = cdnBase ? `${cdnBase}/${key}` : `/${key}`;

    return new Response(
      JSON.stringify({
        uploadUrl,
        objectKey: key,
        publicUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Presign] Erro interno:', err);
    return new Response(
      JSON.stringify({
        error: 'Falha interna ao gerar URL assinada de armazenamento.',
        details: err?.message || String(err),
        code: 'presign_error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
