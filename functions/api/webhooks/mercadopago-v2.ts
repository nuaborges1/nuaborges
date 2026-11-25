/**
 * Cloudflare Pages Function: POST /api/webhooks/mercadopago-v2
 *
 * Novo receptor de webhooks do NUA ID (estratégia Strangler).
 * NÃO modifica o webhook legado (/api/finance/webhook) até a aprovação do Gate 2.
 * - Validação HMAC-SHA256 fail-closed (x-signature)
 * - Consulta obrigatória na API do Mercado Pago (nunca confia no payload)
 * - Processamento unificado via `_paymentEngine.ts` (idempotência, conferência de valor/moeda,
 *   concessão/revogação de entitlements, estorno automático para hold expirado em VIP)
 */

import { getMercadoPagoPayment, refundMercadoPagoPayment } from '../_mercadopago';
import { isReplaceablePixCancellation } from '../payments/_pixRenewal';
import {
  getAppointmentByIdFromSupabase,
  getOrderFromSupabase,
  getPersonalizadoOrderFromSupabase,
  saveAppointmentToSupabase,
  savePersonalizadoOrderToSupabase,
  updateOrderInSupabase,
} from '../_supabaseStore';
import { queuePaidOrderEmail } from '../payments/_orderFulfillment';
import { NuaIdEnv } from '../id/_nuaIdStore';
import {
  OrderDomainTarget,
  processVerifiedMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from '../payments/_paymentEngine';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export function createSupabasePaymentDependencies(env: NuaIdEnv) {
  return {
    async notifyApprovedOrder(target: OrderDomainTarget) {
      if (target.kind === 'vip' || target.kind === 'custom') {
        await queuePaidOrderEmail(env, target.kind, target.orderRef);
      }
    },
    async loadOrderTarget(externalReference: string): Promise<OrderDomainTarget | null> {
      const ref = String(externalReference || '').trim();
      if (!ref) return null;

      // 1. Chamadas VIP (prefixo estrito apt_, book_, app_ ou nua_call_)
      if (
        ref.startsWith('apt_') ||
        ref.startsWith('book_') ||
        ref.startsWith('app_') ||
        ref.startsWith('nua_call_')
      ) {
        const match = ref.match(/((?:book|app)_[a-zA-Z0-9_-]+)/);
        const bookingId = match ? match[1] : ref.replace(/^apt_/, '');
        const booking = await getAppointmentByIdFromSupabase(env, bookingId);
        if (!booking) return null;
        return {
          orderRef: booking.id,
          activePaymentId: booking.payment?.transactionId,
          kind: 'vip',
          resourceId: booking.modalityId,
          title: booking.modalityName || 'Chamada VIP',
          expectedAmountCents: Math.round(Number(booking.price || 0) * 100),
          currency: 'BRL',
          currentStatus: booking.status,
          profileId: (booking as any).profileId || null,
          customerEmail: booking.clientEmail || null,
          customerName: booking.clientName || null,
          holdExpiresAt: booking.expiresAt || null,
          slotStillAvailable: booking.status === 'aguardando_pagamento',
        };
      }

      // 2. Personalizados (prefixo estrito ped_, pers_, nua_pers_ ou nua_personalizado_)
      if (
        ref.startsWith('ped_') ||
        ref.startsWith('pers_') ||
        ref.startsWith('nua_pers_') ||
        ref.startsWith('nua_personalizado_')
      ) {
        const stripped = ref.replace(/^nua_(?:pers|personalizado)_/, '');
        const match = stripped.match(/((?:ped|pers)_[a-zA-Z0-9_-]+)/);
        const persId = match ? match[1] : stripped;
        const pers = await getPersonalizadoOrderFromSupabase(env, persId);
        if (!pers) return null;
        return {
          orderRef: pers.id,
          activePaymentId: pers.payment?.transactionId,
          kind: 'custom',
          resourceId: pers.id,
          title: `Personalizado (${pers.photoCount} fotos)`,
          expectedAmountCents: Math.round(Number(pers.totalPrice || 0) * 100),
          currency: 'BRL',
          currentStatus: pers.status,
          profileId: (pers as any).profileId || null,
          customerEmail: pers.clientContact?.includes('@') ? pers.clientContact : null,
          customerName: pers.clientName || null,
          allowDownload: true,
        };
      }

      // 3. Packs & Conteúdos Avulsos (prefixo estrito ord_ ou nua_pack_ / nua_avulso_)
      const ordMatch = ref.match(/(ord_[a-zA-Z0-9_-]+)/);
      const orderId = ordMatch ? ordMatch[1] : ref;
      const order = await getOrderFromSupabase(env, orderId);
      if (!order) return null;

      return {
        orderRef: order.id,
        activePaymentId: order.paymentId,
        kind: 'pack',
        resourceId: order.packId,
        title: order.packId,
        expectedAmountCents: Math.round(Number(order.amount || 0) * 100),
        currency: 'BRL',
        currentStatus: order.status,
        profileId: (order as any).profileId || null,
        customerEmail: order.customerEmail || null,
        customerName: order.customerName || null,
        expiresAt: null,
        allowDownload: false,
      };
    },

    async updateOrderState(
      target: OrderDomainTarget,
      next: {
        financialStatus: string;
        operationalStatus?: string;
        paymentId: string;
        paymentMethod?: string;
        paidAt?: string | null;
        refundId?: string;
      }
    ): Promise<void> {
      const mappedOrderStatus =
        next.financialStatus === 'paid'
          ? 'paid'
          : next.financialStatus === 'refunded' || next.financialStatus === 'charged_back'
            ? 'refunded'
            : next.financialStatus === 'cancelled' || next.financialStatus === 'failed'
              ? 'cancelled'
              : 'pending';

      const syncOrdersMirror = async () => {
        const saved = await updateOrderInSupabase(env, target.orderRef, {
          status: mappedOrderStatus,
          payment_id: next.paymentId,
          payment_method: next.paymentMethod || 'pix',
          paid_at: next.paidAt || undefined,
        });
        if (!saved.success) throw new Error('Falha ao persistir o pedido comercial.');
      };

      if (target.kind === 'vip') {
        const booking = await getAppointmentByIdFromSupabase(env, target.orderRef);
        if (!booking) throw new Error('Reserva não encontrada durante a atualização.');
        if (next.operationalStatus) {
          booking.status = next.operationalStatus as any;
        }
        if (booking.payment) {
          booking.payment.status =
            next.financialStatus === 'paid'
              ? 'approved'
              : next.financialStatus === 'refunded' || next.financialStatus === 'charged_back'
                ? 'refunded'
                : next.financialStatus === 'failed' || next.financialStatus === 'cancelled'
                  ? 'rejected'
                  : 'pending';
          booking.payment.transactionId = next.paymentId;
          if (next.paidAt) booking.payment.paidAt = next.paidAt;
          if (next.refundId) booking.payment.refundId = next.refundId;
        }
        if (booking.meeting) {
          booking.meeting.visibleToClient = next.financialStatus === 'paid';
        }
        const saved = await saveAppointmentToSupabase(env, booking);
        if (!saved.success) throw new Error('Falha ao persistir o estado da reserva.');
        await syncOrdersMirror();
        return;
      }

      if (target.kind === 'custom') {
        const pers = await getPersonalizadoOrderFromSupabase(env, target.orderRef);
        if (!pers) throw new Error('Personalizado não encontrado durante a atualização.');
        if (next.operationalStatus) {
          const isTerminalDelivered = ['pronto', 'entregue'].includes(pers.status);
          if (!(next.operationalStatus === 'em_producao' && isTerminalDelivered)) {
            pers.status = next.operationalStatus as any;
          }
        }
        if (pers.payment) {
          pers.payment.status =
            next.financialStatus === 'paid'
              ? 'approved'
              : next.financialStatus === 'refunded' || next.financialStatus === 'charged_back'
                ? 'refunded'
                : next.financialStatus === 'failed' || next.financialStatus === 'cancelled'
                  ? 'rejected'
                  : 'pending';
          pers.payment.transactionId = next.paymentId;
          if (next.paidAt) pers.payment.paidAt = next.paidAt;
        }
        const saved = await savePersonalizadoOrderToSupabase(env, pers);
        if (!saved.success) throw new Error('Falha ao persistir o estado do Personalizado.');
        await syncOrdersMirror();
        return;
      }

      await syncOrdersMirror();
    },

    async executeAutoRefund(paymentId: string, orderRef: string, amountCents: number) {
      const res = await refundMercadoPagoPayment(env, paymentId, orderRef, amountCents / 100);
      return { success: res.success, refundId: res.id, error: res.error };
    },
  };
}

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const url = new URL(request.url);
    const body: any = await request.json().catch(() => ({}));

    const topic = String(body?.type || body?.topic || body?.action || url.searchParams.get('topic') || '');
    const paymentId = String(body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || '').trim();

    if (!topic.startsWith('payment') || !paymentId || !/^\d{1,32}$/.test(paymentId)) {
      return new Response(JSON.stringify({ success: true, ignored: true }), { status: 200, headers });
    }

    // 1. Validação criptográfica fail-closed (x-signature)
    const webhookSecret =
      env.MP_WEBHOOK_SECRET ||
      (typeof process !== 'undefined' ? process.env?.MP_WEBHOOK_SECRET : undefined);

    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ success: false, error: 'MP_WEBHOOK_SECRET não configurado.' }),
        { status: 503, headers }
      );
    }

    const sigOk = await verifyMercadoPagoWebhookSignature({
      xSignature: request.headers.get('x-signature') || '',
      dataId: paymentId,
      secret: webhookSecret,
      requestId: request.headers.get('x-request-id') || '',
    });

    if (!sigOk) {
      return new Response(JSON.stringify({ success: false, error: 'Assinatura x-signature inválida.' }), {
        status: 401,
        headers,
      });
    }

    // 2. Consulta oficial no servidor do Mercado Pago (nunca confia no payload)
    const mpInfo = await getMercadoPagoPayment(env, paymentId);
    if (!mpInfo.success) {
      return new Response(JSON.stringify({ success: false, error: 'Falha ao consultar API MP.' }), {
        status: 502,
        headers,
      });
    }

    const reference = String(mpInfo.externalReference || '');
    const strippedReference = reference.replace(/^nua_(?:pers|personalizado|pack|avulso|call)_/, '');
    const orderRef = strippedReference.match(/((?:ord|ped|pers|book|apt|app)_[a-zA-Z0-9_-]+)$/)?.[1];
    if (orderRef && (mpInfo.status === 'pending' || await isReplaceablePixCancellation(env, orderRef, paymentId, mpInfo.raw))) {
      return Response.json({ success: true, ignored: true });
    }

    const result = await processVerifiedMercadoPagoPayment(
      env,
      {
        paymentId,
        status: mpInfo.status,
        statusDetail: mpInfo.statusDetail,
        transactionAmount: mpInfo.amount,
        currencyId: String(mpInfo.raw?.currency_id || 'BRL'),
        externalReference: reference,
        paymentMethodId: mpInfo.paymentMethod,
        dateApproved: mpInfo.dateApproved || null,
        dateLastUpdated: mpInfo.raw?.date_last_updated || null,
      },
      createSupabasePaymentDependencies(env)
    );

    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers });
  } catch (err: any) {
    console.error('[Webhook MP v2] Erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno no processamento do webhook.' }),
      { status: 500, headers }
    );
  }
};
