import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { loadVaultHandlers } from '../tools/localVaultHandlers.mjs';

test('retoma somente a cobrança Pix ativa do titular em Packs, VIP e Personalizados', async (t) => {
  const handlers = await loadVaultHandlers();
  const secret = 'customer-session-fixture-secret';
  const future = new Date(Date.now() + 600_000).toISOString();
  const past = new Date(Date.now() - 600_000).toISOString();
  const records = new Map();
  const orderIds = ['ord_test', 'app_test', 'ped_test'];
  const pack = { id: 'ord_test', pack_id: 'my-pack', amount: 12, status: 'pending', provider_payment_id: '101' };
  const booking = { id: 'app_test', status: 'aguardando_pagamento', total_price: 12, date_time: future, notes: JSON.stringify({ expiresAt: future }), payment: { status: 'pending', transactionId: '102' } };
  const custom = { id: 'ped_test', status: 'aguardando_pagamento', total_price: 12, payment: { status: 'pending', transactionId: '103' } };

  const env = {
    ENVIRONMENT: 'production', NUA_ID_SECRET: secret, MP_ACCESS_TOKEN: 'gateway-test-fixture',
    SUPABASE_URL: 'https://database.test', SUPABASE_SERVICE_ROLE_KEY: 'database-test-fixture',
    __CUSTOMER_DATA_FIXTURES__: { catalog: [{ slug: 'my-pack' }] },
    __NUA_ID_TEST_STORE__: {
      kvGet: async (key) => structuredClone(records.get(key) ?? null),
      kvSet: async (key, value) => { records.set(key, structuredClone(value)); return true; },
      kvCreate: async (key, value) => {
        if (records.has(key)) return false;
        records.set(key, structuredClone(value));
        return true;
      },
    },
  };

  for (const name of ['owner', 'other']) {
    records.set(`nua_id:profile:${name}`, { id: name, status: 'active', email: `${name}@example.test` });
    records.set(`nua_id:session:sess_${name}`, { id: `sess_${name}`, profileId: name, expiresAt: future });
  }
  for (const id of orderIds) records.set(`nua_id:claim:${id}`, { orderRef: id, profileId: 'owner' });

  let gatewayStatus = 'pending';
  let gatewayExpiry = future;
  let wrongReference = false;
  let gatewayReads = 0;
  let failPatch = false;
  const replaced = new Set();
  const newPayments = new Map();
  const renewKeys = [];
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input.url || String(input));
    if (url.host === 'database.test') {
      const row = url.pathname.endsWith('/personalizados_orders') ? custom : pack;
      if (options?.method === 'PATCH') {
        if (failPatch) return Response.json({ message: 'temporary database failure' }, { status: 503 });
        const prevId = url.searchParams.get(row === pack ? 'provider_payment_id' : 'payment->>transactionId');
        const currentId = row === pack ? pack.provider_payment_id : custom.payment.transactionId;
        if (prevId !== `eq.${currentId}`) return Response.json([]);
        Object.assign(row, JSON.parse(options.body));
        return Response.json([{ id: row.id }]);
      }
      if (url.pathname.endsWith('/appointments')) return Response.json([booking]);
      return Response.json([row]);
    }
    assert.equal(url.host, 'api.mercadopago.com');
    if (options?.method === 'POST') {
      const body = JSON.parse(options.body);
      const key = new Headers(options.headers).get('X-Idempotency-Key');
      renewKeys.push(key);
      if (!newPayments.has(key)) {
        newPayments.set(key, {
          id: 201 + newPayments.size, status: 'pending', date_of_expiration: future, currency_id: 'BRL',
          external_reference: body.external_reference, transaction_amount: body.transaction_amount, payment_method_id: 'pix',
          point_of_interaction: { transaction_data: { qr_code: 'new-code' } },
        });
      }
      return Response.json(newPayments.get(key));
    }
    gatewayReads++;
    const paymentId = Number(url.pathname.split('/').at(-1));
    if (options?.method === 'PUT') {
      assert.equal(paymentId, 101);
      assert.deepEqual(JSON.parse(options.body), { status: 'cancelled' });
      replaced.add(paymentId);
      return Response.json({ id: paymentId, status: 'cancelled' });
    }
    const renewed = [...newPayments.values()].find(payment => payment.id === paymentId);
    if (renewed) return Response.json(renewed);
    const id = orderIds[paymentId - 101];
    return Response.json({
      status: replaced.has(paymentId) ? 'cancelled' : gatewayStatus,
      status_detail: replaced.has(paymentId) ? 'by_collector' : undefined,
      date_of_expiration: gatewayExpiry, currency_id: 'BRL',
      payment_method_id: 'pix', transaction_amount: 12,
      external_reference: wrongReference ? 'unrelated_order' : `nua_${id}`,
      point_of_interaction: { transaction_data: { qr_code: `pix-${id}` } },
    });
  });

  function lookup(id, name = 'owner', renew = false) {
    const session = `sess_${name}`;
    const signature = createHmac('sha256', secret).update(session).digest('base64url');
    const request = new Request(`https://example.test/api/me/order-payment?id=${id}`, {
      method: renew ? 'POST' : 'GET',
      headers: { Cookie: `__Host-nua_id_session=${session}.${signature}`, 'Content-Type': 'application/json' },
    });
    const route = handlers['/api/me/order-payment'];
    return (renew ? route.onRequestPost : route.onRequestGet)({ request, env });
  }

  assert.equal((await lookup('ord_test', 'other')).status, 404);
  assert.equal((await lookup('ord_test', 'other', true)).status, 404);
  assert.equal(gatewayReads, 0);
  for (const id of orderIds) {
    const response = await lookup(id);
    assert.match(response.headers.get('Cache-Control'), /no-store/);
    assert.deepEqual(await response.json(), { state: 'payable', code: `pix-${id}`, expiresAt: future }, id);
  }

  booking.notes = JSON.stringify({ expiresAt: past });
  assert.deepEqual(await (await lookup('app_test')).json(), { state: 'waiting_expiry' });
  booking.notes = JSON.stringify({ expiresAt: future });

  wrongReference = true;
  assert.deepEqual(await (await lookup('ord_test')).json(), { state: 'unavailable' });
  wrongReference = false;
  gatewayExpiry = past;
  assert.deepEqual(await (await lookup('ord_test')).json(), { state: 'expired', canRenew: true });
  gatewayStatus = 'cancelled';
  assert.deepEqual(await (await lookup('app_test', 'owner', true)).json(), { state: 'expired', nextHref: '/chamadas', nextLabel: 'Escolher outro horário' });
  gatewayStatus = 'approved';
  assert.deepEqual(await (await lookup('ord_test', 'owner', true)).json(), { state: 'confirming' });
  assert.equal(renewKeys.length, 0);

  gatewayStatus = 'pending';
  failPatch = true;
  assert.equal((await lookup('ord_test', 'owner', true)).status, 503);
  assert.ok(replaced.has(101));
  assert.equal(pack.provider_payment_id, '101');
  failPatch = false;
  const concurrent = await Promise.all([lookup('ord_test', 'owner', true), lookup('ord_test', 'owner', true)]);
  for (const response of concurrent) assert.equal(response.status, 200);
  assert.equal(new Set(renewKeys).size, 1);
  assert.equal(pack.provider_payment_id, '201');
  assert.equal(pack.amount, 12);
  assert.deepEqual(await (await lookup('ord_test')).json(), { state: 'payable', code: 'new-code', expiresAt: future });

  gatewayStatus = 'cancelled';
  assert.deepEqual(await (await lookup('ped_test', 'owner', true)).json(), { state: 'renewed' });
  assert.equal(custom.payment.transactionId, '202');
  assert.equal(custom.id, 'ped_test');
  pack.status = 'paid';
  assert.deepEqual(await (await lookup('ord_test')).json(), { state: 'paid' });
});
