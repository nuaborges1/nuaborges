/**
 * Suíte Automatizada — Fases 3, 5, 6, 7, 8 e 9 do NUA ID
 *
 * Valida:
 * - Camada única de pagamentos (HMAC, idempotência, valor/moeda, aprovação, revogação, VIP tardio)
 * - Mídia protegida (TTL curto, download autorizado/negado, expiração, revogação, IDOR)
 * - Chamadas VIP (fuso America/Sao_Paulo, cancelamento/reagendamento, IDOR)
 * - Personalizados (estados canônicos, cofre condicional)
 * - Claim idempotente de pedidos legados (anti dupla titularidade, pending não concede direito)
 * - Admin › Clientes (sanitização de segredos/mídia, bloqueio de ações proibidas, auditoria)
 */

import assert from 'node:assert/strict';
import {
  createMemoryNuaIdStore,
  getOrCreateProfileByEmail,
  listEntitlementsByProfile,
  isEntitlementActive,
  saveCustomerSession,
} from '../functions/api/id/_nuaIdStore.ts';
import { signSessionCookie } from '../functions/api/id/_crypto.ts';
import {
  mapMercadoPagoStatus,
  processVerifiedMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from '../functions/api/payments/_paymentEngine.ts';
import {
  signPrivateMediaUrl,
  verifyPrivateMediaSignature,
} from '../functions/api/me/_mediaSigner.ts';
import { onRequestPost as requestMediaUrl } from '../functions/api/me/media-url.ts';
import { onRequestPost as claimOrder } from '../functions/api/me/claim.ts';
import { onRequestGet as getOrders } from '../functions/api/me/orders.ts';
import { onRequestGet as getAppointments, onRequestPost as mutateAppointment } from '../functions/api/me/appointments.ts';
import { onRequestGet as getPersonalizados } from '../functions/api/me/personalizados.ts';
import { onRequestGet as adminListCustomers, onRequestPost as adminMutateCustomer } from '../functions/api/admin/customers.ts';

const SECRET = 'nua-id-core-flows-secret-key-9876543210';
const MP_SECRET = 'mp-webhook-hmac-secret-test-key';

async function makeAuthCookie(env, profileId) {
  const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '')}`;
  await saveCustomerSession(env, {
    id: sessionId,
    profileId,
    deviceLabel: 'Chrome em Windows',
    userAgent: 'TestAgent',
    ipHash: 'abc123',
    isRevoked: false,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400_000).toISOString(),
  });
  const signed = await signSessionCookie(sessionId, SECRET);
  return `__Host-nua_id_session=${encodeURIComponent(signed)}`;
}

async function signMpHeader(dataId, requestId, ts, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(manifest));
  const hex = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
  return `ts=${ts},v1=${hex}`;
}

function makeReq(path, method = 'GET', body = null, cookie = null) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (cookie) headers.set('Cookie', cookie);
  return new Request(`https://nuaborges.com.br${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runTests() {
  const store = createMemoryNuaIdStore();
  const sentEmails = [];
  const fixtures = {
    catalog: [
      {
        id: 'pack-ensaio-vinho',
        slug: 'pack-ensaio-vinho',
        title: 'Ensaio Vinho',
        coverImage: '/images/vinho.jpg',
        protectedMedia: [{ id: 'm1', label: 'Vídeo 1', path: 'private/pack-ensaio-vinho/video1.mp4', type: 'video' }],
      },
    ],
    orders: {},
    ordersByToken: {},
    appointments: {},
    appointmentsByToken: {},
    personalizados: {},
    personalizadosByToken: {},
  };

  const env = {
    ADMIN_API_SECRET: SECRET,
    NUA_ID_SECRET: SECRET,
    MP_WEBHOOK_SECRET: MP_SECRET,
    ENVIRONMENT: 'production',
    __NUA_ID_TEST_STORE__: store,
    __CUSTOMER_DATA_FIXTURES__: fixtures,
    __EMAIL_SENDER__: async (msg) => {
      sentEmails.push(msg);
      return true;
    },
  };

  const alice = await getOrCreateProfileByEmail(env, 'alice@example.com', 'Alice');
  const bob = await getOrCreateProfileByEmail(env, 'bob@example.com', 'Bob');
  const aliceCookie = await makeAuthCookie(env, alice.id);
  const bobCookie = await makeAuthCookie(env, bob.id);

  // =========================================================================
  // 1. PAGAMENTOS — Assinatura HMAC x-signature e mapeamento de status
  // =========================================================================
  const nowSec = Math.floor(Date.now() / 1000);
  const validSig = await signMpHeader('12345678', 'req-1', nowSec, MP_SECRET);
  assert.equal(
    await verifyMercadoPagoWebhookSignature({ xSignature: validSig, dataId: '12345678', secret: MP_SECRET, requestId: 'req-1', nowEpochSeconds: nowSec }),
    true
  );
  // Anti-replay (>15min) falha
  const oldSig = await signMpHeader('12345678', 'req-1', nowSec - 1200, MP_SECRET);
  assert.equal(
    await verifyMercadoPagoWebhookSignature({ xSignature: oldSig, dataId: '12345678', secret: MP_SECRET, requestId: 'req-1', nowEpochSeconds: nowSec }),
    false
  );
  // Status mapping (Seção 8)
  assert.equal(mapMercadoPagoStatus('approved').accessEffect, 'grant');
  assert.equal(mapMercadoPagoStatus('pending').accessEffect, 'none');
  assert.equal(mapMercadoPagoStatus('in_process').accessEffect, 'none');
  assert.equal(mapMercadoPagoStatus('rejected').accessEffect, 'none');
  assert.equal(mapMercadoPagoStatus('cancelled').accessEffect, 'revoke');
  assert.equal(mapMercadoPagoStatus('refunded').accessEffect, 'revoke');
  assert.equal(mapMercadoPagoStatus('charged_back').accessEffect, 'revoke');

  // =========================================================================
  // 2. PAGAMENTOS — Valor adulterado, moeda, aprovação, dedupe, chargeback
  // =========================================================================
  const packOrder = {
    id: 'ord_pack_001',
    purchaseToken: 'ptok_0123456789abcdef0123456789abcdef',
    packId: 'pack-ensaio-vinho',
    amount: 79.9,
    status: 'pending',
    customerEmail: alice.email,
    customerName: alice.displayName,
    paymentMethod: 'pix',
    createdAt: new Date().toISOString(),
  };
  fixtures.orders[packOrder.id] = packOrder;
  fixtures.ordersByToken[packOrder.purchaseToken] = packOrder;

  const deps = {
    async loadOrderTarget(ref) {
      if (ref === packOrder.id) {
        return {
          orderRef: packOrder.id,
          kind: 'pack',
          resourceId: packOrder.packId,
          title: 'Ensaio Vinho',
          expectedAmountCents: 7990,
          currency: 'BRL',
          currentStatus: packOrder.status,
          profileId: alice.id,
          customerEmail: alice.email,
          allowDownload: false,
        };
      }
      if (fixtures.appointments[ref]) {
        const a = fixtures.appointments[ref];
        return {
          orderRef: a.id,
          kind: 'vip',
          resourceId: a.modalityId,
          title: a.modalityName,
          expectedAmountCents: Math.round(a.price * 100),
          currency: 'BRL',
          currentStatus: a.status,
          profileId: alice.id,
          customerEmail: alice.email,
          holdExpiresAt: a.expiresAt,
          slotStillAvailable: a._slotStillAvailable,
        };
      }
      return null;
    },
    async updateOrderState(target, next) {
      if (fixtures.orders[target.orderRef]) {
        fixtures.orders[target.orderRef].status = next.financialStatus;
      }
      if (fixtures.appointments[target.orderRef]) {
        fixtures.appointments[target.orderRef].status = next.operationalStatus || next.financialStatus;
        fixtures.appointments[target.orderRef].payment.status =
          next.financialStatus === 'refunded' ? 'refunded' : next.financialStatus === 'paid' ? 'approved' : 'pending';
      }
    },
    async executeAutoRefund(paymentId, orderRef) {
      return { success: true, refundId: `ref_auto_${paymentId}_${orderRef}` };
    },
  };

  // 2a. Valor adulterado (R$ 1,00 em pedido de R$ 79,90) -> rejeitado!
  const resUnderpaid = await processVerifiedMercadoPagoPayment(
    env,
    { paymentId: 'mp_pay_1', status: 'approved', transactionAmount: 1.0, currencyId: 'BRL', externalReference: packOrder.id, dateLastUpdated: 't1' },
    deps
  );
  assert.equal(resUnderpaid.processed, false);
  assert.equal((await listEntitlementsByProfile(env, alice.id)).length, 0);

  // 2b. Moeda divergente -> rejeitado!
  const resBadCurrency = await processVerifiedMercadoPagoPayment(
    env,
    { paymentId: 'mp_pay_2', status: 'approved', transactionAmount: 79.9, currencyId: 'USD', externalReference: packOrder.id, dateLastUpdated: 't2' },
    deps
  );
  assert.equal(resBadCurrency.processed, false);

  // 2c. Aprovação legítima -> concede entitlement e envia 1 e-mail
  const emailsBefore = sentEmails.length;
  const resApproved = await processVerifiedMercadoPagoPayment(
    env,
    { paymentId: 'mp_pay_ok', status: 'approved', transactionAmount: 79.9, currencyId: 'BRL', externalReference: packOrder.id, dateLastUpdated: 't3' },
    deps
  );
  assert.equal(resApproved.processed, true);
  assert.equal(resApproved.accessAction, 'granted');
  assert.equal(sentEmails.length, emailsBefore + 1);

  // 2d. Webhook repetido -> deduplicado, ZERO efeitos extras, ZERO e-mail repetido
  const resDup = await processVerifiedMercadoPagoPayment(
    env,
    { paymentId: 'mp_pay_ok', status: 'approved', transactionAmount: 79.9, currencyId: 'BRL', externalReference: packOrder.id, dateLastUpdated: 't3' },
    deps
  );
  assert.equal(resDup.duplicate, true);
  assert.equal(sentEmails.length, emailsBefore + 1);

  // =========================================================================
  // 3. MÍDIA PROTEGIDA — Link assinado TTL curto, download, expiração, IDOR
  // =========================================================================
  // Alice pede link de visualização -> 200
  const resMediaOk = await requestMediaUrl({
    request: makeReq('/api/me/media-url', 'POST', {
      resourceId: 'pack-ensaio-vinho',
      mediaPath: 'private/pack-ensaio-vinho/video1.mp4',
      download: false,
    }, aliceCookie),
    env,
  });
  assert.equal(resMediaOk.status, 200);
  const mediaData = await resMediaOk.json();
  assert.equal(mediaData.ttlSeconds, 300);

  // Validar assinatura real do link emitido
  const parsedUrl = new URL(`https://nuaborges.com.br${mediaData.signedUrl}`);
  const verifyOk = await verifyPrivateMediaSignature({
    mediaPath: 'private/pack-ensaio-vinho/video1.mp4',
    exp: parsedUrl.searchParams.get('exp'),
    pid: parsedUrl.searchParams.get('pid'),
    dl: parsedUrl.searchParams.get('dl'),
    sig: parsedUrl.searchParams.get('sig'),
    secret: SECRET,
  });
  assert.equal(verifyOk.valid, true);
  assert.equal(verifyOk.allowDownload, false);

  // Link expirado falha
  const verifyExp = await verifyPrivateMediaSignature({
    mediaPath: 'private/pack-ensaio-vinho/video1.mp4',
    exp: parsedUrl.searchParams.get('exp'),
    pid: parsedUrl.searchParams.get('pid'),
    dl: parsedUrl.searchParams.get('dl'),
    sig: parsedUrl.searchParams.get('sig'),
    secret: SECRET,
    nowEpochSeconds: Math.floor(Date.now() / 1000) + 999,
  });
  assert.equal(verifyExp.valid, false);
  assert.equal(verifyExp.reason, 'expired');

  // Assinatura para outro arquivo falha (tampering)
  const verifyTamper = await verifyPrivateMediaSignature({
    mediaPath: 'private/outro-pack/video2.mp4',
    exp: parsedUrl.searchParams.get('exp'),
    pid: parsedUrl.searchParams.get('pid'),
    dl: parsedUrl.searchParams.get('dl'),
    sig: parsedUrl.searchParams.get('sig'),
    secret: SECRET,
  });
  assert.equal(verifyTamper.valid, false);

  // Download não autorizado (allowDownload=false) -> 403
  const resDlDenied = await requestMediaUrl({
    request: makeReq('/api/me/media-url', 'POST', {
      resourceId: 'pack-ensaio-vinho',
      mediaPath: 'private/pack-ensaio-vinho/video1.mp4',
      download: true,
    }, aliceCookie),
    env,
  });
  assert.equal(resDlDenied.status, 403);

  // IDOR: Bob tenta gerar link para conteúdo da Alice -> 403
  const resIdorMedia = await requestMediaUrl({
    request: makeReq('/api/me/media-url', 'POST', {
      resourceId: 'pack-ensaio-vinho',
      mediaPath: 'private/pack-ensaio-vinho/video1.mp4',
    }, bobCookie),
    env,
  });
  assert.equal(resIdorMedia.status, 403);

  // Chargeback revoga acesso imediatamente -> novas emissões retornam 403!
  const resChargeback = await processVerifiedMercadoPagoPayment(
    env,
    { paymentId: 'mp_pay_ok', status: 'charged_back', transactionAmount: 79.9, currencyId: 'BRL', externalReference: packOrder.id, dateLastUpdated: 't4' },
    deps
  );
  assert.equal(resChargeback.accessAction, 'revoked');
  const aliceEntsAfter = await listEntitlementsByProfile(env, alice.id);
  assert.equal(isEntitlementActive(aliceEntsAfter[0]), false);

  const resAfterRevoke = await requestMediaUrl({
    request: makeReq('/api/me/media-url', 'POST', {
      resourceId: 'pack-ensaio-vinho',
      mediaPath: 'private/pack-ensaio-vinho/video1.mp4',
    }, aliceCookie),
    env,
  });
  assert.equal(resAfterRevoke.status, 403);

  // =========================================================================
  // 4. CHAMADAS VIP — Pagamento tardio após hold expirado -> estorno automático
  // =========================================================================
  const lateVip = {
    id: 'book_vip_late_01',
    publicToken: 'tok_vip_late_0123456789abcdef',
    modalityId: 'mod_30m',
    modalityName: 'Chamada 30min',
    durationMinutes: 30,
    price: 250,
    date: '2026-11-25',
    startTime: '20:00',
    endTime: '20:30',
    dateTimeUtc: '2026-11-25T20:00:00Z',
    timezone: 'Europe/Dublin',
    status: 'cancelada',
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
    _slotStillAvailable: false,
    payment: { status: 'pending', method: 'pix', amount: 250 },
    meeting: { visibleToClient: false, joinUrl: 'https://meet.example/secret' },
    createdAt: new Date().toISOString(),
  };
  fixtures.appointments[lateVip.id] = lateVip;
  fixtures.appointmentsByToken[lateVip.publicToken] = lateVip;

  const resLateVip = await processVerifiedMercadoPagoPayment(
    env,
    { paymentId: 'mp_vip_late_pay', status: 'approved', transactionAmount: 250, currencyId: 'BRL', externalReference: lateVip.id, dateLastUpdated: 't5' },
    deps
  );
  assert.equal(resLateVip.processed, true);
  assert.equal(resLateVip.autoRefunded, true);
  assert.equal(resLateVip.financialStatus, 'refunded');
  assert.equal(resLateVip.accessAction, 'none');

  // =========================================================================
  // 5. CLAIM IDEMPOTENTE + ANTI DUPLA TITULARIDADE + PERSONALIZADOS + VIP IDOR
  // =========================================================================
  const legacyPaidPack = {
    id: 'ord_legacy_paid',
    purchaseToken: 'ptok_legacy_paid_0123456789abcd',
    packId: 'pack-ensaio-vinho',
    amount: 79.9,
    status: 'paid',
    customerEmail: 'antigo@example.com',
    customerName: 'Cliente Antigo',
    paymentMethod: 'pix',
    createdAt: new Date().toISOString(),
  };
  const legacyPendingPack = {
    id: 'ord_legacy_pending',
    purchaseToken: 'ptok_legacy_pend_0123456789abcd',
    packId: 'pack-pendente',
    amount: 50,
    status: 'pending',
    customerEmail: 'bob@example.com',
    customerName: 'Bob',
    paymentMethod: 'pix',
    createdAt: new Date().toISOString(),
  };
  fixtures.orders[legacyPaidPack.id] = legacyPaidPack;
  fixtures.ordersByToken[legacyPaidPack.purchaseToken] = legacyPaidPack;
  fixtures.orders[legacyPendingPack.id] = legacyPendingPack;
  fixtures.ordersByToken[legacyPendingPack.purchaseToken] = legacyPendingPack;

  // Claim 1 (Bob reivindica pedido legado pago usando purchaseToken) -> 200 e libera entitlement
  const resClaim1 = await claimOrder({
    request: makeReq('/api/me/claim', 'POST', { token: legacyPaidPack.purchaseToken }, bobCookie),
    env,
  });
  assert.equal(resClaim1.status, 200);
  const claim1Body = await resClaim1.json();
  assert.equal(claim1Body.entitlementGranted, true);

  // Claim 2 (Idempotência: Bob reivindica novamente) -> 200 alreadyClaimed=true
  const resClaim2 = await claimOrder({
    request: makeReq('/api/me/claim', 'POST', { token: legacyPaidPack.purchaseToken }, bobCookie),
    env,
  });
  assert.equal(resClaim2.status, 200);
  assert.equal((await resClaim2.json()).alreadyClaimed, true);

  // Claim 3 (Dupla titularidade: Alice tenta reivindicar o pedido já do Bob) -> 409!
  const resClaimConflict = await claimOrder({
    request: makeReq('/api/me/claim', 'POST', { token: legacyPaidPack.purchaseToken }, aliceCookie),
    env,
  });
  assert.equal(resClaimConflict.status, 409);

  // Claim 4 (Invariante 5: pedido legado PENDING vinculado mas SEM entitlement)
  const resClaimPending = await claimOrder({
    request: makeReq('/api/me/claim', 'POST', { token: legacyPendingPack.purchaseToken }, bobCookie),
    env,
  });
  assert.equal(resClaimPending.status, 200);
  assert.equal((await resClaimPending.json()).entitlementGranted, false);

  // Claim 5 (orderId sem purchaseToken é rejeitado -> 404)
  const resClaimById = await claimOrder({
    request: makeReq('/api/me/claim', 'POST', { token: legacyPaidPack.id }, bobCookie),
    env,
  });
  assert.equal(resClaimById.status, 404);

  // Personalizado com estado canônico 'em_producao' NÃO libera vaultFiles
  const customOrder = {
    id: 'ped_custom_01',
    publicToken: 'tok_custom_0123456789abcdef',
    photoCount: 5,
    videoDurationMinutes: 3,
    mentionName: true,
    express24h: false,
    deliveryChannel: 'vault',
    briefing: 'Ensaio reservado',
    totalPrice: 395,
    status: 'em_producao',
    payment: { status: 'approved', method: 'pix', amount: 395 },
    vaultFiles: [{ id: 'v1', name: 'foto1.jpg', type: 'photo', url: 'private/ped_custom_01/foto1.jpg' }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fixtures.personalizados[customOrder.id] = customOrder;
  fixtures.personalizadosByToken[customOrder.publicToken] = customOrder;
  await claimOrder({
    request: makeReq('/api/me/claim', 'POST', { token: customOrder.publicToken }, aliceCookie),
    env,
  });

  const resPers = await getPersonalizados({
    request: makeReq('/api/me/personalizados', 'GET', null, aliceCookie),
    env,
  });
  const persBody = await resPers.json();
  assert.equal(persBody.personalizados.length, 1);
  assert.equal(persBody.personalizados[0].operationalStatus, 'em_producao');
  assert.equal(persBody.personalizados[0].vaultFiles.length, 0, 'Cofre não libera enquanto em_producao');

  // Avança para 'pronto' -> cofre aparece
  customOrder.status = 'pronto';
  const resPersReady = await getPersonalizados({
    request: makeReq('/api/me/personalizados', 'GET', null, aliceCookie),
    env,
  });
  assert.equal((await resPersReady.json()).personalizados[0].vaultFiles.length, 1);

  // VIP confirmada da Alice -> Bob tenta cancelar (IDOR -> 404), Alice consegue (200 -> reembolso_pendente)
  const confirmedVip = {
    ...lateVip,
    id: 'book_vip_ok_02',
    publicToken: 'tok_vip_ok_0123456789abcdef',
    status: 'confirmada',
    payment: { status: 'approved', method: 'pix', amount: 250 },
    meeting: { visibleToClient: true, joinUrl: 'https://meet.example/alice-room' },
  };
  fixtures.appointments[confirmedVip.id] = confirmedVip;
  fixtures.appointmentsByToken[confirmedVip.publicToken] = confirmedVip;
  await claimOrder({
    request: makeReq('/api/me/claim', 'POST', { token: confirmedVip.publicToken }, aliceCookie),
    env,
  });

  const resAliceApts = await getAppointments({
    request: makeReq('/api/me/appointments', 'GET', null, aliceCookie),
    env,
  });
  const aptsBody = await resAliceApts.json();
  assert.equal(aptsBody.appointments[0].timezoneDisplay, 'America/Sao_Paulo');
  assert.equal(aptsBody.appointments[0].callLink, 'https://meet.example/alice-room');

  const resBobCancelIdor = await mutateAppointment({
    request: makeReq('/api/me/appointments', 'POST', { appointmentId: confirmedVip.id, action: 'request_cancel' }, bobCookie),
    env,
  });
  assert.equal(resBobCancelIdor.status, 404);

  const resAliceCancel = await mutateAppointment({
    request: makeReq('/api/me/appointments', 'POST', { appointmentId: confirmedVip.id, action: 'request_cancel', reason: 'Imprevisto' }, aliceCookie),
    env,
  });
  assert.equal(resAliceCancel.status, 200);
  assert.equal((await resAliceCancel.json()).status, 'reembolso_pendente');

  // Histórico unificado paginado
  const resOrders = await getOrders({
    request: makeReq('/api/me/orders?page=1&pageSize=10', 'GET', null, aliceCookie),
    env,
  });
  const ordersBody = await resOrders.json();
  assert.ok(ordersBody.items.length >= 2);
  assert.equal(ordersBody.pagination.page, 1);

  // =========================================================================
  // 6. ADMIN › CLIENTES — Sanitização, ações proibidas e auditoria
  // =========================================================================
  const resAdminList = await adminListCustomers({
    request: makeReq('/api/admin/customers?q=alice', 'GET'),
    env,
  });
  assert.equal(resAdminList.status, 200);
  const adminListBody = await resAdminList.json();
  assert.equal(adminListBody.customers.length, 1);

  const resAdminDetail = await adminListCustomers({
    request: makeReq(`/api/admin/customers?id=${alice.id}`, 'GET'),
    env,
  });
  const detailText = await resAdminDetail.text();
  assert.ok(!detailText.includes('ptok_'), 'Admin nunca expõe purchaseToken');
  assert.ok(!detailText.includes('sess_'), 'Admin nunca expõe sessionId');
  assert.ok(!detailText.includes('alice-room'), 'Admin não expõe callLink privado na listagem');

  // Bloqueio explícito contra manipulação arbitrária de pagamentos ou impersonation
  const resForbidden = await adminMutateCustomer({
    request: makeReq('/api/admin/customers', 'POST', { profileId: alice.id, action: 'mark_paid' }),
    env,
  });
  assert.equal(resForbidden.status, 403);

  const resSuspend = await adminMutateCustomer({
    request: makeReq('/api/admin/customers', 'POST', { profileId: bob.id, action: 'suspend', reason: 'Teste auditoria' }),
    env,
  });
  assert.equal(resSuspend.status, 200);

  console.log('nuaIdCoreFlows.test: ALL CORE PAYMENT, MEDIA, VIP, CUSTOM, CLAIM & ADMIN TESTS PASSED');
}

runTests().catch((err) => {
  console.error('nuaIdCoreFlows.test FAILED:', err);
  process.exit(1);
});
