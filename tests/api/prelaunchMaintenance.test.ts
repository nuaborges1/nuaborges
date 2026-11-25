import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { onRequestPost as createPix } from '@/functions/api/payments/create-pix';
import { onRequestPost as createPersonalizado } from '@/functions/api/personalizados/create';
import { onRequestPost as reconcilePayments } from '@/functions/api/payments/reconcile';
import { onRequestPost as webhookMpV2 } from '@/functions/api/webhooks/mercadopago-v2';
import { onRequestPost as paymentStatus } from '@/functions/api/payments/status';
import { onRequestPost as cronHygiene } from '@/functions/api/cron/hygiene';
import {
  formatMercadoPagoExpiration,
  PACK_PIX_EXPIRATION_MS,
  PERSONALIZADO_PIX_EXPIRATION_MS,
} from '@/functions/api/_mercadopago';
import { evaluateEphemeralKvRecord } from '@/functions/api/cron/_hygiene';
import { bookingToSupabaseRow } from '@/functions/api/supabase/appointments';
import {
  claimOrderForProfile,
  getOrCreateProfileByEmail,
  listEntitlementsByProfile,
} from '@/functions/api/id/_nuaIdStore';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import { createTestEmail, TEST_SECRETS } from '../factories/domainFactories';

async function signMpWebhook(dataId: string, secret: string, requestId = 'req-qa-1') {
  const ts = String(Math.floor(Date.now() / 1000));
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(manifest));
  const hex = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  return { xSignature: `ts=${ts},v1=${hex}`, requestId };
}

