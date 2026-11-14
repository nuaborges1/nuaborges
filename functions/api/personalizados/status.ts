/**
 * Cloudflare Pages Function: /api/personalizados/status
 * 
 * Consulta status de pagamento Pix e dispara e-mail para contato@nuaborges.com ao confirmar.
 * Persistência 100% Supabase PostgreSQL.
 */

import { PersonalizadoOrder } from '../../../lib/personalizadosCanonical';
import { getMercadoPagoPayment } from '../_mercadopago';
import { sendPersonalizadoNotificationEmail } from './_emailHelper';
import {
  getPersonalizadoOrderFromSupabase,
  savePersonalizadoOrderToSupabase,
  updateOrderInSupabase,
} from '../_supabaseStore';

interface Env {
  MP_ACCESS_TOKEN?: string;
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

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || '').trim();
  const orderIdParam = (url.searchParams.get('orderId') || '').trim();
  const lookupKey = token || orderIdParam;

  if (!lookupKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Parâmetro token ou orderId obrigatório.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Consulta no Supabase PostgreSQL
  const order = await getPersonalizadoOrderFromSupabase(env, lookupKey);
  if (order) {
    const isCompleted = order.status === 'completed' || order.status === 'approved';
    const sanitizedOrder = {
      id: order.id,
      status: order.status,
      paymentStatus: order.payment?.status || 'pending',
      photoCount: order.photoCount,
      videoOptionId: order.videoOptionId,
      deliveryChannel: order.deliveryChannel,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      vaultFiles: isCompleted ? (order.vaultFiles || []) : [],
      hasBriefing: Boolean(order.briefing),
    };
    return new Response(
      JSON.stringify({ success: true, order: sanitizedOrder }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: 'Pedido não localizado.' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string;
      simulate?: boolean;
      confirm?: boolean;
    };

    const orderId = (body.orderId || '').trim();
    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'orderId obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Recupera do Supabase
    let order: PersonalizadoOrder | null = await getPersonalizadoOrderFromSupabase(env, orderId);

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não localizado no sistema.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Já está aprovado anteriormente
    if (order.payment?.status === 'approved') {
      return new Response(
        JSON.stringify({ success: true, paid: true, order }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let wasPaid = false;
    let paymentDetails: any = null;

    // Aprovação com confirmação oficial do Mercado Pago
    if (order.payment?.transactionId) {
      const txId = order.payment.transactionId;
      try {
        const mpCheck = await getMercadoPagoPayment(env, txId);
        if (mpCheck?.success && mpCheck.isPaid) {
          wasPaid = true;
          paymentDetails = mpCheck;
        }
      } catch (mpErr) {
        console.warn('[Personalizados Status] Erro ao consultar Mercado Pago:', mpErr);
      }
    }

    if (wasPaid) {
      const nowIso = new Date().toISOString();
      order.payment.status = 'approved';
      order.payment.paidAt = nowIso;
      if (paymentDetails?.paymentMethodId) {
        order.payment.transactionId = String(paymentDetails.id || order.payment.transactionId);
      }
      order.status = 'em_producao';
      order.updatedAt = nowIso;

      // 1. Atualiza no Supabase PostgreSQL (personalizados_orders)
      await savePersonalizadoOrderToSupabase(env, order);

      // 2. Atualiza no Supabase PostgreSQL (orders)
      await updateOrderInSupabase(env, order.id, {
        status: 'paid',
        paid_at: nowIso,
      });

      // DISPARO DO E-MAIL DE NOTIFICAÇÃO PARA CONTATO@NUABORGES.COM
      try {
        await sendPersonalizadoNotificationEmail(env, order);
      } catch (mailErr) {
        console.error('[Personalizados Status] Falha no envio de e-mail:', mailErr);
      }

      return new Response(
        JSON.stringify({ success: true, paid: true, order }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, paid: false, order }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Personalizados Status API Error]:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao verificar status do pagamento Pix.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
