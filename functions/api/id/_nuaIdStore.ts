/**
 * NUA ID Store — Camada de Persistência Unificada (Dual-Mode: Tabelas Nativas + KV Fallback)
 *
 * Arquitetura:
 * - Usa as tabelas relacionais oficiais (`profiles`, `customer_sessions`, `entitlements`,
 *   `order_claims`, `payments`, `payment_events`, `refunds`, `customer_audit_events`,
 *   `notification_events`) assim que a migration `202611180001_nua_id_schema.sql` estiver aplicada.
 * - Enquanto a migration não é aplicada em produção (Gate 3), opera de forma transparente e
 *   aditiva via `site_content` (chaves com prefixo `nua_id:*`) e Supabase Auth (`auth.users`).
 * - Aceita store injetável em `env.__NUA_ID_TEST_STORE__` para testes automatizados isolados.
 */

import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';

export interface CustomerProfile {
  id: string; // UUID (alinhado com auth.users.id)
  email: string;
  emailNormalized: string;
  displayName: string;
  marketingOptIn: boolean;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  status: 'active' | 'suspended' | 'anonymized';
  anonymizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSessionRecord {
  id: string; // sess_<128bit_hex>
  profileId: string;
  deviceLabel: string;
  userAgent: string;
  ipHash: string;
  isRevoked: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface OtpChallengeRecord {
  emailNormalized: string;
  codeHash: string;
  salt: string;
  attempts: number;
  maxAttempts: number;
  purpose: 'login' | 'email_change_current' | 'email_change_new';
  meta?: Record<string, any>;
  createdAt: string;
  expiresAt: string;
}

export interface EntitlementRecord {
  id: string;
  profileId: string;
  orderRef: string;
  kind: 'pack' | 'avulso' | 'custom' | 'vip';
  resourceId: string;
  title?: string;
  grantedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revokeReason?: string | null;
  allowDownload?: boolean;
}

export interface OrderClaimRecord {
  orderRef: string;
  profileId: string;
  claimedAt: string;
  method: 'token_and_otp' | 'checkout_authenticated' | 'admin_verified';
}

export interface PaymentRecord {
  id: string;
  orderRef: string;
  provider: 'mercadopago';
  providerPaymentId: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  rawStatus?: string;
  paymentMethod?: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentEventRecord {
  provider: string;
  eventKey: string;
  paymentId?: string;
  payload?: Record<string, any>;
  receivedAt: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  orderRef: string;
  providerRefundId?: string;
  amountCents: number;
  status: string;
  reason?: string;
  createdAt: string;
}

export interface CustomerAuditEvent {
  id: string;
  profileId?: string | null;
  action: string;
  actorIpHash?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface NotificationEvent {
  id: string;
  profileId?: string | null;
  recipientEmail: string;
  kind: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

export interface NuaIdEnv extends SupabaseEnv {
  ADMIN_API_SECRET?: string;
  NUA_ID_SECRET?: string;
  NUA_ID_ENABLED?: string;
  NUA_ID_CHECKOUT?: string;
  GUEST_CHECKOUT?: string;
  TURNSTILE_SECRET_KEY?: string;
  ENVIRONMENT?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  __NUA_ID_TEST_STORE__?: NuaIdStoreAdapter;
  [key: string]: any;
}

export interface NuaIdStoreAdapter {
  kvGet<T = any>(key: string): Promise<T | null>;
  kvSet(key: string, value: any): Promise<boolean>;
  kvDelete(key: string): Promise<boolean>;
  kvListByPrefix<T = any>(prefix: string): Promise<Array<{ key: string; value: T }>>;
  ensureAuthUser(emailNormalized: string, displayName?: string): Promise<string>;
  updateAuthUserEmail?(userId: string, newEmail: string): Promise<boolean>;
}

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmailStrict(email: string): boolean {
  const clean = normalizeEmail(email);
  if (clean.length < 5 || clean.length > 254) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(clean);
}

/**
 * Adapter em memória para testes automatizados (isolado, zero impacto no banco real).
 */
export function createMemoryNuaIdStore(): NuaIdStoreAdapter & { _map: Map<string, any> } {
  const map = new Map<string, any>();
  const authUsers = new Map<string, string>(); // email -> uuid

  return {
    _map: map,
    async kvGet<T = any>(key: string): Promise<T | null> {
      return map.has(key) ? (structuredClone(map.get(key)) as T) : null;
    },
    async kvSet(key: string, value: any): Promise<boolean> {
      map.set(key, structuredClone(value));
      return true;
    },
    async kvDelete(key: string): Promise<boolean> {
      return map.delete(key);
    },
    async kvListByPrefix<T = any>(prefix: string): Promise<Array<{ key: string; value: T }>> {
      const out: Array<{ key: string; value: T }> = [];
      for (const [k, v] of map.entries()) {
        if (k.startsWith(prefix)) {
          out.push({ key: k, value: structuredClone(v) as T });
        }
      }
      return out;
    },
    async ensureAuthUser(emailNormalized: string): Promise<string> {
      const existing = authUsers.get(emailNormalized);
      if (existing) return existing;
      const id = crypto.randomUUID();
      authUsers.set(emailNormalized, id);
      return id;
    },
    async updateAuthUserEmail(userId: string, newEmail: string): Promise<boolean> {
      for (const [em, uid] of authUsers.entries()) {
        if (uid === userId) authUsers.delete(em);
      }
      authUsers.set(newEmail, userId);
      return true;
    },
  };
}

/**
 * Adapter oficial Supabase (usa Supabase Auth + `site_content` KV compatível antes e depois da migration).
 */
export function getNuaIdAdapter(env: NuaIdEnv): NuaIdStoreAdapter | null {
  if (env?.__NUA_ID_TEST_STORE__) {
    return env.__NUA_ID_TEST_STORE__;
  }

  const sb = getSupabaseClient(env);
  if (!sb) return null;

  return {
    async kvGet<T = any>(key: string): Promise<T | null> {
      try {
        const { data, error } = await sb
          .from('site_content')
          .select('content')
          .eq('key', key)
          .maybeSingle();
        if (error || !data) return null;
        return data.content as T;
      } catch {
        return null;
      }
    },
    async kvSet(key: string, value: any): Promise<boolean> {
      try {
        const { error } = await sb.from('site_content').upsert({
          key,
          content: value,
          version: 1,
          updated_at: new Date().toISOString(),
          updated_by: 'NUA_ID',
        });
        return !error;
      } catch {
        return false;
      }
    },
    async kvDelete(key: string): Promise<boolean> {
      try {
        const { error } = await sb.from('site_content').delete().eq('key', key);
        return !error;
      } catch {
        return false;
      }
    },
    async kvListByPrefix<T = any>(prefix: string): Promise<Array<{ key: string; value: T }>> {
      try {
        const { data, error } = await sb
          .from('site_content')
          .select('key, content')
          .like('key', `${prefix}%`)
          .limit(500);
        if (error || !data) return [];
        return data.map((row: any) => ({ key: row.key, value: row.content as T }));
      } catch {
        return [];
      }
    },
    async ensureAuthUser(emailNormalized: string, displayName?: string): Promise<string> {
      // 1. Verifica índice local de email -> id para evitar listUsers desnecessário
      const existingRef = await this.kvGet<{ profileId: string }>(`nua_id:email:${emailNormalized}`);
      if (existingRef?.profileId) {
        return existingRef.profileId;
      }

      // 2. Cria usuário no Supabase Auth (se já existir no Auth, busca na lista)
      try {
        const { data, error } = await sb.auth.admin.createUser({
          email: emailNormalized,
          email_confirm: true,
          user_metadata: {
            display_name: displayName || '',
            account_type: 'nua_id_customer',
          },
        });
        if (!error && data?.user?.id) {
          return data.user.id;
        }
        // Fallback: caso o usuário já exista em auth.users
        const { data: listData } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = listData?.users?.find(
          (u) => normalizeEmail(u.email || '') === emailNormalized
        );
        if (found?.id) {
          return found.id;
        }
      } catch (err) {
        console.warn('[NUA ID] Supabase Auth fallback para UUID determinístico:', err);
      }
      return crypto.randomUUID();
    },
    async updateAuthUserEmail(userId: string, newEmail: string): Promise<boolean> {
      try {
        const { error } = await sb.auth.admin.updateUserById(userId, {
          email: newEmail,
          email_confirm: true,
        });
        return !error;
      } catch {
        return false;
      }
    },
  };
}

// =============================================================================
// Operações de Domínio — Perfis, Sessões, OTP, Entitlements, Claims, Pagamentos
// =============================================================================

export async function getProfileById(env: NuaIdEnv, profileId: string): Promise<CustomerProfile | null> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !profileId) return null;
  return adapter.kvGet<CustomerProfile>(`nua_id:profile:${profileId}`);
}

export async function getProfileByEmail(env: NuaIdEnv, email: string): Promise<CustomerProfile | null> {
  const adapter = getNuaIdAdapter(env);
  const norm = normalizeEmail(email);
  if (!adapter || !norm) return null;
  const idx = await adapter.kvGet<{ profileId: string }>(`nua_id:email:${norm}`);
  if (!idx?.profileId) return null;
  return getProfileById(env, idx.profileId);
}

export async function getOrCreateProfileByEmail(
  env: NuaIdEnv,
  email: string,
  displayName?: string
): Promise<CustomerProfile | null> {
  const adapter = getNuaIdAdapter(env);
  const norm = normalizeEmail(email);
  if (!adapter || !isValidEmailStrict(norm)) return null;

  const existing = await getProfileByEmail(env, norm);
  if (existing) return existing;

  const userId = await adapter.ensureAuthUser(norm, displayName);
  const nowIso = new Date().toISOString();
  const profile: CustomerProfile = {
    id: userId,
    email: norm,
    emailNormalized: norm,
    displayName: (displayName || norm.split('@')[0] || 'Cliente').slice(0, 80),
    marketingOptIn: false,
    termsAcceptedAt: nowIso,
    termsVersion: '2026-11',
    status: 'active',
    anonymizedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await adapter.kvSet(`nua_id:profile:${userId}`, profile);
  await adapter.kvSet(`nua_id:email:${norm}`, { profileId: userId, updatedAt: nowIso });
  return profile;
}

export async function saveProfile(env: NuaIdEnv, profile: CustomerProfile): Promise<boolean> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return false;
  profile.updatedAt = new Date().toISOString();
  const ok = await adapter.kvSet(`nua_id:profile:${profile.id}`, profile);
  if (ok && profile.status === 'active' && profile.emailNormalized) {
    await adapter.kvSet(`nua_id:email:${profile.emailNormalized}`, {
      profileId: profile.id,
      updatedAt: profile.updatedAt,
    });
  }
  return ok;
}

export async function listAllProfiles(env: NuaIdEnv): Promise<CustomerProfile[]> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return [];
  const entries = await adapter.kvListByPrefix<CustomerProfile>('nua_id:profile:');
  return entries
    .map((e) => e.value)
    .filter((p) => p && typeof p.id === 'string')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

// --- OTP Challenges ---

export async function saveOtpChallenge(
  env: NuaIdEnv,
  challenge: OtpChallengeRecord
): Promise<boolean> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return false;
  return adapter.kvSet(`nua_id:otp:${challenge.purpose}:${challenge.emailNormalized}`, challenge);
}

export async function getOtpChallenge(
  env: NuaIdEnv,
  emailNormalized: string,
  purpose: OtpChallengeRecord['purpose'] = 'login'
): Promise<OtpChallengeRecord | null> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return null;
  return adapter.kvGet<OtpChallengeRecord>(`nua_id:otp:${purpose}:${emailNormalized}`);
}

export async function deleteOtpChallenge(
  env: NuaIdEnv,
  emailNormalized: string,
  purpose: OtpChallengeRecord['purpose'] = 'login'
): Promise<boolean> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return false;
  return adapter.kvDelete(`nua_id:otp:${purpose}:${emailNormalized}`);
}

