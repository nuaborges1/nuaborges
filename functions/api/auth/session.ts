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
  parseAndVerifySessionToken,
  resolveAdminPanelProfile,
  timingSafeEqualString,
} from '../_authHelper';
import { isAdminSessionActive } from '../_central/adminSessions';
import {
  getAdminSessionSecret,
  getDedicatedMasterSecret,
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

  if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && !isProd) {
    return new Response(
      JSON.stringify({
        authenticated: true,
        role: 'dev',
        sub: 'local_dev',
        profile: 'nua',
        displayName: 'Nua Borges',
      }),
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }

  const sessionSecret = getAdminSessionSecret(env);
  const dedicatedMaster = getDedicatedMasterSecret(env);

  if (!sessionSecret && !dedicatedMaster) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        error: 'O acesso ao painel está temporariamente indisponível.',
      }),
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }

  let token = getSessionCookie(request);
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    const masterKeyHeader = request.headers.get('X-Master-Key');
    token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : masterKeyHeader?.trim() || null;
  }

  if (!token) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }

  // Valida chave mestra dedicada (NUA-AUD-012: exige >=24 chars e != ADMIN_PASSWORD)
  if (dedicatedMaster && (await timingSafeEqualString(token, dedicatedMaster))) {
    return new Response(
      JSON.stringify({ authenticated: true, role: 'admin', sub: 'master_key' }),
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }

  if (!sessionSecret) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }

  const payload = await parseAndVerifySessionToken(token, sessionSecret);
  if (!payload || !(await isAdminSessionActive(env, payload.nonce))) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }

  const profile = resolveAdminPanelProfile(payload);
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
