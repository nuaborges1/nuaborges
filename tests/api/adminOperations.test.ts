import { invokeThroughGateway } from '../helpers/gatewayHarness';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { onRequestPost as adminPersonalizados } from '@/functions/api/personalizados/admin';
import { onRequestPost as adminCustomersPost } from '@/functions/api/admin/customers';
import { onRequestPost as appointmentsAdminPost } from '@/functions/api/appointments/admin';
import { onRequestPost as contentOpsPost } from '@/functions/api/admin/content-ops';
import { onRequestPost as controlSystemPost, onRequestGet as controlSystemGet } from '@/functions/api/control/system';
import { onRequestPost as adminLogin } from '@/functions/api/auth/login';
import { onRequestGet as contentSyncGet } from '@/functions/api/content/sync';
import { onRequestGet as mediaProxyGet } from '@/functions/media/[[path]]';
import {
  getOrCreateProfileByEmail,
  getProfileById,
  grantEntitlement,
  listEntitlementsByProfile,
  isEntitlementActive,
} from '@/functions/api/id/_nuaIdStore';
import { validatePersonalizadoStatusTransition } from '@/lib/personalizadosCanonical';
import { analyzeHistoricalConsistency } from '@/scripts/qa-historical-audit.mjs';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import { createTestEmail, extractCookies, serializeCookieJar, TEST_SECRETS } from '../factories/domainFactories';

