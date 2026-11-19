/**
 * Cloudflare Pages Function: GET /api/id/session
 *
 * Retorna o estado autenticado da sessão atual do cliente NUA ID.
 */

import { resolveCustomerSession } from './_customerGuard';
import { NuaIdEnv } from './_nuaIdStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  };

  const ctx = await resolveCustomerSession(request, env);
  if (!ctx) {
    return new Response(
      JSON.stringify({ authenticated: false, profile: null }),
      { status: 200, headers }
    );
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      sessionId: ctx.session.id,
      profile: {
        id: ctx.profile.id,
        email: ctx.profile.email,
        displayName: ctx.profile.displayName,
        marketingOptIn: ctx.profile.marketingOptIn,
        termsAcceptedAt: ctx.profile.termsAcceptedAt || null,
        createdAt: ctx.profile.createdAt,
      },
    }),
    { status: 200, headers }
  );
};
