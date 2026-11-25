/**
 * Cloudflare Pages Function: POST /api/prelaunch-feedback/submit
 *
 * Recebe e persiste definitivamente uma avaliação do pré-lançamento com
 * consumo atômico único do link (previne envios duplicados / concorrência).
 */

import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { getClientIp, sha256Hex } from '../id/_crypto';
import {
  findLinkByRawCode,
  getFeedbackSettings,
  isValidFeedbackCodeFormat,
  submitFeedbackAtomically,
  validateSubmissionPayload,
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

export const onRequestPost = async (context: PagesContext) => {
  const { request, env } = context;

  try {
    const ipHash = await sha256Hex(getClientIp(request));
    const rl = await checkAndConsumeRateLimit(env, `prelaunch_submit_ip:${ipHash}`, 20, 600);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.',
        }),
        { status: 429, headers: HEADERS }
      );
    }

    const body = (await request.json().catch(() => null)) as any;
    const rawCode = String(body?.code || '').trim();
    if (!isValidFeedbackCodeFormat(rawCode)) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'INVALID_LINK',
          error: 'Este endereço de avaliação não é mais válido.',
        }),
        { status: 404, headers: HEADERS }
      );
    }

    const [settings, { link, codeHash }] = await Promise.all([
      getFeedbackSettings(env),
      findLinkByRawCode(env, rawCode),
    ]);

    if (!settings.collectionActive) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'COLLECTION_CLOSED',
          error: 'A etapa de avaliações do pré-lançamento já foi encerrada.',
        }),
        { status: 403, headers: HEADERS }
      );
    }

    if (!link) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'INVALID_LINK',
          error: 'Este endereço de avaliação não é mais válido.',
        }),
        { status: 404, headers: HEADERS }
      );
    }
    if (link.status === 'completed') {
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'ALREADY_COMPLETED',
          error: 'Essa avaliação já foi enviada. Muito obrigada por participar!',
        }),
        { status: 409, headers: HEADERS }
      );
    }
    if (link.status === 'revoked') {
      return new Response(
        JSON.stringify({
          ok: false,
          code: 'REVOKED_LINK',
          error: 'Este convite não está mais ativo.',
        }),
        { status: 403, headers: HEADERS }
      );
    }

    const validation = validateSubmissionPayload(body, link.id);
    if (!validation.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: validation.error }),
        { status: 400, headers: HEADERS }
      );
    }

    const result = await submitFeedbackAtomically(env, codeHash, validation.data);
    if (!result.ok) {
      if (result.code === 'ALREADY_COMPLETED') {
        return new Response(
          JSON.stringify({
            ok: false,
            code: 'ALREADY_COMPLETED',
            error: 'Essa avaliação já foi enviada. Muito obrigada por participar!',
          }),
          { status: 409, headers: HEADERS }
        );
      }
      if (result.code === 'COLLECTION_CLOSED') {
        return new Response(
          JSON.stringify({
            ok: false,
            code: 'COLLECTION_CLOSED',
            error: 'A etapa de avaliações do pré-lançamento já foi encerrada.',
          }),
          { status: 403, headers: HEADERS }
        );
      }
      if (result.code === 'REVOKED_LINK' || result.code === 'INVALID_LINK') {
        return new Response(
          JSON.stringify({
            ok: false,
            code: result.code,
            error: 'Este convite não está mais ativo.',
          }),
          { status: 403, headers: HEADERS }
        );
      }
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Não foi possível enviar sua avaliação agora. Suas respostas continuam salvas aqui — tente novamente em instantes.',
        }),
        { status: 503, headers: HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Obrigada por fazer parte desse momento!',
      }),
      { status: 201, headers: HEADERS }
    );
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Não foi possível enviar sua avaliação agora. Tente novamente em instantes.',
      }),
      { status: 503, headers: HEADERS }
    );
  }
};