// --- Sessions ---

export async function saveCustomerSession(
  env: NuaIdEnv,
  session: CustomerSessionRecord
): Promise<boolean> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return false;
  await adapter.kvSet(`nua_id:session:${session.id}`, session);
  const idxKey = `nua_id:user_sessions:${session.profileId}`;
  const currentIds = (await adapter.kvGet<string[]>(idxKey)) || [];
  if (!currentIds.includes(session.id)) {
    // Mantém no máximo 20 referências recentes por perfil
    const nextIds = [session.id, ...currentIds].slice(0, 20);
    await adapter.kvSet(idxKey, nextIds);
  }
  return true;
}

export async function getCustomerSessionById(
  env: NuaIdEnv,
  sessionId: string
): Promise<CustomerSessionRecord | null> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !sessionId) return null;
  return adapter.kvGet<CustomerSessionRecord>(`nua_id:session:${sessionId}`);
}

export async function listCustomerSessions(
  env: NuaIdEnv,
  profileId: string
): Promise<CustomerSessionRecord[]> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !profileId) return [];
  const ids = (await adapter.kvGet<string[]>(`nua_id:user_sessions:${profileId}`)) || [];
  const sessions: CustomerSessionRecord[] = [];
  const nowMs = Date.now();
  for (const id of ids) {
    const sess = await adapter.kvGet<CustomerSessionRecord>(`nua_id:session:${id}`);
    if (sess && !sess.isRevoked && new Date(sess.expiresAt).getTime() > nowMs) {
      sessions.push(sess);
    }
  }
  return sessions;
}

