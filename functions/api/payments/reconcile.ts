/**
 * Cloudflare Pages Function: POST /api/payments/reconcile
 *
 * Reconciliação periódica (acionada por Cron Trigger ou painel administrativo autenticado).
 * Cobre as 3 modalidades do NUA Borges em lotes limitados:
 *   - Packs (`orders`)
 *   - Chamadas VIP (`appointments`)
 *   - Personalizados (`personalizados_orders`)
 *
 * Regras de segurança:
 * 1. Sempre consulta o estado financeiro confiável no Mercado Pago antes de alterar registros locais.
 * 2. Em erro, timeout ou estado inconclusivo do provedor, NUNCA marca como expirado nem libera reservas.
 * 3. Preserva lock anti-concorrência e idempotência via `_paymentEngine.ts`.
 * 4. Emite logs sanitizados (sem PII) e trata falhas individualmente por item.
 */

import {
  cancelExpiredMercadoPagoPix,
  getMercadoPagoPayment,
  isExpiredPix,
} from '../_mercadopago';
import { getSupabaseClient } from '../_supabaseClient';
import { getSessionCookie } from '../_authHelper';
import { timingSafeEqual } from '../id/_crypto';
import { getNuaIdAdapter, NuaIdEnv, recordCustomerAuditEvent } from '../id/_nuaIdStore';
import { processVerifiedMercadoPagoPayment } from './_paymentEngine';
import { createSupabasePaymentDependencies } from '../webhooks/mercadopago-v2';
import {
  saveAppointmentToSupabase,
  supabaseRowToBooking,
  personalizadoRowToOrder,
  updateOrderInSupabase,
} from '../_supabaseStore';

interface ReconcileEnv extends NuaIdEnv {
  CRON_SECRET?: string;
  ADMIN_API_SECRET?: string;
  ADMIN_PASSWORD?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

type ReconcileModality = 'packs' | 'vip' | 'custom';

interface ModalityStats {
  checked: number;
  approved: number;
  expired: number;
  reconciled: number;
  errors: number;
}

const BATCH_LIMIT_PER_MODALITY = 20;
const LOCK_TTL_MS = 90_000;
const ORPHAN_VIP_NO_PAYMENT_GRACE_MS = 5 * 60 * 1000;

const KNOWN_MP_TERMINAL_STATUSES = new Set([
  'approved',
  'cancelled',
  'expired',
  'rejected',
  'refunded',
  'charged_back',
]);

function createEmptyModalityStats(): ModalityStats {
  return { checked: 0, approved: 0, expired: 0, reconciled: 0, errors: 0 };
}

function isNonPackOrderId(orderId: string): boolean {
  return /^(app|apt|book|ped|pers)_/i.test(String(orderId || '').trim());
}

function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'unknown_error');
  return raw.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]').slice(0, 160);
}

