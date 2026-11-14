/**
 * Cloudflare Pages Function: /api/webhooks/stripe
 *
 * Receptor oficial de Webhooks da Stripe:
 * - checkout.session.completed (Quitação de pedidos personalizados, chamadas e packs)
 * - payment_intent.succeeded
 * - invoice.paid (Faturas quitadas)
 */

import { recordAuditEvent } from '../_auditHelper';
import { timingSafeEqualString } from '../_authHelper';
import { sendPersonalizadoNotificationEmail } from '../personalizados/_emailHelper';
import {
  updateOrderStatusInSupabase,
  getAppointmentByIdFromSupabase,
  saveAppointmentToSupabase,
  getPersonalizadoOrderFromSupabase,
  savePersonalizadoOrderToSupabase,
  getSystemKVFromSupabase,
  setSystemKVInSupabase,
} from '../_supabaseStore';

interface Env {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

/**
 * Validação criptográfica da assinatura HMAC-SHA256 da Stripe (stripe-signature)
 */
async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(',');
  let ts = '';
  const signatures: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k?.trim() === 't') ts = v?.trim();
    if (k?.trim() === 'v1' && v) signatures.push(v.trim());
  }
  if (!/^\d+$/.test(ts) || signatures.length === 0) return false;

  // Tolerância de 15 minutos contra replay attacks
  const tsNum = parseInt(ts, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!isNaN(tsNum) && Math.abs(nowSec - tsNum) > 900) {
    return false;
  }

  try {
    const payloadToSign = `${ts}.${rawBody}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret) as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadToSign) as unknown as BufferSource);
    const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    for (const signature of signatures) {
      if (await timingSafeEqualString(hex, signature)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('stripe-signature') || '';
    const webhookSecret =
      env.STRIPE_WEBHOOK_SECRET ||
      (typeof process !== 'undefined' ? process.env?.STRIPE_WEBHOOK_SECRET : undefined);

    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET ausente.');
      return Response.json({ error: 'Webhook indisponível.' }, { status: 503 });
    }
    if (!(await verifyStripeSignature(rawBody, signatureHeader, webhookSecret))) {
      return Response.json({ error: 'Assinatura inválida.' }, { status: 401 });
    }

    let payload: any = null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }

    if (!payload || !payload.type) {
      return new Response(JSON.stringify({ error: 'Payload inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const eventId = payload.id;
    // Deduplicação idempotente de eventos da Stripe via Supabase
    if (eventId) {
      const alreadyProcessed = await getSystemKVFromSupabase(env, `webhook_event:${eventId}`);
      if (alreadyProcessed) {
        return new Response(
          JSON.stringify({ received: true, deduplicated: true, message: 'Evento já processado anteriormente.' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      await setSystemKVInSupabase(env, `webhook_event:${eventId}`, { processedAt: new Date().toISOString() });
    }

    const eventType = payload.type;
    const dataObject = payload.data?.object || {};

    // 1. Checkout Session Concluída com Sucesso
    if (eventType === 'checkout.session.completed') {
      const orderId = dataObject.client_reference_id || dataObject.metadata?.orderId;
      const orderType = dataObject.metadata?.orderType || 'custom';
      const amountPaid = (dataObject.amount_total || 0) / 100;
      const paymentIntentId = dataObject.payment_intent || dataObject.id;

      if (orderId) {
        // Atualiza a tabela orders do Supabase PostgreSQL (Fonte Canônica)
        await updateOrderStatusInSupabase(env, orderId, 'paid', paymentIntentId).catch(() => {});

        // Atualiza encomenda personalizada no Supabase se aplicável
        if (orderType === 'personalizado') {
          const pers = await getPersonalizadoOrderFromSupabase(env, orderId);
          if (pers && pers.payment?.status !== 'approved') {
            pers.payment = { ...pers.payment, status: 'approved', paidAt: new Date().toISOString(), transactionId: paymentIntentId };
            pers.status = 'em_producao';
            pers.updatedAt = new Date().toISOString();
            await savePersonalizadoOrderToSupabase(env, pers).catch(() => {});

            try {
              await sendPersonalizadoNotificationEmail(env, pers);
            } catch (mErr) {
              console.error('[Stripe Webhook] Erro ao enviar email personalizado:', mErr);
            }

            recordAuditEvent(env, request, {
              type: 'CONTENT_PUBLISH' as any,
              summary: `Pedido Personalizado pago via Stripe: ${pers.clientName} (R$ ${amountPaid})`,
              details: { orderId, stripeSessionId: dataObject.id, amountPaid },
            }).catch(() => {});
          }
        }

        // Atualiza agendamento de chamada no Supabase se aplicável
        if (orderType === 'appointment') {
          const cleanId = orderId.replace(/^apt_/, '');
          const apt = (await getAppointmentByIdFromSupabase(env, orderId)) || (await getAppointmentByIdFromSupabase(env, cleanId));
          if (apt && apt.status !== 'confirmada') {
            apt.status = 'confirmada';
            apt.payment = { ...apt.payment, status: 'approved', paidAt: new Date().toISOString(), transactionId: paymentIntentId };
            apt.meeting.visibleToClient = true;
            if (!Array.isArray(apt.history)) {
              apt.history = [];
            }
            apt.history.push({
              at: new Date().toISOString(),
              action: 'pagamento_webhook_aprovado',
              note: `Pagamento de R$ ${amountPaid.toFixed(2)} confirmado via Stripe (Sessão: ${dataObject.id}).`,
              author: 'system',
            });
            apt.updatedAt = new Date().toISOString();
            await saveAppointmentToSupabase(env, apt).catch(() => {});

            recordAuditEvent(env, request, {
              type: 'CONTENT_PUBLISH' as any,
              summary: `Chamada de Vídeo confirmada via Stripe: ${apt.clientName} (R$ ${amountPaid})`,
              details: { bookingId: orderId, stripeSessionId: dataObject.id, amountPaid },
            }).catch(() => {});
          }
        }

        if (orderType === 'avulso' || orderType === 'vip') {
          recordAuditEvent(env, request, {
            type: 'CONTENT_PUBLISH' as any,
            summary: `Pedido liquidado via Stripe Checkout: ${orderId} (R$ ${amountPaid})`,
            details: { orderId, stripeSessionId: dataObject.id, amountPaid },
          }).catch(() => {});
        }
      }
    }

    // 2. Pagamento Pix ou Direto Concluído (payment_intent.succeeded)
    if (eventType === 'payment_intent.succeeded') {
      const intentId = dataObject.id;
      const amountPaid = (dataObject.amount_received || dataObject.amount || 0) / 100;
      let orderId = dataObject.metadata?.orderId || dataObject.metadata?.bookingId;
      let orderType = dataObject.metadata?.orderType;

      if (orderId) {
        // Atualiza a tabela orders do Supabase PostgreSQL (Fonte Canônica)
        await updateOrderStatusInSupabase(env, orderId, 'paid', intentId).catch(() => {});

        // Atualiza encomenda personalizada no Supabase se aplicável
        if (orderType === 'personalizado') {
          const pers = await getPersonalizadoOrderFromSupabase(env, orderId);
          if (pers && pers.payment?.status !== 'approved') {
            pers.payment = { ...pers.payment, status: 'approved', paidAt: new Date().toISOString(), transactionId: intentId, method: 'stripe_pix' };
            pers.status = 'em_producao';
            pers.updatedAt = new Date().toISOString();
            await savePersonalizadoOrderToSupabase(env, pers).catch(() => {});

            try {
              await sendPersonalizadoNotificationEmail(env, pers);
            } catch (mErr) {
              console.error('[Stripe Webhook] Erro ao enviar email personalizado:', mErr);
            }

            recordAuditEvent(env, request, {
              type: 'CONTENT_PUBLISH' as any,
              summary: `Pedido Personalizado pago via Stripe Pix: ${pers.clientName} (R$ ${amountPaid})`,
              details: { orderId, intentId, amountPaid },
            }).catch(() => {});
          }
        }

        // Atualiza agendamento de chamada no Supabase se aplicável
        if (orderType === 'appointment') {
          const cleanId = orderId.replace(/^apt_/, '');
          const apt = (await getAppointmentByIdFromSupabase(env, orderId)) || (await getAppointmentByIdFromSupabase(env, cleanId));
          if (apt && apt.status !== 'confirmada') {
            apt.status = 'confirmada';
            apt.payment = { ...apt.payment, status: 'approved', paidAt: new Date().toISOString(), transactionId: intentId, method: 'stripe_pix' };
            apt.meeting.visibleToClient = true;
            if (!Array.isArray(apt.history)) {
              apt.history = [];
            }
            apt.history.push({
              at: new Date().toISOString(),
              action: 'pagamento_webhook_aprovado',
              note: `Pagamento Pix de R$ ${amountPaid.toFixed(2)} confirmado via Stripe (ID: ${intentId}).`,
              author: 'system',
            });
            apt.updatedAt = new Date().toISOString();
            await saveAppointmentToSupabase(env, apt).catch(() => {});

            recordAuditEvent(env, request, {
              type: 'CONTENT_PUBLISH' as any,
              summary: `Chamada de Vídeo confirmada via Stripe Pix: ${apt.clientName} (R$ ${amountPaid})`,
              details: { bookingId: orderId, intentId, amountPaid },
            }).catch(() => {});
          }
        }

        if (!orderType || orderType === 'avulso' || orderType === 'vip') {
          recordAuditEvent(env, request, {
            type: 'CONTENT_PUBLISH' as any,
            summary: `Pedido liquidado via Stripe Pix: ${orderId} (R$ ${amountPaid})`,
            details: { orderId, intentId, amountPaid },
          }).catch(() => {});
        }
      }
    }

    // 3. Fatura Paga (Invoice Paid)
    if (eventType === 'invoice.paid') {
      const invoiceNumber = dataObject.number || dataObject.id;
      const amountPaid = (dataObject.amount_paid || 0) / 100;
      const customer = dataObject.customer_name || dataObject.customer_email || 'Cliente';

      recordAuditEvent(env, request, {
        type: 'CONTENT_PUBLISH' as any,
        summary: `Fatura Stripe #${invoiceNumber} quitada por ${customer} (R$ ${amountPaid})`,
        details: { invoiceId: dataObject.id, amountPaid },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Stripe Webhook Error]:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Erro no webhook' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestGet = async () => {
  return new Response(JSON.stringify({ status: 'active', gateway: 'stripe' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
