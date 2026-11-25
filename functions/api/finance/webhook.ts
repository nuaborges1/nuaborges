/**
 * Alias de compatibilidade zero-downtime para `/api/webhooks/mercadopago`.
 *
 * Delega 100% para o motor endurecido v2 (`_paymentEngine.ts` via `mercadopago-v2`),
 * sem qualquer código legado v1 — garante que eventos configurados na conta do
 * Mercado Pago continuem funcionando com assinatura fail-closed, deduplicação
 * persistente e revogação garantida mesmo sem reconfiguração manual do painel MP.
 */

export { onRequestPost } from '../webhooks/mercadopago-v2';
