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

  const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;
  if (!secret) return null;

  const cookie = getSessionCookie(request);
  if (cookie) {
    const payload = await parseAndVerifySessionToken(cookie, secret);
    if (payload?.role) return payload.role;
  }

  const authHeader = request.headers.get('Authorization');
  const masterKey = request.headers.get('X-Master-Key');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : masterKey?.trim();

  if (token) {
    if (
      (await timingSafeEqualString(token, secret)) ||
      (env.ADMIN_PASSWORD && (await timingSafeEqualString(token, env.ADMIN_PASSWORD)))
    ) {
      return 'admin';
    }
    const payload = await parseAndVerifySessionToken(token, secret);
    if (payload?.role) return payload.role;
  }

  return null;
}
