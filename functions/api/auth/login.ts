/**
 * Cloudflare Pages Function: POST /api/auth/login
 *
 * Autenticação administrativa endurecida (NUA-AUD-003):
 * - Validação de senha em tempo constante
 * - Rate limit atômico no Supabase
 * - Cookie HttpOnly (__Host-Admin-Session em HTTPS) com sessão `jti` revogável em `admin_sessions`
 * - Nunca retorna o token de sessão no corpo JSON (impede persistência em localStorage)
 */

import {
  timingSafeEqualString,
  createSessionToken,
  parseAndVerifySessionToken,
  buildSessionCookie,
  getAdminProfileDisplayName,
  type AdminPanelProfile,
} from '../_authHelper';
import { recordAuditEvent } from '../_auditHelper';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { registerAdminSession } from '../_central/adminSessions';
import { getAdminSessionSecret, hashIpPseudonym } from '../_central/secrets';

interface Env {
  ADMIN_PASSWORD?: string;
  DEV_PANEL_PASSWORD?: string;
  PHDEV_PASSWORD?: string;
  CLIENT_PASSWORD?: string;
  PORTAL_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
  ADMIN_API_SECRET?: string;
  ENVIRONMENT?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 900; // 15 minutes

function buildLoginCookie(request: Request, token: string, maxAge = 86400): string {
  try {
    const url = new URL(request.url);
    const isHttps = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    if (!isHttps) {
      return `nua_admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
    }
  } catch {}
  return buildSessionCookie(token, maxAge);
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const rawIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';
  const ipHash = await hashIpPseudonym(rawIp, env);

  // 1. Rate Limiting atômico no Supabase
  const rate = await checkAndConsumeRateLimit(
    env as any,
    `admin_login_ip:${ipHash}`,
    MAX_ATTEMPTS,
    WINDOW_SECONDS
  );
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Muitas tentativas seguidas. Aguarde 15 minutos antes de tentar novamente.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rate.retryAfterSeconds || WINDOW_SECONDS),
        },
      }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const password = body.password?.trim();

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Senha é obrigatória.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminPassword = env.ADMIN_PASSWORD;
    const devPanelPassword = env.DEV_PANEL_PASSWORD || env.PHDEV_PASSWORD;
    const clientPassword = env.CLIENT_PASSWORD || env.PORTAL_PASSWORD;
    const secret = getAdminSessionSecret(env);

    if ((!adminPassword && !devPanelPassword) || !secret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'O acesso ao painel está temporariamente indisponível. Tente novamente em instantes.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Determinação estrita de papel e perfil por credencial (comparação em tempo constante)
    let matchedRole: 'dev' | 'client' | 'admin' | null = null;
    let matchedProfile: AdminPanelProfile = 'nua';
    let customSub: string | undefined;

    if (devPanelPassword && (await timingSafeEqualString(password, devPanelPassword))) {
      matchedRole = 'dev';
      matchedProfile = 'phdev';
      customSub = 'phdev';
    } else if (adminPassword && (await timingSafeEqualString(password, adminPassword))) {
      matchedRole = clientPassword ? 'dev' : 'admin';
      matchedProfile = 'nua';
      customSub = devPanelPassword ? 'nua_borges' : undefined;
    } else if (clientPassword && (await timingSafeEqualString(password, clientPassword))) {
      matchedRole = 'client';
      matchedProfile = 'nua';
      customSub = 'nayara_client';
    }

    if (!matchedRole) {
      await recordAuditEvent(env, request, {
        type: 'ADMIN_LOGIN_FAIL',
        severity: 'warning',
        summary: 'Tentativa de entrada no painel com senha incorreta',
        details: { ipHash },
      });

      return new Response(
        JSON.stringify({ success: false, error: 'Senha incorreta. Verifique e tente novamente.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Emite token assinado e registra `jti` revogável em `admin_sessions`
    const maxAge = 86400;
    const token = await createSessionToken(secret, matchedRole, maxAge, customSub);
    const payload = await parseAndVerifySessionToken(token, secret);
    if (payload?.nonce) {
      await registerAdminSession({
        env,
        request,
        jti: payload.nonce,
        role: matchedRole,
        subject: payload.sub,
        expiresInSeconds: maxAge,
      });
    }

    const cookie = buildLoginCookie(request, token, maxAge);
    const displayName = getAdminProfileDisplayName(matchedProfile);

    await recordAuditEvent(env, request, {
      type: 'ADMIN_LOGIN_SUCCESS',
      severity: 'info',
      actorRole: matchedRole,
      summary: 'Entrada no painel realizada com sucesso',
      details: { role: matchedRole, profile: matchedProfile },
    });

    // NUA-AUD-003: Nunca retorna `token` no corpo JSON (sessão exclusiva por cookie HttpOnly)
    return new Response(
      JSON.stringify({
        success: true,
        role: matchedRole,
        profile: matchedProfile,
        displayName,
        message: 'Entrada realizada com sucesso.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Não foi possível entrar agora. Tente novamente em instantes.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