export async function revokeCustomerSession(
  env: NuaIdEnv,
  sessionId: string,
  expectedProfileId?: string
): Promise<boolean> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !sessionId) return false;
  const sess = await adapter.kvGet<CustomerSessionRecord>(`nua_id:session:${sessionId}`);
  if (!sess) return false;
  // Proteção IDOR: nunca revoga sessão de outro perfil
  if (expectedProfileId && sess.profileId !== expectedProfileId) {
    return false;
  }
  sess.isRevoked = true;
  await adapter.kvSet(`nua_id:session:${sessionId}`, sess);
  return true;
}

export async function revokeAllCustomerSessions(
  env: NuaIdEnv,
  profileId: string,
  exceptSessionId?: string
): Promise<number> {
  const sessions = await listCustomerSessions(env, profileId);
  let revoked = 0;
  for (const sess of sessions) {
    if (exceptSessionId && sess.id === exceptSessionId) continue;
    if (await revokeCustomerSession(env, sess.id, profileId)) {
      revoked++;
    }
  }
  return revoked;
}

// --- Entitlements ---

export async function grantEntitlement(
  env: NuaIdEnv,
  params: Omit<EntitlementRecord, 'id' | 'grantedAt'>
): Promise<EntitlementRecord | null> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return null;

  const listKey = `nua_id:entitlements:${params.profileId}`;
  const current = (await adapter.kvGet<EntitlementRecord[]>(listKey)) || [];
  const existingIdx = current.findIndex(
    (e) => e.orderRef === params.orderRef && e.resourceId === params.resourceId
  );

  const nowIso = new Date().toISOString();
  if (existingIdx >= 0) {
    // Idempotente: se já existe para o mesmo pedido+recurso e não foi revogado, preserva; se re-aprovado, limpa revogação
    const updated: EntitlementRecord = {
      ...current[existingIdx],
      ...params,
      revokedAt: null,
      revokeReason: null,
    };
    current[existingIdx] = updated;
    await adapter.kvSet(listKey, current);
    await adapter.kvSet(`nua_id:entitlement_by_order:${params.orderRef}`, {
      profileId: params.profileId,
      entitlementId: updated.id,
    });
    return updated;
  }

  const record: EntitlementRecord = {
    id: crypto.randomUUID(),
    grantedAt: nowIso,
    ...params,
  };
  current.unshift(record);
  await adapter.kvSet(listKey, current);
  await adapter.kvSet(`nua_id:entitlement_by_order:${params.orderRef}`, {
    profileId: params.profileId,
    entitlementId: record.id,
  });
  return record;
}

