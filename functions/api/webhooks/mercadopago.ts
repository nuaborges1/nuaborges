/**
 * Cloudflare Pages Function: POST /api/webhooks/mercadopago
 *
 * Endpoint canônico único para notificações comerciais do Mercado Pago.
 * Delega 100% para o motor endurecido (`mercadopago-v2` / `_paymentEngine.ts`):
 * - Validação fail-closed de `x-signature` (janela 15 min)
 * - Deduplicação persistente (`recordPaymentEventOnce`)
 * - Trava contra reaprovação de pedidos cancelados/reembolsados
 * - Revogação obrigatória de entitlements em estorno/chargeback (HTTP 500 se falhar)
 * - Auto-estorno para Chamadas VIP pagas após expiração do hold
 */

export { onRequestPost } from './mercadopago-v2';
