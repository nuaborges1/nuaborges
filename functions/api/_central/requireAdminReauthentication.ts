import { resolveAdminOperator, timingSafeEqualString } from '../_authHelper';
import { consumeDurableRateLimit } from './rateLimitGuard';
import { isProductionEnv } from './secrets';
import type { CentralActor, CentralEnv } from './types';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 300;
const localAttempts = new Map<string, { count: number; expiresAt: number }>();

function rejection(status: number, code: string, error: string, retryAfter?: number): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (retryAfter) headers.set('Retry-After', String(retryAfter));
  return Response.json({ success: false, error, code }, { status, headers });
}

function localRateLimit(account: string) {
  const now = Date.now();
  let window = localAttempts.get(account);
  if (!window || now >= window.expiresAt) {
    window = { count: 0, expiresAt: now + WINDOW_SECONDS * 1000 };
    localAttempts.set(account, window);
  }
  if (window.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((window.expiresAt - now) / 1000) };
  }
  window.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Rechecks the current operator's password for this request only. */
export async function requireAdminReauthentication(
  request: Request,
  env: CentralEnv,
  actor: CentralActor | undefined,
  password: unknown
): Promise<Response | null> {
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
  const localSession = loopback && !isProductionEnv(env) && actor?.authMethod === 'local_session';
  const signedSession = Boolean(actor?.jti && (actor.authMethod === 'cookie' || actor.authMethod === 'bearer'));
  const profile = actor && resolveAdminOperator({ sub: actor.subject, role: actor.role });
  if (!actor || !profile || (!signedSession && !localSession)) {
    return rejection(401, 'ADMIN_SESSION_REQUIRED', 'Entre com sua conta do painel para autorizar esta ação.');
  }
  if (typeof password !== 'string' || !password.trim() || password.length > 512) {
    return rejection(400, 'REAUTH_REQUIRED', 'Confirme a senha do painel para continuar.');
  }

  const phdevPassword = env.DEV_PANEL_PASSWORD || env.PHDEV_PASSWORD;
  const portalPassword = env.CLIENT_PASSWORD || env.PORTAL_PASSWORD;
  const expected = profile === 'phdev' ? phdevPassword
    : actor.role === 'client' ? portalPassword : env.ADMIN_PASSWORD;
  if (!expected || (phdevPassword && (phdevPassword === env.ADMIN_PASSWORD || phdevPassword === portalPassword))) {
    return rejection(503, 'REAUTH_UNAVAILABLE', 'A confirmação da conta está temporariamente indisponível.');
  }

  // The limit is shared by account across sessions and source IPs.
  const rate = localSession ? localRateLimit(profile)
    : await consumeDurableRateLimit(env, 'admin_reauth:' + profile, MAX_ATTEMPTS, WINDOW_SECONDS);
  if (!rate) return rejection(503, 'REAUTH_UNAVAILABLE', 'A confirmação segura está temporariamente indisponível.');
  if (!rate.allowed) {
    return rejection(429, 'REAUTH_RATE_LIMIT', 'Muitas tentativas. Aguarde antes de confirmar novamente.',
      Math.max(1, rate.retryAfterSeconds || WINDOW_SECONDS));
  }
  if (!await timingSafeEqualString(password.trim(), expected)) {
    return rejection(403, 'REAUTH_INVALID', 'A senha não corresponde à conta em uso.');
  }
  return null;
}