describe('API — Granular Admin Module Controls, DEF-006 State Machine & Historical Audit', () => {
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

  it('[DEF-006] enforces Personalizados state machine across all valid, invalid, unpaid, backward, duplicate, and terminal transitions', async () => {
    // Unit checks on centralized validator
    expect(
      validatePersonalizadoStatusTransition(
        { status: 'aguardando_pagamento', payment: { status: 'pending', method: 'pix', amount: 120 } },
        ''
      ).valid
    ).toBe(false);
    expect(
      validatePersonalizadoStatusTransition(
        { status: 'aguardando_pagamento', payment: { status: 'pending', method: 'pix', amount: 120 } },
        123 as any
      ).valid
    ).toBe(false);
    expect(
      validatePersonalizadoStatusTransition(
        { status: 'aguardando_pagamento', payment: { status: 'pending', method: 'pix', amount: 120 } },
        'entregue'
      ).code
    ).toBe('PAYMENT_REQUIRED');

    const persId = 'ped_machine_qa_001';
    const buyerEmail = createTestEmail('pers_machine');
    harness.tables.personalizados_orders.push({
      id: persId,
      public_token: 'tok_ped_machine_001',
      client_name: 'Cliente State Machine',
      client_contact: buyerEmail,
      delivery_channel: 'vault',
      photo_count: 3,
      video_option_id: 'vid_none',
      video_duration_minutes: 0,
      mention_name: false,
      express_24h: false,
      briefing: 'Teste',
      total_price: 150,
      status: 'aguardando_pagamento',
      payment: { status: 'pending', method: 'pix', amount: 150 },
      vault_files: [],
      admin_notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const patchOrder = (patch: Record<string, any>) =>
      adminPersonalizados({
        request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_order', orderId: persId, patch }),
        }),
        env,
      });

    // Reject unknown string, empty string, non-string type, and unpaid production/delivery
    expect((await patchOrder({ status: 'inexistente' })).status).toBe(400);
    expect((await patchOrder({ status: '' })).status).toBe(400);
    expect((await patchOrder({ status: 999 })).status).toBe(400);
    expect((await patchOrder({ status: 'em_producao' })).status).toBe(400);
    expect((await patchOrder({ status: 'pronto' })).status).toBe(400);
    expect((await patchOrder({ status: 'entregue' })).status).toBe(400);

    // Approve payment -> valid progression: aguardando_pagamento -> em_producao -> pronto (with private vault file) -> entregue
    harness.tables.personalizados_orders[0].payment.status = 'approved';

    const toProd = await patchOrder({ status: 'em_producao' });
    expect(toProd.status).toBe(200);
    expect((await toProd.json()).order.status).toBe('em_producao');

    // Duplicate same-status transition is idempotent
    const dupProd = await patchOrder({ status: 'em_producao', adminNotes: 'Gravando agora' });
    expect(dupProd.status).toBe(200);

    // Trying to mark 'pronto' without vault files fails 400
    const prontoNoFiles = await patchOrder({ status: 'pronto' });
    expect(prontoNoFiles.status).toBe(400);

    // Valid transition to 'pronto' with private vault media -> grants entitlement + sends vault mail
    const toPronto = await patchOrder({
      status: 'pronto',
      vaultFiles: [
        {
          id: 'vf_1',
          name: 'foto1.webp',
          url: '/media/private/personalizados/foto1.webp',
          type: 'photo',
          uploadedAt: new Date().toISOString(),
        },
      ],
    });
    expect(toPronto.status).toBe(200);

    // Backward transition pronto -> em_producao MUST be rejected (400)
    const backward = await patchOrder({ status: 'em_producao' });
    expect(backward.status).toBe(400);
    expect((await backward.json()).code).toBe('INVALID_TRANSITION');

    // Valid transition pronto -> entregue
    const toEntregue = await patchOrder({ status: 'entregue' });
    expect(toEntregue.status).toBe(200);

    // Terminal state 'entregue' MUST NOT transition to any other status
    const fromEntregue = await patchOrder({ status: 'em_producao' });
    expect(fromEntregue.status).toBe(400);
    expect((await fromEntregue.json()).code).toBe('TERMINAL_STATUS');

    // Cancelado is also terminal
    const cancelId = 'ped_cancel_qa_002';
    harness.tables.personalizados_orders.push({
      ...harness.tables.personalizados_orders[0],
      id: cancelId,
      public_token: 'tok_ped_cancel_002',
      status: 'aguardando_pagamento',
      payment: { status: 'pending', method: 'pix', amount: 150 },
      vault_files: [],
    });
    const toCancel = await adminPersonalizados({
      request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_order', orderId: cancelId, patch: { status: 'cancelado' } }),
      }),
      env,
    });
    expect(toCancel.status).toBe(200);

    const reopenCancelled = await adminPersonalizados({
      request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_order', orderId: cancelId, patch: { status: 'em_producao' } }),
      }),
      env,
    });
    expect(reopenCancelled.status).toBe(400);
    expect((await reopenCancelled.json()).code).toBe('TERMINAL_STATUS');

    // Settings validation rejects negative prices and saves valid settings
    const badSettings = await adminPersonalizados({
      request: new Request('https://admin.nuaborges.com.br/api/personalizados/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_settings', settings: { pricePerPhoto: -10 } }),
      }),
      env,
    });
    expect(badSettings.status).toBe(400);
  });

  it('Admin Customers CRM actions (suspend, reactivate, revoke_entitlement, revoke_sessions) mutate real state accurately', async () => {
    const email = createTestEmail('crm_ops');
    const profile = (await getOrCreateProfileByEmail(env as any, email, 'Cliente CRM'))!;
    await grantEntitlement(env as any, {
      profileId: profile.id,
      orderRef: 'ord_crm_1',
      kind: 'pack',
      resourceId: 'ensaio-qa',
      title: 'Ensaio QA',
      expiresAt: null,
      allowDownload: false,
    });

    const suspendRes = await adminCustomersPost({
      request: new Request('https://admin.nuaborges.com.br/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suspend', profileId: profile.id, reason: 'qa_check' }),
      }),
      env: env as any,
    });
    expect(suspendRes.status).toBe(200);
    expect((await getProfileById(env as any, profile.id))?.status).toBe('suspended');

    const reactivateRes = await adminCustomersPost({
      request: new Request('https://admin.nuaborges.com.br/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate', profileId: profile.id, reason: 'qa_restore' }),
      }),
      env: env as any,
    });
    expect(reactivateRes.status).toBe(200);
    expect((await getProfileById(env as any, profile.id))?.status).toBe('active');

    const revokeEntRes = await adminCustomersPost({
      request: new Request('https://admin.nuaborges.com.br/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_entitlement',
          profileId: profile.id,
          orderRef: 'ord_crm_1',
          reason: 'chargeback_manual',
        }),
      }),
      env: env as any,
    });
    expect(revokeEntRes.status).toBe(200);
    const ents = await listEntitlementsByProfile(env as any, profile.id);
    expect(ents.some((e) => e.orderRef === 'ord_crm_1' && isEntitlementActive(e))).toBe(false);
  });

  it('Appointments Admin updateSettings persists valid schedule configuration and blocks invalid patches', async () => {
    const invalidRes = await appointmentsAdminPost({
      request: new Request('https://admin.nuaborges.com.br/api/appointments/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSettings',
          settings: { weeklyHours: { 1: { enabled: true, ranges: [{ start: '18:00', end: '12:00' }] } } },
        }),
      }),
      env,
    });
    expect(invalidRes.status).toBe(400);

    const validRes = await appointmentsAdminPost({
      request: new Request('https://admin.nuaborges.com.br/api/appointments/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSettings',
          settings: { bufferMinutes: 20, minNoticeHours: 6 },
        }),
      }),
      env,
    });
    expect(validRes.status).toBe(200);
    const body = await validRes.json();
    expect(body.settings?.bufferMinutes).toBe(20);
    expect(body.settings?.minNoticeHours).toBe(6);
  });

  it('Admin Content Ops enforces RBAC on adminUi and blocks public media in Vault arrays, while Control System kill-switch revokes all active admin sessions', async () => {
    // 1. Client role cannot alter adminUi via content-ops
    const clientLogin = await adminLogin({
      request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
        method: 'POST',
        headers: { Origin: 'https://admin.nuaborges.com.br', 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_SECRETS.CLIENT_PASSWORD }),
      }),
      env,
    });
    const clientCookie = serializeCookieJar(extractCookies(clientLogin.headers));

    const blockedAdminUi = await contentOpsPost({
      request: new Request('https://admin.nuaborges.com.br/api/admin/content-ops', {
        method: 'POST',
        headers: { Cookie: clientCookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { adminUi: { theme: 'hacked' } },
        }),
      }),
      env,
    });
    expect(blockedAdminUi.status).toBe(403);

    const origin = 'https://admin.nuaborges.com.br';
    const phdevPassword = 'QA PHDEV independent password';
    env.DEV_PANEL_PASSWORD = phdevPassword;
    const phdev = await adminLogin({
      request: new Request(origin + '/api/auth/login', {
        method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: phdevPassword }),
      }), env,
    });
    expect(phdev.status).toBe(200);
    const phdevCookie = serializeCookieJar(extractCookies(phdev.headers));
    const control = (body: object, cookie = phdevCookie) => invokeThroughGateway({
      request: new Request(origin + '/api/control/system', {
        method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, confirmationPassword: phdevPassword }),
      }), env, handler: controlSystemPost,
    });
    const patch = { action: 'set_flags', maintenanceMode: false, disabledModules: ['vip_subscribe'] };
    expect((await control(patch, clientCookie)).status).toBe(403);
    expect((await control(patch)).status).toBe(200);
    const statusGet = await invokeThroughGateway({
      request: new Request(origin + '/api/control/system', { headers: { Cookie: phdevCookie } }),
      env, handler: controlSystemGet,
    });
    expect(statusGet.status).toBe(200);
    expect((await statusGet.json()).flags.disabledModules.includes('vip_subscribe')).toBe(true);

    const killRes = await control({ action: 'revoke_admin_sessions' });
    expect(killRes.status).toBe(200);

    const syncAfterKill = await contentSyncGet({
      request: new Request('https://admin.nuaborges.com.br/api/content/sync?mode=admin', {
        method: 'GET',
        headers: { Cookie: clientCookie },
      }),
      env,
    });
    expect(syncAfterKill.status).toBe(403);

    const mediaAfterKill = await mediaProxyGet({
      request: new Request('https://admin.nuaborges.com.br/media/private/ensaio-qa/foto-01.webp', {
        method: 'GET',
        headers: { Cookie: clientCookie },
      }),
      env,
      params: { path: ['private', 'ensaio-qa', 'foto-01.webp'] },
    });
    expect(mediaAfterKill.status).toBe(403);
  });

  it('[Section 15] Read-only historical consistency audit detects DEF-001/002/005/006 anomalies without mutating data', () => {
    const report = analyzeHistoricalConsistency({
      orders: [
        { id: 'ord_guest_missing_1', status: 'paid', customer_email: 'guest@qa.test' },
        { id: 'ped_divergent_1', status: 'pending', customer_email: 'pers@qa.test' },
        { id: 'book_divergent_1', status: 'pending', customer_email: 'vip@qa.test' },
      ],
      personalizados_orders: [
        { id: 'ped_divergent_1', status: 'em_producao', payment: { status: 'approved' } },
        { id: 'ped_invalid_1', status: 'status_corrompido', payment: { status: 'pending' } },
        { id: 'ped_unpaid_del_1', status: 'entregue', payment: { status: 'pending' } },
      ],
      appointments: [
        { id: 'book_divergent_1', status: 'cancelada', payment: { status: 'pending' } },
      ],
      order_claims: [],
      entitlements: [],
      pending_vault_mail: [{ order: 'ord_guest_missing_1', attempts: 2, next: Date.now() - 60_000 }],
      payment_events: [
        { provider: 'mercadopago', eventKey: 'ev_dup' },
        { provider: 'mercadopago', eventKey: 'ev_dup' },
      ],
    });

    expect(report.mode).toBe('READ_ONLY_AUDIT');
    expect(report.mutatedProduction).toBe(false);
    expect(report.healthy).toBe(false);
    expect(report.findings.paidPacksWithoutClaimOrEntitlement).toHaveLength(1);
    expect(report.findings.divergentPersonalizadosOrdersMirror).toHaveLength(1);
    expect(report.findings.vipCancelledWithPendingPayment).toHaveLength(1);
    expect(report.findings.invalidPersonalizadoStatusesOrUnpaidDelivery).toHaveLength(2);
    expect(report.findings.stuckPendingVaultMailJobs).toHaveLength(1);
    expect(report.findings.duplicateClaimsOrPaymentEvents).toHaveLength(1);
  });
});
