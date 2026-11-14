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
 * Armazenamento: Backblaze B2 (bucket S3-compatible nuaborges-media).
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

const uploadRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_UPLOADS_PER_WINDOW = 150;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;

function checkUploadRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = uploadRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    uploadRateLimitMap.set(ip, { count: 1, resetTime: now + UPLOAD_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_UPLOADS_PER_WINDOW) {
    return false;
  }
  record.count += 1;
  return true;
}

function isExtensionMatchingMime(key: string, mime: string): boolean {
  const lowerKey = key.toLowerCase();
  const ext = lowerKey.split('.').pop() || '';
  const map: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'image/avif': ['avif'],
    'video/mp4': ['mp4', 'm4v', 'mov'],
    'video/quicktime': ['mov', 'mp4', 'm4v'],
    'video/webm': ['webm', 'mkv'],
    'audio/mpeg': ['mp3'],
    'audio/wav': ['wav'],
    'audio/mp4': ['m4a', 'aac', 'mp4'],
    'audio/ogg': ['ogg'],
  };
  const allowedExts = map[mime];
  if (!allowedExts) return true;
  return allowedExts.includes(ext);
}

export const onRequestPost = async (context: PagesContext<MediaEnv>) => {
  const { request, env } = context;

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';

  if (!checkUploadRateLimit(clientIp)) {
    return json({ error: 'Limite de uploads excedido. Aguarde alguns minutos.' }, 429);
  }

  try {
    if (!isMediaStorageConfigured(env)) {
      console.error('[Upload] Nenhum armazenamento de mídia (Backblaze B2) vinculado.');
      // 503 + code é o contrato de "sem backend configurado": o cliente só então
      // aciona o fallback temporário local. Nunca mascarar erro de validação como isto.
      return json(
        { error: 'Serviço de armazenamento não configurado adequadamente.', code: 'storage_not_configured' },
        503
      );
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

    // 4.1. Extension and MIME Binding
    if (magicCheck.detectedMime && !isExtensionMatchingMime(key, magicCheck.detectedMime)) {
      return json(
        {
          error: 'A extensão informada no nome do arquivo não corresponde ao tipo MIME real do binário.',
        },
        400
      );
    }

    // 5. Store (Backblaze B2)
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
