/**
 * Cloudflare Pages Function: GET /api/auth/session
 *
 * Verifica sessão administrativa ativa validando:
 * - Cookie HttpOnly (__Host-Admin-Session) com checagem de revogação (`admin_sessions`)
 * - Chave mestra dedicada (`X-Master-Key` / `ADMIN_API_SECRET` >= 24 chars e !== ADMIN_PASSWORD)
 * - Nunca faz fallback para ADMIN_PASSWORD como segredo HMAC em produção
 */

import {
  getAdminProfileDisplayName,
  getSessionCookie,
  resolveAdminOperator,
} from '../_authHelper';
import { parseAndVerifyActiveAdminSession } from '../_central/adminSessions';
import {
  getAdminSessionSecret,
  isProductionEnv,
} from '../_central/secrets';
import type { CentralEnv } from '../_central/types';

type PagesContext<T = CentralEnv> = {
  request: Request;
  env: T;
};

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export const onRequestGet = async (context: PagesContext) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const isProd = isProductionEnv(env);

  const authHeader = request.headers.get('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const token = getSessionCookie(request) || bearer;

  if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && !isProd && !token) {
    return new Response(
      JSON.stringify({
        authenticated: true,
        role: 'client',
        sub: 'local_dev',
        profile: 'nua',
        displayName: 'Nua Borges',
      }),
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }

  const sessionSecret = getAdminSessionSecret(env);

  if (!sessionSecret) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        error: 'O acesso ao painel está temporariamente indisponível.',
      }),
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }

  const payload = await parseAndVerifyActiveAdminSession(env, token, sessionSecret);
  const profile = payload && resolveAdminOperator(payload);
  if (!payload || !profile) {
    return Response.json({ authenticated: false }, { headers: NO_STORE_HEADERS });
  }
  return new Response(
    JSON.stringify({
      authenticated: true,
      role: payload.role,
      sub: payload.sub,
      profile,
      displayName: getAdminProfileDisplayName(profile),
    }),
    { status: 200, headers: NO_STORE_HEADERS }
  );
};
