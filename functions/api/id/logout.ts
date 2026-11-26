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
import { getNuaIdAdapter, NuaIdEnv, recordCustomerAuditEvent, revokeCustomerSession } from './_nuaIdStore';
import { cookie as vaultCookie, digest as vaultDigest, setCookie as setVaultCookie } from '../me/_vault';

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

  // Encerra imediatamente eventual visita ativa do Cofre no servidor e limpa cookies efêmeros
  const activeVisit = vaultCookie(request, 'visit');
  if (activeVisit) {
    const adapter = getNuaIdAdapter(env);
    if (adapter) {
      await adapter.kvDelete('vault:visit:' + (await vaultDigest(activeVisit))).catch(() => {});
    }
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  });
  for (const cookie of buildClearCustomerSessionCookies(request)) {
    headers.append('Set-Cookie', cookie);
  }
  setVaultCookie(headers, request, 'visit', '', 0);
  setVaultCookie(headers, request, 'pending', '', 0);

  return new Response(JSON.stringify({ success: true, authenticated: false }), {
    status: 200,
    headers,
  });
};
