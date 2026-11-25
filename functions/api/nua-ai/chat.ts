/**
 * POST /api/nua-ai/chat — entrada de produção do orquestrador Nua IA.
 *
 * Contrato: SEMPRE responde 200 com `{ ok, reply, error }` para erros de negócio.
 * O papel do ator é resolvido aqui e repassado ao registro de ferramentas —
 * a IA nunca decide sozinha o que pode executar.
 */

import { assistantChat } from '../../../lib/nuaAi/adminAssistant.mjs';
import { createAssistantServices } from '../../../lib/nuaAi/assistantServices.mjs';
import { resolveActorRole } from './_actor';

type Env = Record<string, any>;

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

function errorResponse(status: number, code: string, friendly: string) {
  return Response.json(
    {
      ok: false,
      reply: friendly,
      conversationId: '',
      actionExecuted: null,
      proposal: null,
      proposals: [],
      error: { code, friendly },
    },
    { status, headers: NO_STORE }
  );
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Não consegui ler a solicitação.');
  }

  if (raw.length > 8 * 1024 * 1024) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'O conteúdo enviado é muito grande.');
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse(400, 'INVALID_JSON', 'Solicitação malformada.');
  }

  const role = await resolveActorRole(request, env);
  if (!role) {
    return errorResponse(401, 'UNAUTHORIZED', 'Faça login no painel administrativo para usar a Nay.');
  }

  try {
    const origin = new URL(request.url).origin;
    const callerHeaders: Record<string, string> = {};
    const authHeader = request.headers.get('Authorization');
    const cookieHeader = request.headers.get('Cookie');
    if (authHeader) callerHeaders.Authorization = authHeader;
    if (cookieHeader) callerHeaders.Cookie = cookieHeader;
    const services = createAssistantServices(env, fetch, { origin, callerHeaders });
    const result = await assistantChat({ ...body, actorRole: role }, services);
    return Response.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error('[nua-ai/chat] Falha ao processar a solicitação:', error);
    const friendly =
      'Não consegui concluir sua solicitação agora. Nada foi alterado — tente novamente em instantes.';
    return Response.json(
      {
        ok: false,
        reply: friendly,
        conversationId: body?.conversationId || '',
        actionExecuted: null,
        proposal: null,
        proposals: [],
        error: {
          code: 'CHAT_FAILED',
          friendly,
        },
      },
      { status: 200, headers: NO_STORE }
    );
  }
};
