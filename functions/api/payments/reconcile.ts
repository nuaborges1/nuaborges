/**
 * Cloudflare Pages Function: POST /api/payments/reconcile
 *
 * Reconciliação periódica (acionada por Cron Trigger ou painel administrativo autenticado).
 * Identifica pedidos `pending` que já foram aprovados/estornados no Mercado Pago sem webhook
 * e reaplica o processamento oficial pela camada única `_paymentEngine.ts`.
 */

import { getMercadoPagoPayment } from '../_mercadopago';
import { getSupabaseClient } from '../_supabaseClient';
import { NuaIdEnv, recordCustomerAuditEvent } from '../id/_nuaIdStore';
import { processVerifiedMercadoPagoPayment } from './_paymentEngine';
import { createSupabasePaymentDependencies } from '../webhooks/mercadopago-v2';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const { env } = context;
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

  const sb = getSupabaseClient(env);
  if (!sb) {
    return new Response(JSON.stringify({ success: false, error: 'Supabase não configurado.' }), {
      status: 503,
      headers,
    });
  }

  try {
    // Busca até 30 pedidos pendentes recentes com payment_id associado
    const { data: pendingOrders, error } = await sb
      .from('orders')
      .select('id, stripe_payment_intent_id, status, created_at')
      .eq('status', 'pending')
      .neq('stripe_payment_intent_id', '')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers,
      });
    }

    const deps = createSupabasePaymentDependencies(env);
    const summary = { checked: 0, reconciled: 0, errors: 0 };

    for (const row of pendingOrders || []) {
      const paymentId = String(row.stripe_payment_intent_id || '').trim();
      if (!paymentId || paymentId.startsWith('SIM-')) continue;
      summary.checked++;

      try {
        const mpInfo = await getMercadoPagoPayment(env, paymentId);
        if (mpInfo.success && mpInfo.status !== 'pending' && mpInfo.status !== 'in_process') {
          const res = await processVerifiedMercadoPagoPayment(
            env,
            {
              paymentId,
              status: mpInfo.status,
              statusDetail: mpInfo.statusDetail,
              transactionAmount: mpInfo.amount,
              currencyId: String(mpInfo.raw?.currency_id || 'BRL'),
              externalReference: String(mpInfo.externalReference || row.id),
              paymentMethodId: mpInfo.paymentMethod,
              dateApproved: mpInfo.dateApproved || null,
              dateLastUpdated: mpInfo.raw?.date_last_updated || null,
            },
            deps
          );
          if (res.processed) summary.reconciled++;
        }
      } catch (err) {
        summary.errors++;
        console.warn(`[Reconcile] Erro ao reconciliar pedido ${row.id}:`, err);
      }
    }

    await recordCustomerAuditEvent(env, {
      profileId: null,
      action: 'payment_reconciliation_run',
      details: summary,
    });

    return new Response(JSON.stringify({ success: true, ...summary }), { status: 200, headers });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erro na reconciliação.' }),
      { status: 500, headers }
    );
  }
};
