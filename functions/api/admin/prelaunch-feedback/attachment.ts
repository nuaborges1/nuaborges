/**
 * Cloudflare Pages Function: GET /api/admin/prelaunch-feedback/attachment?key=<storageKey>
 *
 * Entrega privada de capturas de tela anexadas às avaliações do pré-lançamento.
 * Exige sessão administrativa ativa e valida estritamente o prefixo privado.
 */

import { getSessionCookie, resolveAdminPanelProfile } from '../../_authHelper';
import { parseAndVerifyActiveAdminSession } from '../../_central/adminSessions';
import { getAdminSessionSecret } from '../../_central/secrets';
import { getMedia } from '../../_mediaStore';
import type { CentralEnv } from '../../_central/types';
import { isValidAnyFeedbackAttachmentKey } from '../../prelaunch-feedback/_store';

type PagesContext = {
  request: Request;
  env: CentralEnv & Record<string, any>;
};

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;

  const secret = getAdminSessionSecret(env);
  const cookieToken = getSessionCookie(request);
  const authHeader = request.headers.get('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = cookieToken || bearer;
  const session =
    secret && token
      ? await parseAndVerifyActiveAdminSession(env, token, secret, ['admin', 'dev', 'client'])
      : null;

  if (!session) {
    return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    });
  }
  if (resolveAdminPanelProfile(session) !== 'phdev') {
    return new Response(JSON.stringify({ error: 'Acesso restrito ao perfil PHDEV.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    });
  }

  const url = new URL(request.url);
  const key = (url.searchParams.get('key') || '').trim();
  if (!isValidAnyFeedbackAttachmentKey(key)) {
    return new Response(JSON.stringify({ error: 'Anexo inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    });
  }

  try {
    const media = await getMedia(env, key);
    if (!media) {
      return new Response(JSON.stringify({ error: 'Anexo não encontrado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
      });
    }

    return new Response(media.body, {
      status: 200,
      headers: {
        'Content-Type': media.contentType || 'image/png',
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Falha ao carregar anexo.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    });
  }
};
