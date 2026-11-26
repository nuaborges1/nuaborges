import { getSessionCookie, verifySessionToken } from '../_authHelper';
import { getAdminSessionSecret } from '../_central/secrets';
import { GoogleEnv } from './_googleMeetService';

export async function verifyAdminRequest(
  request: Request,
  env: GoogleEnv
): Promise<{ ok: boolean; role?: string }> {
  const authHeader = request.headers.get('Authorization');
  const sessionCookie = getSessionCookie(request);
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : sessionCookie;
  const secret = getAdminSessionSecret(env);
  if (!secret || !token) return { ok: false };

  const verified = await verifySessionToken(token, secret);
  if (verified === true) return { ok: true, role: 'admin' };
  if (verified && typeof verified === 'object' && ['dev', 'admin'].includes((verified as any).role)) {
    return { ok: true, role: (verified as any).role };
  }
  return { ok: false };
}
