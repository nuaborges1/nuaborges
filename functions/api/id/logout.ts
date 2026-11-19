/**
 * Cloudflare Pages Function: POST /api/id/logout
 *
 * Revoga a sessão atual no servidor e remove o cookie HttpOnly.
 */

import { hashClientIp } from './_crypto';
import {
  buildClearCustomerSessionCookies,
  getClientIp,
  getIdSecret,
  resolveCustomerSession,
} from './_customerGuard';
import { NuaIdEnv, recordCustomerAuditEvent, revokeCustomerSession } from './_nuaIdStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const ctx = await resolveCustomerSession(request, env);

  if (ctx) {
    await revokeCustomerSession(env, ctx.session.id, ctx.profile.id);
    const secret = getIdSecret(env) || 'nua-id';
    await recordCustomerAuditEvent(env, {
      profileId: ctx.profile.id,
      action: 'logout',
      actorIpHash: await hashClientIp(getClientIp(request), secret),
    });
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  });
  for (const cookie of buildClearCustomerSessionCookies(request)) {
    headers.append('Set-Cookie', cookie);
  }

  return new Response(JSON.stringify({ success: true, authenticated: false }), {
    status: 200,
    headers,
  });
};
