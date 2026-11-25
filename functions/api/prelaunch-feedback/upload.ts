/**
 * Cloudflare Pages Function: POST /api/prelaunch-feedback/upload
 *
 * Recebe capturas de tela anexadas na Parte 7 da avaliação:
 * - Valida link ativo (available / in_progress) e coleta aberta
 * - Valida tamanho (<= 5 MB), MIME (PNG/JPEG/WebP) e magic bytes no servidor
 * - Armazena exclusivamente em caminho privado no Backblaze B2 (`objects/private/prelaunch-feedback/<linkId>/...`)
 */

import { putMedia } from '../_mediaStore';
import { verifyMagicBytes } from '../_security';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { getClientIp, sha256Hex } from '../id/_crypto';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  PRIVATE_ATTACHMENT_PREFIX,
  findLinkByRawCode,
  getFeedbackSettings,
  isValidFeedbackCodeFormat,
  sanitizePlainText,
  type PrelaunchFeedbackEnv,
} from './_store';

type PagesContext<T = PrelaunchFeedbackEnv> = {
  request: Request;
  env: T;
};

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

function mimeToExt(mime: string): 'png' | 'jpg' | 'webp' {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export const onRequestPost = async (context: PagesContext) => {
  const { request, env } = context;

  try {
    const ipHash = await sha256Hex(getClientIp(request));
    const rl = await checkAndConsumeRateLimit(env, `prelaunch_upload_ip:${ipHash}`, 20, 600);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Muitos envios de imagem seguidos. Aguarde alguns minutos.' }),
        { status: 429, headers: HEADERS }
      );
    }

    const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
    let rawCode = '';
    let fileName = 'captura.png';
    let declaredMime = '';
    let fileBytes: ArrayBuffer | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      rawCode = String(form.get('code') || '').trim();
      const file = form.get('file');
      if (file && typeof file !== 'string') {
        fileName = sanitizePlainText(file.name, 120) || 'captura.png';
        declaredMime = String(file.type || '').toLowerCase();
        fileBytes = await file.arrayBuffer();
      }
    } else {
      rawCode = String(request.headers.get('X-Feedback-Code') || '').trim();
      fileName = sanitizePlainText(request.headers.get('X-File-Name') || 'captura.png', 120);
      declaredMime = contentType.split(';')[0].trim();
      fileBytes = await request.arrayBuffer();
    }

    if (!isValidFeedbackCodeFormat(rawCode)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Convite de avaliação inválido.' }),
        { status: 403, headers: HEADERS }
      );
    }

    const [settings, { link }] = await Promise.all([
      getFeedbackSettings(env),
      findLinkByRawCode(env, rawCode),
    ]);

    if (!settings.collectionActive) {
      return new Response(
        JSON.stringify({ ok: false, error: 'A coleta de avaliações já foi encerrada.' }),
        { status: 403, headers: HEADERS }
      );
    }
    if (!link || link.status === 'revoked' || link.status === 'completed') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Este convite não está mais aberto para enviar imagens.' }),
        { status: 403, headers: HEADERS }
      );
    }

    if (!fileBytes || fileBytes.byteLength === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Escolha uma imagem válida para anexar.' }),
        { status: 400, headers: HEADERS }
      );
    }
    if (fileBytes.byteLength > MAX_ATTACHMENT_BYTES) {
      return new Response(
        JSON.stringify({ ok: false, error: 'A imagem passou do tamanho máximo de 5 MB.' }),
        { status: 413, headers: HEADERS }
      );
    }

    const magic = verifyMagicBytes(new Uint8Array(fileBytes.slice(0, 32)));
    const detectedMime = magic.valid ? String(magic.detectedMime || '').toLowerCase() : '';
    if (!magic.valid || !ALLOWED_IMAGE_MIME_TYPES.has(detectedMime)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Envie apenas imagens nos formatos PNG, JPG ou WebP.' }),
        { status: 415, headers: HEADERS }
      );
    }
    if (declaredMime && ALLOWED_IMAGE_MIME_TYPES.has(declaredMime) && declaredMime !== detectedMime) {
      // Usa sempre o MIME real validado pelos magic bytes
      declaredMime = detectedMime;
    }

    const ext = mimeToExt(detectedMime);
    const attachmentId = crypto.randomUUID().replace(/-/g, '');
    const storageKey = `${PRIVATE_ATTACHMENT_PREFIX}${link.id}/${attachmentId}.${ext}`;

    await putMedia(env, storageKey, fileBytes, detectedMime, {
      purpose: 'prelaunch_feedback_attachment',
      linkId: link.id,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        attachment: {
          id: attachmentId,
          key: storageKey,
          name: fileName,
          mimeType: detectedMime,
          size: fileBytes.byteLength,
        },
      }),
      { status: 201, headers: HEADERS }
    );
  } catch (err: any) {
    console.error('[PrelaunchUpload] Falha no upload de captura:', String(err?.message || '').slice(0, 120));
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Não foi possível anexar a imagem agora. Você pode enviar sua avaliação mesmo sem a imagem.',
      }),
      { status: 503, headers: HEADERS }
    );
  }
};
