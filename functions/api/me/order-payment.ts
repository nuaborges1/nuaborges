import {
  buildDiscreetPaymentDescription,
  cancelExpiredMercadoPagoPix,
  computePixExpiration,
  createMercadoPagoPix,
  getMercadoPagoPayment,
  PACK_PIX_EXPIRATION_MS,
  PERSONALIZADO_PIX_EXPIRATION_MS,
} from '../_mercadopago';
import { getSupabaseClient } from '../_supabaseClient';
import { getAppointmentByIdFromSupabase, getOrderFromSupabase, getPersonalizadoOrderFromSupabase } from '../_supabaseStore';
import { requireCustomer } from '../id/_customerGuard';
import { getNuaIdAdapter, getOrderClaim, getPaymentByOrderRef, NuaIdEnv } from '../id/_nuaIdStore';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter';
import { isReplaceablePixCancellation, pixRenewalKey } from '../payments/_pixRenewal';
import { normalizeFinancialStatus } from './_customerData';

const headers = { 'Cache-Control': 'private, no-store' };
const reply = (state: string, details: Record<string, unknown> = {}) => Response.json({ state, ...details }, { headers });

async function loadPaymentOrder(env: NuaIdEnv, id: string) {
  if (/^(app|apt|book)_/.test(id)) {
    const booking = await getAppointmentByIdFromSupabase(env, id);
    if (booking?.id !== id) return null;
    return {
      kind: 'vip' as const, status: booking.payment?.status, payable: booking.status === 'aguardando_pagamento',
      amount: booking.price, paymentId: booking.payment?.transactionId, holdUntil: booking.expiresAt,
    };
  }

  if (/^(ped|pers)_/.test(id)) {
    const order = await getPersonalizadoOrderFromSupabase(env, id);
    if (order?.id !== id) return null;
    return {
      kind: 'custom' as const, status: order.payment?.status, payable: order.status === 'aguardando_pagamento',
      amount: order.totalPrice, paymentId: order.payment?.transactionId,
      operationalStatus: order.status,
    };
  }

  const order = await getOrderFromSupabase(env, id);
  if (order?.id !== id) return null;
  return {
    kind: 'pack' as const, status: order.status, payable: order.status === 'pending', amount: order.amount,
    paymentId: order.paymentId,
  };
}

type PaymentOrder = NonNullable<Awaited<ReturnType<typeof loadPaymentOrder>>>;

function canRenew(order: PaymentOrder) {
  if (order.kind === 'vip') return false;
  if (order.kind === 'pack') return order.payable || order.status === 'cancelled';
  return order.payable || (order.operationalStatus === 'cancelado' && order.status === 'rejected');
}

type Context = { request: Request; env: NuaIdEnv };
type Renewal = { key: string; email: string; startedAt: number; replacementId?: string };

async function renewPix(env: NuaIdEnv, id: string, order: Exclude<PaymentOrder, {kind: 'vip'}>, reference: string, email: string, cancelFirst: boolean) {
  const db = getSupabaseClient(env);
  const store = getNuaIdAdapter(env);
  if (!db || !store?.kvCreate) throw new Error('Pix renewal storage unavailable');

  const oldId = order.paymentId!;
  const key = pixRenewalKey(id, oldId);
  const proposed = { key: crypto.randomUUID(), email, startedAt: Date.now() };
  let attempt = await store.kvGet<Renewal>(key, true);
  if (!attempt) {
    attempt = await store.kvCreate(key, proposed) ? proposed : await store.kvGet<Renewal>(key, true);
  }
  // Keep retries bounded when the gateway response was lost and no replacement ID was recorded.
  if (!attempt || (!attempt.replacementId && Date.now() - attempt.startedAt > 10 * 60_000)) return reply('renewal_review');

  if (!attempt.replacementId && cancelFirst && !await cancelExpiredMercadoPagoPix(env, oldId)) {
    const current = await getMercadoPagoPayment(env, oldId);
    if (!await isReplaceablePixCancellation(env, id, oldId, current.raw)) {
      if (current.status === 'approved' || current.status === 'in_process' || current.status === 'authorized') return reply('confirming');
      return current.status === 'pending' ? reply('expired', { canRenew: true }) : reply('closed');
    }
  }

  let paymentId = attempt.replacementId;
  let expiresAt: string | undefined;
  let qrCode = '';
  let qrCodeBase64 = '';
  if (paymentId) {
    const saved = await getMercadoPagoPayment(env, paymentId);
    if (saved.externalReference !== reference || saved.paymentMethod !== 'pix' || saved.raw?.currency_id !== 'BRL' ||
        Math.round(saved.amount * 100) !== Math.round(order.amount * 100)) throw new Error('Invalid saved renewal');
    expiresAt = saved.raw?.date_of_expiration;
    qrCode = saved.raw?.point_of_interaction?.transaction_data?.qr_code || '';
  } else {
    const renewTtlMs =
      order.kind === 'custom' ? PERSONALIZADO_PIX_EXPIRATION_MS : PACK_PIX_EXPIRATION_MS;
    const pixExpiry = computePixExpiration(renewTtlMs);
    const pix = await createMercadoPagoPix(env, {
      amount: order.amount,
      description: buildDiscreetPaymentDescription(id, env),
      payerEmail: attempt.email,
      externalReference: reference,
      idempotencyKey: attempt.key,
      dateOfExpiration: pixExpiry.mpDateOfExpiration,
    });
    paymentId = String(pix.id);
    if (!/^\d{1,32}$/.test(paymentId) || paymentId === oldId) throw new Error('Invalid renewal payment ID');
    ({ expiresAt, qrCode, qrCodeBase64 } = pix);
    if (!expiresAt || !Number.isFinite(Date.parse(expiresAt))) {
      expiresAt = pixExpiry.isoUtc;
    }
    await store.kvSet(key, { ...attempt, replacementId: paymentId });
  }

  const updatedAt = new Date().toISOString();
  let error: any = null;
  if (order.kind === 'pack') {
    ({ error } = await db
      .from('orders')
      .update({
        status: 'pending',
        provider_payment_id: paymentId,
        updated_at: updatedAt,
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      })
      .eq('provider_payment_id', order.paymentId!)
      .eq('status', order.status)
      .eq('id', id));
    if (error && (error.code === '42703' || error.code === 'PGRST204' || String(error.message || '').includes('provider_payment_id'))) {
      ({ error } = await db
        .from('orders')
        .update({
          status: 'pending',
          stripe_payment_intent_id: paymentId,
          updated_at: updatedAt,
          ...(expiresAt ? { expires_at: expiresAt } : {}),
        })
        .eq('stripe_payment_intent_id', order.paymentId!)
        .eq('status', order.status)
        .eq('id', id));
    }
  } else {
    ({ error } = await db
      .from('personalizados_orders')
      .update({
        status: 'aguardando_pagamento',
        updated_at: updatedAt,
        payment: {
          status: 'pending',
          method: 'pix',
          amount: order.amount,
          transactionId: paymentId,
          pixPayload: qrCode,
          pixQrCode: qrCodeBase64,
          ...(expiresAt ? { expiresAt } : {}),
        },
      })
      .eq('payment->>transactionId', order.paymentId!)
      .eq('payment->>status', order.status || 'pending')
      .eq('status', order.operationalStatus)
      .eq('id', id));
  }
  if (error) throw error;
  // The client reloads the active charge, including when a concurrent request won the update.
  return reply('renewed');
}

