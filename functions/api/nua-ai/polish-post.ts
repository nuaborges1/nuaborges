/* Vinho maduro / Nua Borges */
/**
 * POST /api/nua-ai/polish-post — Revisão e Diagramação Editorial Assistida por IA.
 *
 * Protegida por autenticação administrativa/cliente via `resolveActorRole`.
 * Retorna sempre uma proposta estruturada (original × organizado + resumo de alterações)
 * para aprovação explícita da cliente antes de aplicar ao rascunho.
 */

import { polishEditorialPost } from '../../../lib/nuaAi/polishPost';
import { resolveActorRole } from './_actor';

type Env = Record<string, any>;

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  const role = await resolveActorRole(request, env);
  if (!role || (role !== 'admin' && role !== 'client' && role !== 'dev')) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          friendly: 'Faça login no painel administrativo para usar a organização com IA.',
        },
      },
      { status: 401, headers: NO_STORE }
    );
  }

  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return Response.json(
      {
        ok: false,
        error: { code: 'BAD_REQUEST', friendly: 'Não foi possível ler o texto enviado.' },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  if (raw.length > 100 * 1024) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          friendly: 'O texto enviado é muito grande para organização automática.',
        },
      },
      { status: 413, headers: NO_STORE }
    );
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      {
        ok: false,
        error: { code: 'INVALID_JSON', friendly: 'Formato de solicitação inválido.' },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const result = await polishEditorialPost(
      {
        text: String(body?.text || ''),
        headline: body?.headline ? String(body.headline) : undefined,
        role: body?.role ? String(body.role) : undefined,
        mode: body?.mode === 'basic' ? 'basic' : 'ai',
      },
      {
        GEMINI_API_KEY: env?.GEMINI_API_KEY,
        GEMINI_MODEL: env?.GEMINI_MODEL,
      }
    );

    return Response.json(result, { status: 200, headers: NO_STORE });
  } catch (err) {
    console.error('[nua-ai/polish-post] Falha ao diagramar post:', err);
    return Response.json(
      {
        ok: false,
        error: {
          code: 'POLISH_FAILED',
          friendly:
            'A organização inteligente não está disponível agora. Você pode continuar editando normalmente.',
        },
      },
      { status: 200, headers: NO_STORE }
    );
  }
};
