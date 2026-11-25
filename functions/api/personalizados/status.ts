/**
 * Cloudflare Pages Function: /api/personalizados/status
 * 
 * Consulta status de pagamento Pix e dispara e-mail para contato@nuaborges.com ao confirmar.
 * Persistência 100% Supabase PostgreSQL.
 */

import { PersonalizadoOrder } from '../../../lib/personalizadosCanonical';
import { getMercadoPagoPayment } from '../_mercadopago';
import { queuePaidOrderEmail } from '../payments/_orderFulfillment';
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

const SAFE_LOOKUP_RE = /^[A-Za-z0-9_-]{4,128}$/;

function buildSanitizedOrder(order: PersonalizadoOrder) {
  const paymentStatus = order.payment?.status || 'pending';
  return {
    id: order.id,
    status: order.status,
    paymentStatus,
    payment: {
      status: paymentStatus,
      amount: order.payment?.amount ?? order.totalPrice,
      method: order.payment?.method || 'mercadopago_pix',
      paidAt: order.payment?.paidAt,
    },
    photoCount: order.photoCount,
    videoOptionId: order.videoOptionId,
    videoDurationMinutes: order.videoDurationMinutes || 0,
    mentionName: Boolean(order.mentionName),
    express24h: Boolean(order.express24h),
    deliveryChannel: order.deliveryChannel,
    totalPrice: order.totalPrice,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveredAt: order.deliveredAt,
    vaultFiles: [],
    vaultFilesCount: Array.isArray(order.vaultFiles) ? order.vaultFiles.length : 0,
    hasBriefing: Boolean(order.briefing),
  };
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || '').trim();
  const orderIdParam = (url.searchParams.get('orderId') || '').trim();
  const lookupKey = token || orderIdParam;

  if (!lookupKey || !SAFE_LOOKUP_RE.test(lookupKey)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Parâmetro token ou orderId inválido ou ausente.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Consulta no Supabase PostgreSQL
  const order = await getPersonalizadoOrderFromSupabase(env, lookupKey);
  if (order) {
    return new Response(
      JSON.stringify({ success: true, order: buildSanitizedOrder(order) }),
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
      token?: string;
    };

    const lookupKey = (body.token || body.orderId || '').trim();
    if (!lookupKey || !SAFE_LOOKUP_RE.test(lookupKey)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identificador de pedido inválido ou ausente.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Recupera do Supabase
    let order: PersonalizadoOrder | null = await getPersonalizadoOrderFromSupabase(env, lookupKey);

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não localizado no sistema.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Já está aprovado anteriormente — ainda garante disparo idempotente caso webhook/polling anterior tenha falhado
    if (order.payment?.status === 'approved') {
      await queuePaidOrderEmail(env, 'custom', order.id).catch(() => {});
      return new Response(
        JSON.stringify({ success: true, paid: true, order: buildSanitizedOrder(order) }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let wasPaid = false;
    let paymentDetails: any = null;

    // Aprovação com confirmação oficial do Mercado Pago + validação estrita de valor e moeda
    if (order.payment?.transactionId) {
      const txId = order.payment.transactionId;
      try {
        const mpCheck = await getMercadoPagoPayment(env, txId);
        const expectedTotal = Number(order.totalPrice || order.payment?.amount || 0);
        const actualAmount = Number(mpCheck?.amount || 0);
        const actualCurrency = String(mpCheck?.raw?.currency_id || 'BRL').toUpperCase();
        if (
          mpCheck?.success &&
          mpCheck.status === 'approved' &&
          actualCurrency === 'BRL' &&
          actualAmount + 0.01 >= expectedTotal
        ) {
          wasPaid = true;
          paymentDetails = mpCheck;
        }
      } catch (mpErr) {
        console.warn('[Personalizados Status] Erro ao consultar Mercado Pago:', mpErr);
      }
    }

    if (wasPaid) {
      const nowIso = paymentDetails?.dateApproved || new Date().toISOString();
      order.payment.status = 'approved';
      order.payment.paidAt = nowIso;
      if (paymentDetails?.paymentMethod) {
        order.payment.method = paymentDetails.paymentMethod;
      }
      // Nunca regride status operacional de pedido já pronto, entregue ou cancelado
      if (order.status === 'aguardando_pagamento') {
        order.status = 'em_producao';
      }
      order.updatedAt = nowIso;

      // 1. Atualiza no Supabase PostgreSQL (personalizados_orders)
      const saved = await savePersonalizadoOrderToSupabase(env, order);
      if (!saved.success) return Response.json({ success: false, error: 'Falha ao salvar a confirmação do pedido.' }, { status: 503 });

      // 2. Atualiza no Supabase PostgreSQL (orders)
      await updateOrderInSupabase(env, order.id, {
        status: 'paid',
        paid_at: nowIso,
      });

      // 3. Disparo idempotente de e-mail para administração e cliente
      await queuePaidOrderEmail(env, 'custom', order.id).catch((mailErr) => {
        console.error('[Personalizados Status] Falha no envio de e-mail:', mailErr);
      });

      return new Response(
        JSON.stringify({ success: true, paid: true, order: buildSanitizedOrder(order) }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, paid: false, order: buildSanitizedOrder(order) }),
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