async function handle({ request, env }: Context) {
  const auth = await requireCustomer(request, env);
  if (!auth.ok) return auth.response;

  const renew = request.method === 'POST';
  if (renew && !/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) {
    return new Response(null, { status: 415, headers });
  }

  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-zA-Z0-9_-]{4,128}$/.test(id)) return new Response(null, { status: 400, headers });

  try {
    const claim = await getOrderClaim(env, id);
    if (claim?.profileId !== auth.profile.id || claim.orderRef !== id) {
      return new Response(null, { status: 404, headers });
    }

    const [order, recorded] = await Promise.all([loadPaymentOrder(env, id), getPaymentByOrderRef(env, id)]);
    if (!order) return new Response(null, { status: 404, headers });

    const localStatus = normalizeFinancialStatus(order.status).status;
    const recordedStatus = normalizeFinancialStatus(recorded?.status).status;
    const status = recorded?.providerPaymentId === order.paymentId ? recordedStatus : localStatus;
    if ([localStatus, recordedStatus].some(state => state === 'refunded' || state === 'charged_back')) return reply('closed');
    if (localStatus === 'paid' || recordedStatus === 'paid') return reply('paid');
    if (!order.paymentId || !/^\d{1,32}$/.test(order.paymentId)) return reply('unavailable');

    const limit = await checkAndConsumeRateLimit(env, `${renew ? 'renew_pix' : 'order_payment'}:${auth.profile.id}`, renew ? 8 : 24, 60);
    if (!limit.allowed) return new Response(null, { status: 429, headers });

    const payment = await getMercadoPagoPayment(env, order.paymentId);
    const reference = payment.externalReference || '';
    const matchesOrder = reference === id || reference.endsWith(`_${id}`);
    if (!payment.success || !matchesOrder || payment.paymentMethod !== 'pix' ||
        payment.raw?.currency_id !== 'BRL' || Math.round(payment.amount * 100) !== Math.round(order.amount * 100)) {
      return reply('unavailable');
    }

    if (payment.status === 'approved' || payment.status === 'in_process' || payment.status === 'authorized') {
      return reply('confirming');
    }

    const now = Date.now();
    const paymentExpiry = Date.parse(payment.raw?.date_of_expiration || '');
    const holdExpiry = Date.parse(order.holdUntil || '');
    const expired = (Number.isFinite(paymentExpiry) && paymentExpiry <= now) ||
      (Number.isFinite(holdExpiry) && holdExpiry <= now);

    const cancelledByExpiry = await isReplaceablePixCancellation(env, id, order.paymentId, payment.raw);
    const expiredPending = payment.status === 'pending' && Number.isFinite(paymentExpiry) && paymentExpiry <= now;
    if (cancelledByExpiry || (expiredPending && order.kind !== 'vip')) {
      if (order.kind === 'vip') return reply('expired', { nextHref: '/chamadas', nextLabel: 'Escolher outro horário' });
      const canRenewPayment = canRenew(order) && Number.isFinite(order.amount) && order.amount > 0 && Boolean(auth.profile.email);
      if (renew && canRenewPayment) return await renewPix(env, id, order, reference, auth.profile.email, expiredPending);
      return reply('expired', { canRenew: canRenewPayment });
    }
    if (payment.status !== 'pending') return reply('closed');
    if (expired) return reply('waiting_expiry');
    if (!order.payable || status !== 'pending' || (order.kind === 'vip' && !Number.isFinite(holdExpiry))) {
      return reply('unavailable');
    }

    const code = payment.raw?.point_of_interaction?.transaction_data?.qr_code;
    if (typeof code !== 'string' || !code || code.length > 2048) return reply('unavailable');
    const expiry = Math.min(Number.isFinite(paymentExpiry) ? paymentExpiry : Infinity, Number.isFinite(holdExpiry) ? holdExpiry : Infinity);
    return reply('payable', { code, expiresAt: Number.isFinite(expiry) ? new Date(expiry).toISOString() : null });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}

export const onRequestGet = handle;
export const onRequestPost = handle;
