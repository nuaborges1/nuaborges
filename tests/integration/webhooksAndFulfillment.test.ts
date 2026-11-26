import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { onRequestPost as mpWebhook } from '@/functions/api/webhooks/mercadopago';
import { onRequestPost as financeWebhook } from '@/functions/api/finance/webhook';
import { onRequestPost as createPix } from '@/functions/api/payments/create-pix';
import { retryVaultMail } from '@/functions/api/me/_vaultMail';
import {
  claimOrderForProfile,
  getOrCreateProfileByEmail,
  listEntitlementsByProfile,
  isEntitlementActive,
} from '@/functions/api/id/_nuaIdStore';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import { createTestEmail, signMercadoPagoWebhook } from '../factories/domainFactories';

describe('INTEGRATION — Mercado Pago Webhooks, Fulfillment, Refunds & Email Recovery', () => {
  let harness: IsolatedBackendHarness;
  let env: Record<string, any>;

  beforeEach(() => {
    harness = new IsolatedBackendHarness();
    harness.installFetchInterceptor();
    env = harness.createEnv();
  });

  afterEach(() => {
    harness.restoreFetch();
  });

  it('rejects unsigned or forged webhooks (401) and routes /api/finance/webhook through the same fail-closed v2 engine', async () => {
    const res1 = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': 'ts=123,v1=deadbeef' },
        body: JSON.stringify({ type: 'payment', data: { id: '900001' } }),
      }),
      env: env as any,
    });
    expect(res1.status).toBe(401);

    const res2 = await financeWebhook({
      request: new Request('https://nuaborges.com.br/api/finance/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'payment', data: { id: '900001' } }),
      }),
      env: env as any,
    });
    expect(res2.status).toBe(401);
  });

  it('processes authenticated Pack approval -> grants entitlement -> sends Vault email once -> idempotently ignores duplicates -> revokes on refund/chargeback', async () => {
    const email = createTestEmail('int_pack');
    const profile = await getOrCreateProfileByEmail(env as any, email, 'Cliente Integrado');

    const pixRes = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: email, payerName: 'Cliente Integrado' }),
      }),
      env,
    });
    expect(pixRes.status).toBe(201);
    const pix = await pixRes.json();
    await claimOrderForProfile(env as any, pix.orderId, profile!.id, 'checkout_authenticated');

    const mpId = String(pix.paymentId);
    const mpObj = harness.mpPayments.get(mpId)!;

    // 1. Underpaid attempt -> rejected without granting entitlement!
    mpObj.status = 'approved';
    mpObj.transaction_amount = 10.0; // Expected 89.90
    mpObj.date_last_updated = '2026-11-24T12:00:00Z';
    const sigUnder = await signMercadoPagoWebhook({ dataId: mpId });
    const underRes = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sigUnder.xSignature, 'x-request-id': sigUnder.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpId } }),
      }),
      env: env as any,
    });
    expect(underRes.status).toBe(200);
    expect((await underRes.json()).processed).toBe(false);
    expect(await listEntitlementsByProfile(env as any, profile!.id)).toHaveLength(0);

    // 2. Legitimate full amount approval -> grants entitlement + sends Vault email
    mpObj.transaction_amount = 89.9;
    mpObj.date_approved = '2026-11-24T12:01:00Z';
    mpObj.date_last_updated = '2026-11-24T12:01:00Z';
    const sigOk = await signMercadoPagoWebhook({ dataId: mpId });
    const okRes = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sigOk.xSignature, 'x-request-id': sigOk.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpId } }),
      }),
      env: env as any,
    });
    expect(okRes.status).toBe(200);
    const okBody = await okRes.json();
    expect(okBody.processed).toBe(true);
    expect(okBody.accessAction).toBe('granted');

    const ents = await listEntitlementsByProfile(env as any, profile!.id);
    expect(ents.some((e) => e.orderRef === pix.orderId && isEntitlementActive(e))).toBe(true);
    expect(harness.emails.filter((e) => e.to === email)).toHaveLength(1);

    // 3. Exact duplicate webhook replay -> idempotent, zero duplicate emails
    const dupRes = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sigOk.xSignature, 'x-request-id': sigOk.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpId } }),
      }),
      env: env as any,
    });
    expect((await dupRes.json()).duplicate).toBe(true);
    expect(harness.emails.filter((e) => e.to === email)).toHaveLength(1);

    // 4. Refund webhook -> revokes entitlement immediately
    mpObj.status = 'refunded';
    mpObj.date_last_updated = '2026-11-24T12:05:00Z';
    const sigRef = await signMercadoPagoWebhook({ dataId: mpId });
    const refRes = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sigRef.xSignature, 'x-request-id': sigRef.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpId } }),
      }),
      env: env as any,
    });
    expect((await refRes.json()).accessAction).toBe('revoked');
    const afterRevoke = await listEntitlementsByProfile(env as any, profile!.id);
    expect(afterRevoke.some((e) => e.orderRef === pix.orderId && isEntitlementActive(e))).toBe(false);
  });

  it('auto-refunds late VIP call payment when temporary hold expired and slot was cancelled', async () => {
    const email = createTestEmail('late_vip');
    const bookingId = 'book_late_qa_001';
    const mpId = '977000111';
    const expiredIso = new Date(Date.now() - 30 * 60_000).toISOString();

    harness.tables.appointments.push({
      id: bookingId,
      public_token: 'tok_late_vip_001',
      modality_id: 'chamada-vip-15',
      client_name: 'Cliente Tardio',
      client_instagram: email,
      client_contact: '+5511999999999',
      date_time: '2026-12-15T15:00:00.000Z',
      duration_minutes: 15,
      total_price: 180,
      status: 'cancelada',
      payment: { status: 'pending', method: 'pix', amount: 180, transactionId: mpId },
      notes: JSON.stringify({
        modalityName: 'Chamada VIP 15 min',
        date: '2026-12-15',
        startTime: '15:00',
        endTime: '15:15',
        timezone: 'Europe/Dublin',
        clientName: 'Cliente Tardio',
        clientEmail: email,
        expiresAt: expiredIso,
        meeting: { platform: 'google_meet', visibleToClient: false },
        history: [],
      }),
      expires_at: expiredIso,
    });

    harness.mpPayments.set(mpId, {
      id: mpId,
      status: 'approved',
      transaction_amount: 180,
      currency_id: 'BRL',
      external_reference: `apt_${bookingId}`,
      payment_method_id: 'pix',
      date_approved: new Date().toISOString(),
      date_last_updated: new Date().toISOString(),
    });

    const sig = await signMercadoPagoWebhook({ dataId: mpId });
    const whRes = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sig.xSignature, 'x-request-id': sig.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpId } }),
      }),
      env: env as any,
    });
    expect(whRes.status).toBe(200);
    const body = await whRes.json();
    expect(body.autoRefunded).toBe(true);
    expect(body.accessAction).toBe('none');
    expect(harness.mpRefunds).toHaveLength(1);
    expect(harness.mpRefunds[0].paymentId).toBe(mpId);
    expect(harness.emails.some((e) => e.to === email && /reembolso/i.test(e.html))).toBe(true);
  });

  it('recovers failed Vault delivery email via retryVaultMail once SMTP is restored', async () => {
    const email = createTestEmail('retry_mail');
    const profile = await getOrCreateProfileByEmail(env as any, email, 'Cliente Retry');

    const pixRes = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: email }),
      }),
      env,
    });
    const pix = await pixRes.json();
    await claimOrderForProfile(env as any, pix.orderId, profile!.id, 'checkout_authenticated');

    // Simulate SMTP outage during webhook approval
    harness.faults.emailDown = true;
    const mpId = String(pix.paymentId);
    const mpObj = harness.mpPayments.get(mpId)!;
    mpObj.status = 'approved';
    mpObj.date_approved = new Date().toISOString();
    mpObj.date_last_updated = new Date().toISOString();

    const sig = await signMercadoPagoWebhook({ dataId: mpId });
    await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sig.xSignature, 'x-request-id': sig.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpId } }),
      }),
      env: env as any,
    });

    // No email delivered yet, pending job scheduled in KV
    expect(harness.emails.filter((e) => e.to === email)).toHaveLength(0);
    const pendingKey = `vault:delivery:pending:${pix.orderId}`;
    const pendingJob = harness.kv.get(pendingKey);
    expect(pendingJob).toBeTruthy();

    // Restore SMTP and advance retry window
    harness.faults.emailDown = false;
    harness.kv.set(pendingKey, { ...pendingJob, next: Date.now() - 1000 });
    await retryVaultMail(env as any);

    expect(harness.emails.some((e) => e.to === email && e.html.includes('/conta?tab=biblioteca&amp;item='))).toBe(true);
    expect(harness.kv.has(`vault:delivery:sent:${pix.orderId}`)).toBe(true);
  });

  it('[DEF-001] handles simultaneous guest webhooks idempotently, preserves existing claim on conflict, isolates buyers, and recovers from DB/SMTP failures', async () => {
    const guestEmail = createTestEmail('guest_full_cycle');
    const otherEmail = createTestEmail('other_buyer');

    // A. Simultaneous duplicate webhooks for the same guest order -> single profile, claim, entitlement, email
    const pix1Res = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pack',
          slug: 'ensaio-qa',
          payerEmail: guestEmail,
          payerName: 'Convidada Dupla',
        }),
      }),
      env,
    });
    expect(pix1Res.status).toBe(201);
    const pix1 = await pix1Res.json();
    const mp1 = harness.mpPayments.get(String(pix1.paymentId))!;
    mp1.status = 'approved';
    mp1.date_approved = '2026-11-24T13:00:00Z';
    mp1.date_last_updated = '2026-11-24T13:00:00Z';

    const sig1 = await signMercadoPagoWebhook({ dataId: String(pix1.paymentId) });
    const makeWhReq = () =>
      mpWebhook({
        request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': sig1.xSignature,
            'x-request-id': sig1.xRequestId,
          },
          body: JSON.stringify({ type: 'payment', data: { id: String(pix1.paymentId) } }),
        }),
        env: env as any,
      });

    const [r1, r2] = await Promise.all([makeWhReq(), makeWhReq()]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const [b1, b2] = await Promise.all([r1.json(), r2.json()]);
    expect([b1.processed, b2.processed].filter(Boolean)).toHaveLength(1);
    expect([b1.duplicate, b2.duplicate].filter(Boolean)).toHaveLength(1);

    const guestProfile = await getOrCreateProfileByEmail(env as any, guestEmail);
    expect(guestProfile).not.toBeNull();
    expect(await listEntitlementsByProfile(env as any, guestProfile!.id)).toHaveLength(1);
    expect(harness.emails.filter((e) => e.to === guestEmail && e.html.includes('/conta?tab=biblioteca&amp;item='))).toHaveLength(1);

    // B. Second order by the SAME guest buyer -> reuses same profile, grants second entitlement, isolates from other buyer
    const pix2Res = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pack',
          slug: 'ensaio-qa',
          payerEmail: guestEmail,
          payerName: 'Convidada Dupla',
        }),
      }),
      env,
    });
    expect(pix2Res.status).toBe(201);
    const pix2 = await pix2Res.json();
    const mp2 = harness.mpPayments.get(String(pix2.paymentId))!;
    mp2.status = 'approved';
    mp2.date_approved = '2026-11-24T13:05:00Z';
    mp2.date_last_updated = '2026-11-24T13:05:00Z';

    // Simulate transient SMTP outage on order 2 -> entitlement MUST still be granted & mail queued for retry
    harness.faults.emailDown = true;
    const sig2 = await signMercadoPagoWebhook({ dataId: String(pix2.paymentId) });
    const wh2Res = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': sig2.xSignature,
          'x-request-id': sig2.xRequestId,
        },
        body: JSON.stringify({ type: 'payment', data: { id: String(pix2.paymentId) } }),
      }),
      env: env as any,
    });
    expect(wh2Res.status).toBe(200);
    const entsAfter2 = await listEntitlementsByProfile(env as any, guestProfile!.id);
    expect(entsAfter2.filter((e) => isEntitlementActive(e))).toHaveLength(2);
    expect(harness.kv.has(`vault:delivery:pending:${pix2.orderId}`)).toBe(true);

    // Cross-buyer isolation: another buyer has zero entitlements
    const otherProfile = await getOrCreateProfileByEmail(env as any, otherEmail, 'Outro Comprador');
    expect(await listEntitlementsByProfile(env as any, otherProfile!.id)).toHaveLength(0);

    // Recover SMTP and retry queued guest Vault delivery
    harness.faults.emailDown = false;
    const pending2 = harness.kv.get(`vault:delivery:pending:${pix2.orderId}`);
    harness.kv.set(`vault:delivery:pending:${pix2.orderId}`, { ...pending2, next: Date.now() - 1000 });
    await retryVaultMail(env as any);
    expect(
      harness.emails.some(
        (e) => e.to === guestEmail && e.html.includes(`/conta?tab=biblioteca&amp;item=${encodeURIComponent(pix2.orderId)}`)
      )
    ).toBe(true);

    // C. Claim conflict protection: pre-claimed order NEVER transfers ownership to a different email
    const pix3Res = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pack',
          slug: 'ensaio-qa',
          payerEmail: guestEmail,
        }),
      }),
      env,
    });
    const pix3 = await pix3Res.json();
    await claimOrderForProfile(env as any, pix3.orderId, otherProfile!.id, 'checkout_authenticated');
    const mp3 = harness.mpPayments.get(String(pix3.paymentId))!;
    mp3.status = 'approved';
    mp3.date_approved = '2026-11-24T13:10:00Z';
    mp3.date_last_updated = '2026-11-24T13:10:00Z';
    const sig3 = await signMercadoPagoWebhook({ dataId: String(pix3.paymentId) });
    const wh3Res = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': sig3.xSignature,
          'x-request-id': sig3.xRequestId,
        },
        body: JSON.stringify({ type: 'payment', data: { id: String(pix3.paymentId) } }),
      }),
      env: env as any,
    });
    expect(wh3Res.status).toBe(200);
    // Entitlement MUST belong to original claimant (otherProfile), NOT hijacked by guestProfile
    const otherEnts = await listEntitlementsByProfile(env as any, otherProfile!.id);
    expect(otherEnts.some((e) => e.orderRef === pix3.orderId && isEntitlementActive(e))).toBe(true);
    const guestEnts = await listEntitlementsByProfile(env as any, guestProfile!.id);
    expect(guestEnts.some((e) => e.orderRef === pix3.orderId)).toBe(false);

    // D. Transient persistence failure during fulfillment releases payment event dedupe lock -> retry succeeds
    const pix4Res = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pack',
          slug: 'ensaio-qa',
          payerEmail: createTestEmail('guest_retry_db'),
        }),
      }),
      env,
    });
    const pix4 = await pix4Res.json();
    const mp4 = harness.mpPayments.get(String(pix4.paymentId))!;
    mp4.status = 'approved';
    mp4.date_approved = '2026-11-24T13:15:00Z';
    mp4.date_last_updated = '2026-11-24T13:15:00Z';
    const sig4 = await signMercadoPagoWebhook({ dataId: String(pix4.paymentId) });

    // Inject transient persistence failure on entitlement write on first attempt
    const store = env.__NUA_ID_TEST_STORE__;
    const origKvSet = store.kvSet.bind(store);
    let failOnce = true;
    store.kvSet = async (key: string, value: any) => {
      if (failOnce && key.startsWith('nua_id:entitlements:')) {
        failOnce = false;
        throw new Error('Simulated transient DB error on entitlement write');
      }
      return origKvSet(key, value);
    };

    const wh4Fail = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': sig4.xSignature,
          'x-request-id': sig4.xRequestId,
        },
        body: JSON.stringify({ type: 'payment', data: { id: String(pix4.paymentId) } }),
      }),
      env: env as any,
    });
    expect(wh4Fail.status).toBe(500);

    // Retry exact same webhook event -> MUST NOT be skipped as duplicate and MUST grant entitlement now
    const wh4Retry = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': sig4.xSignature,
          'x-request-id': sig4.xRequestId,
        },
        body: JSON.stringify({ type: 'payment', data: { id: String(pix4.paymentId) } }),
      }),
      env: env as any,
    });
    expect(wh4Retry.status).toBe(200);
    const wh4Body = await wh4Retry.json();
    expect(wh4Body.processed).toBe(true);
    expect(wh4Body.accessAction).toBe('granted');
  });

  it('[DEF-005] synchronizes orders mirror on VIP & Personalizados webhooks (approval, cancellation, refund), handles out-of-order/orphan events cleanly', async () => {
    const email = createTestEmail('vip_sync');
    const bookingId = 'book_sync_qa_001';
    const mpVipId = '966000222';
    const futureIso = new Date(Date.now() + 60 * 60_000).toISOString();

    harness.tables.appointments.push({
      id: bookingId,
      public_token: 'tok_vip_sync_001',
      modality_id: 'chamada-vip-15',
      client_name: 'Cliente VIP Sync',
      client_instagram: email,
      client_contact: '+5511999999999',
      date_time: '2026-12-20T15:00:00.000Z',
      duration_minutes: 15,
      total_price: 200,
      status: 'aguardando_pagamento',
      payment: { status: 'pending', method: 'pix', amount: 200, transactionId: mpVipId },
      notes: JSON.stringify({
        modalityName: 'Chamada VIP 15 min',
        date: '2026-12-20',
        startTime: '15:00',
        endTime: '15:15',
        timezone: 'Europe/Dublin',
        clientName: 'Cliente VIP Sync',
        clientEmail: email,
        expiresAt: futureIso,
        meeting: { platform: 'google_meet', visibleToClient: false },
        history: [],
      }),
      expires_at: futureIso,
    });
    harness.tables.orders.push({
      id: bookingId,
      purchase_token: 'tok_vip_sync_001',
      pack_id: 'chamada-vip-15',
      amount: 200,
      status: 'pending',
      provider_payment_id: mpVipId,
      customer_email: email,
    });

    // 1. VIP cancellation -> payment.status MUST become 'rejected' (never 'pending'), orders mirror becomes 'cancelled'
    harness.mpPayments.set(mpVipId, {
      id: mpVipId,
      status: 'cancelled',
      transaction_amount: 200,
      currency_id: 'BRL',
      external_reference: `apt_${bookingId}`,
      payment_method_id: 'pix',
      date_last_updated: '2026-11-24T14:00:00Z',
    });
    const sigCancel = await signMercadoPagoWebhook({ dataId: mpVipId });
    const resCancel = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sigCancel.xSignature, 'x-request-id': sigCancel.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpVipId } }),
      }),
      env: env as any,
    });
    expect(resCancel.status).toBe(200);
    const vipRowCancel = harness.tables.appointments.find((a) => a.id === bookingId);
    expect(vipRowCancel?.payment?.status).toBe('rejected');
    expect(vipRowCancel?.status).toBe('cancelada');
    expect(harness.tables.orders.find((o) => o.id === bookingId)?.status).toBe('cancelled');

    // 2. VIP approval -> booking confirmed + orders mirror 'paid' -> refund -> both 'refunded'
    const bookingId2 = 'book_sync_qa_002';
    const mpVipId2 = '966000333';
    harness.tables.appointments.push({
      id: bookingId2,
      public_token: 'tok_vip_sync_002',
      modality_id: 'chamada-vip-15',
      client_name: 'Cliente VIP Aprovado',
      client_instagram: email,
      client_contact: '+5511999999999',
      date_time: '2026-12-21T15:00:00.000Z',
      duration_minutes: 15,
      total_price: 200,
      status: 'aguardando_pagamento',
      payment: { status: 'pending', method: 'pix', amount: 200, transactionId: mpVipId2 },
      notes: JSON.stringify({
        modalityName: 'Chamada VIP 15 min',
        date: '2026-12-21',
        startTime: '15:00',
        endTime: '15:15',
        timezone: 'Europe/Dublin',
        clientName: 'Cliente VIP Aprovado',
        clientEmail: email,
        expiresAt: futureIso,
        meeting: { platform: 'google_meet', visibleToClient: false },
        history: [],
      }),
      expires_at: futureIso,
    });
    harness.tables.orders.push({
      id: bookingId2,
      purchase_token: 'tok_vip_sync_002',
      pack_id: 'chamada-vip-15',
      amount: 200,
      status: 'pending',
      provider_payment_id: mpVipId2,
      customer_email: email,
    });
    harness.mpPayments.set(mpVipId2, {
      id: mpVipId2,
      status: 'approved',
      transaction_amount: 200,
      currency_id: 'BRL',
      external_reference: `apt_${bookingId2}`,
      payment_method_id: 'pix',
      date_approved: '2026-11-24T14:05:00Z',
      date_last_updated: '2026-11-24T14:05:00Z',
    });
    const sigApp = await signMercadoPagoWebhook({ dataId: mpVipId2 });
    await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sigApp.xSignature, 'x-request-id': sigApp.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpVipId2 } }),
      }),
      env: env as any,
    });
    expect(harness.tables.appointments.find((a) => a.id === bookingId2)?.status).toBe('confirmada');
    expect(harness.tables.orders.find((o) => o.id === bookingId2)?.status).toBe('paid');

    // Refund webhook synchronizes both appointment and orders mirror
    harness.mpPayments.get(mpVipId2)!.status = 'refunded';
    harness.mpPayments.get(mpVipId2)!.date_last_updated = '2026-11-24T14:10:00Z';
    const sigRef = await signMercadoPagoWebhook({ dataId: mpVipId2 });
    await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sigRef.xSignature, 'x-request-id': sigRef.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpVipId2 } }),
      }),
      env: env as any,
    });
    expect(harness.tables.appointments.find((a) => a.id === bookingId2)?.payment?.status).toBe('refunded');
    expect(harness.tables.orders.find((o) => o.id === bookingId2)?.status).toBe('refunded');

    // 3. Missing order (orphan external_reference) -> handled gracefully without crash
    const orphanMpId = '966000999';
    harness.mpPayments.set(orphanMpId, {
      id: orphanMpId,
      status: 'approved',
      transaction_amount: 99,
      currency_id: 'BRL',
      external_reference: 'ord_inexistente_999',
      payment_method_id: 'pix',
      date_last_updated: '2026-11-24T14:15:00Z',
    });
    const sigOrphan = await signMercadoPagoWebhook({ dataId: orphanMpId });
    const resOrphan = await mpWebhook({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sigOrphan.xSignature, 'x-request-id': sigOrphan.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: orphanMpId } }),
      }),
      env: env as any,
    });
    expect(resOrphan.status).toBe(200);
    expect((await resOrphan.json()).processed).toBe(false);
  });
});
