/**
 * Cloudflare Pages Function: GET/POST /api/payments/status
 *
 * Consulta o status de pagamento de um pedido avulso ou VIP com contingência ativa no Mercado Pago.
 * Persistência 100% no Supabase PostgreSQL.
 */

import { getMercadoPagoPayment, refundMercadoPagoPayment } from '../_mercadopago';
import { isLocalhostPaymentSimulationAllowed } from '../_security';
import {
  queuePaidOrderEmail,
  finalizePaidPackOrder,
} from './_orderFulfillment';
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
    const resolvedMpId =
      (sbOrder as any).paymentId ||
      (sbOrder as any).mpPaymentId ||
      (sbOrder as any).payment_id ||
      (sbOrder as any).mp_payment_id ||
      sbOrder.providerPaymentId;
    const isSimulatedRecord =
      sbOrder.paymentMethod === 'simulated_local_pix' ||
      String(resolvedMpId || '').startsWith('sim_') ||
      String(resolvedMpId || '').startsWith('SIM-');
    order = {
      orderId: sbOrder.id,
      // purchaseToken é credencial de acesso: nunca devolvido por consulta de status (apenas pelo create-pix).
      itemSlug: sbOrder.packId,
      amount: sbOrder.amount,
      status: sbOrder.status === 'paid' ? 'approved' : sbOrder.status,
      mpPaymentId: resolvedMpId,
      paymentMethod: sbOrder.paymentMethod,
      isTestMode: isSimulatedRecord,
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

  // 2. Consulta de pagamento oficial no Mercado Pago (nunca reaprova cancelado/reembolsado)
  const isTerminalCancelled = ['cancelled', 'cancelado', 'refunded', 'charged_back'].includes(
    String(order.status || '').toLowerCase()
  );
  if (order.mpPaymentId && !isTerminalCancelled) {
    try {
      const mpStatus = await getMercadoPagoPayment(env, order.mpPaymentId);
      const expectedAmount = Number(order.amount || 0);
      const paidAmount = Number(mpStatus.amount || 0);
      const currencyId = String(mpStatus.raw?.currency_id || '').toUpperCase();
      const extRef = String(mpStatus.externalReference || '').trim();
      const canonicalOrderRef = order.orderId;
      const refs = new Set([canonicalOrderRef, 'apt_' + canonicalOrderRef, 'nua_pers_' + canonicalOrderRef]);
      if (order.itemSlug) {
        if (/^(?:app|apt|book)_/.test(order.itemSlug)) refs.add('apt_' + order.itemSlug);
        if (/^(?:ped|pers)_/.test(order.itemSlug)) refs.add('nua_pers_' + order.itemSlug);
        refs.add('nua_pack_' + order.itemSlug + '_' + canonicalOrderRef);
        refs.add('nua_avulso_' + order.itemSlug + '_' + canonicalOrderRef);
      }
      const refMatchesOrder = refs.has(extRef);

      if (
        mpStatus.success &&
        mpStatus.status === 'approved' &&
        currencyId === 'BRL' &&
        refMatchesOrder &&
        expectedAmount > 0 &&
        Math.round(paidAmount * 100) >= Math.round(expectedAmount * 100)
      ) {
        const paidAtIso = mpStatus.dateApproved || new Date().toISOString();
        const isVip =
          orderId.startsWith('app_') ||
          orderId.startsWith('apt_') ||
          orderId.startsWith('book_') ||
          /^(?:app_|apt_|book_|chamada-)/.test(order.itemSlug || '');
        const isCustom =
          orderId.startsWith('ped_') ||
          orderId.startsWith('pers_') ||
          /^(?:ped_|pers_|personalizado)/.test(order.itemSlug || '');

        // NUA-AUD-006: valida validade do agendamento VIP ANTES de marcar `orders` como `paid`
        let confirmedVipId: string | null = null;
        if (isVip) {
          const cleanAppId = orderId.replace(/^apt_/, '');
          const app =
            (await getAppointmentByIdFromSupabase(env, orderId)) ||
            (await getAppointmentByIdFromSupabase(env, cleanAppId)) ||
            (order.itemSlug ? await getAppointmentByIdFromSupabase(env, order.itemSlug) : null);

          if (app && app.status === 'aguardando_pagamento') {
            const holdMs = app.expiresAt ? Date.parse(app.expiresAt) : NaN;
            const approvedMs = mpStatus.dateApproved ? Date.parse(mpStatus.dateApproved) : NaN;
            const paidBeforeExpiry =
              Number.isFinite(holdMs) && Number.isFinite(approvedMs) && approvedMs <= holdMs;
            // Se o pagamento foi aprovado antes do vencimento (webhook/consulta atrasada) ou a vaga
            // ainda está reservada exclusivamente para este pedido, confirma normalmente sem estornar.
            const isLateAfterExpiry =
              Number.isFinite(holdMs) &&
              Date.now() > holdMs &&
              !paidBeforeExpiry &&
              Boolean(app.payment?.status === 'rejected');
            if (isLateAfterExpiry) {
              const refundRes = await refundMercadoPagoPayment(
                env,
                String(order.mpPaymentId),
                orderId,
                paidAmount
              ).catch(() => ({ success: false }));
              await updateOrderInSupabase(env, orderId, {
                status: refundRes.success ? 'refunded' : 'cancelled',
                payment_id: order.mpPaymentId,
              });
              return new Response(
                JSON.stringify({
                  success: true,
                  paid: false,
                  status: refundRes.success ? 'refunded' : 'expired',
                  error: 'O prazo da reserva VIP expirou antes do pagamento. Estorno automático solicitado.',
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              );
            }
            app.status = 'confirmada';
            if (app.payment) {
              app.payment.status = 'approved';
              app.payment.paidAt = paidAtIso;
              app.payment.transactionId = String(order.mpPaymentId || app.payment.transactionId || '');
            }
            if (app.meeting) app.meeting.visibleToClient = true;
            const saved = await saveAppointmentToSupabase(env, app);
            if (!saved.success) return persistenceFailed();
            confirmedVipId = app.id;
          } else if (app && app.status === 'confirmada') {
            confirmedVipId = app.id;
          }
        }

        order.status = 'approved';
        order.paidAt = paidAtIso;
        order.paidAmount = mpStatus.amount;
        order.paymentMethod = mpStatus.paymentMethod || 'mercadopago_pix';
        order.updatedAt = new Date().toISOString();


        // Atualiza personalizados_orders se for encomenda personalizada (sem regredir pronto/entregue/cancelado)
        let confirmedCustomId: string | null = null;
        if (isCustom) {
          const pers = await getPersonalizadoOrderFromSupabase(env, orderId)
            || (order.itemSlug ? await getPersonalizadoOrderFromSupabase(env, order.itemSlug) : null);
          if (pers) {
            if (pers.status === 'aguardando_pagamento') {
              pers.status = 'em_producao';
            }
            if (pers.payment) {
              pers.payment.status = 'approved';
              pers.payment.paidAt = order.paidAt;
            }
            const saved = await savePersonalizadoOrderToSupabase(env, pers);
            if (!saved.success) return persistenceFailed();
            confirmedCustomId = pers.id;
          }
          if (!confirmedCustomId) return persistenceFailed();
        }
        if (isVip && !confirmedVipId) return persistenceFailed();

        const saved = await updateOrderInSupabase(env, orderId, { status: 'paid', payment_id: order.mpPaymentId });
        if (!saved.success) return persistenceFailed();

        // Sincroniza registro financeiro, entitlement NUA ID e e-mail transacional idempotente
        const payMeta = {
          paymentId: String(order.mpPaymentId || ''),
          amount: Number(order.paidAmount || order.amount || 0),
          paymentMethod: order.paymentMethod || 'mercadopago_pix',
          paidAt: order.paidAt,
        };
        try {
          if (isVip && confirmedVipId) {
            await queuePaidOrderEmail(env, 'vip', confirmedVipId);
          } else if (confirmedCustomId) {
            await queuePaidOrderEmail(env, 'custom', confirmedCustomId);
          } else if (!isVip) {
            await finalizePaidPackOrder(env, orderId, payMeta);
          }
        } catch (fulfillErr) {
          console.error(`[Status Check Fulfillment Error for ${orderId}]:`, fulfillErr);
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

function persistenceFailed() {
  return Response.json({ success: false, error: 'Não foi possível salvar a confirmação do pagamento.' }, { status: 503 });
}
