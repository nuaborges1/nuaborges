/**
 * Cloudflare Pages Function: /api/media/upload
 *
 * Security Level 5 Hardened Upload Endpoint:
 * - Defense-in-depth authorization check (via /api/_middleware)
 * - Strict key format validation (anti-path traversal & anti-IDOR)
 * - Raw binary Magic Bytes verification (anti-MIME spoofing)
 * - Maximum payload size enforcement
 * - Masked error messages (zero infrastructure leaks)
 *
 * Armazenamento: R2 (se habilitado) ou Workers KV NUA_MEDIA (plano gratuito).
 * Retorna URL RELATIVA (/media/...) servida por functions/media/[[path]].ts,
 * válida em qualquer domínio do site ou do admin.
 */

import { isValidObjectKey, verifyMagicBytes } from '../_security';
import { recordAuditEvent } from '../_auditHelper';
import { isMediaStorageConfigured, maxUploadBytes, putMedia, MediaEnv } from '../_mediaStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const onRequestPost = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;

  try {
    if (!isMediaStorageConfigured(env)) {
      console.error('[Upload] Nenhum armazenamento (R2 ou KV NUA_MEDIA) vinculado.');
      return json({ error: 'Serviço de armazenamento não configurado adequadamente.' }, 500);
    }

    const key = request.headers.get('X-Object-Key');
    const rawMime = (request.headers.get('X-Mime-Type') || '').toLowerCase().trim();

    // 1. Strict Key Validation
    if (!key || !isValidObjectKey(key)) {
      return json({ error: 'Chave de objeto inválida ou fora do diretório permitido.' }, 400);
    }

    // 2. Read Body Buffer
    const bodyBytes = await request.arrayBuffer();
    if (!bodyBytes || bodyBytes.byteLength === 0) {
      return json({ error: 'Corpo da requisição vazio.' }, 400);
    }

    const isVideo = rawMime.startsWith('video/') || key.endsWith('.mp4') || key.endsWith('.webm');
    const maxSize = isVideo ? maxUploadBytes(env) : Math.min(MAX_IMAGE_BYTES, maxUploadBytes(env));

    // 3. Payload Size Limit
    if (bodyBytes.byteLength > maxSize) {
      return json(
        {
          error: `O arquivo excede o limite máximo permitido de ${Math.round(
            maxSize / (1024 * 1024)
          )}MB.`,
        },
        413
      );
    }

    // 4. Magic Bytes Signature Verification
    const magicCheck = verifyMagicBytes(new Uint8Array(bodyBytes.slice(0, 32)));
    if (!magicCheck.valid) {
      return json(
        {
          error:
            'Assinatura binária do arquivo inválida. Apenas imagens e vídeos autênticos são aceitos.',
        },
        400
      );
    }

    const verifiedMime = magicCheck.detectedMime || rawMime || 'application/octet-stream';

    // 5. Store (R2 or KV)
    await putMedia(env, key, bodyBytes, verifiedMime);

    const publicUrl = `/${key}`;

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

    return json(
      {
        success: true,
        key,
        url: publicUrl,
        sizeBytes: bodyBytes.byteLength,
      },
      200
    );
  } catch (err: any) {
    console.error('[Upload] Erro interno:', err);
    return json({ error: 'Falha interna ao armazenar mídia.' }, 500);
  }
};
