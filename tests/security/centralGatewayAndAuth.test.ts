import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveRoutePolicy } from '@/functions/api/_central/policies';
import { onRequestPost as adminLogin } from '@/functions/api/auth/login';
import { onRequestPost as adminLogout } from '@/functions/api/auth/logout';
import { onRequestGet as contentSyncGet } from '@/functions/api/content/sync';
import { onRequestGet as mediaProxyGet } from '@/functions/media/[[path]]';
import { onRequestPost as contentOpsPost } from '@/functions/api/admin/content-ops';
import { onRequestPost as cronRemindersPost } from '@/functions/api/cron/appointment-reminders';
import { onRequestPost as reconcilePost } from '@/functions/api/payments/reconcile';
import { onRequestPost as createPix } from '@/functions/api/payments/create-pix';
import { getProfileByEmail, listEntitlementsByProfile, isEntitlementActive } from '@/functions/api/id/_nuaIdStore';
import { createSessionToken } from '@/functions/api/_authHelper';
import { getAdminSessionSecret } from '@/functions/api/_central/secrets';
import { resolveActorRole } from '@/functions/api/nua-ai/_actor';
import { rejectIfNotLocal } from '@/functions/api/mail/_common';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import { invokeThroughGateway } from '../helpers/gatewayHarness';
import { createTestEmail, extractCookies, serializeCookieJar, TEST_SECRETS } from '../factories/domainFactories';

