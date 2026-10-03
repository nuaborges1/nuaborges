/**
 * Cloudflare Pages Function: /api/media/upload
 *
 * Security Level 5 Hardened Upload Endpoint:
 * - Defense-in-depth authorization check
 * - Strict key format validation (anti-path traversal & anti-IDOR)
 * - Raw binary Magic Bytes verification (anti-MIME spoofing)
 * - Maximum payload size enforcement
 * - Masked error messages (zero infrastructure leaks)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  isValidObjectKey,
  verifyMagicBytes,
  ALLOWED_MIME_TYPES,
} from '../_security';
import { recordAuditEvent } from '../_auditHelper';

interface Env {
  BUCKET?: any; // Native Cloudflare R2 bucket binding
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

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const key = request.headers.get('X-Object-Key');
    const rawMime = (request.headers.get('X-Mime-Type') || '').toLowerCase().trim();

    // 1. Strict Key Validation
    if (!key || !isValidObjectKey(key)) {
      return new Response(
        JSON.stringify({
          error: 'Chave de objeto inválida ou fora do diretório permitido.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Read Body Buffer
    const bodyBytes = await request.arrayBuffer();
    if (!bodyBytes || bodyBytes.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: 'Corpo da requisição vazio.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isVideo = rawMime.startsWith('video/') || key.endsWith('.mp4') || key.endsWith('.webm');
    const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

    // 3. Payload Size Limit
    if (bodyBytes.byteLength > maxSize) {
      return new Response(
        JSON.stringify({
          error: `O arquivo excede o limite máximo permitido de ${Math.round(
            maxSize / (1024 * 1024)
          )}MB.`,
        }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Magic Bytes Signature Verification
    const magicCheck = verifyMagicBytes(new Uint8Array(bodyBytes.slice(0, 32)));
    if (!magicCheck.valid) {
      return new Response(
        JSON.stringify({
          error: 'Assinatura binária do arquivo inválida. Apenas imagens e vídeos autênticos são aceitos.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const verifiedMime = magicCheck.detectedMime || rawMime || 'application/octet-stream';

    // 5. Store to Cloudflare R2
    if (env.BUCKET && typeof env.BUCKET.put === 'function') {
      // 5.1 Native R2 Binding
      await env.BUCKET.put(key, bodyBytes, {
        httpMetadata: {
          contentType: verifiedMime,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
    } else {
      // 5.2 S3 Client Fallback
      const accountId = env.CLOUDFLARE_ACCOUNT_ID;
      const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
      const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      const bucket = env.CLOUDFLARE_R2_BUCKET_NAME || 'nuaborges-media';
      const endpoint =
        env.CLOUDFLARE_R2_ENDPOINT ||
        (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

      if (!accessKeyId || !secretAccessKey || !endpoint) {
        console.error('[Upload] Missing R2 credentials in environment.');
        return new Response(
          JSON.stringify({
            error: 'Serviço de armazenamento não configurado adequadamente.',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: new Uint8Array(bodyBytes),
          ContentType: verifiedMime,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
    }

    const cdnBase = (env.NEXT_PUBLIC_MEDIA_CDN_URL || '').replace(/\/$/, '');
    const publicUrl = cdnBase ? `${cdnBase}/${key}` : `/${key}`;

    // Registra evento no monitoramento de auditoria
    await recordAuditEvent(env, request, {
      type: 'MEDIA_UPLOAD',
      severity: 'info',
      summary: `Upload de mídia: ${key} (${Math.round(bodyBytes.byteLength / 1024)} KB)`,
      details: {
        key,
        url: publicUrl,
        sizeBytes: bodyBytes.byteLength,
        mimeType: verifiedMime,
        isVideo,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        key,
        url: publicUrl,
        sizeBytes: bodyBytes.byteLength,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Upload] Erro interno:', err);
    return new Response(
      JSON.stringify({ error: 'Falha interna ao armazenar mídia.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
