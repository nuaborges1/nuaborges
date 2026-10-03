/**
 * Cloudflare Pages Function: POST /api/auth/login
 *
 * Edge authentication endpoint for admin access:
 * - Constant-time password validation
 * - In-memory IP rate limiting
 * - Cryptographically signed __Host-Admin-Session cookie
 */

import {
  timingSafeEqualString,
  createSessionToken,
  buildSessionCookie,
} from '../_authHelper';
import { recordAuditEvent } from '../_auditHelper';

interface Env {
  BUCKET?: any;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

// In-memory rate limiting map (IP -> { count, resetTime })
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  // Extract client IP (provided by Cloudflare)
  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';

  // 1. Rate Limiting Check
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        error: 'Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900',
        },
      }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      password?: string;
    };
    const password = body.password?.trim();

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Senha é obrigatória.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const expectedPassword = env.ADMIN_PASSWORD || 'nuaborges2026';
    const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD || 'nuaborges2026';

    // 2. Constant-Time Password Verification
    const isValid = await timingSafeEqualString(password, expectedPassword);

    if (!isValid) {
      await recordAuditEvent(env, request, {
        type: 'ADMIN_LOGIN_FAIL',
        severity: 'warning',
        summary: `Tentativa de login falha no painel administrativo a partir de ${clientIp}`,
        details: { clientIp },
      });

      return new Response(
        JSON.stringify({ error: 'Senha incorreta. Verifique e tente novamente.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Clear rate limit on successful login
    rateLimitMap.delete(clientIp);

    // 4. Create signed session token and cookie
    const token = await createSessionToken(secret, 86400); // 24 hours
    const cookie = buildSessionCookie(token, 86400);

    // Registra login bem-sucedido
    await recordAuditEvent(env, request, {
      type: 'ADMIN_LOGIN_SUCCESS',
      severity: 'info',
      summary: `Login autenticado com sucesso no painel administrativo (${clientIp})`,
      details: { clientIp },
    });

    return new Response(
      JSON.stringify({
        success: true,
        token,
        message: 'Login efetuado com sucesso.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie,
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Falha interna ao processar autenticação.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
