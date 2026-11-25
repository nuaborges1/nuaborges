/**
 * Resolve o papel do ator que está chamando a Nua IA.
 *
 * Regra: o cliente NUNCA decide seu próprio papel. O papel vem da sessão
 * assinada, do master key do servidor, ou do bypass estrito de localhost.
 */

import { getSessionCookie, parseAndVerifySessionToken, timingSafeEqualString } from '../_authHelper';

type Env = Record<string, any>;

export async function resolveActorRole(request: Request, env: Env): Promise<string | null> {
  const url = new URL(request.url);
  const isLocal =
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && env.ENVIRONMENT !== 'production';
  if (isLocal) return 'dev';

  const { getAdminSessionSecret } = await import('../_central/secrets');
  const { parseAndVerifyActiveAdminSession } = await import('../_central/adminSessions');
  const secret = getAdminSessionSecret(env);
  if (!secret) return null;

  const cookie = getSessionCookie(request);
  if (cookie) {
    const payload = await parseAndVerifyActiveAdminSession(env as any, cookie, secret);
    if (payload?.role) return payload.role;
  }

  const authHeader = request.headers.get('Authorization');
  const masterKey = request.headers.get('X-Master-Key');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : masterKey?.trim();

  if (token) {
    const hasDedicatedApiSecret = Boolean(
      env.ADMIN_API_SECRET &&
        env.ADMIN_API_SECRET.length >= 24 &&
        env.ADMIN_API_SECRET !== env.ADMIN_PASSWORD
    );
    if (hasDedicatedApiSecret && (await timingSafeEqualString(token, env.ADMIN_API_SECRET!))) {
      return 'admin';
    }
    const payload = await parseAndVerifyActiveAdminSession(env as any, token, secret);
    if (payload?.role) return payload.role;
  }

  return null;
}
