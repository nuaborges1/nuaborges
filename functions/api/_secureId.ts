/**
 * Geração de identificadores e tokens com CSPRNG (Web Crypto).
 * Nunca use Math.random() para credenciais.
 */

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** ID de pedido: não é credencial. 64 bits aleatórios + timestamp só para ordenação humana. */
export function newOrderId(): string {
  return `ord_${Date.now().toString(36)}_${randomHex(8)}`;
}

/** Token de compra (credencial de acesso): 128 bits. */
export function newPurchaseToken(): string {
  return `ptok_${randomHex(16)}`;
}

/** Token de sessão de acesso: 128 bits. */
export function newSessionToken(): string {
  return `sess_${randomHex(16)}`;
}
