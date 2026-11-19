/**
 * Cloudflare Pages Function: GET/POST /api/payments/status
 *
 * Consulta o status de pagamento de um pedido avulso ou VIP com contingência ativa no Mercado Pago.
 * Persistência 100% no Supabase PostgreSQL.
 */

import { getMercadoPagoPayment } from '../_mercadopago';
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
      mpPaymentId: (sbOrder as any).paymentId || (sbOrder as any).mpPaymentId || (sbOrder as any).payment_id || (sbOrder as any).mp_payment_id || sbOrder.stripePaymentIntentId,
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

  // 2. Consulta de pagamento oficial no Mercado Pago
  if (order.mpPaymentId) {
    try {
      const mpStatus = await getMercadoPagoPayment(env, order.mpPaymentId);
      if (mpStatus.success && mpStatus.status === 'approved') {
        order.status = 'approved';
        order.paidAt = mpStatus.dateApproved || new Date().toISOString();
        order.paidAmount = mpStatus.amount;
        order.paymentMethod = mpStatus.paymentMethod || 'mercadopago_pix';
        order.updatedAt = new Date().toISOString();

        await updateOrderInSupabase(env, orderId, {
          status: 'paid',
          payment_id: order.mpPaymentId,
        });

        // Atualiza appointments se for agendamento (somente se ainda estiver aguardando_pagamento e dentro da validade!)
        if (orderId.startsWith('app_') || orderId.startsWith('apt_') || orderId.startsWith('book_') || order.itemSlug?.startsWith('chamada-')) {
          const cleanAppId = orderId.replace(/^apt_/, '');
          const app = (await getAppointmentByIdFromSupabase(env, orderId)) || (await getAppointmentByIdFromSupabase(env, cleanAppId));
          if (app && app.status === 'aguardando_pagamento') {
            const isExpired = Boolean(app.expiresAt && app.expiresAt <= new Date().toISOString());
            if (!isExpired) {
              app.status = 'confirmada';
              if (app.payment) app.payment.status = 'approved';
              if (app.meeting) app.meeting.visibleToClient = true;
              await saveAppointmentToSupabase(env, app);
            }
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
    } catch (mpErr) {
      console.warn(`[Status Check MP Error for order ${orderId}]:`, mpErr);
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
