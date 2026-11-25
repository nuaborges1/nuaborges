import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { onRequestPost as bookAppointment } from '@/functions/api/appointments/book';
import { onRequestPost as mpWebhook } from '@/functions/api/webhooks/mercadopago';
import { onRequestPost as cofreHandler } from '@/functions/api/me/cofre';
import { onRequestPost as requestOtp } from '@/functions/api/id/request-code';
import { onRequestPost as createPix } from '@/functions/api/payments/create-pix';
import {
  claimOrderForProfile,
  getOrCreateProfileByEmail,
  grantEntitlement,
} from '@/functions/api/id/_nuaIdStore';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import {
  createTestEmail,
  extractCookies,
  serializeCookieJar,
  signMercadoPagoWebhook,
} from '../factories/domainFactories';

describe('RELIABILITY — Concurrency Barriers, Idempotency & Fault Injection', () => {
  let harness: IsolatedBackendHarness;
  let env: Record<string, any>;

  beforeEach(() => {
    harness = new IsolatedBackendHarness();
    harness.installFetchInterceptor();
    env = harness.createEnv();

    // Ensure target future date (tomorrow + 3 days) is open across all weekdays
    const settingsRow = harness.tables.appointments_settings[0];
    for (let d = 0; d <= 6; d++) {
      settingsRow.settings.weeklyHours[d] = { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] };
    }
    settingsRow.settings.openMonths = [];
    settingsRow.settings.blockedDates = [];
  });

  afterEach(() => {
    harness.restoreFetch();
  });

  function getFutureDateString(daysAhead = 5): string {
    const dt = new Date(Date.now() + daysAhead * 86400 * 1000);
    return dt.toISOString().slice(0, 10);
  }

  it('CONCURRENCY — 5 simultaneous VIP bookings for the exact same slot result in strictly 1 reservation (201) and 4 conflicts (409)', async () => {
    const targetDate = getFutureDateString(5);
    const modalityId = harness.tables.appointments_settings[0].modalities[0].id;

    const attempts = Array.from({ length: 5 }, (_, idx) =>
      bookAppointment({
        request: new Request('https://nuaborges.com.br/api/appointments/book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': `198.51.100.${idx + 10}`,
          },
          body: JSON.stringify({
            modalityId,
            date: targetDate,
            startTime: '15:00',
            clientName: `Concorrente ${idx + 1}`,
            clientEmail: createTestEmail(`race_${idx}`),
            clientPhone: `+551199999000${idx}`,
            termsAccepted: true,
            turnstileToken: 'qa-turnstile-token-valid-12345',
          }),
        }),
        env,
      })
    );

    const responses = await Promise.all(attempts);
    const statuses = responses.map((r) => r.status);
    const created = statuses.filter((s) => s === 201);
    const conflicted = statuses.filter((s) => s === 409);

    expect(created).toHaveLength(1);
    expect(conflicted).toHaveLength(4);
    expect(harness.tables.appointments).toHaveLength(1);
  });

  it('CONCURRENCY — parallel duplicate Mercado Pago webhooks grant entitlement once and send strictly 1 Vault email', async () => {
    const email = createTestEmail('race_wh');
    const profile = await getOrCreateProfileByEmail(env as any, email, 'Cliente Concorrência');
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

    const mpId = String(pix.paymentId);
    const mpObj = harness.mpPayments.get(mpId)!;
    mpObj.status = 'approved';
    mpObj.date_approved = '2026-11-24T13:00:00Z';
    mpObj.date_last_updated = '2026-11-24T13:00:00Z';
    const sig = await signMercadoPagoWebhook({ dataId: mpId });

    const burst = Array.from({ length: 4 }, () =>
      mpWebhook({
        request: new Request('https://nuaborges.com.br/api/webhooks/mercadopago', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': sig.xSignature,
            'x-request-id': sig.xRequestId,
          },
          body: JSON.stringify({ type: 'payment', data: { id: mpId } }),
        }),
        env: env as any,
      })
    );

    const results = await Promise.all(burst.map((p) => p.then((r) => r.json())));
    const processedCount = results.filter((r) => r.processed === true).length;
    expect(processedCount).toBe(1);
    expect(harness.emails.filter((e) => e.to === email)).toHaveLength(1);
  });

  it('CONCURRENCY — parallel Vault browser confirmation replays allow strictly 1 confirmation (single-use token)', async () => {
    const email = createTestEmail('race_vault');
    const profile = await getOrCreateProfileByEmail(env as any, email, 'Cofre Race');
    const orderId = 'ord_race_vault_1';
    harness.tables.orders.push({
      id: orderId,
      purchase_token: 'tok_race_vault_1',
      pack_id: 'ensaio-qa',
      amount: 89.9,
      status: 'paid',
      customer_email: email,
    });
    await claimOrderForProfile(env as any, orderId, profile!.id, 'checkout_authenticated');
    await grantEntitlement(env as any, {
      profileId: profile!.id,
      orderRef: orderId,
      kind: 'pack',
      resourceId: 'ensaio-qa',
      title: 'Ensaio Exclusivo QA',
      expiresAt: null,
      allowDownload: false,
    });

    const reqRes = await cofreHandler({
      request: new Request('https://nuaborges.com.br/api/me/cofre', {
        method: 'POST',
        headers: { Origin: 'https://nuaborges.com.br', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', order: orderId }),
      }),
      env: env as any,
    });
    const pendingCookie = serializeCookieJar(extractCookies(reqRes.headers));
    const mail = harness.emails.find((e) => e.to === email && e.html.includes('confirm='));
    const token = mail!.html.match(/confirm=([a-f0-9-]{20,})/i)![1];

    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        cofreHandler({
          request: new Request('https://nuaborges.com.br/api/me/cofre', {
            method: 'POST',
            headers: {
              Origin: 'https://nuaborges.com.br',
              'Content-Type': 'application/json',
              Cookie: pendingCookie,
            },
            body: JSON.stringify({ action: 'confirm', order: orderId, token }),
          }),
          env: env as any,
        })
      )
    );

    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 403)).toHaveLength(3);
  });

  it('FAULT INJECTION — handles Mercado Pago outage (503), Supabase outage (500), and SMTP outage (503) without false success', async () => {
    // 1. Mercado Pago create outage on VIP booking -> 503, reservation recorded with failure audit note
    harness.faults.mpCreateDown = true;
    const modalityId = harness.tables.appointments_settings[0].modalities[0].id;
    const mpDownRes = await bookAppointment({
      request: new Request('https://nuaborges.com.br/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.77' },
        body: JSON.stringify({
          modalityId,
          date: getFutureDateString(6),
          startTime: '16:00',
          clientName: 'Cliente Falha MP',
          clientEmail: createTestEmail('mpfail'),
          clientPhone: '+5511977777777',
          termsAccepted: true,
          turnstileToken: 'qa-turnstile-token-valid-12345',
        }),
      }),
      env,
    });
    expect(mpDownRes.status).toBe(503);
    harness.faults.mpCreateDown = false;

    // 2. SMTP outage during OTP -> 503 (never lies that email was sent)
    harness.faults.emailDown = true;
    const smtpDownRes = await requestOtp({
      request: new Request('https://nuaborges.com.br/api/id/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.88' },
        body: JSON.stringify({ email: createTestEmail('smtpfail'), turnstileToken: 'qa-turnstile-token-valid-12345' }),
      }),
      env: env as any,
    });
    expect(smtpDownRes.status).toBe(503);
    harness.faults.emailDown = false;

    // 3. Supabase outage during create-pix -> fail-closed (>= 400, never returns 201 or false success)
    harness.faults.supabaseDown = true;
    const dbDownRes = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.99' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: createTestEmail('dbfail') }),
      }),
      env,
    });
    expect(dbDownRes.status).toBeGreaterThanOrEqual(400);
    expect(harness.tables.orders).toHaveLength(0);
    harness.faults.supabaseDown = false;
  });
});
