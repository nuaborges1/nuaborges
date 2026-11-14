/**
 * Cloudflare Pages Function: /api/payments/simulate-approve
 *
 * Simulação de aprovação exclusiva para ambiente local (wrangler dev / localhost).
 * ESTRITAMENTE BLOQUEADA E INOPERANTE EM PRODUÇÃO.
 * Atualiza o pedido diretamente no Supabase PostgreSQL.
 */

import { isLocalhostPaymentSimulationAllowed } from '../_security';
import { getOrderFromSupabase, updateOrderInSupabase } from '../_supabaseStore';

interface Env {
  ENVIRONMENT?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  // 1. TRAVA ABSOLUTA DE SEGURANÇA: Bloqueio em Produção
  if (!isLocalhostPaymentSimulationAllowed(request, env)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Acesso negado: simulação de pagamento é estritamente proibida em produção.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body: any = await request.json().catch(() => ({}));
  const orderId = (body.orderId || '').trim();

  if (!orderId) {
    return new Response(
      JSON.stringify({ success: false, error: 'orderId obrigatório.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const order = await getOrderFromSupabase(env, orderId);

  if (!order) {
    return new Response(
      JSON.stringify({ success: false, error: 'Pedido local não encontrado no Supabase.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const nowIso = new Date().toISOString();
  await updateOrderInSupabase(env, orderId, {
    status: 'paid',
    paid_at: nowIso,
  });

  return new Response(
    JSON.stringify({
      success: true,
      paid: true,
      status: 'approved',
      orderId: order.id,
      purchaseToken: order.purchaseToken,
      accessUrl: `/assistir/${order.packId}?token=${order.purchaseToken}`,
      amount: order.amount,
      isTestMode: true,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  return onRequestPost(context);
};
