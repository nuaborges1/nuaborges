import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMemoryNuaIdStore } from '../functions/api/id/_nuaIdStore.ts';
import { executeManualRefund, inspectRefundEligibility, refundStateKey } from '../functions/api/payments/_refundEngine.ts';

const orderId = 'ord_refund_test';
const providerPaymentId = '12345';
const externalReference = 'nua_pack_pack-teste_' + orderId;
const actor = { profile: 'phdev', role: 'dev', subject: 'test-admin' };

function fixture() {
  const order = { id: orderId, packId: 'pack-teste', status: 'paid', paymentId: providerPaymentId, amount: 10 };
  const store = createMemoryNuaIdStore();
  const env = { __NUA_ID_TEST_STORE__: store, __CUSTOMER_DATA_FIXTURES__: { orders: { [orderId]: order }, catalog: [] } };
  let sent = 0;
  const deps = {
    getPayment: async () => ({ success: true, status: 'approved', amount: 10, externalReference }),
    listRefunds: async () => [],
    refundPayment: async (_env, paymentId, _orderRef, amount) => {
      assert.equal(paymentId, providerPaymentId);
      assert.equal(amount, 10);
      sent++;
      return { success: true, status: 'approved', id: '987', amount };
    },
  };
  const params = { orderId, modality: 'pack', confirmRefund: true, reason: 'Solicitação do cliente', expectedRefundAmount: 10, actor };
  return { order, store, env, deps, params, submissions: () => sent };
}

test('confere o formato canônico e rejeita referência vazia ou de outro pedido', async () => {
  const { env, deps } = fixture();
  for (const [reference, expected] of [[externalReference, true], ['', false], [externalReference + '_outro', false]]) {
    const getPayment = async () => ({ success: true, status: 'approved', amount: 10, externalReference: reference });
    const result = await inspectRefundEligibility(env, orderId, 'pack', { ...deps, getPayment });
    assert.equal(result.summary?.eligible, expected);
  }
});

test('recusa pedido parcial e preço divergente antes de chamar o provedor', async () => {
  const { env, deps, params, submissions } = fixture();
  assert.equal((await executeManualRefund(env, { ...params, amount: 1 }, deps)).httpStatus, 400);
  assert.equal((await executeManualRefund(env, { ...params, expectedRefundAmount: 9 }, deps)).httpStatus, 409);
  assert.equal(submissions(), 0);
});

test('aguarda a devolução em andamento e preserva o acesso após devolução parcial', async () => {
  const { env, deps, params, order, submissions } = fixture();
  deps.listRefunds = async () => [{ id: '987', status: 'pending', amount: 10 }];
  assert.equal((await executeManualRefund(env, params, deps)).state, 'processing');
  deps.listRefunds = async () => [{ id: '987', status: 'approved', amount: 3 }];
  const result = await executeManualRefund(env, { ...params, reconcileOnly: true }, deps);
  assert.equal(result.state, 'unknown_awaiting_reconciliation');
  assert.equal(order.status, 'paid');
  assert.equal(submissions(), 0);
});

test('retoma a gravação após falha local usando a confirmação já persistida', async () => {
  const { env, deps, params, store, order, submissions } = fixture();
  const save = store.kvSet.bind(store);
  let failLedgerWrite = true;
  store.kvSet = async (key, value) => failLedgerWrite && key.startsWith('nua_id:payment:') ? false : save(key, value);
  const first = await executeManualRefund(env, params, deps);
  assert.equal(first.state, 'unknown_awaiting_reconciliation');
  assert.equal((await store.kvGet(refundStateKey(orderId))).providerConfirmed, true);
  failLedgerWrite = false;
  deps.getPayment = async () => { throw new Error('O provedor não deve ser consultado durante a retomada confirmada.'); };
  const second = await executeManualRefund(env, { ...params, reconcileOnly: true }, deps);
  assert.equal(second.state, 'refunded');
  assert.equal(order.status, 'refunded');
  assert.equal(submissions(), 1);
});


test('reserva o pagamento no gateway antes de enviar e bloqueia outra entrada concorrente', async (t) => {
  const { refundMercadoPagoPayment } = await import('../functions/api/_mercadopago.ts');
  const env = { ENVIRONMENT: 'production', MP_ACCESS_TOKEN: 'APP_USR-ficticio', __NUA_ID_TEST_STORE__: createMemoryNuaIdStore() };
  let release;
  let notify;
  const started = new Promise((resolve) => { notify = resolve; });
  const response = new Promise((resolve) => { release = resolve; });
  const transport = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(String(url), /\/payments\/12345\/refunds$/);
    assert.equal(options.method, 'POST');
    notify();
    return response;
  });
  const first = refundMercadoPagoPayment(env, '12345', 'ord_test', 10, { scope: 'manual' });
  await started;
  try {
    const second = await refundMercadoPagoPayment(env, '12345', 'ord_test', 10, { scope: 'vip' });
    assert.equal(second.httpStatus, 409);
    assert.equal(second.inconclusive, true);
    assert.equal(transport.mock.callCount(), 1);
  } finally {
    release(Response.json({ id: '987', status: 'approved', amount: 10 }));
    await first;
  }
});


test('tenta novamente o aviso de um estorno confirmado sem refazer a devolução', async () => {
  const { env, deps, params, order, store, submissions } = fixture();
  order.customerEmail = 'cliente@example.com';
  let attempts = 0;
  env.__EMAIL_SENDER__ = async () => ++attempts > 1;
  const result = await executeManualRefund(env, params, deps);
  assert.equal(result.state, 'refunded');
  assert.equal(result.emailSent, false);
  assert.equal((await store.kvGet(refundStateKey(orderId))).emailPending, true);
  const { retryConfirmedRefunds } = await import('../functions/api/payments/_refundEngine.ts');
  await retryConfirmedRefunds(env);
  await retryConfirmedRefunds(env);
  assert.equal(attempts, 2);
  assert.equal(submissions(), 1);
  assert.equal((await store.kvGet(refundStateKey(orderId))).emailPending, false);
});

