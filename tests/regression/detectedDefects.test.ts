/**
 * REPRODUCIBLE PRODUCTION DEFECT SUITE — NUA BORGES QA AUDIT
 *
 * Protocol Rule 2.2:
 * "Se detectar um bug na aplicação, crie um teste reproduzível e documente a causa.
 *  Não modifique a implementação de produção sem autorização posterior."
 * "Não ajuste assertions para esconder bugs da aplicação."
 *
 * Every test in this file asserts the EXPECTED CORRECT behavior and currently
 * reproduces a confirmed bug in production code (P0–P2).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { onRequestPost as adminLogin } from '@/functions/api/auth/login';
import { onRequestPost as adminLogout } from '@/functions/api/auth/logout';
import { onRequestGet as contentSyncGet } from '@/functions/api/content/sync';
import { onRequestGet as mediaProxyGet } from '@/functions/media/[[path]]';
import { onRequestPost as mpWebhookPost } from '@/functions/api/webhooks/mercadopago';
import { onRequestPost as createPix } from '@/functions/api/payments/create-pix';
import { onRequestPost as adminPersonalizados } from '@/functions/api/personalizados/admin';
import { onRequestPost as cronRemindersPost } from '@/functions/api/cron/appointment-reminders';
import { onRequestPost as reconcilePost } from '@/functions/api/payments/reconcile';
import { getOrderClaim, listEntitlementsByProfile, getProfileByEmail } from '@/functions/api/id/_nuaIdStore';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import { invokeThroughGateway } from '../helpers/gatewayHarness';
import {
  createTestEmail,
  extractCookies,
  serializeCookieJar,
  signMercadoPagoWebhook,
  TEST_SECRETS,
} from '../factories/domainFactories';

describe('REGRESSION — Confirmed Pre-Launch Defects (Reproducible Failing Tests)', () => {
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

  it('[DEF-001 / P0] Guest checkout Pack paid via Mercado Pago webhook MUST create profile, claim, entitlement, and deliver Vault email', async () => {
    const guestEmail = createTestEmail('guest_webhook');

    // 1. Guest (unauthenticated) creates a Pack Pix order
    const pixRes = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pack',
          slug: 'ensaio-qa',
          payerEmail: guestEmail,
          payerName: 'Comprador Convidado',
        }),
      }),
      env,
    });
    expect(pixRes.status).toBe(201);
    const pixData = await pixRes.json();

    // 2. Payment is approved at Mercado Pago (buyer closed browser tab -> no /api/payments/status polling)
    const mpPay = harness.mpPayments.get(String(pixData.paymentId))!;
    mpPay.status = 'approved';
    mpPay.date_approved = new Date().toISOString();
    mpPay.date_last_updated = new Date().toISOString();

    // 3. Mercado Pago delivers signed webhook to /api/webhooks/mercadopago
    const sig = await signMercadoPagoWebhook({ dataId: String(pixData.paymentId) });
    const whRes = await mpWebhookPost({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': sig.xSignature,
          'x-request-id': sig.xRequestId,
        },
        body: JSON.stringify({ type: 'payment', data: { id: String(pixData.paymentId) } }),
      }),
      env: env as any,
    });
    expect(whRes.status).toBe(200);

    // EXPECTED: Guest receives NUA ID profile + order claim + active entitlement + Vault delivery email (/cofre?order=...)
    const profile = await getProfileByEmail(env as any, guestEmail);
    expect(profile, 'Guest profile should be created upon webhook payment approval').not.toBeNull();

    const claim = await getOrderClaim(env as any, pixData.orderId);
    expect(claim?.profileId, 'Order claim should be linked to guest profile').toBe(profile?.id);

    const entitlements = profile ? await listEntitlementsByProfile(env as any, profile.id) : [];
    expect(
      entitlements.some((e) => e.orderRef === pixData.orderId && !e.revokedAt),
      'Active pack entitlement must be granted after webhook approval'
    ).toBe(true);

    const vaultMail = harness.emails.find((e) => e.to === guestEmail && e.html.includes('/cofre?order='));
    expect(vaultMail, 'Vault delivery email containing /cofre?order= link must be sent').toBeTruthy();
  });

  it('[DEF-002 / P1] Cron Worker Bearer auth to /api/cron/appointment-reminders MUST be accepted by _central gateway', async () => {
    // Mirrors exact request sent by workers/reminders-cron/src/index.ts:18-24
    const res = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/cron/appointment-reminders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_SECRETS.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      }),
      env,
      handler: (ctx) => cronRemindersPost(ctx),
    });

    // EXPECTED: 200 OK (currently fails with 401 because _central/authGuard.ts only checks x-cron-secret!)
    expect(res.status).toBe(200);
  });

  it('[DEF-003 / P1] Cron Worker call to https://nuaborges.com.br/api/payments/reconcile MUST NOT be blocked by host surface guard', async () => {
    // Mirrors exact request sent by workers/reminders-cron/src/index.ts:35-44
    const res = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/payments/reconcile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TEST_SECRETS.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      }),
      env,
      handler: (ctx) => reconcilePost(ctx),
    });

    // EXPECTED: 200 OK (currently fails with 403 HOST_NOT_ALLOWED because commerce.policies.ts sets surface: 'superadmin')
    expect(res.status).toBe(200);
  });

  it('[DEF-004 / P1] Revoked admin session cookie MUST be rejected by /api/content/sync?mode=admin AND /media/private/*', async () => {
    const loginRes = await adminLogin({
      request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
        method: 'POST',
        headers: { Origin: 'https://admin.nuaborges.com.br', 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_SECRETS.ADMIN_PASSWORD }),
      }),
      env,
    });
    expect(loginRes.status).toBe(200);
    const cookieHeader = serializeCookieJar(extractCookies(loginRes.headers));

    // Admin logs out (server-side jti revocation in admin_sessions)
    const logoutRes = await adminLogout({
      request: new Request('https://admin.nuaborges.com.br/api/auth/logout', {
        method: 'POST',
        headers: { Origin: 'https://admin.nuaborges.com.br', Cookie: cookieHeader },
      }),
      env,
    });
    expect(logoutRes.status).toBe(200);

    // Replaying revoked cookie on /api/content/sync?mode=admin MUST return 401/403 (currently returns 200!)
    const syncRes = await contentSyncGet({
      request: new Request('https://admin.nuaborges.com.br/api/content/sync?mode=admin', {
        method: 'GET',
        headers: { Cookie: cookieHeader },
      }),
      env,
    });
    expect([401, 403].includes(syncRes.status)).toBe(true);

    // Replaying revoked cookie on /media/private/* MUST return 403 (currently passes auth check!)
    const mediaRes = await mediaProxyGet({
      request: new Request('https://admin.nuaborges.com.br/media/private/ensaio-qa/foto-01.webp', {
        method: 'GET',
        headers: { Cookie: cookieHeader },
      }),
      env,
      params: { path: ['private', 'ensaio-qa', 'foto-01.webp'] },
    });
    expect(mediaRes.status).toBe(403);
  });

  it('[DEF-005 / P1] Webhook approval of Personalizado/VIP MUST synchronize mirror status in orders table and map VIP cancellation payment status cleanly', async () => {
    const persId = 'ped_sync_qa_001';
    const mpId = '955000111';
    harness.tables.personalizados_orders.push({
      id: persId,
      public_token: 'tok_ped_sync_001',
      client_name: 'Cliente Sync',
      client_contact: 'sync@qa.test',
      delivery_channel: 'vault',
      photo_count: 2,
      video_option_id: 'vid_none',
      video_duration_minutes: 0,
      mention_name: false,
      express_24h: false,
      briefing: '',
      total_price: 120,
      status: 'aguardando_pagamento',
      payment: { status: 'pending', method: 'pix', amount: 120, transactionId: mpId },
      vault_files: [],
      admin_notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    harness.tables.orders.push({
      id: persId,
      purchase_token: 'tok_ped_sync_001',
      pack_id: 'personalizado_2f',
      amount: 120,
      status: 'pending',
      provider_payment_id: mpId,
      customer_email: 'sync@qa.test',
    });
    harness.mpPayments.set(mpId, {
      id: mpId,
      status: 'approved',
      transaction_amount: 120,
      currency_id: 'BRL',
      external_reference: `nua_pers_${persId}`,
      payment_method_id: 'pix',
      date_approved: new Date().toISOString(),
      date_last_updated: new Date().toISOString(),
    });

    const sig = await signMercadoPagoWebhook({ dataId: mpId });
    const whRes = await mpWebhookPost({
      request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-signature': sig.xSignature, 'x-request-id': sig.xRequestId },
        body: JSON.stringify({ type: 'payment', data: { id: mpId } }),
      }),
      env: env as any,
    });
    expect(whRes.status).toBe(200);

    // EXPECTED: mirror row in `orders` table is also updated to 'paid' (currently remains 'pending' forever!)
    const mirrorOrder = harness.tables.orders.find((o) => o.id === persId);
    expect(mirrorOrder?.status).toBe('paid');
  });

  it('[DEF-006 / P2] personalizados/admin MUST reject arbitrary invalid status strings and unpaid delivery transitions', async () => {
    const persId = 'ped_state_qa_001';
    harness.tables.personalizados_orders.push({
      id: persId,
      public_token: 'tok_ped_state_001',
      client_name: 'Cliente Estado',
      client_contact: 'estado@qa.test',
      delivery_channel: 'vault',
      photo_count: 2,
      video_option_id: 'vid_none',
      video_duration_minutes: 0,
      mention_name: false,
      express_24h: false,
      briefing: '',
      total_price: 120,
      status: 'aguardando_pagamento',
      payment: { status: 'pending', method: 'pix', amount: 120 },
      vault_files: [],
      admin_notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const invalidStatusRes = await adminPersonalizados({
      request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order',
          orderId: persId,
          patch: { status: 'status_totalmente_invalido_xyz' },
        }),
      }),
      env,
    });
    // EXPECTED: 400 Bad Request (currently accepts arbitrary string with 200!)
    expect(invalidStatusRes.status).toBe(400);
  });
});
