/**
 * Higiene Diária Segura de Registros Efêmeros Expirados — NUA Borges
 *
 * Escopo estritamente limitado a:
 *  1. OTPs comprovadamente expirados (`nua_id:otp:<purpose>:<email>`)
 *  2. Sessões de cliente comprovadamente expiradas (`nua_id:session:<id>` e tabela `customer_sessions`)
 *  3. Sessões administrativas comprovadamente expiradas (`admin_sessions`, somente após `expires_at` + margem)
 *  4. Buckets de rate limit comprovadamente expirados (`nua_id:rl:<bucket>`)
 *
 * Regras invioláveis (fail-closed):
 *  - Nunca exclui registros apenas por prefixo semelhante: valida formato, finalidade e expiração de cada registro.
 *  - Nunca toca em `content_backups`, `nua_ai_*`, contas/perfis, pedidos, pagamentos,
 *    entitlements, claims, mídias, auditoria ou configurações do site.
 *  - Processamento em lotes limitados com logs sanitizados (sem PII).
 */

import { getSupabaseClient } from '../_supabaseClient';
import { NuaIdEnv } from '../id/_nuaIdStore';

export const HYGIENE_BATCH_LIMIT = 100;
export const EPHEMERAL_SAFETY_MARGIN_MS = 60 * 1000; // 1 minuto após expiração
export const ADMIN_SESSION_SAFETY_MARGIN_MS = 5 * 60 * 1000; // 5 minutos após expiração do JWT
export const DEFAULT_RATE_LIMIT_MAX_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h conservador (maior janela real do app é 1h)

const OTP_KEY_RE = /^nua_id:otp:(login|email_change|account_delete|vault|recovery):.+$/;
const SESSION_KEY_RE = /^nua_id:session:([a-zA-Z0-9_-]{8,128})$/;
const RATE_LIMIT_KEY_RE = /^nua_id:rl:[a-zA-Z0-9_.:-]{2,200}$/;

const PROTECTED_EXACT_KEYS = new Set([
  'private_admin_content',
  'published_content',
  'vault_credentials',
  'contract_signatures_v1_2',
  'nua_finance_installments_v2',
]);

const PROTECTED_PREFIXES = [
  'nua_ai_',
  'nua_id:profile:',
  'nua_id:email:',
  'nua_id:claim:',
  'nua_id:entitlement:',
  'nua_id:payment:',
  'nua_id:refund:',
  'nua_id:audit:',
  'nua_id:notif:',
  'nua_id:profile_orders:',
  'nua_id:pix_renewal:',
  'nua_id:user_sessions:',
  'nua_panel_presence:',
  'webhook_event:',
];

export interface HygieneEvaluation {
  eligible: boolean;
  kind: 'otp' | 'customer_session' | 'rate_limit' | 'protected' | 'invalid';
  reason: string;
}

