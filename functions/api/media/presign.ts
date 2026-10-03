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
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_R2_ACCESS_KEY_ID?: string;
  CLOUDFLARE_R2_SECRET_ACCESS_KEY?: string;
  CLOUDFLARE_R2_BUCKET_NAME?: string;
  CLOUDFLARE_R2_ENDPOINT?: string;
  NEXT_PUBLIC_MEDIA_CDN_URL?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
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

    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucket = env.CLOUDFLARE_R2_BUCKET_NAME || 'nuaborges-media';
    const endpoint =
      env.CLOUDFLARE_R2_ENDPOINT ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      console.error('[Presign] Missing R2 credentials.');
      return new Response(
        JSON.stringify({
          error: 'Credenciais de armazenamento não configuradas no servidor.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    // 5-minute maximum window for direct client upload
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

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
      JSON.stringify({ error: 'Falha interna ao gerar URL assinada.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