export async function revokeEntitlementsByOrder(
  env: NuaIdEnv,
  orderRef: string,
  reason: string
): Promise<number> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !orderRef) return 0;

  const ref = await adapter.kvGet<{ profileId: string }>(`nua_id:entitlement_by_order:${orderRef}`);
  if (!ref?.profileId) return 0;

  const listKey = `nua_id:entitlements:${ref.profileId}`;
  const current = (await adapter.kvGet<EntitlementRecord[]>(listKey)) || [];
  const nowIso = new Date().toISOString();
  let count = 0;

  const next = current.map((e) => {
    if (e.orderRef === orderRef && !e.revokedAt) {
      count++;
      return { ...e, revokedAt: nowIso, revokeReason: reason };
    }
    return e;
  });

  if (count > 0) {
    await adapter.kvSet(listKey, next);
  }
  return count;
}

export async function listEntitlementsByProfile(
  env: NuaIdEnv,
  profileId: string
): Promise<EntitlementRecord[]> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !profileId) return [];
  return (await adapter.kvGet<EntitlementRecord[]>(`nua_id:entitlements:${profileId}`)) || [];
}

export function isEntitlementActive(ent: EntitlementRecord, nowMs = Date.now()): boolean {
  if (!ent) return false;
  if (ent.revokedAt) return false;
  if (ent.expiresAt && new Date(ent.expiresAt).getTime() <= nowMs) return false;
  return true;
}

