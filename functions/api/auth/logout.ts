/**
 * Cloudflare Pages Function: POST /api/auth/logout
 *
 * Revoga a sessão administrativa (`jti`) no Supabase (`admin_sessions`)
 * e remove os cookies de sessão do navegador (NUA-AUD-003).
 */

import {
  appendClearCookies,
  getSessionCookie,
  parseAndVerifySessionToken,
  resolveAdminOperator,
} from '../_authHelper';
import { recordAuditEvent } from '../_auditHelper';
import { revokeAdminSession } from '../_central/adminSessions';
import { getAdminSessionSecret } from '../_central/secrets';
import { clearNuaPresenceOnLogout } from '../admin/presence';
import type { CentralEnv } from '../_central/types';

type PagesContext<T = CentralEnv> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context?: PagesContext) => {
  const request = context?.request || null;
  const env = (context?.env || {}) as CentralEnv;

  if (request) {
    const secret = getAdminSessionSecret(env);
    const cookieToken = getSessionCookie(request);
    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const token = cookieToken || bearerToken;

    if (secret && token) {
      const payload = await parseAndVerifySessionToken(token, secret);
      const profile = payload && resolveAdminOperator(payload);
      if (payload?.nonce && profile) {
        if (!await revokeAdminSession(env, payload.nonce, 'logout')) {
          return Response.json({ success: false, error: 'Não foi possível encerrar a sessão. Tente novamente.' }, {
            status: 503,
            headers: { 'Cache-Control': 'no-store' },
          });
        }
        if (profile === 'nua') {
          await clearNuaPresenceOnLogout(env, payload.nonce);
        }
        await recordAuditEvent(env, request, {
          type: 'ADMIN_LOGOUT',
          severity: 'info',
          actorRole: payload.role,
          summary: 'Saída do painel com revogação de sessão no servidor',
          details: { role: payload.role, profile },
        });
      }
    }
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  appendClearCookies(headers);

  return new Response(
    JSON.stringify({ success: true, message: 'Você saiu do painel com sucesso.' }),
    { status: 200, headers }
  );
};
