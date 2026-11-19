import assert from 'node:assert/strict';
import { newOrderId, newPurchaseToken, newSessionToken } from '../functions/api/_secureId.ts';

const N = 5000;
const tokens = new Set();
const orders = new Set();
for (let i = 0; i < N; i++) {
  tokens.add(newPurchaseToken());
  orders.add(newOrderId());
}
assert.equal(tokens.size, N, 'tokens devem ser únicos');
assert.equal(orders.size, N, 'orderIds devem ser únicos');

assert.match(newPurchaseToken(), /^ptok_[0-9a-f]{32}$/, 'token = 128 bits hex');
assert.match(newSessionToken(), /^sess_[0-9a-f]{32}$/, 'sessão = 128 bits hex');
assert.match(newOrderId(), /^ord_[0-9a-z]+_[0-9a-f]{16}$/, 'orderId = 64 bits hex');
// compatível com a regex de roteamento do webhook e com a validação estrita de token
assert.match(newOrderId().match(/(ord_[a-zA-Z0-9_-]+)/)[1], /^ord_/);
assert.match(newPurchaseToken(), /^[A-Za-z0-9_-]{8,128}$/);
console.log('secureId.test: OK');