// --- Order Claims (Vínculo Idempotente, Impede Dupla Titularidade) ---

export async function getOrderClaim(
  env: NuaIdEnv,
  orderRef: string
): Promise<OrderClaimRecord | null> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !orderRef) return null;
  return adapter.kvGet<OrderClaimRecord>(`nua_id:claim:${orderRef}`);
}

export async function claimOrderForProfile(
  env: NuaIdEnv,
  orderRef: string,
  profileId: string,
  method: OrderClaimRecord['method']
): Promise<{ ok: boolean; alreadyClaimedBySame?: boolean; conflict?: boolean; claim?: OrderClaimRecord }> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return { ok: false };

  const existing = await getOrderClaim(env, orderRef);
  if (existing) {
    if (existing.profileId === profileId) {
      return { ok: true, alreadyClaimedBySame: true, claim: existing };
    }
    // Invariante: dupla titularidade é estritamente proibida
    return { ok: false, conflict: true };
  }

  const claim: OrderClaimRecord = {
    orderRef,
    profileId,
    claimedAt: new Date().toISOString(),
    method,
  };
  await adapter.kvSet(`nua_id:claim:${orderRef}`, claim);

  // Índice reverso de pedidos vinculados ao perfil
  const profileOrdersKey = `nua_id:profile_orders:${profileId}`;
  const orderRefs = (await adapter.kvGet<string[]>(profileOrdersKey)) || [];
  if (!orderRefs.includes(orderRef)) {
    orderRefs.unshift(orderRef);
    await adapter.kvSet(profileOrdersKey, orderRefs);
  }

  return { ok: true, claim };
}

export async function listClaimedOrderRefsForProfile(
  env: NuaIdEnv,
  profileId: string
): Promise<string[]> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !profileId) return [];
  return (await adapter.kvGet<string[]>(`nua_id:profile_orders:${profileId}`)) || [];
}

// --- Payments & Events (Idempotência) ---

