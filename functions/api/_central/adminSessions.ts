/**
 * Sessões Administrativas Revogáveis no Servidor (`admin_sessions`).
 *
 * Corrige NUA-AUD-003: todo login administrativo grava seu `jti` (nonce do token)
 * no Supabase e o logout/revogação global invalida imediatamente o token no servidor,
 * impedindo reutilização mesmo antes da expiração de 24h.
 */

import { getSupabaseClient } from '../_supabaseClient';
import { hashIpPseudonym, isProductionEnv } from './secrets';
import type { CentralEnv } from './types';
import {
  parseAndVerifySessionToken,
  resolveAdminOperator,
  type SessionPayload,
  type UserRole,
} from '../_authHelper';

// Only used by loopback/test environments with no configured database.
const localRegisteredSessions = new Map<string, { expiresAtMs: number; role: UserRole; subject: string }>();

export async function registerAdminSession(params: {
  env: CentralEnv;
  request: Request | null;
  jti: string;
  role: UserRole;
  subject: string;
  expiresInSeconds: number;
}): Promise<boolean> {
  const { env, request, jti, role, subject, expiresInSeconds } = params;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const sb = getSupabaseClient(env);
  if (!sb) {
    if (isProductionEnv(env)) return false;
    localRegisteredSessions.set(jti, { expiresAtMs: expiresAt.getTime(), role, subject });
    return true;
  }

  try {
    const rawIp = request?.headers.get('CF-Connecting-IP') || request?.headers.get('X-Forwarded-For') || '';
    const ipHash = await hashIpPseudonym(rawIp, env);
    const ua = (request?.headers.get('User-Agent') || '').slice(0, 200);
    const { error } = await sb.from('admin_sessions').insert({
      jti,
      role,
      subject,
      ip_hash: ipHash,
      user_agent: ua,
      expires_at: expiresAt.toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function isAdminSessionActive(
  env: CentralEnv,
  nonce: string | null | undefined,
  expected?: Pick<SessionPayload, 'role' | 'sub'>
): Promise<boolean> {
  if (!nonce) return false;

  const sb = getSupabaseClient(env);
  if (!sb) {
    const local = localRegisteredSessions.get(nonce);
    return !isProductionEnv(env) && Boolean(local && local.expiresAtMs > Date.now() &&
      (!expected || (local.subject === expected.sub && local.role === expected.role)));
  }

  try {
    const { data, error } = await sb
      .from('admin_sessions')
      .select('subject, role, revoked_at, expires_at')
      .eq('jti', nonce)
      .maybeSingle();
    return !error && Boolean(data && !data.revoked_at && Date.parse(data.expires_at) > Date.now() &&
      (!expected || (data.subject === expected.sub && data.role === expected.role)));
  } catch {
    return false;
  }
}

export async function parseAndVerifyActiveAdminSession(
  env: CentralEnv,
  token: string | null | undefined,
  secret: string | null | undefined,
  allowedRoles?: readonly UserRole[]
): Promise<SessionPayload | null> {
  if (!token || !secret) return null;
  const payload = await parseAndVerifySessionToken(token, secret);
  if (!payload || !resolveAdminOperator(payload)) return null;
  if (allowedRoles && !allowedRoles.includes(payload.role)) return null;
  const active = await isAdminSessionActive(env, payload.nonce, payload);
  if (!active) return null;
  return payload;
}

export async function revokeAdminSession(
  env: CentralEnv,
  jti: string,
  reason = 'logout'
): Promise<boolean> {
  const sb = getSupabaseClient(env);
  if (!sb) {
    if (isProductionEnv(env)) return false;
    return localRegisteredSessions.delete(jti);
  }

  try {
    const { error } = await sb.from('admin_sessions')
      .update({ revoked_at: new Date().toISOString(), revoke_reason: reason })
      .eq('jti', jti).is('revoked_at', null);
    return !error;
  } catch {
    return false;
  }
}

export async function revokeAllAdminSessions(
  env: CentralEnv,
  reason = 'global_kill_switch'
): Promise<number> {
  const sb = getSupabaseClient(env);
  if (!sb) {
    if (isProductionEnv(env)) throw new Error('Session store unavailable');
    const count = localRegisteredSessions.size;
    localRegisteredSessions.clear();
    return count;
  }

  const { data, error } = await sb
    .from('admin_sessions')
    .update({ revoked_at: new Date().toISOString(), revoke_reason: reason })
    .is('revoked_at', null)
    .select('jti');
  if (error || !Array.isArray(data)) throw new Error('Session revocation could not be confirmed');
  return data.length;
}