export function isProtectedKvKey(key: string): boolean {
  if (!key || PROTECTED_EXACT_KEYS.has(key)) return true;
  return PROTECTED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function evaluateEphemeralKvRecord(
  key: string,
  content: unknown,
  nowMs = Date.now()
): HygieneEvaluation {
  if (typeof key !== 'string' || !key || isProtectedKvKey(key)) {
    return { eligible: false, kind: 'protected', reason: 'protected_key' };
  }

  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return { eligible: false, kind: 'invalid', reason: 'invalid_payload_shape' };
  }

  const obj = content as Record<string, unknown>;

  // 1. OTP Challenge
  const otpMatch = key.match(OTP_KEY_RE);
  if (otpMatch) {
    const purpose = obj.purpose;
    const emailNormalized = obj.emailNormalized;
    const codeHash = obj.codeHash;
    const expiresAt = obj.expiresAt;

    if (
      typeof purpose !== 'string' ||
      purpose !== otpMatch[1] ||
      typeof emailNormalized !== 'string' ||
      !emailNormalized.includes('@') ||
      key !== `nua_id:otp:${purpose}:${emailNormalized}` ||
      typeof codeHash !== 'string' ||
      codeHash.length < 16 ||
      typeof expiresAt !== 'string'
    ) {
      return { eligible: false, kind: 'invalid', reason: 'otp_schema_mismatch' };
    }

    const expMs = Date.parse(expiresAt);
    if (!Number.isFinite(expMs)) {
      return { eligible: false, kind: 'invalid', reason: 'otp_invalid_expires_at' };
    }

    return expMs + EPHEMERAL_SAFETY_MARGIN_MS <= nowMs
      ? { eligible: true, kind: 'otp', reason: 'otp_expired' }
      : { eligible: false, kind: 'otp', reason: 'otp_still_valid' };
  }

  // 2. Customer Session (KV)
  const sessionMatch = key.match(SESSION_KEY_RE);
  if (sessionMatch) {
    const id = obj.id;
    const profileId = obj.profileId;
    const expiresAt = obj.expiresAt;

    if (
      typeof id !== 'string' ||
      id !== sessionMatch[1] ||
      typeof profileId !== 'string' ||
      profileId.trim().length === 0 ||
      typeof expiresAt !== 'string'
    ) {
      return { eligible: false, kind: 'invalid', reason: 'session_schema_mismatch' };
    }

    const expMs = Date.parse(expiresAt);
    if (!Number.isFinite(expMs)) {
      return { eligible: false, kind: 'invalid', reason: 'session_invalid_expires_at' };
    }

    return expMs + EPHEMERAL_SAFETY_MARGIN_MS <= nowMs
      ? { eligible: true, kind: 'customer_session', reason: 'session_expired' }
      : { eligible: false, kind: 'customer_session', reason: 'session_still_valid' };
  }

  // 3. Rate Limit Bucket (KV)
  if (RATE_LIMIT_KEY_RE.test(key)) {
    const keys = Object.keys(obj);
    if (keys.length === 0 || !keys.every((k) => k === 'timestamps' || k === 'windowSeconds')) {
      return { eligible: false, kind: 'invalid', reason: 'rate_limit_unexpected_fields' };
    }

    const timestamps = obj.timestamps;
    if (
      !Array.isArray(timestamps) ||
      !timestamps.every((ts) => typeof ts === 'number' && Number.isFinite(ts) && ts > 0)
    ) {
      return { eligible: false, kind: 'invalid', reason: 'rate_limit_invalid_timestamps' };
    }

    let windowMs = DEFAULT_RATE_LIMIT_MAX_WINDOW_MS;
    if ('windowSeconds' in obj) {
      if (
        typeof obj.windowSeconds !== 'number' ||
        !Number.isFinite(obj.windowSeconds) ||
        obj.windowSeconds <= 0
      ) {
        return { eligible: false, kind: 'invalid', reason: 'rate_limit_invalid_window' };
      }
      windowMs = Math.max(obj.windowSeconds * 1000, 60_000);
    }

    if (timestamps.length === 0) {
      return { eligible: true, kind: 'rate_limit', reason: 'rate_limit_empty' };
    }

    const latestTs = Math.max(...timestamps);
    return latestTs + windowMs + EPHEMERAL_SAFETY_MARGIN_MS <= nowMs
      ? { eligible: true, kind: 'rate_limit', reason: 'rate_limit_expired' }
      : { eligible: false, kind: 'rate_limit', reason: 'rate_limit_still_active' };
  }

  return { eligible: false, kind: 'protected', reason: 'unmatched_key_format' };
}

export interface HygieneRunSummary {
  otps: { scanned: number; deleted: number; skippedValid: number; skippedInvalid: number };
  customerSessionsKv: { scanned: number; deleted: number; skippedValid: number; skippedInvalid: number };
  rateLimitsKv: { scanned: number; deleted: number; skippedValid: number; skippedInvalid: number };
  customerSessionsTable: { scanned: number; deleted: number; skippedValid: number };
  adminSessionsTable: { scanned: number; deleted: number; skippedValid: number };
  errors: number;
}

function isMissingTableError(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return code === '42P01' || code === 'PGRST205' || msg.includes('does not exist');
}

async function cleanKvPrefix(params: {
  sb: NonNullable<ReturnType<typeof getSupabaseClient>>;
  likePattern: string;
  expectedKind: 'otp' | 'customer_session' | 'rate_limit';
  nowMs: number;
}): Promise<{ scanned: number; deleted: number; skippedValid: number; skippedInvalid: number; hadError: boolean }> {
  const { sb, likePattern, expectedKind, nowMs } = params;
  const stats = { scanned: 0, deleted: 0, skippedValid: 0, skippedInvalid: 0, hadError: false };

  const { data, error } = await sb
    .from('site_content')
    .select('key, content')
    .ilike('key', likePattern)
    .limit(HYGIENE_BATCH_LIMIT);

  if (error) {
    stats.hadError = true;
    return stats;
  }

  const rows = Array.isArray(data) ? data : [];
  const keysToDelete: string[] = [];

  for (const row of rows) {
    stats.scanned++;
    const evaluation = evaluateEphemeralKvRecord(String(row?.key || ''), row?.content, nowMs);
    if (evaluation.eligible && evaluation.kind === expectedKind) {
      keysToDelete.push(String(row.key));
    } else if (evaluation.kind === expectedKind) {
      stats.skippedValid++;
    } else {
      stats.skippedInvalid++;
    }
  }

  if (keysToDelete.length > 0) {
    const { error: delErr } = await sb.from('site_content').delete().in('key', keysToDelete);
    if (delErr) {
      stats.hadError = true;
    } else {
      stats.deleted = keysToDelete.length;
    }
  }

  return stats;
}

