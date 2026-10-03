/**
 * Cloudflare Pages Function: GET /api/auth/session
 *
 * Verifies active admin session without exposing secret keys or tokens.
 */

import { getSessionCookie, verifySessionToken } from '../_authHelper';

interface Env {
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const cookie = getSessionCookie(request);
  if (!cookie) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  const expectedPassword = env.ADMIN_PASSWORD;
  const secret = env.ADMIN_API_SECRET || expectedPassword;

  if (!secret) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  const isValid = await verifySessionToken(cookie, secret);

  return new Response(JSON.stringify({ authenticated: isValid }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
};