function makeCronRequest(path: string, secret: string) {
  return new Request(`https://nuaborges.com.br${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': secret,
      Authorization: `Bearer ${secret}`,
    },
  });
}

describe('Manutenção Pré-Lançamento — Expiração Pix, Reconciliação Multi-Modalidade & Higiene Segura', () => {
  let harness: IsolatedBackendHarness;
  let env: Record<string, any>;

  beforeEach(() => {
    harness = new IsolatedBackendHarness();
    harness.installFetchInterceptor();
    env = harness.createEnv({
      CRON_SECRET: 'qa-cron-secret-strict-32-bytes-ok',
      MP_WEBHOOK_SECRET: TEST_SECRETS.MP_WEBHOOK_SECRET,
    });
  });

  afterEach(() => {
    harness.restoreFetch();
  });

  it('1. Pix pendente dentro do prazo: gera Pack com vencimento de 2h no formato MP e reconciliação não expira', async () => {
    const email = createTestEmail('pack-active');
    const beforeMs = Date.now();
    const res = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: email }),
      }),
      env,
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    const paymentId = String(created.paymentId);
    const mpFixture = harness.mpPayments.get(paymentId)!;

    // Formato exigido pela API do Mercado Pago: ISO-8601 com offset explícito (+00:00)
    expect(mpFixture.date_of_expiration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
    const expDelta = Date.parse(mpFixture.date_of_expiration!) - beforeMs;
    expect(expDelta).toBeGreaterThanOrEqual(PACK_PIX_EXPIRATION_MS - 10_000);
    expect(expDelta).toBeLessThanOrEqual(PACK_PIX_EXPIRATION_MS + 10_000);
    expect(Date.parse(created.expiresAt)).toBe(Date.parse(mpFixture.date_of_expiration!));

    // Reconciliação não deve cancelar nem alterar Pix ainda dentro do prazo
    const recRes = await reconcilePayments({ request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET), env });
    expect(recRes.status).toBe(200);
    const recBody = await recRes.json();
    expect(recBody.byModality.packs).toMatchObject({ checked: 1, reconciled: 0, expired: 0, errors: 0 });
    expect(harness.tables.orders[0].status).toBe('pending');
  });

  it('2. Pix vencido: reconciliação cancela no Mercado Pago e atualiza pedido local para cancelled sem enviar e-mail de revogação', async () => {
    const email = createTestEmail('pack-expired');
    const res = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: email }),
      }),
      env,
    });
    const created = await res.json();
    const paymentId = String(created.paymentId);

    // Simula Pix vencido no Mercado Pago
    const pastIso = formatMercadoPagoExpiration(Date.now() - 5 * 60_000);
    harness.mpPayments.get(paymentId)!.date_of_expiration = pastIso;
    harness.tables.orders[0].expires_at = new Date(Date.now() - 5 * 60_000).toISOString();

    const recRes = await reconcilePayments({ request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET), env });
    expect(recRes.status).toBe(200);
    const recBody = await recRes.json();
    expect(recBody.byModality.packs).toMatchObject({ checked: 1, reconciled: 1, expired: 1, errors: 0 });
    expect(harness.mpPayments.get(paymentId)!.status).toBe('cancelled');
    expect(harness.tables.orders[0].status).toBe('cancelled');
    // Pedido nunca pago expirado não deve disparar e-mail dizendo "acessos encerrados"
    expect(harness.emails.filter((e) => e.to === email)).toHaveLength(0);
  });

  it('3. Pagamento aprovado com webhook atrasado: reconciliação/webhook após vencimento confirma e concede acesso sem cancelar', async () => {
    const email = createTestEmail('delayed-webhook');
    const res = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: email }),
      }),
      env,
    });
    const created = await res.json();
    const paymentId = String(created.paymentId);

    // Cliente pagou 10 min antes do vencimento, mas a notificação só chega depois do vencimento
    const expiredAt = Date.now() - 2 * 60_000;
    const mp = harness.mpPayments.get(paymentId)!;
    mp.date_of_expiration = formatMercadoPagoExpiration(expiredAt);
    mp.status = 'approved';
    mp.date_approved = new Date(expiredAt - 10 * 60_000).toISOString();
    mp.date_last_updated = new Date().toISOString();
    harness.tables.orders[0].expires_at = new Date(expiredAt).toISOString();

    const recRes = await reconcilePayments({ request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET), env });
    expect(recRes.status).toBe(200);
    const recBody = await recRes.json();
    expect(recBody.byModality.packs).toMatchObject({ checked: 1, reconciled: 1, approved: 1, errors: 0 });
    expect(harness.tables.orders[0].status).toBe('paid');

    const profile = await getOrCreateProfileByEmail(env as any, email);
    const entitlements = await listEntitlementsByProfile(env as any, profile!.id);
    expect(entitlements.some((e) => e.orderRef === created.orderId && !e.revokedAt)).toBe(true);
  });

  it('4. Webhook duplicado: segunda entrega do mesmo pagamento é deduplicada sem efeitos colaterais', async () => {
    const email = createTestEmail('dup-webhook');
    const res = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: email }),
      }),
      env,
    });
    const created = await res.json();
    const paymentId = String(created.paymentId);
    const mp = harness.mpPayments.get(paymentId)!;
    mp.status = 'approved';
    mp.date_approved = new Date().toISOString();
    mp.date_last_updated = '2026-11-25T15:00:00.000Z';

    const sig = await signMpWebhook(paymentId, env.MP_WEBHOOK_SECRET);
    const makeHook = () =>
      webhookMpV2({
        request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago-v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': sig.xSignature,
            'x-request-id': sig.requestId,
          },
          body: JSON.stringify({ type: 'payment', data: { id: paymentId } }),
        }),
        env: env as any,
      });

    const first = await makeHook();
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ success: true, processed: true, financialStatus: 'paid' });
    const emailsAfterFirst = harness.emails.length;

    const second = await makeHook();
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ success: true, processed: false, duplicate: true });
    expect(harness.emails.length).toBe(emailsAfterFirst);
  });

  it('5. Falha temporária do Mercado Pago: nunca expira pedido nem libera reserva VIP', async () => {
    const email = createTestEmail('mp-outage');
    const res = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: email }),
      }),
      env,
    });
    const created = await res.json();
    const pastIso = new Date(Date.now() - 10 * 60_000).toISOString();
    harness.tables.orders[0].expires_at = pastIso;

    // Também cria reserva VIP com hold vencido e cobrança registrada
    const vipId = 'app_vip_outage_1';
    const vipPayId = '99000111';
    harness.mpPayments.set(vipPayId, {
      id: vipPayId,
      status: 'pending',
      transaction_amount: 250,
      currency_id: 'BRL',
      external_reference: `apt_${vipId}`,
      payment_method_id: 'pix',
      date_of_expiration: formatMercadoPagoExpiration(pastIso),
    });
    harness.tables.appointments.push(
      bookingToSupabaseRow({
        id: vipId,
        publicToken: 'tok_vip_outage',
        modalityId: 'chamada-30',
        modalityName: 'Chamada 30min',
        durationMinutes: 30,
        price: 250,
        date: '2026-12-01',
        startTime: '18:00',
        endTime: '18:30',
        timezone: 'America/Sao_Paulo',
        clientTimezone: 'America/Sao_Paulo',
        clientName: 'Cliente VIP',
        clientEmail: email,
        clientPhone: '+5511999999999',
        status: 'aguardando_pagamento',
        payment: { status: 'pending', method: 'pix', amount: 250, transactionId: vipPayId },
        meeting: { platform: 'google_meet', instructions: '', visibleToClient: false },
        history: [],
        expiresAt: pastIso,
        createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
      })
    );

    // Simula indisponibilidade da API do Mercado Pago
    harness.faults.mpGetDown = true;
    const recRes = await reconcilePayments({ request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET), env });
    expect(recRes.status).toBe(200);
    const recBody = await recRes.json();
    expect(recBody.byModality.packs.errors).toBe(1);
    expect(recBody.byModality.vip.errors).toBe(1);

    // Nenhum pedido expirado e nenhuma reserva liberada!
    expect(harness.tables.orders.find((o) => o.id === created.orderId)!.status).toBe('pending');
    expect(harness.tables.appointments.find((a) => a.id === vipId)!.status).toBe('aguardando_pagamento');
  });

  it('6. Reserva VIP não paga: só libera horário após expiração confirmada no Mercado Pago', async () => {
    const email = createTestEmail('vip-unpaid');
    const vipId = 'app_vip_unpaid_1';
    const vipPayId = '99000222';
    const pastIso = new Date(Date.now() - 5 * 60_000).toISOString();

    harness.mpPayments.set(vipPayId, {
      id: vipPayId,
      status: 'pending',
      transaction_amount: 300,
      currency_id: 'BRL',
      external_reference: `apt_${vipId}`,
      payment_method_id: 'pix',
      date_of_expiration: formatMercadoPagoExpiration(pastIso),
    });
    harness.tables.appointments.push(
      bookingToSupabaseRow({
        id: vipId,
        publicToken: 'tok_vip_unpaid',
        modalityId: 'chamada-30',
        modalityName: 'Chamada 30min',
        durationMinutes: 30,
        price: 300,
        date: '2026-12-02',
        startTime: '19:00',
        endTime: '19:30',
        timezone: 'America/Sao_Paulo',
        clientTimezone: 'America/Sao_Paulo',
        clientName: 'Cliente VIP Unpaid',
        clientEmail: email,
        clientPhone: '+5511999998888',
        status: 'aguardando_pagamento',
        payment: { status: 'pending', method: 'pix', amount: 300, transactionId: vipPayId },
        meeting: { platform: 'google_meet', instructions: '', visibleToClient: false },
        history: [],
        expiresAt: pastIso,
        createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
      })
    );
    harness.tables.orders.push({
      id: vipId,
      pack_id: 'chamada-30',
      amount: 300,
      status: 'pending',
      provider_payment_id: vipPayId,
      expires_at: pastIso,
      created_at: new Date(Date.now() - 30 * 60_000).toISOString(),
    });

    const recRes = await reconcilePayments({ request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET), env });
    expect(recRes.status).toBe(200);
    const recBody = await recRes.json();
    expect(recBody.byModality.vip).toMatchObject({ checked: 1, reconciled: 1, expired: 1, errors: 0 });
    expect(harness.mpPayments.get(vipPayId)!.status).toBe('cancelled');
    expect(harness.tables.appointments.find((a) => a.id === vipId)!.status).toBe('cancelada');
    expect(harness.tables.orders.find((o) => o.id === vipId)!.status).toBe('cancelled');
  });

  it('7. Reserva VIP paga antes do vencimento (mesmo com notificação/consulta atrasada): confirma sem estornar', async () => {
    const email = createTestEmail('vip-paid-ontime');
    const vipId = 'app_vip_paid_1';
    const vipPayId = '99000333';
    const holdExpiredMs = Date.now() - 3 * 60_000;
    const holdExpiredIso = new Date(holdExpiredMs).toISOString();
    const paidBeforeExpiryIso = new Date(holdExpiredMs - 5 * 60_000).toISOString();

    harness.mpPayments.set(vipPayId, {
      id: vipPayId,
      status: 'approved',
      transaction_amount: 300,
      currency_id: 'BRL',
      external_reference: `apt_${vipId}`,
      payment_method_id: 'pix',
      date_of_expiration: formatMercadoPagoExpiration(holdExpiredIso),
      date_approved: paidBeforeExpiryIso,
      date_last_updated: new Date().toISOString(),
    });
    harness.tables.appointments.push(
      bookingToSupabaseRow({
        id: vipId,
        publicToken: 'tok_vip_paid',
        modalityId: 'chamada-30',
        modalityName: 'Chamada 30min',
        durationMinutes: 30,
        price: 300,
        date: '2026-12-03',
        startTime: '20:00',
        endTime: '20:30',
        timezone: 'America/Sao_Paulo',
        clientTimezone: 'America/Sao_Paulo',
        clientName: 'Cliente VIP Pago',
        clientEmail: email,
        clientPhone: '+5511999997777',
        status: 'aguardando_pagamento',
        payment: { status: 'pending', method: 'pix', amount: 300, transactionId: vipPayId },
        meeting: { platform: 'google_meet', instructions: '', visibleToClient: false },
        history: [],
        expiresAt: holdExpiredIso,
        createdAt: new Date(holdExpiredMs - 15 * 60_000).toISOString(),
        updatedAt: new Date(holdExpiredMs - 15 * 60_000).toISOString(),
      })
    );
    harness.tables.orders.push({
      id: vipId,
      pack_id: 'chamada-30',
      amount: 300,
      status: 'pending',
      provider_payment_id: vipPayId,
      customer_email: email,
      expires_at: holdExpiredIso,
      created_at: new Date(holdExpiredMs - 15 * 60_000).toISOString(),
    });

    // Também testa consulta de status após vencimento de um pagamento aprovado antes do vencimento
    const statusRes = await paymentStatus({
      request: new Request('https://nuaborges.com.br/api/payments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: vipId }),
      }),
      env,
    });
    expect(statusRes.status).toBe(200);
    expect(await statusRes.json()).toMatchObject({ success: true, paid: true, status: 'approved' });
    expect(harness.mpRefunds).toHaveLength(0);
    expect(harness.tables.appointments.find((a) => a.id === vipId)!.status).toBe('confirmada');
    expect(harness.tables.orders.find((o) => o.id === vipId)!.status).toBe('paid');
  });

  it('8. Pedido Personalizado pendente e aprovado: cria com vencimento de 2h, mantém pendente no prazo e aprova via reconciliação', async () => {
    const email = createTestEmail('custom-order');
    const beforeMs = Date.now();
    const createRes = await createPersonalizado({
      request: new Request('https://nuaborges.com.br/api/personalizados/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: 'Cliente Personalizado',
          clientContact: email,
          deliveryChannel: 'vault',
          photoCount: 3,
          videoOptionId: 'vid_none',
          mentionName: false,
          express24h: false,
          briefing: 'Ensaio personalizado de teste com iluminação suave e acabamento artístico.',
          turnstileToken: 'qa-turnstile-token-valid-12345',
        }),
      }),
      env,
    });
    expect(createRes.status).toBe(201);
    const { order } = await createRes.json();
    const paymentId = String(order.payment.transactionId);
    const mpFixture = harness.mpPayments.get(paymentId)!;

    // Verifica prazo de 2h enviado no formato MP e persistido em personalizados_orders + orders
    expect(mpFixture.date_of_expiration).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
    const expDelta = Date.parse(mpFixture.date_of_expiration!) - beforeMs;
    expect(expDelta).toBeGreaterThanOrEqual(PERSONALIZADO_PIX_EXPIRATION_MS - 10_000);
    expect(expDelta).toBeLessThanOrEqual(PERSONALIZADO_PIX_EXPIRATION_MS + 10_000);
    expect(order.payment.expiresAt).toBeTruthy();
    expect(harness.tables.orders.find((o) => o.id === order.id)!.expires_at).toBeTruthy();

    // 8a. Enquanto pendente dentro do prazo, reconciliação mantém aguardando_pagamento
    const recPending = await reconcilePayments({
      request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET),
      env,
    });
    expect(recPending.status).toBe(200);
    expect((await recPending.json()).byModality.custom).toMatchObject({ checked: 1, reconciled: 0, errors: 0 });
    expect(harness.tables.personalizados_orders[0].status).toBe('aguardando_pagamento');

    // 8b. Aprovado no MP -> reconciliação promove para em_producao + orders=paid + entitlement
    mpFixture.status = 'approved';
    mpFixture.date_approved = new Date().toISOString();
    mpFixture.date_last_updated = new Date().toISOString();

    const recApproved = await reconcilePayments({
      request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET),
      env,
    });
    expect(recApproved.status).toBe(200);
    expect((await recApproved.json()).byModality.custom).toMatchObject({
      checked: 1,
      reconciled: 1,
      approved: 1,
      errors: 0,
    });
    expect(harness.tables.personalizados_orders[0].status).toBe('em_producao');
    expect(harness.tables.orders.find((o) => o.id === order.id)!.status).toBe('paid');
  });

  it('9. Reexecução concorrente do Cron: lock impede execução paralela duplicada em reconcile e hygiene', async () => {
    // 9a. Reconcile concorrente com lock já ativo
    harness.kv.set('nua_id:reconcile_lock', { owner: 'other-worker', until: Date.now() + 60_000 });
    const skippedReconcile = await reconcilePayments({
      request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET),
      env,
    });
    expect(skippedReconcile.status).toBe(200);
    expect(await skippedReconcile.json()).toMatchObject({ success: true, skipped: true, reason: 'already_running' });
    harness.kv.delete('nua_id:reconcile_lock');

    // 9b. Execução simultânea de dois crons de reconcile via Promise.all
    const [r1, r2] = await Promise.all([
      reconcilePayments({ request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET), env }),
      reconcilePayments({ request: makeCronRequest('/api/payments/reconcile', env.CRON_SECRET), env }),
    ]);
    const [b1, b2] = await Promise.all([r1.json(), r2.json()]);
    const skippedCount = [b1, b2].filter((b) => b.skipped === true).length;
    expect(skippedCount).toBe(1);

    // 9c. Execução simultânea + throttle diário de hygiene
    const [h1, h2] = await Promise.all([
      cronHygiene({ request: makeCronRequest('/api/cron/hygiene', env.CRON_SECRET), env }),
      cronHygiene({ request: makeCronRequest('/api/cron/hygiene', env.CRON_SECRET), env }),
    ]);
    const [hb1, hb2] = await Promise.all([h1.json(), h2.json()]);
    expect([hb1, hb2].filter((b) => b.skipped === true)).toHaveLength(1);

    // Nova chamada no mesmo dia deve ser pulada pelo intervalo diário
    const hSameDay = await cronHygiene({ request: makeCronRequest('/api/cron/hygiene', env.CRON_SECRET), env });
    expect(await hSameDay.json()).toMatchObject({
      success: true,
      skipped: true,
      reason: 'daily_interval_not_elapsed',
    });
  });

  it('10 e 11. Higiene diária: remove apenas OTPs, sessões e rate limits expirados e preserva registros válidos, protegidos e malformados', async () => {
    const now = Date.now();
    const expiredIso = new Date(now - 10 * 60_000).toISOString();
    const validIso = new Date(now + 30 * 60_000).toISOString();
    const oldAdminExpiredIso = new Date(now - 15 * 60_000).toISOString();
    const recentlyExpiredAdminIso = new Date(now - 60_000).toISOString(); // Dentro da margem de 5 min

    // --- Registros EXPIRADOS (devem ser removidos) ---
    harness.tables.site_content.push(
      {
        key: 'nua_id:otp:login:expirado@example.test',
        content: {
          purpose: 'login',
          emailNormalized: 'expirado@example.test',
          codeHash: 'a'.repeat(64),
          expiresAt: expiredIso,
        },
      },
      {
        key: 'nua_id:session:sess_expired_123456',
        content: {
          id: 'sess_expired_123456',
          profileId: 'prof_1',
          expiresAt: expiredIso,
        },
      },
      {
        key: 'nua_id:rl:otp_ip:expiredbucket',
        content: {
          timestamps: [now - 30 * 60_000],
          windowSeconds: 900,
        },
      },
      {
        key: 'nua_id:rl:legacy_old_bucket',
        content: {
          timestamps: [now - 26 * 60 * 60_000], // > 24h conservador
        },
      }
    );

    harness.tables.customer_sessions.push(
      { id: 'cs_expired', profile_id: 'prof_1', expires_at: expiredIso },
      { id: 'cs_valid', profile_id: 'prof_1', expires_at: validIso }
    );
    harness.tables.admin_sessions.push(
      { jti: 'adm_expired_safe', expires_at: oldAdminExpiredIso, revoked_at: null },
      { jti: 'adm_revoked_still_valid_jwt', expires_at: validIso, revoked_at: expiredIso },
      { jti: 'adm_within_safety_margin', expires_at: recentlyExpiredAdminIso, revoked_at: null }
    );

    // --- Registros VÁLIDOS, MALFORMADOS e PROTEGIDOS (DEVEM ser preservados!) ---
    harness.tables.site_content.push(
      {
        key: 'nua_id:otp:login:valido@example.test',
        content: {
          purpose: 'login',
          emailNormalized: 'valido@example.test',
          codeHash: 'b'.repeat(64),
          expiresAt: validIso,
        },
      },
      {
        // Prefixo parecido com OTP, mas formato inválido -> NUNCA excluir
        key: 'nua_id:otp:login:estranho@example.test',
        content: { customData: true, expiresAt: expiredIso },
      },
      {
        key: 'nua_id:session:sess_valid_123456',
        content: {
          id: 'sess_valid_123456',
          profileId: 'prof_1',
          expiresAt: validIso,
        },
      },
      {
        key: 'nua_id:rl:otp_ip:activebucket',
        content: {
          timestamps: [now - 60_000],
          windowSeconds: 900,
        },
      },
      {
        // Prefixo de RL mas com campo desconhecido -> NUNCA excluir
        key: 'nua_id:rl:unexpected_object',
        content: { timestamps: [], extraPayload: 'do_not_delete' },
      },
      { key: 'vault_credentials', content: [{ id: 'cred_1' }] },
      { key: 'nua_ai_conversation:conv_1', content: { messages: [] } },
      { key: 'nua_id:profile:prof_1', content: { id: 'prof_1', email: 'cliente@example.test' } },
      { key: 'nua_id:claim:ord_1', content: { orderRef: 'ord_1', profileId: 'prof_1' } },
      { key: 'nua_id:entitlement:ent_1', content: { id: 'ent_1', orderRef: 'ord_1' } }
    );
    harness.tables.content_backups.push({
      id: 1,
      content_key: 'private_admin_content',
      snapshot: { ok: true },
      created_at: new Date(now - 60 * 24 * 60 * 60_000).toISOString(),
    });
    harness.tables.orders.push({ id: 'ord_keep', pack_id: 'ensaio-qa', status: 'paid', amount: 89.9 });

    // Validação direta da função pura para prefixos protegidos
    expect(evaluateEphemeralKvRecord('nua_ai_proposal:123', { expiresAt: expiredIso }, now).eligible).toBe(false);
    expect(evaluateEphemeralKvRecord('nua_id:profile:abc', { expiresAt: expiredIso }, now).eligible).toBe(false);

    const res = await cronHygiene({ request: makeCronRequest('/api/cron/hygiene', env.CRON_SECRET), env });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.summary).toMatchObject({
      otps: { deleted: 1, skippedValid: 1, skippedInvalid: 1 },
      customerSessionsKv: { deleted: 1, skippedValid: 1, skippedInvalid: 0 },
      rateLimitsKv: { deleted: 2, skippedValid: 1, skippedInvalid: 1 },
      customerSessionsTable: { deleted: 1 },
      adminSessionsTable: { deleted: 1 },
      errors: 0,
    });

    const remainingKeys = new Set(harness.tables.site_content.map((r) => r.key));
    // Expirados removidos
    expect(remainingKeys.has('nua_id:otp:login:expirado@example.test')).toBe(false);
    expect(remainingKeys.has('nua_id:session:sess_expired_123456')).toBe(false);
    expect(remainingKeys.has('nua_id:rl:otp_ip:expiredbucket')).toBe(false);
    expect(remainingKeys.has('nua_id:rl:legacy_old_bucket')).toBe(false);

    // Válidos, malformados e protegidos preservados
    expect(remainingKeys.has('nua_id:otp:login:valido@example.test')).toBe(true);
    expect(remainingKeys.has('nua_id:otp:login:estranho@example.test')).toBe(true);
    expect(remainingKeys.has('nua_id:session:sess_valid_123456')).toBe(true);
    expect(remainingKeys.has('nua_id:rl:otp_ip:activebucket')).toBe(true);
    expect(remainingKeys.has('nua_id:rl:unexpected_object')).toBe(true);
    expect(remainingKeys.has('private_admin_content')).toBe(true);
    expect(remainingKeys.has('published_content')).toBe(true);
    expect(remainingKeys.has('vault_credentials')).toBe(true);
    expect(remainingKeys.has('nua_ai_conversation:conv_1')).toBe(true);
    expect(remainingKeys.has('nua_id:profile:prof_1')).toBe(true);
    expect(remainingKeys.has('nua_id:claim:ord_1')).toBe(true);
    expect(remainingKeys.has('nua_id:entitlement:ent_1')).toBe(true);

    // Tabelas relacionais preservadas
    expect(harness.tables.customer_sessions.map((s) => s.id)).toEqual(['cs_valid']);
    expect(harness.tables.admin_sessions.map((s) => s.jti)).toEqual([
      'adm_revoked_still_valid_jwt',
      'adm_within_safety_margin',
    ]);
    expect(harness.tables.content_backups).toHaveLength(1);
    expect(harness.tables.orders).toHaveLength(1);
  });
});
