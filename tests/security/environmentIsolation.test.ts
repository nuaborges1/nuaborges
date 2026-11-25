import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveRuntimeEnvironment,
  resolveValidatedMercadoPagoWebhookUrl,
  assertMercadoPagoEnvironmentSafety,
} from '@/functions/api/_central/environment';
import {
  createMercadoPagoPix,
  getMercadoPagoPayment,
  cancelExpiredMercadoPagoPix,
  refundMercadoPagoPayment,
  resetMercadoPagoSandboxCacheForTests,
} from '@/functions/api/_mercadopago';
import { onRequestPost as createPix } from '@/functions/api/payments/create-pix';
import { onRequestPost as createPersonalizado } from '@/functions/api/personalizados/create';
import { onRequestPost as bookAppointment } from '@/functions/api/appointments/book';
import remindersCronWorker, { validateCronWorkerTargetUrl } from '@/workers/reminders-cron/src/index';
import {
  validateStagingConfig,
  runHomologation,
  sanitizeLogText,
} from '@/scripts/qa-staging-homologation.mjs';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import { createTestEmail, TEST_SECRETS } from '../factories/domainFactories';

describe('SECURITY — Wave 0 Environment Isolation (Staging vs Production)', () => {
  let harness: IsolatedBackendHarness;
  let env: Record<string, any>;

  beforeEach(() => {
    resetMercadoPagoSandboxCacheForTests();
    harness = new IsolatedBackendHarness();
    harness.installFetchInterceptor();
    env = harness.createEnv();
  });

  afterEach(() => {
    harness.restoreFetch();
  });

  it('classifies runtime environments explicitly and resolves validated webhook URLs without staging->production fallback', () => {
    expect(resolveRuntimeEnvironment({ ENVIRONMENT: 'staging' })).toBe('staging');
    expect(resolveRuntimeEnvironment({ ENVIRONMENT: 'production' })).toBe('production');
    expect(resolveRuntimeEnvironment({ ENVIRONMENT: 'development' })).toBe('development');
    expect(resolveRuntimeEnvironment({ ENVIRONMENT: 'test' })).toBe('test');

    // Valid staging webhook URL from MP_WEBHOOK_URL or NEXT_PUBLIC_SITE_URL
    expect(
      resolveValidatedMercadoPagoWebhookUrl({
        ENVIRONMENT: 'staging',
        MP_WEBHOOK_URL: 'https://staging.nuaborges.pages.dev/api/webhooks/mercadopago',
      })
    ).toBe('https://staging.nuaborges.pages.dev/api/webhooks/mercadopago');

    expect(
      resolveValidatedMercadoPagoWebhookUrl({
        ENVIRONMENT: 'staging',
        NEXT_PUBLIC_SITE_URL: 'https://homolog.nuaborges.com.br',
      })
    ).toBe('https://homolog.nuaborges.com.br/api/webhooks/mercadopago');

    // NEGATIVE: Staging missing webhook configuration MUST throw (NO fallback to nuaborges.com.br!)
    expect(() => resolveValidatedMercadoPagoWebhookUrl({ ENVIRONMENT: 'staging' })).toThrow(/ENV_ISOLATION/);

    // NEGATIVE: Staging pointing to production webhook URL MUST throw
    expect(() =>
      resolveValidatedMercadoPagoWebhookUrl({
        ENVIRONMENT: 'staging',
        MP_WEBHOOK_URL: 'https://nuaborges.com.br/api/webhooks/mercadopago',
      })
    ).toThrow(/ENV_ISOLATION/);

    expect(() =>
      resolveValidatedMercadoPagoWebhookUrl({
        ENVIRONMENT: 'staging',
        NEXT_PUBLIC_SITE_URL: 'https://nuaborges.com.br',
      })
    ).toThrow(/ENV_ISOLATION/);

    // NEGATIVE: Staging non-HTTPS, external host, or wrong path MUST throw
    expect(() =>
      resolveValidatedMercadoPagoWebhookUrl({
        ENVIRONMENT: 'staging',
        MP_WEBHOOK_URL: 'http://staging.nuaborges.pages.dev/api/webhooks/mercadopago',
      })
    ).toThrow(/HTTPS/);

    expect(() =>
      resolveValidatedMercadoPagoWebhookUrl({
        ENVIRONMENT: 'staging',
        MP_WEBHOOK_URL: 'https://attacker.example.com/api/webhooks/mercadopago',
      })
    ).toThrow(/ENV_ISOLATION/);

    expect(() =>
      resolveValidatedMercadoPagoWebhookUrl({
        ENVIRONMENT: 'staging',
        MP_WEBHOOK_URL: 'https://staging.nuaborges.pages.dev/api/other/route',
      })
    ).toThrow(/ENV_ISOLATION/);

    // NEGATIVE: Production MUST reject staging/preview webhook URLs
    expect(() =>
      resolveValidatedMercadoPagoWebhookUrl({
        ENVIRONMENT: 'production',
        MP_WEBHOOK_URL: 'https://staging.nuaborges.pages.dev/api/webhooks/mercadopago',
      })
    ).toThrow(/ENV_ISOLATION/);

    expect(
      resolveValidatedMercadoPagoWebhookUrl({
        ENVIRONMENT: 'production',
        NEXT_PUBLIC_SITE_URL: 'https://nuaborges.com.br',
      })
    ).toBe('https://nuaborges.com.br/api/webhooks/mercadopago');
  });

  it('NEGATIVE: Staging blocks production Mercado Pago credentials (APP_USR-) and missing MP_WEBHOOK_SECRET across all MP operations', async () => {
    const stagingWithProdToken = {
      ENVIRONMENT: 'staging',
      NEXT_PUBLIC_SITE_URL: 'https://staging.nuaborges.pages.dev',
      MP_WEBHOOK_SECRET: TEST_SECRETS.MP_WEBHOOK_SECRET,
      MP_ACCESS_TOKEN: 'APP_USR-1234567890123456-000000-production-token',
    };

    expect(() => assertMercadoPagoEnvironmentSafety(stagingWithProdToken, stagingWithProdToken.MP_ACCESS_TOKEN)).toThrow(
      /ENV_ISOLATION/
    );

    await expect(
      createMercadoPagoPix(stagingWithProdToken, {
        amount: 50,
        description: 'Teste Isolamento',
        externalReference: 'ord_iso_1',
      })
    ).rejects.toThrow(/ENV_ISOLATION/);

    await expect(getMercadoPagoPayment(stagingWithProdToken, '123456')).rejects.toThrow(/ENV_ISOLATION/);
    expect(await cancelExpiredMercadoPagoPix(stagingWithProdToken, '123456')).toBe(false);
    const refRes = await refundMercadoPagoPayment(stagingWithProdToken, '123456', 'ord_iso_1');
    expect(refRes.success).toBe(false);
    expect(refRes.error?.includes('ENV_ISOLATION')).toBe(true);

    // NEGATIVE: Staging missing MP_WEBHOOK_SECRET blocks charge creation
    const stagingMissingWhSecret = {
      ENVIRONMENT: 'staging',
      NEXT_PUBLIC_SITE_URL: 'https://staging.nuaborges.pages.dev',
      MP_ACCESS_TOKEN: TEST_SECRETS.MP_ACCESS_TOKEN,
      MP_WEBHOOK_SECRET: '',
    };
    await expect(
      createMercadoPagoPix(stagingMissingWhSecret, {
        amount: 50,
        description: 'Sem webhook secret',
        externalReference: 'ord_iso_2',
      })
    ).rejects.toThrow(/MP_WEBHOOK_SECRET/);
  });

  it('supports legitimate Mercado Pago Test User APP_USR- credentials ONLY when MP_SANDBOX_MODE=true AND /users/me confirms tag test_user, while blocking real production APP_USR- accounts', async () => {
    const baseStagingEnv = {
      ...env,
      ENVIRONMENT: 'staging',
      MP_SANDBOX_MODE: 'true',
      NEXT_PUBLIC_SITE_URL: 'https://nuaborges-staging.pages.dev',
      MP_WEBHOOK_URL: 'https://nuaborges-staging.pages.dev/api/webhooks/mercadopago',
      MP_WEBHOOK_SECRET: TEST_SECRETS.MP_WEBHOOK_SECRET,
    };

    const origFetch = globalThis.fetch;
    let paymentPostAttempts = 0;

    // 1. NEGATIVE: Real production account (APP_USR- with MP_SANDBOX_MODE=true, but /users/me lacks "test_user" tag) -> MUST BLOCK BEFORE POST /v1/payments!
    globalThis.fetch = async (input: any, init?: any) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr.includes('api.mercadopago.com/users/me')) {
        return new Response(
          JSON.stringify({ id: 999888777, nickname: 'NUA_PROD_REAL', tags: ['normal'] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('api.mercadopago.com/v1/payments') && init?.method === 'POST') {
        paymentPostAttempts += 1;
      }
      return origFetch(input, init);
    };

    try {
      await expect(
        createMercadoPagoPix(
          { ...baseStagingEnv, MP_ACCESS_TOKEN: 'APP_USR-real-prod-account-token' },
          { amount: 10, description: 'Prod account leak test', externalReference: 'ord_prod_leak' }
        )
      ).rejects.toThrow(/test_user/);
      expect(paymentPostAttempts).toBe(0);

      // 2. POSITIVE: Legitimate Mercado Pago Test User (APP_USR- with MP_SANDBOX_MODE=true AND /users/me returns tags: ["test_user"]) -> ALLOWED!
      resetMercadoPagoSandboxCacheForTests();
      globalThis.fetch = async (input: any, init?: any) => {
        const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (urlStr.includes('api.mercadopago.com/users/me')) {
          return new Response(
            JSON.stringify({ id: 111222333, nickname: 'TESTUSER_NUA', tags: ['test_user', 'normal'] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return origFetch(input, init);
      };

      const okRes = await createMercadoPagoPix(
        {
          ...baseStagingEnv,
          MP_ACCESS_TOKEN: 'APP_USR-valid-test-user-token',
          MP_TEST_USER_ACCOUNT_ID: '111222333',
        },
        { amount: 10, description: 'Valid Test User charge', externalReference: 'ord_test_user_ok' }
      );
      expect(okRes.success).toBe(true);
      expect(okRes.isTestMode).toBe(true);

      // Config validator also accepts APP_USR- ONLY when MP_SANDBOX_MODE=true
      const validCfg = validateStagingConfig({
        ENVIRONMENT: 'staging',
        STAGING_SITE_URL: 'https://nuaborges-staging.pages.dev',
        MP_ACCESS_TOKEN: 'APP_USR-valid-test-user-token',
        MP_SANDBOX_MODE: 'true',
        MP_WEBHOOK_SECRET: TEST_SECRETS.MP_WEBHOOK_SECRET,
      });
      expect(validCfg.ok).toBe(true);
      expect(validCfg.capabilities.mercadoPagoSandbox).toBe(true);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('ignores client/caller-supplied notificationUrl and enforces staging webhook URL uniformly across Pack, Personalizado, and VIP', async () => {
    const stagingEnv = {
      ...env,
      ENVIRONMENT: 'staging',
      NEXT_PUBLIC_SITE_URL: 'https://staging.nuaborges.pages.dev',
      MP_WEBHOOK_URL: 'https://staging.nuaborges.pages.dev/api/webhooks/mercadopago',
      MP_ACCESS_TOKEN: TEST_SECRETS.MP_ACCESS_TOKEN,
      MP_WEBHOOK_SECRET: TEST_SECRETS.MP_WEBHOOK_SECRET,
    };

    const capturedUrls: string[] = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (input: any, init?: any) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (urlStr.includes('api.mercadopago.com/v1/payments') && init?.method === 'POST') {
        const parsed = JSON.parse(String(init.body || '{}'));
        capturedUrls.push(String(parsed.notification_url || ''));
      }
      return origFetch(input, init);
    };

    try {
      // Even if caller passes a malicious/production notificationUrl option, it MUST be ignored
      await createMercadoPagoPix(stagingEnv, {
        amount: 25,
        description: 'Direct check',
        externalReference: 'ord_direct_1',
        notificationUrl: 'https://nuaborges.com.br/api/webhooks/mercadopago',
      });

      // Pack via create-pix
      const packRes = await createPix({
        request: new Request('https://staging.nuaborges.pages.dev/api/payments/create-pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: createTestEmail('stg_pack') }),
        }),
        env: stagingEnv,
      });
      expect(packRes.status).toBe(201);

      // Personalizado via personalizados/create
      const persRes = await createPersonalizado({
        request: new Request('https://staging.nuaborges.pages.dev/api/personalizados/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: 'Cliente Staging',
            clientContact: createTestEmail('stg_pers'),
            deliveryChannel: 'vault',
            photoCount: 3,
            videoOptionId: 'vid_none',
            mentionName: false,
            express24h: false,
            briefing: 'Briefing staging',
            turnstileToken: '1x00000000000000000000AA',
          }),
        }),
        env: stagingEnv,
      });
      expect(persRes.status).toBe(201);

      // VIP via appointments/book
      const settingsRow = harness.tables.appointments_settings[0];
      for (let d = 0; d <= 6; d++) {
        settingsRow.settings.weeklyHours[d] = { enabled: true, ranges: [{ start: '14:00', end: '22:00' }] };
      }
      settingsRow.settings.openMonths = [];
      settingsRow.settings.blockedDates = [];
      const vipModalityId = settingsRow.modalities[0].id;
      const vipDate = new Date(Date.now() + 5 * 86400 * 1000).toISOString().slice(0, 10);

      const vipRes = await bookAppointment({
        request: new Request('https://staging.nuaborges.pages.dev/api/appointments/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.77' },
          body: JSON.stringify({
            modalityId: vipModalityId,
            date: vipDate,
            startTime: '15:00',
            clientName: 'Cliente VIP Staging',
            clientEmail: createTestEmail('stg_vip'),
            clientPhone: '+5511999999999',
            termsAccepted: true,
            turnstileToken: '1x00000000000000000000AA',
          }),
        }),
        env: stagingEnv,
      });
      expect(vipRes.status).toBe(201);

      // ALL 4 charges MUST carry the exact validated staging webhook URL (ZERO production URLs!)
      expect(capturedUrls).toHaveLength(4);
      for (const u of capturedUrls) {
        expect(u).toBe('https://staging.nuaborges.pages.dev/api/webhooks/mercadopago');
      }

      // NEGATIVE: Misconfigured staging (pointing to production URL) blocks Pack creation safely
      const brokenStagingEnv = {
        ...stagingEnv,
        NEXT_PUBLIC_SITE_URL: 'https://nuaborges.com.br',
        MP_WEBHOOK_URL: '',
      };
      const blockedPack = await createPix({
        request: new Request('https://staging.nuaborges.pages.dev/api/payments/create-pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: createTestEmail('stg_blocked') }),
        }),
        env: brokenStagingEnv,
      });
      expect(blockedPack.status).toBeGreaterThanOrEqual(500);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('NEGATIVE: Staging Cron Worker blocks production URLs, missing target URLs, and missing CRON_SECRET; wrangler.toml isolates [env.staging]', async () => {
    // Direct URL validator checks
    expect(() =>
      validateCronWorkerTargetUrl(
        'https://nuaborges.com.br/api/cron/appointment-reminders',
        'staging',
        '/api/cron/appointment-reminders'
      )
    ).toThrow(/ENV_ISOLATION/);

    expect(() =>
      validateCronWorkerTargetUrl(
        'https://nuaborges.com.br/api/payments/reconcile',
        'staging',
        '/api/payments/reconcile'
      )
    ).toThrow(/ENV_ISOLATION/);

    expect(() =>
      validateCronWorkerTargetUrl(undefined, 'staging', '/api/cron/appointment-reminders')
    ).toThrow(/ENV_ISOLATION/);

    expect(() =>
      validateCronWorkerTargetUrl(
        'https://staging.nuaborges.pages.dev/api/cron/appointment-reminders',
        'production',
        '/api/cron/appointment-reminders'
      )
    ).toThrow(/ENV_ISOLATION/);

    // Scheduled execution with staging pointing to production -> MUST throw BEFORE fetch
    await expect(
      remindersCronWorker.scheduled(
        {},
        {
          ENVIRONMENT: 'staging',
          CRON_SECRET: TEST_SECRETS.CRON_SECRET,
          REMINDERS_TARGET_URL: 'https://nuaborges.com.br/api/cron/appointment-reminders',
        },
        {}
      )
    ).rejects.toThrow(/ENV_ISOLATION/);

    // Scheduled execution with missing REMINDERS_TARGET_URL in staging -> MUST throw (no fallback to prod!)
    await expect(
      remindersCronWorker.scheduled(
        {},
        {
          ENVIRONMENT: 'staging',
          CRON_SECRET: TEST_SECRETS.CRON_SECRET,
        },
        {}
      )
    ).rejects.toThrow(/ENV_ISOLATION/);

    // Scheduled execution with missing CRON_SECRET -> MUST throw
    await expect(
      remindersCronWorker.scheduled(
        {},
        {
          ENVIRONMENT: 'staging',
          CRON_SECRET: '',
          REMINDERS_TARGET_URL: 'https://staging.nuaborges.pages.dev/api/cron/appointment-reminders',
        },
        {}
      )
    ).rejects.toThrow(/CRON_SECRET/);

    // Verify wrangler.toml [env.staging] configuration guarantees (no inherited crons, no prod hosts)
    const wranglerRaw = fs.readFileSync(
      path.resolve(process.cwd(), 'workers', 'reminders-cron', 'wrangler.toml'),
      'utf8'
    );
    const stagingSection = wranglerRaw.split('[env.staging]')[1] || '';
    expect(stagingSection.includes('crons = []')).toBe(true);
    expect(stagingSection.includes('ENVIRONMENT = "staging"')).toBe(true);
    expect(stagingSection.includes('ENABLE_PAYMENT_RECONCILE = "false"')).toBe(true);
    expect(stagingSection.includes('nuaborges.com.br')).toBe(false);
  });

  it('NEGATIVE: qa-staging-homologation refuses production hosts/tokens/buckets, redacts secrets, and never marks unavailable integrations PASS', async () => {
    const prodViolation = validateStagingConfig({
      ENVIRONMENT: 'staging',
      STAGING_SITE_URL: 'https://nuaborges.com.br',
      MP_ACCESS_TOKEN: 'APP_USR-999999999999999-prod-secret',
      B2_BUCKET_NAME: 'nuaborges-media',
    });
    expect(prodViolation.ok).toBe(false);
    expect(prodViolation.errors.some((e: string) => e.includes('STAGING_SITE_URL'))).toBe(true);
    expect(prodViolation.errors.some((e: string) => e.includes('MP_ACCESS_TOKEN'))).toBe(true);
    expect(prodViolation.errors.some((e: string) => e.includes('B2_BUCKET_NAME'))).toBe(true);

    const redacted = sanitizeLogText('token=APP_USR-1234567890abcdef secret=my-super-secret-value', {
      CRON_SECRET: 'my-super-secret-value',
    });
    expect(redacted.includes('APP_USR-1234567890abcdef')).toBe(false);
    expect(redacted.includes('my-super-secret-value')).toBe(false);

    // Preflight with empty staging services MUST classify all unavailable external integrations as BLOCKED (0 PASS!)
    const preflightReport = await runHomologation({
      cfg: { ENVIRONMENT: 'staging' },
      preflightOnly: true,
    });
    expect(preflightReport.totals.passed).toBe(0);
    expect(preflightReport.totals.blocked).toBe(12);
    expect(preflightReport.verdict.startsWith('INDETERMINADO')).toBe(true);
  });
});
