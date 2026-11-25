/**
 * Cloudflare Pages Function: GET /api/id/session
 *
 * Retorna o estado autenticado da sessão atual do cliente NUA ID.
 */

import { isHttpsRequest, resolveCustomerSession, SESSION_HINT_COOKIE_NAME } from './_customerGuard';
import { NuaIdEnv } from './_nuaIdStore';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const responseHeaders = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  });

  const ctx = await resolveCustomerSession(request, env);
  if (!ctx) {
    const cookieHeader = request.headers.get('Cookie') || '';
    if (cookieHeader.includes(`${SESSION_HINT_COOKIE_NAME}=1`)) {
      const secure = isHttpsRequest(request) ? '; Secure' : '';
      responseHeaders.append(
        'Set-Cookie',
        `${SESSION_HINT_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0${secure}`
      );
    }
    return new Response(
      JSON.stringify({ authenticated: false, profile: null }),
      { status: 200, headers: responseHeaders }
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
        phoneMasked: ctx.profile.phoneMasked || null,
        marketingOptIn: ctx.profile.marketingOptIn,
        termsAcceptedAt: ctx.profile.termsAcceptedAt || null,
        createdAt: ctx.profile.createdAt,
      },
    }),
    { status: 200, headers: responseHeaders }
  );
};
