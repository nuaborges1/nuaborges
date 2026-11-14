/**
 * Cloudflare Pages Function: POST /api/webhooks/mercadopago
 *
 * Endpoint canônico para notificações do Mercado Pago (alias para /api/finance/webhook).
 */

import { onRequestPost as handleFinanceWebhook } from '../finance/webhook';

export const onRequestPost = handleFinanceWebhook;
export const onRequestGet = async () => {
  return new Response(JSON.stringify({ status: 'active', gateway: 'mercadopago' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