async function isAuthorizedReconcileCaller(request: Request, env: ReconcileEnv): Promise<boolean> {
  const explicitCron = (request.headers.get('x-cron-secret') || '').trim();
  const authHeader = request.headers.get('Authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const cronSecret = String(env.CRON_SECRET || '').trim();
  const candidateCron = explicitCron || bearer;
  if (cronSecret && candidateCron && timingSafeEqual(candidateCron, cronSecret)) {
    return true;
  }

  const { getAdminSessionSecret } = await import('../_central/secrets');
  const { parseAndVerifyActiveAdminSession } = await import('../_central/adminSessions');
  const adminSecret = getAdminSessionSecret(env as any) || '';
  const cookieToken = getSessionCookie(request);
  const candidateToken = bearer || cookieToken || '';
  if (adminSecret && candidateToken) {
    if (
      env.ADMIN_API_SECRET &&
      env.ADMIN_API_SECRET.length >= 24 &&
      timingSafeEqual(candidateToken, env.ADMIN_API_SECRET)
    ) {
      return true;
    }
    const payload = await parseAndVerifyActiveAdminSession(env as any, candidateToken, adminSecret, ['admin', 'dev']);
    if (payload) {
      return true;
    }
  }
  return false;
}

async function acquireReconcileLock(
  adapter: ReturnType<typeof getNuaIdAdapter>,
  lockKey: string,
  ownerId: string,
  nowMs: number
): Promise<boolean> {
  if (!adapter) return true;
  const payload = { owner: ownerId, until: nowMs + LOCK_TTL_MS };

  // Tentativa atômica primeiro via kvCreate quando suportado pelo adapter
  if (adapter.kvCreate) {
    const created = await adapter.kvCreate(lockKey, payload).catch(() => false);
    if (created) return true;
  }

  const existing = await adapter.kvGet<{ owner?: string; until?: number }>(lockKey, true).catch(() => null);
  if (existing && typeof existing.until === 'number' && existing.until > nowMs) {
    return false;
  }

  // Lock expirado ou inexistente: assume com verificação pós-escrita
  const saved = await adapter.kvSet(lockKey, payload).catch(() => false);
  if (!saved) return false;
  const confirmed = await adapter.kvGet<{ owner?: string; until?: number }>(lockKey, true).catch(() => null);
  return confirmed?.owner === ownerId;
}

async function reconcileSinglePayment(params: {
  env: ReconcileEnv;
  deps: ReturnType<typeof createSupabasePaymentDependencies>;
  kind: ReconcileModality;
  orderId: string;
  paymentId: string;
  fallbackExternalReference: string;
  localExpiresAt?: string | null;
  stats: ModalityStats;
  nowMs: number;
}): Promise<void> {
  const {
    env,
    deps,
    kind,
    orderId,
    paymentId,
    fallbackExternalReference,
    localExpiresAt,
    stats,
    nowMs,
  } = params;

  const cleanPaymentId = String(paymentId || '').trim();
  // AUD-PRE-011: Ignora qualquer identificador simulado (SIM- ou sim_) ou não numérico
  if (!cleanPaymentId || /^sim[_-]/i.test(cleanPaymentId) || !/^\d{1,32}$/.test(cleanPaymentId)) {
    return;
  }

  stats.checked++;

  try {
    let mpInfo = await getMercadoPagoPayment(env, cleanPaymentId);
    if (!mpInfo?.success || !mpInfo.status) {
      stats.errors++;
      return;
    }

    let mpStatus = String(mpInfo.status).trim().toLowerCase();

    // Se ainda está pending no Mercado Pago, só tenta encerrar se o vencimento OFICIAL no MP já passou
    // (e para VIP, também se o hold da reserva já expirou). Em caso de dúvida ou erro, não altera nada.
    if (mpStatus === 'pending') {
      const mpExpMs = mpInfo.raw?.date_of_expiration ? Date.parse(mpInfo.raw.date_of_expiration) : NaN;
      const localExpMs = localExpiresAt ? Date.parse(localExpiresAt) : NaN;
      const mpExpired = Number.isFinite(mpExpMs) && mpExpMs <= nowMs;
      const vipHoldExpired = kind !== 'vip' || !Number.isFinite(localExpMs) || localExpMs <= nowMs;

      if (!mpExpired || !vipHoldExpired) {
        return;
      }

      // Cancela no Mercado Pago e reconsulta antes de alterar o estado local
      await cancelExpiredMercadoPagoPix(env, cleanPaymentId).catch(() => false);
      mpInfo = await getMercadoPagoPayment(env, cleanPaymentId);
      if (!mpInfo?.success || !mpInfo.status) {
        stats.errors++;
        return;
      }
      mpStatus = String(mpInfo.status).trim().toLowerCase();
    }

    // Estados ainda em processamento/inconclusivos: não altera localmente nem libera reserva
    if (!KNOWN_MP_TERMINAL_STATUSES.has(mpStatus)) {
      return;
    }

    const res = await processVerifiedMercadoPagoPayment(
      env,
      {
        paymentId: cleanPaymentId,
        status: mpStatus,
        statusDetail: mpInfo.statusDetail,
        transactionAmount: mpInfo.amount,
        currencyId: String(mpInfo.raw?.currency_id || 'BRL'),
        externalReference: String(mpInfo.externalReference || fallbackExternalReference),
        paymentMethodId: mpInfo.paymentMethod,
        dateApproved: mpInfo.dateApproved || null,
        dateLastUpdated: mpInfo.raw?.date_last_updated || null,
      },
      deps
    );

    if (res.processed) {
      stats.reconciled++;
      if (mpStatus === 'approved') {
        stats.approved++;
      } else if (
        mpStatus === 'expired' ||
        isExpiredPix(mpStatus, mpInfo.statusDetail, mpInfo.raw?.date_of_expiration) ||
        mpStatus === 'cancelled'
      ) {
        stats.expired++;
      }
    }
  } catch (err) {
    stats.errors++;
    console.warn(`[Reconcile:${kind}] Falha ao consultar/reconciliar ${orderId}: ${sanitizeErrorMessage(err)}`);
  }
}

export const onRequestPost = async (context: PagesContext<ReconcileEnv>) => {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

  if (!(await isAuthorizedReconcileCaller(request, env))) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers,
    });
  }

  const sb = getSupabaseClient(env);
  if (!sb) {
    return new Response(JSON.stringify({ success: false, error: 'Supabase não configurado.' }), {
      status: 503,
      headers,
    });
  }

  const adapter = getNuaIdAdapter(env);
  const lockKey = 'nua_id:reconcile_lock';
  const lockOwner = crypto.randomUUID();
  const nowMs = Date.now();
  const lockAcquired = await acquireReconcileLock(adapter, lockKey, lockOwner, nowMs);
  if (!lockAcquired) {
    return new Response(JSON.stringify({ success: true, skipped: true, reason: 'already_running' }), {
      status: 200,
      headers,
    });
  }

  try {
    const deps = createSupabasePaymentDependencies(env);
    const byModality: Record<ReconcileModality, ModalityStats> = {
      packs: createEmptyModalityStats(),
      vip: createEmptyModalityStats(),
      custom: createEmptyModalityStats(),
    };

    // 1. PACKS — tabela `orders` (exclui espelhos de VIP e Personalizados, reconciliados abaixo)
    let { data: pendingOrders, error: ordersErr } = await sb
      .from('orders')
      .select('id, provider_payment_id, status, expires_at, created_at')
      .eq('status', 'pending')
      .neq('provider_payment_id', '')
      .order('created_at', { ascending: false })
      .limit(BATCH_LIMIT_PER_MODALITY * 2);

    if (
      ordersErr &&
      (ordersErr.code === '42703' || String(ordersErr.message || '').includes('provider_payment_id'))
    ) {
      ({ data: pendingOrders, error: ordersErr } = await sb
        .from('orders')
        .select('id, stripe_payment_intent_id, status, expires_at, created_at')
        .eq('status', 'pending')
        .neq('stripe_payment_intent_id', '')
        .order('created_at', { ascending: false })
        .limit(BATCH_LIMIT_PER_MODALITY * 2) as any);
    }

    if (ordersErr) {
      byModality.packs.errors++;
      console.warn(`[Reconcile:packs] Falha ao listar pedidos pendentes: ${sanitizeErrorMessage(ordersErr.message)}`);
    } else {
      const packRows = ((pendingOrders || []) as any[])
        .filter((row) => row?.id && !isNonPackOrderId(row.id))
        .slice(0, BATCH_LIMIT_PER_MODALITY);

      for (const row of packRows) {
        const paymentId = String(row.provider_payment_id ?? row.stripe_payment_intent_id ?? '').trim();
        await reconcileSinglePayment({
          env,
          deps,
          kind: 'packs',
          orderId: String(row.id),
          paymentId,
          fallbackExternalReference: String(row.id),
          localExpiresAt: row.expires_at || null,
          stats: byModality.packs,
          nowMs,
        });
      }
    }

    // 2. CHAMADAS VIP — tabela `appointments`
    const { data: pendingAppointments, error: appErr } = await sb
      .from('appointments')
      .select('*')
      .eq('status', 'aguardando_pagamento')
      .order('created_at', { ascending: false })
      .limit(BATCH_LIMIT_PER_MODALITY);

    if (appErr) {
      byModality.vip.errors++;
      console.warn(`[Reconcile:vip] Falha ao listar reservas pendentes: ${sanitizeErrorMessage(appErr.message)}`);
    } else {
      for (const rawRow of (pendingAppointments || []) as any[]) {
        const booking = supabaseRowToBooking(rawRow);
        const paymentId = String(booking.payment?.transactionId || '').trim();

        if (!paymentId) {
          // Reserva sem cobrança gerada no MP (ex.: erro antes de obter paymentId):
          // só libera após o vencimento do hold + margem de segurança.
          const expMs = booking.expiresAt ? Date.parse(booking.expiresAt) : NaN;
          if (Number.isFinite(expMs) && nowMs > expMs + ORPHAN_VIP_NO_PAYMENT_GRACE_MS) {
            byModality.vip.checked++;
            const nowIso = new Date(nowMs).toISOString();
            booking.status = 'cancelada';
            booking.cancellationReason = 'Prazo de pagamento expirou sem cobrança emitida';
            booking.updatedAt = nowIso;
            booking.history = [
              ...(Array.isArray(booking.history) ? booking.history : []),
              {
                at: nowIso,
                action: 'reserva_expirada',
                note: 'Reserva expirada sem cobrança Pix registrada; horário liberado pela reconciliação.',
                author: 'system',
              },
            ];
            const saved = await saveAppointmentToSupabase(env, booking);
            if (saved.success) {
              await updateOrderInSupabase(env, booking.id, { status: 'cancelled' }).catch(() => {});
              byModality.vip.reconciled++;
              byModality.vip.expired++;
            } else {
              byModality.vip.errors++;
            }
          }
          continue;
        }

        await reconcileSinglePayment({
          env,
          deps,
          kind: 'vip',
          orderId: booking.id,
          paymentId,
          fallbackExternalReference: `apt_${booking.id}`,
          localExpiresAt: booking.expiresAt || null,
          stats: byModality.vip,
          nowMs,
        });
      }
    }

    // 3. PERSONALIZADOS — tabela `personalizados_orders`
    const { data: pendingCustom, error: customErr } = await sb
      .from('personalizados_orders')
      .select('*')
      .eq('status', 'aguardando_pagamento')
      .order('created_at', { ascending: false })
      .limit(BATCH_LIMIT_PER_MODALITY);

    if (customErr) {
      byModality.custom.errors++;
      console.warn(
        `[Reconcile:custom] Falha ao listar personalizados pendentes: ${sanitizeErrorMessage(customErr.message)}`
      );
    } else {
      for (const rawRow of (pendingCustom || []) as any[]) {
        const order = personalizadoRowToOrder(rawRow);
        const paymentId = String(order.payment?.transactionId || '').trim();
        if (!paymentId) continue;

        await reconcileSinglePayment({
          env,
          deps,
          kind: 'custom',
          orderId: order.id,
          paymentId,
          fallbackExternalReference: `nua_pers_${order.id}`,
          localExpiresAt: order.payment?.expiresAt || null,
          stats: byModality.custom,
          nowMs,
        });
      }
    }

    const summary = {
      checked: byModality.packs.checked + byModality.vip.checked + byModality.custom.checked,
      reconciled: byModality.packs.reconciled + byModality.vip.reconciled + byModality.custom.reconciled,
      errors: byModality.packs.errors + byModality.vip.errors + byModality.custom.errors,
      byModality,
    };

    await recordCustomerAuditEvent(env, {
      profileId: null,
      action: 'payment_reconciliation_run',
      details: summary,
    });

    return new Response(JSON.stringify({ success: true, ...summary }), { status: 200, headers });
  } catch (err: any) {
    console.error(`[Reconcile] Erro inesperado: ${sanitizeErrorMessage(err)}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro na reconciliação de pagamentos.' }),
      { status: 500, headers }
    );
  } finally {
    if (adapter) {
      const current = await adapter.kvGet<{ owner?: string }>(lockKey, true).catch(() => null);
      if (!current || current.owner === lockOwner) {
        await adapter.kvDelete(lockKey).catch(() => {});
      }
    }
  }
};
