/**
 * Cloudflare Pages Function: GET /api/auth/session
 *
 * Verifies active session supporting both HttpOnly cookies and Bearer tokens:
 * - Anti-spoofing: Does NOT trust Origin/Referer headers for authentication
 * - Dual check: Validates cookie (__Host-Admin-Session) OR Authorization Bearer token
 * - Returns authenticated status and active role
 */

import { getSessionCookie, parseAndVerifySessionToken, timingSafeEqualString } from '../_authHelper';

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

  const url = new URL(request.url);

  // Somente dispensa em desenvolvimento local estrito se o hostname for localhost/127.0.0.1
  // NUNCA confia em Origin ou Referer fornecido pelo cliente (M3)
  const isLocalDev =
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
    (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

  if (isLocalDev) {
    return new Response(JSON.stringify({ authenticated: true, role: 'dev', sub: 'local_dev' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;
  if (!secret) {
    return new Response(JSON.stringify({ authenticated: false, error: 'Servidor sem chave configurada.' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  // 1. Tenta obter token pelo Cookie HttpOnly
  let token = getSessionCookie(request);

  // 2. Se não houver cookie, tenta obter pelo cabeçalho Authorization Bearer ou X-Master-Key
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
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  // Master key check direta
  if (env.ADMIN_API_SECRET && (await timingSafeEqualString(token, env.ADMIN_API_SECRET))) {
    return new Response(JSON.stringify({ authenticated: true, role: 'admin', sub: 'master_key' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  // Validação criptográfica do payload e expiração
  const payload = await parseAndVerifySessionToken(token, secret);
  if (!payload) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      role: payload.role,
      sub: payload.sub,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
};