export async function runEphemeralHygiene(
  env: NuaIdEnv,
  nowMs = Date.now()
): Promise<HygieneRunSummary> {
  const summary: HygieneRunSummary = {
    otps: { scanned: 0, deleted: 0, skippedValid: 0, skippedInvalid: 0 },
    customerSessionsKv: { scanned: 0, deleted: 0, skippedValid: 0, skippedInvalid: 0 },
    rateLimitsKv: { scanned: 0, deleted: 0, skippedValid: 0, skippedInvalid: 0 },
    customerSessionsTable: { scanned: 0, deleted: 0, skippedValid: 0 },
    adminSessionsTable: { scanned: 0, deleted: 0, skippedValid: 0 },
    errors: 0,
  };

  const sb = getSupabaseClient(env);
  if (!sb) {
    summary.errors++;
    return summary;
  }

  // 1. KV em site_content: OTPs, sessões de cliente e rate limits
  const [otpRes, sessRes, rlRes] = await Promise.all([
    cleanKvPrefix({ sb, likePattern: 'nua_id:otp:%', expectedKind: 'otp', nowMs }),
    cleanKvPrefix({ sb, likePattern: 'nua_id:session:%', expectedKind: 'customer_session', nowMs }),
    cleanKvPrefix({ sb, likePattern: 'nua_id:rl:%', expectedKind: 'rate_limit', nowMs }),
  ]);

  summary.otps = {
    scanned: otpRes.scanned,
    deleted: otpRes.deleted,
    skippedValid: otpRes.skippedValid,
    skippedInvalid: otpRes.skippedInvalid,
  };
  summary.customerSessionsKv = {
    scanned: sessRes.scanned,
    deleted: sessRes.deleted,
    skippedValid: sessRes.skippedValid,
    skippedInvalid: sessRes.skippedInvalid,
  };
  summary.rateLimitsKv = {
    scanned: rlRes.scanned,
    deleted: rlRes.deleted,
    skippedValid: rlRes.skippedValid,
    skippedInvalid: rlRes.skippedInvalid,
  };
  if (otpRes.hadError) summary.errors++;
  if (sessRes.hadError) summary.errors++;
  if (rlRes.hadError) summary.errors++;

  // 2. Tabela relacional `customer_sessions` (somente comprovadamente expiradas)
  const customerCutoffIso = new Date(nowMs - EPHEMERAL_SAFETY_MARGIN_MS).toISOString();
  const { data: expiredCustRows, error: custErr } = await sb
    .from('customer_sessions')
    .select('id, expires_at')
    .lte('expires_at', customerCutoffIso)
    .limit(HYGIENE_BATCH_LIMIT);

  if (custErr) {
    if (!isMissingTableError(custErr)) summary.errors++;
  } else {
    const idsToDelete: string[] = [];
    for (const row of Array.isArray(expiredCustRows) ? expiredCustRows : []) {
      summary.customerSessionsTable.scanned++;
      const expMs = typeof row?.expires_at === 'string' ? Date.parse(row.expires_at) : NaN;
      if (typeof row?.id === 'string' && row.id && Number.isFinite(expMs) && expMs + EPHEMERAL_SAFETY_MARGIN_MS <= nowMs) {
        idsToDelete.push(row.id);
      } else {
        summary.customerSessionsTable.skippedValid++;
      }
    }
    if (idsToDelete.length > 0) {
      const { error: delErr } = await sb.from('customer_sessions').delete().in('id', idsToDelete);
      if (delErr) summary.errors++;
      else summary.customerSessionsTable.deleted = idsToDelete.length;
    }
  }

  // 3. Tabela relacional `admin_sessions` (somente após expires_at + 5 min de margem para preservar revogações ativas)
  const adminCutoffIso = new Date(nowMs - ADMIN_SESSION_SAFETY_MARGIN_MS).toISOString();
  const { data: expiredAdminRows, error: adminErr } = await sb
    .from('admin_sessions')
    .select('jti, expires_at')
    .lte('expires_at', adminCutoffIso)
    .limit(HYGIENE_BATCH_LIMIT);

  if (adminErr) {
    if (!isMissingTableError(adminErr)) summary.errors++;
  } else {
    const jtisToDelete: string[] = [];
    for (const row of Array.isArray(expiredAdminRows) ? expiredAdminRows : []) {
      summary.adminSessionsTable.scanned++;
      const expMs = typeof row?.expires_at === 'string' ? Date.parse(row.expires_at) : NaN;
      if (
        typeof row?.jti === 'string' &&
        row.jti &&
        Number.isFinite(expMs) &&
        expMs + ADMIN_SESSION_SAFETY_MARGIN_MS <= nowMs
      ) {
        jtisToDelete.push(row.jti);
      } else {
        summary.adminSessionsTable.skippedValid++;
      }
    }
    if (jtisToDelete.length > 0) {
      const { error: delErr } = await sb.from('admin_sessions').delete().in('jti', jtisToDelete);
      if (delErr) summary.errors++;
      else summary.adminSessionsTable.deleted = jtisToDelete.length;
    }
  }

  return summary;
}