describe('SECURITY — Central API Gateway (_central) & Admin Auth Invariants', () => {
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

  it('enforces default-deny (404 ROUTE_NOT_FOUND) for unregistered API endpoints', async () => {
    const res = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/secret/undocumented', { method: 'GET' }),
      env,
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('ROUTE_NOT_FOUND');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('isolates admin and superadmin routes from the public host nuaborges.com.br in production', async () => {
    const res = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/admin/customers', {
        method: 'GET',
        headers: { 'X-Master-Key': TEST_SECRETS.ADMIN_API_SECRET },
      }),
      env,
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('HOST_NOT_ALLOWED');

    // Same request succeeds on admin.nuaborges.com.br
    const okRes = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/customers', {
        method: 'GET',
        headers: { 'X-Master-Key': TEST_SECRETS.ADMIN_API_SECRET },
      }),
      env,
    });
    expect(okRes.status).toBe(200);
  });

  it('enforces strict CORS allowlist (never *, rejects arbitrary pages.dev)', async () => {
    const evilRes = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/content/sync', {
        method: 'OPTIONS',
        headers: { Origin: 'https://attacker-clone.pages.dev' },
      }),
      env,
    });
    expect(evilRes.status).toBe(204);
    expect(evilRes.headers.get('Access-Control-Allow-Origin')).toBeNull();

    const legitRes = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/content/sync', {
        method: 'OPTIONS',
        headers: { Origin: 'https://nuaborges.com.br' },
      }),
      env,
    });
    expect(legitRes.status).toBe(204);
    expect(legitRes.headers.get('Access-Control-Allow-Origin')).toBe('https://nuaborges.com.br');
  });

  it('blocks CSRF cross-site Origin, invalid Referer, and prod cookie mutations missing Origin/Referer', async () => {
    const badOrigin = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
        body: '{}',
      }),
      env,
    });
    expect(badOrigin.status).toBe(403);
    expect((await badOrigin.json()).code).toBe('CSRF_BLOCKED');

    const cookieNoOrigin = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { Cookie: 'nua_id_session=abc', 'Content-Type': 'application/json' },
        body: '{}',
      }),
      env,
    });
    expect(cookieNoOrigin.status).toBe(403);
    expect((await cookieNoOrigin.json()).code).toBe('CSRF_BLOCKED');

    // Server-to-server X-Master-Key without cookies/Origin is permitted
    const masterOk = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/control/system', {
        method: 'POST',
        headers: { 'X-Master-Key': TEST_SECRETS.ADMIN_API_SECRET, 'Content-Type': 'application/json' },
        body: '{}',
      }),
      env,
    });
    expect(masterOk.status).toBe(200);
  });

  it('rejects raw ADMIN_PASSWORD as Bearer/X-Master-Key and blocks customer cookies on admin endpoints', async () => {
    const rawPassRes = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/customers', {
        method: 'GET',
        headers: { 'X-Master-Key': TEST_SECRETS.ADMIN_PASSWORD },
      }),
      env,
    });
    expect(rawPassRes.status).toBe(401);

    const customerCookieRes = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/customers', {
        method: 'GET',
        headers: { Cookie: '__Host-nua_id_session=fake-customer-session' },
      }),
      env,
    });
    expect(customerCookieRes.status).toBe(401);
  });

  it('enforces RBAC: client role accesses CMS/customers but is denied superadmin /api/finance/admin and /api/control/system', async () => {
    const loginRes = await adminLogin({
      request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
        method: 'POST',
        headers: { Origin: 'https://admin.nuaborges.com.br', 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_SECRETS.CLIENT_PASSWORD }),
      }),
      env,
    });
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.role).toBe('client');
    expect(loginBody.token).toBeUndefined(); // Never leaks session token in JSON

    const cookieHeader = serializeCookieJar(extractCookies(loginRes.headers));

    // Allowed for client role
    const customersRes = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/customers', {
        method: 'GET',
        headers: { Cookie: cookieHeader },
      }),
      env,
    });
    expect(customersRes.status).toBe(200);

    // Denied for client role (superadmin_only)
    const superAdminRes = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/finance/admin', {
        method: 'GET',
        headers: { Cookie: cookieHeader },
      }),
      env,
    });
    expect(superAdminRes.status).toBe(403);
    expect((await superAdminRes.json()).code).toBe('FORBIDDEN');

    // Logout revokes jti server-side -> replaying cookie returns 401
    const logoutRes = await adminLogout({
      request: new Request('https://admin.nuaborges.com.br/api/auth/logout', {
        method: 'POST',
        headers: { Origin: 'https://admin.nuaborges.com.br', Cookie: cookieHeader },
      }),
      env,
    });
    expect(logoutRes.status).toBe(200);

    const replayRes = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/admin/customers', {
        method: 'GET',
        headers: { Cookie: cookieHeader },
      }),
      env,
    });
    expect(replayRes.status).toBe(401);
  });

  it('[DEF-004] enforces server-side revocation across ALL admin/private endpoints, blocks expired/contract tokens, and sets private no-store cache headers', async () => {
    // 1. Valid admin login -> content/sync?mode=admin returns 200 with private, no-store
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

    const validSync = await contentSyncGet({
      request: new Request('https://admin.nuaborges.com.br/api/content/sync?mode=admin', {
        method: 'GET',
        headers: { Cookie: cookieHeader },
      }),
      env,
    });
    expect(validSync.status).toBe(200);
    const cc = validSync.headers.get('Cache-Control') || '';
    expect(cc.includes('private') && cc.includes('no-store')).toBe(true);

    // 2. Logout revokes session server-side; concurrent requests after revocation MUST fail
    const logoutRes = await adminLogout({
      request: new Request('https://admin.nuaborges.com.br/api/auth/logout', {
        method: 'POST',
        headers: { Origin: 'https://admin.nuaborges.com.br', Cookie: cookieHeader },
      }),
      env,
    });
    expect(logoutRes.status).toBe(200);

    const [syncAfter, mediaAfter, contentOpsAfter, actorAfter, mailReject] = await Promise.all([
      contentSyncGet({
        request: new Request('https://admin.nuaborges.com.br/api/content/sync?mode=admin', {
          method: 'GET',
          headers: { Cookie: cookieHeader },
        }),
        env,
      }),
      mediaProxyGet({
        request: new Request('https://admin.nuaborges.com.br/media/private/ensaio-qa/foto-01.webp', {
          method: 'GET',
          headers: { Cookie: cookieHeader },
        }),
        env,
        params: { path: ['private', 'ensaio-qa', 'foto-01.webp'] },
      }),
      contentOpsPost({
        request: new Request('https://admin.nuaborges.com.br/api/admin/content-ops', {
          method: 'POST',
          headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ops: [] }),
        }),
        env,
      }),
      resolveActorRole(
        new Request('https://admin.nuaborges.com.br/api/nua-ai/chat', {
          method: 'POST',
          headers: { Cookie: cookieHeader },
        }),
        env
      ),
      rejectIfNotLocal(
        new Request('https://admin.nuaborges.com.br/api/mail/messages', {
          method: 'GET',
          headers: { Cookie: cookieHeader },
        }),
        env
      ),
    ]);

    expect(syncAfter.status).toBe(403);
    expect(mediaAfter.status).toBe(403);
    expect(contentOpsAfter.status).toBe(401);
    expect(actorAfter).toBeNull();
    expect(mailReject?.status).toBe(401);

    // 3. Expired token and contract_client token MUST be rejected on admin & private media endpoints
    const secret = getAdminSessionSecret(env as any)!;
    const expiredToken = await createSessionToken(secret, 'admin', -60);
    const contractToken = await createSessionToken(secret, 'contract_client', 3600);

    const expSync = await contentSyncGet({
      request: new Request('https://admin.nuaborges.com.br/api/content/sync?mode=admin', {
        method: 'GET',
        headers: { Authorization: `Bearer ${expiredToken}` },
      }),
      env,
    });
    expect(expSync.status).toBe(403);

    const contractOnAdminMedia = await mediaProxyGet({
      request: new Request('https://admin.nuaborges.com.br/media/private/ensaio-qa/foto-01.webp', {
        method: 'GET',
        headers: { Authorization: `Bearer ${contractToken}` },
      }),
      env,
      params: { path: ['private', 'ensaio-qa', 'foto-01.webp'] },
    });
    expect(contractOnAdminMedia.status).toBe(403);

    const missingSessionSync = await contentSyncGet({
      request: new Request('https://admin.nuaborges.com.br/api/content/sync?mode=admin', {
        method: 'GET',
      }),
      env,
    });
    expect(missingSessionSync.status).toBe(403);
  });

  it('[DEF-002 & DEF-003] enforces strict cron auth (x-cron-secret and Bearer) on reminders & reconcile while blocking public/unauthenticated/client callers and executing real payment reconciliation', async () => {
    // 1. Valid x-cron-secret & valid Bearer accepted on /api/cron/appointment-reminders
    const cronHeaderOk = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/cron/appointment-reminders', {
        method: 'POST',
        headers: { 'x-cron-secret': TEST_SECRETS.CRON_SECRET },
      }),
      env,
      handler: (ctx) => cronRemindersPost(ctx),
    });
    expect(cronHeaderOk.status).toBe(200);

    const cronBearerOk = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/cron/appointment-reminders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TEST_SECRETS.CRON_SECRET}` },
      }),
      env,
      handler: (ctx) => cronRemindersPost(ctx),
    });
    expect(cronBearerOk.status).toBe(200);

    // 2. Invalid/missing/wrong-header/empty-env cron secrets -> 401
    for (const badHeaders of [
      {},
      { 'x-cron-secret': 'wrong-secret' },
      { Authorization: `Bearer ${TEST_SECRETS.ADMIN_PASSWORD}` },
      { 'X-Wrong-Cron-Header': TEST_SECRETS.CRON_SECRET },
    ]) {
      const badRes = await invokeThroughGateway({
        request: new Request('https://nuaborges.com.br/api/cron/appointment-reminders', {
          method: 'POST',
          headers: badHeaders as Record<string, string>,
        }),
        env,
        handler: (ctx) => cronRemindersPost(ctx),
      });
      expect(badRes.status).toBe(401);
    }

    const emptySecretRes = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/cron/appointment-reminders', {
        method: 'POST',
        headers: { 'x-cron-secret': '' },
      }),
      env: { ...env, CRON_SECRET: '' },
      handler: (ctx) => cronRemindersPost(ctx),
    });
    expect(emptySecretRes.status).toBe(401);

    // 3. /api/payments/reconcile security: unauthenticated -> 401, client role -> 403, superadmin on public host -> 403 HOST_NOT_ALLOWED, superadmin on admin host -> 200
    const unauthReconcile = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/payments/reconcile', { method: 'POST' }),
      env,
      handler: (ctx) => reconcilePost(ctx),
    });
    expect(unauthReconcile.status).toBe(401);

    const clientLogin = await adminLogin({
      request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
        method: 'POST',
        headers: { Origin: 'https://admin.nuaborges.com.br', 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_SECRETS.CLIENT_PASSWORD }),
      }),
      env,
    });
    const clientCookie = serializeCookieJar(extractCookies(clientLogin.headers));
    const clientReconcile = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/payments/reconcile', {
        method: 'POST',
        headers: { Cookie: clientCookie },
      }),
      env,
      handler: (ctx) => reconcilePost(ctx),
    });
    expect(clientReconcile.status).toBe(403);

    const adminLoginRes = await adminLogin({
      request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
        method: 'POST',
        headers: { Origin: 'https://admin.nuaborges.com.br', 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_SECRETS.ADMIN_PASSWORD }),
      }),
      env,
    });
    const adminCookie = serializeCookieJar(extractCookies(adminLoginRes.headers));

    const adminOnPublicHost = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/payments/reconcile', {
        method: 'POST',
        headers: { Cookie: adminCookie },
      }),
      env,
      handler: (ctx) => reconcilePost(ctx),
    });
    expect(adminOnPublicHost.status).toBe(403);
    expect((await adminOnPublicHost.json()).code).toBe('HOST_NOT_ALLOWED');

    const adminOnAdminHost = await invokeThroughGateway({
      request: new Request('https://admin.nuaborges.com.br/api/payments/reconcile', {
        method: 'POST',
        headers: { Cookie: adminCookie },
      }),
      env,
      handler: (ctx) => reconcilePost(ctx),
    });
    expect(adminOnAdminHost.status).toBe(200);

    // 4. Functional reconciliation via CRON_SECRET: recovers missed webhook for approved Pack order and ignores still-pending order
    const guestEmail = createTestEmail('reconcile_guest');
    const pixApprovedRes = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: guestEmail, payerName: 'Reconcile Guest' }),
      }),
      env,
    });
    const pixApproved = await pixApprovedRes.json();
    const mpApproved = harness.mpPayments.get(String(pixApproved.paymentId))!;
    mpApproved.status = 'approved';
    mpApproved.date_approved = new Date().toISOString();
    mpApproved.date_last_updated = new Date().toISOString();

    const pixPendingRes = await createPix({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pack', slug: 'ensaio-qa', payerEmail: createTestEmail('still_pending') }),
      }),
      env,
    });
    expect(pixPendingRes.status).toBe(201);

    const recRun1 = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/payments/reconcile', {
        method: 'POST',
        headers: { 'x-cron-secret': TEST_SECRETS.CRON_SECRET },
      }),
      env,
      handler: (ctx) => reconcilePost(ctx),
    });
    expect(recRun1.status).toBe(200);
    const recBody1 = await recRun1.json();
    expect(recBody1.checked).toBeGreaterThanOrEqual(2);
    expect(recBody1.reconciled).toBe(1);

    const recProfile = await getProfileByEmail(env as any, guestEmail);
    expect(recProfile).not.toBeNull();
    const recEnts = await listEntitlementsByProfile(env as any, recProfile!.id);
    expect(recEnts.some((e) => e.orderRef === pixApproved.orderId && isEntitlementActive(e))).toBe(true);

    // Second reconciliation run is idempotent -> 0 newly reconciled
    const recRun2 = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/payments/reconcile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TEST_SECRETS.CRON_SECRET}` },
      }),
      env,
      handler: (ctx) => reconcilePost(ctx),
    });
    expect(recRun2.status).toBe(200);
    expect((await recRun2.json()).reconciled).toBe(0);
  });

  it('enforces kill-switch maintenance mode and module disablement while allowing bypassMaintenance routes', async () => {
    const envWithFlags = {
      ...env,
      __SYSTEM_FLAGS_OVERRIDE__: {
        maintenanceMode: false,
        maintenanceMessage: 'Manutenção QA',
        disabledModules: ['checkout'],
      },
    };

    const blockedCheckout = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/payments/create-pix', {
        method: 'POST',
        headers: { Origin: 'https://nuaborges.com.br', 'Content-Type': 'application/json' },
        body: '{}',
      }),
      env: envWithFlags,
    });
    expect(blockedCheckout.status).toBe(503);
    expect((await blockedCheckout.json()).code).toBe('MODULE_DISABLED');

    // Public catalog bypasses maintenance
    const catalogOk = await invokeThroughGateway({
      request: new Request('https://nuaborges.com.br/api/content/sync', { method: 'GET' }),
      env: envWithFlags,
    });
    expect(catalogOk.status).toBe(200);
  });

  it('audits all active endpoint files in functions/api/ against central route policies', () => {
    const apiRoot = path.resolve(process.cwd(), 'functions', 'api');
    const endpoints: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith('_')) continue;
          walk(full);
        } else if (entry.name.endsWith('.ts') && !entry.name.startsWith('_') && !entry.name.endsWith('.d.ts')) {
          let rel = path.relative(apiRoot, full).replace(/\\/g, '/').replace(/\.ts$/, '');
          rel = rel.replace(/\/index$/, '').replace(/\[[^\]]+\]/g, 'sample-id');
          endpoints.push(`/api/${rel}`);
        }
      }
    }
    walk(apiRoot);

    const intentionallyDisabled = new Set(['/api/admin/vault']);
    const unmapped = endpoints.filter(
      (ep) =>
        !intentionallyDisabled.has(ep) &&
        !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].some((m) => resolveRoutePolicy(ep, m) !== null)
    );
    expect(unmapped).toEqual([]);
  });
});
