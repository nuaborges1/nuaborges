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
  CLIENT_PASSWORD?: string;
  PORTAL_PASSWORD?: string;
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

    const adminPassword = env.ADMIN_PASSWORD;
    const clientPassword = env.CLIENT_PASSWORD || env.PORTAL_PASSWORD;
    const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;

    if (!adminPassword && !clientPassword) {
      return new Response(
        JSON.stringify({ error: 'Painel sem senha configurada no servidor.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!secret) {
      return new Response(
        JSON.stringify({ error: 'Servidor sem segredo criptográfico configurado.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Determinação de papel por credencial estrita
    let matchedRole: 'dev' | 'client' | 'admin' | null = null;

    if (adminPassword && (await timingSafeEqualString(password, adminPassword))) {
      // Se clientPassword estiver configurada separadamente, adminPassword é exclusiva de dev
      matchedRole = clientPassword ? 'dev' : 'admin';
    } else if (clientPassword && (await timingSafeEqualString(password, clientPassword))) {
      matchedRole = 'client';
    }

    if (!matchedRole) {
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
    const token = await createSessionToken(secret, matchedRole, 86400); // 24 hours
    const cookie = buildSessionCookie(token, 86400);

    // Registra login bem-sucedido com papel identificado
    await recordAuditEvent(env, request, {
      type: 'ADMIN_LOGIN_SUCCESS',
      severity: 'info',
      summary: `Login autenticado com sucesso [Perfil: ${matchedRole}] (${clientIp})`,
      details: { clientIp, role: matchedRole },
    });

    return new Response(
      JSON.stringify({
        success: true,
        token,
        role: matchedRole,
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
