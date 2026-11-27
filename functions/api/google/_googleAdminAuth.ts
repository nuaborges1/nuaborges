import { getSessionCookie, resolveAdminOperator } from '../_authHelper';
import { parseAndVerifyActiveAdminSession } from '../_central/adminSessions';
import { getAdminSessionSecret } from '../_central/secrets';
import type { GoogleEnv } from './_googleMeetService';

export async function verifyAdminRequest(request: Request, env: GoogleEnv) {
  const authorization = request.headers.get('Authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
  const token = getSessionCookie(request) || bearer;
  const session = await parseAndVerifyActiveAdminSession(env, token, getAdminSessionSecret(env));
  if (!session || resolveAdminOperator(session) !== 'nua') return { ok: false } as const;
  return { ok: true, role: session.role } as const;
}
