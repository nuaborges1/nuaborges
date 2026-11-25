/**
 * Cloudflare Pages Function: GET /api/prelaunch-feedback/session?code=<codigo>
 *
 * Valida o link individual de avaliação do pré-lançamento sem revelar dados
 * internos, nome de participantes ou respostas em links encerrados.
 */

import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { getClientIp, sha256Hex } from '../id/_crypto';
import {
  findLinkByRawCode,
  getFeedbackSettings,
  isValidFeedbackCodeFormat,
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

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;

  try {
    const ipHash = await sha256Hex(getClientIp(request));
    const rl = await checkAndConsumeRateLimit(env, `prelaunch_session_ip:${ipHash}`, 60, 600);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          state: 'rate_limited',
          message: 'Muitas tentativas em sequência. Aguarde alguns minutos e tente abrir o link novamente.',
        }),
        { status: 429, headers: HEADERS }
      );
    }

    const url = new URL(request.url);
    const rawCode = (url.searchParams.get('code') || '').trim();
    if (!isValidFeedbackCodeFormat(rawCode)) {
      return new Response(
        JSON.stringify({
          state: 'invalid',
          message: 'Este endereço de avaliação não está mais disponível. Se precisar, peça um novo convite para a Nua.',
        }),
        { status: 200, headers: HEADERS }
      );
    }

    const [settings, { link }] = await Promise.all([
      getFeedbackSettings(env),
      findLinkByRawCode(env, rawCode),
    ]);

    if (!link) {
      return new Response(
        JSON.stringify({
          state: 'invalid',
          message: 'Este endereço de avaliação não está mais disponível. Se precisar, peça um novo convite para a Nua.',
        }),
        { status: 200, headers: HEADERS }
      );
    }

    if (link.status === 'completed') {
      return new Response(
        JSON.stringify({
          state: 'completed',
          message: 'Essa avaliação já foi enviada. Muito obrigada por participar!',
        }),
        { status: 200, headers: HEADERS }
      );
    }

    if (link.status === 'revoked') {
      return new Response(
        JSON.stringify({
          state: 'revoked',
          message: 'Este convite não está mais ativo. Se ainda quiser participar, peça um novo endereço para a Nua.',
        }),
        { status: 200, headers: HEADERS }
      );
    }

    if (!settings.collectionActive) {
      return new Response(
        JSON.stringify({
          state: 'closed',
          message: 'A etapa de avaliações do pré-lançamento já foi encerrada. Muito obrigada pelo carinho!',
        }),
        { status: 200, headers: HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        state: link.status, // 'available' | 'in_progress'
        linkId: link.id,
        retentionDays: settings.retentionDays,
      }),
      { status: 200, headers: HEADERS }
    );
  } catch {
    return new Response(
      JSON.stringify({
        state: 'error',
        message: 'Não conseguimos abrir sua avaliação agora. Tente recarregar a página em instantes.',
      }),
      { status: 503, headers: HEADERS }
    );
  }
};
