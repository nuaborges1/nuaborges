/**
 * Cloudflare Pages Function: GET/POST /api/payments/status
 *
 * Consulta o status de pagamento de um pedido avulso ou VIP com contingência ativa no Mercado Pago.
 * Persistência 100% no Supabase PostgreSQL.
 */

import { getMercadoPagoPayment } from '../_mercadopago';
import { getStripePaymentIntent } from '../_stripe';
import { isLocalhostPaymentSimulationAllowed } from '../_security';
import {
  getOrderFromSupabase,
  updateOrderInSupabase,
  getAppointmentByIdFromSupabase,
  saveAppointmentToSupabase,
  getPersonalizadoOrderFromSupabase,
  savePersonalizadoOrderToSupabase,
} from '../_supabaseStore';

interface Env {
  STRIPE_SECRET_KEY?: string;
  MP_ACCESS_TOKEN?: string;
  ENVIRONMENT?: string;
  NODE_ENV?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

async function handleStatusCheck(context: PagesContext<Env>) {
  const { request, env } = context;

  const url = new URL(request.url);
  let orderId = url.searchParams.get('orderId') || url.searchParams.get('id');

  if (!orderId && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    orderId = body.orderId || body.id;
  }

  if (!orderId) {
    return new Response(
      JSON.stringify({ success: false, error: 'orderId obrigatório.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Consulta no PostgreSQL Supabase
  let order: any = null;
  const sbOrder = await getOrderFromSupabase(env, orderId);
  if (sbOrder) {
    order = {
      orderId: sbOrder.id,
      purchaseToken: sbOrder.purchaseToken,
      itemSlug: sbOrder.packId,
      amount: sbOrder.amount,
      status: sbOrder.status === 'paid' ? 'approved' : sbOrder.status,
      stripePaymentIntentId: sbOrder.stripePaymentIntentId,
      paymentMethod: sbOrder.paymentMethod,
    };
  }

  if (!order) {
    return new Response(
      JSON.stringify({ success: false, error: 'Pedido não encontrado.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // TRAVA DE SEGURANÇA: Se o pedido for marcado como testMode/simulado mas a requisição estiver em PRODUÇÃO,
  // bloqueia sumariamente qualquer aprovação simulada.
  const isSimulationAllowed = isLocalhostPaymentSimulationAllowed(request, env);
  if (order.isTestMode && !isSimulationAllowed) {
    console.warn(`[Security Alert] Tentativa de validação de pedido simulado ${orderId} em PRODUÇÃO bloqueada.`);
    return new Response(
      JSON.stringify({
        success: false,
        paid: false,
        error: 'Acesso negado: pagamentos simulados são estritamente proibidos em produção.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Se já está aprovado, retorna imediatamente
  if (order.status === 'approved') {
    if (order.isTestMode && !isSimulationAllowed) {
      return new Response(
        JSON.stringify({ success: false, paid: false, error: 'Pedido inválido em produção.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        paid: true,
        status: 'approved',
        order,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Se ainda está pendente, consulta o status oficial na Stripe
  if (order.stripePaymentIntentId) {
    try {
      const stripeStatus = await getStripePaymentIntent(env, order.stripePaymentIntentId);
      if (stripeStatus.success && stripeStatus.isPaid) {
        order.status = 'approved';
        order.paidAt = new Date().toISOString();
        order.paidAmount = stripeStatus.amount;
        order.paymentMethod = 'stripe_pix';
        order.updatedAt = new Date().toISOString();

        // Atualiza Supabase orders
        await updateOrderInSupabase(env, orderId, {
          status: 'paid',
          paid_at: order.paidAt,
        });

        // Atualiza appointments se for agendamento
        if (orderId.startsWith('app_') || orderId.startsWith('apt_') || order.itemSlug?.startsWith('chamada-')) {
          const cleanAppId = orderId.replace(/^apt_/, '');
          const app = (await getAppointmentByIdFromSupabase(env, orderId)) || (await getAppointmentByIdFromSupabase(env, cleanAppId));
          if (app) {
            app.status = 'confirmada';
            if (app.payment) app.payment.status = 'approved';
            await saveAppointmentToSupabase(env, app);
          }
        }

        // Atualiza personalizados_orders se for encomenda personalizada
        if (orderId.startsWith('ped_') || orderId.startsWith('pers_') || order.itemSlug?.startsWith('personalizado')) {
          const pers = await getPersonalizadoOrderFromSupabase(env, orderId);
          if (pers) {
            pers.status = 'em_producao';
            if (pers.payment) pers.payment.status = 'approved';
            await savePersonalizadoOrderToSupabase(env, pers);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            paid: true,
            status: 'approved',
            order,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (stripeErr) {
      console.warn(`[Status Check Stripe Error for order ${orderId}]:`, stripeErr);
    }
  }

  // 3. Fallback de contingência para pedidos legados criados anteriormente via Mercado Pago
  if (order.mpPaymentId) {
    try {
      const mpStatus = await getMercadoPagoPayment(env, order.mpPaymentId);
      if (mpStatus.success && mpStatus.status === 'approved') {
        order.status = 'approved';
        order.paidAt = mpStatus.dateApproved || new Date().toISOString();
        order.paidAmount = mpStatus.amount;
        order.paymentMethod = mpStatus.paymentMethod || 'pix';
        order.updatedAt = new Date().toISOString();

        await updateOrderInSupabase(env, orderId, {
          status: 'paid',
          paid_at: order.paidAt,
        });

        return new Response(
          JSON.stringify({
            success: true,
            paid: true,
            status: 'approved',
            order,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (mpErr) {
      console.warn(`[Status Check Legacy MP Error for order ${orderId}]:`, mpErr);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      paid: false,
      status: order.status || 'pending',
      order,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export const onRequestGet = handleStatusCheck;
export const onRequestPost = handleStatusCheck;
