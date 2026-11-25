/**
 * Sessões Administrativas Revogáveis no Servidor (`admin_sessions`).
 *
 * Corrige NUA-AUD-003: todo login administrativo grava seu `jti` (nonce do token)
 * no Supabase e o logout/revogação global invalida imediatamente o token no servidor,
 * impedindo reutilização mesmo antes da expiração de 24h.
 */

import { getSupabaseClient } from '../_supabaseClient';
import { hashIpPseudonym } from './secrets';
import type { CentralEnv } from './types';
import {
  parseAndVerifySessionToken,
  type SessionPayload,
  type UserRole,
} from '../_authHelper';

// Cache local efêmero de sessões revogadas (para testes unitários e aceleração)
const localRevokedJtis = new Set<string>();
const localRegisteredSessions = new Map<string, { role: UserRole; expiresAtMs: number; revoked: boolean }>();

export async function registerAdminSession(params: {
  env: CentralEnv;
  request: Request | null;
  jti: string;
  role: UserRole;
  subject: string;
  expiresInSeconds: number;
}): Promise<void> {
  const { env, request, jti, role, subject, expiresInSeconds } = params;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  localRegisteredSessions.set(jti, {
    role,
    expiresAtMs: expiresAt.getTime(),
    revoked: false,
  });

  const sb = getSupabaseClient(env as any);
  if (!sb) return;

  try {
    const rawIp =
      request?.headers.get('CF-Connecting-IP') ||
      request?.headers.get('X-Forwarded-For') ||
      '';
    const ipHash = await hashIpPseudonym(rawIp, env);
    const ua = (request?.headers.get('User-Agent') || '').slice(0, 200);

    await sb.from('admin_sessions').upsert(
      {
        jti,
        role,
        subject,
        ip_hash: ipHash,
        user_agent: ua,
        expires_at: expiresAt.toISOString(),
        revoked_at: null,
        revoke_reason: null,
      },
      { onConflict: 'jti' }
    );
  } catch (err) {
    console.warn('[adminSessions] Falha ao persistir sessão (tabela pode ainda não estar migrada):', err);
  }
}

/**
 * Verifica se o `jti` de uma sessão administrativa foi revogado no servidor.
 * Retorna `false` se revogada ou expirada.
 */
export async function isAdminSessionActive(env: CentralEnv, jti?: string | null): Promise<boolean> {
  if (!jti) return false;
  if (localRevokedJtis.has(jti)) return false;

  const local = localRegisteredSessions.get(jti);
  if (local) {
    if (local.revoked || Date.now() >= local.expiresAtMs) return false;
  }

  const sb = getSupabaseClient(env as any);
  if (!sb) return true;

  try {
    const { data, error } = await sb
      .from('admin_sessions')
      .select('jti, revoked_at, expires_at')
      .eq('jti', jti)
      .maybeSingle();

    if (error) {
      // Se a migration ainda não foi aplicada (42P01 / PGRST205), não quebra o login em transição
      if (error.code === '42P01' || error.code === 'PGRST205') return true;
      console.warn('[adminSessions] Erro ao consultar sessão:', error.message);
      return true;
    }

    // Se há registro explícito, respeita revogação e expiração
    if (data) {
      if (data.revoked_at) {
        localRevokedJtis.add(jti);
        return false;
      }
      if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
        return false;
      }
      return true;
    }

    // Sessões emitidas antes da criação da tabela continuam válidas até expirarem,
    // mas toda sessão registrada ou revogada passa a ser controlada no servidor.
    return true;
  } catch {
    return true;
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
  if (!payload) return null;
  if (allowedRoles && !allowedRoles.includes(payload.role)) return null;
  const active = await isAdminSessionActive(env, payload.nonce);
  if (!active) return null;
  return payload;
}

export async function revokeAdminSession(
  env: CentralEnv,
  jti: string | null | undefined,
  reason = 'logout'
): Promise<void> {
  if (!jti) return;
  localRevokedJtis.add(jti);
  const local = localRegisteredSessions.get(jti);
  if (local) local.revoked = true;

  const sb = getSupabaseClient(env as any);
  if (!sb) return;

  try {
    const nowIso = new Date().toISOString();
    await sb.from('admin_sessions').upsert(
      {
        jti,
        role: local?.role || 'unknown',
        subject: 'revoked',
        expires_at: nowIso,
        revoked_at: nowIso,
        revoke_reason: reason,
      },
      { onConflict: 'jti' }
    );
  } catch (err) {
    console.warn('[adminSessions] Falha ao revogar sessão:', err);
  }
}

export async function revokeAllAdminSessions(
  env: CentralEnv,
  reason = 'global_kill_switch'
): Promise<number> {
  for (const [jti, rec] of localRegisteredSessions.entries()) {
    rec.revoked = true;
    localRevokedJtis.add(jti);
  }

  const sb = getSupabaseClient(env as any);
  if (!sb) return localRegisteredSessions.size;

  try {
    const nowIso = new Date().toISOString();
    const { data } = await sb
      .from('admin_sessions')
      .update({ revoked_at: nowIso, revoke_reason: reason })
      .is('revoked_at', null)
      .select('jti');

    const rows = Array.isArray(data) ? data : [];
    for (const r of rows) {
      if (r?.jti) localRevokedJtis.add(String(r.jti));
    }
    return rows.length;
  } catch (err) {
    console.warn('[adminSessions] Falha ao revogar todas as sessões:', err);
    return 0;
  }
}