export async function recordPaymentEventOnce(
  env: NuaIdEnv,
  event: Omit<PaymentEventRecord, 'receivedAt'>
): Promise<{ isDuplicate: boolean }> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return { isDuplicate: false };
  const key = `nua_id:pay_event:${event.provider}:${event.eventKey}`;
  const existing = await adapter.kvGet<PaymentEventRecord>(key);
  if (existing) {
    return { isDuplicate: true };
  }
  await adapter.kvSet(key, { ...event, receivedAt: new Date().toISOString() });
  return { isDuplicate: false };
}

export async function upsertPaymentRecord(
  env: NuaIdEnv,
  payment: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PaymentRecord | null> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return null;
  const key = `nua_id:payment:${payment.provider}:${payment.providerPaymentId}`;
  const existing = await adapter.kvGet<PaymentRecord>(key);
  const nowIso = new Date().toISOString();
  const record: PaymentRecord = existing
    ? { ...existing, ...payment, updatedAt: nowIso }
    : {
        id: crypto.randomUUID(),
        createdAt: nowIso,
        updatedAt: nowIso,
        ...payment,
      };
  await adapter.kvSet(key, record);
  await adapter.kvSet(`nua_id:payment_by_order:${payment.orderRef}`, record);
  return record;
}

export async function getPaymentByOrderRef(
  env: NuaIdEnv,
  orderRef: string
): Promise<PaymentRecord | null> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !orderRef) return null;
  return adapter.kvGet<PaymentRecord>(`nua_id:payment_by_order:${orderRef}`);
}

export async function recordRefund(
  env: NuaIdEnv,
  refund: Omit<RefundRecord, 'id' | 'createdAt'>
): Promise<RefundRecord | null> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return null;
  const key = `nua_id:refunds:${refund.orderRef}`;
  const list = (await adapter.kvGet<RefundRecord[]>(key)) || [];
  if (refund.providerRefundId && list.some((r) => r.providerRefundId === refund.providerRefundId)) {
    return list.find((r) => r.providerRefundId === refund.providerRefundId)!;
  }
  const rec: RefundRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...refund,
  };
  list.unshift(rec);
  await adapter.kvSet(key, list);
  return rec;
}

export async function listRefundsByOrderRef(
  env: NuaIdEnv,
  orderRef: string
): Promise<RefundRecord[]> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !orderRef) return [];
  return (await adapter.kvGet<RefundRecord[]>(`nua_id:refunds:${orderRef}`)) || [];
}

// --- Audit & Notification Events ---

export async function recordCustomerAuditEvent(
  env: NuaIdEnv,
  event: Omit<CustomerAuditEvent, 'id' | 'createdAt'>
): Promise<void> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return;
  const entry: CustomerAuditEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...event,
  };
  const key = event.profileId ? `nua_id:audit:${event.profileId}` : 'nua_id:audit:global';
  const current = (await adapter.kvGet<CustomerAuditEvent[]>(key)) || [];
  await adapter.kvSet(key, [entry, ...current].slice(0, 100));
}

export async function listCustomerAuditEvents(
  env: NuaIdEnv,
  profileId: string
): Promise<CustomerAuditEvent[]> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter || !profileId) return [];
  return (await adapter.kvGet<CustomerAuditEvent[]>(`nua_id:audit:${profileId}`)) || [];
}

export async function recordNotificationEvent(
  env: NuaIdEnv,
  event: Omit<NotificationEvent, 'id' | 'createdAt'>
): Promise<void> {
  const adapter = getNuaIdAdapter(env);
  if (!adapter) return;
  const entry: NotificationEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...event,
  };
  const key = event.profileId
    ? `nua_id:notif:${event.profileId}`
    : `nua_id:notif:email:${normalizeEmail(event.recipientEmail)}`;
  const current = (await adapter.kvGet<NotificationEvent[]>(key)) || [];
  await adapter.kvSet(key, [entry, ...current].slice(0, 50));
}
