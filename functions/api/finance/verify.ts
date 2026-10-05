/**
 * Cloudflare Pages Function: /api/finance/verify
 *
 * GET: Consulta e reconcilia ativamente o status de uma parcela
 * junto à API do Mercado Pago caso o webhook tenha sofrido latência de entrega.
 */

import {
  FinancialInstallment,
  getDefaultInstallments,
  KV_FINANCE_KEY,
} from '../../../lib/financeCanonical';
import { computeReceiptHash } from '../../../lib/generateReceiptPdf';
import { recordAuditEvent } from '../_auditHelper';

interface Env {
  NUA_CONTENT?: any;
  CONTENT_KV?: any;
  MP_ACCESS_TOKEN?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const kv = env.NUA_CONTENT || env.CONTENT_KV;

  try {
    const url = new URL(request.url);
    const installmentId = url.searchParams.get('installmentId');

    if (!installmentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'installmentId obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Carrega as parcelas do KV
    let installments: FinancialInstallment[] = [];
    if (kv && typeof kv.get === 'function') {
      const stored = await kv.get(KV_FINANCE_KEY);
      if (stored) {
        try {
          installments = JSON.parse(stored);
        } catch {}
      }
    }

    if (installments.length === 0) {
      installments = getDefaultInstallments();
    }

    const installment = installments.find((i) => i.id === installmentId);
    if (!installment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parcela não encontrada.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Se já estiver pago, retorna imediatamente
    if (installment.status === 'paid') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'paid',
          installment,
          message: 'Parcela já liquidada.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Se houver MP_ACCESS_TOKEN, consulta ativamente na API do Mercado Pago
    const mpToken =
      env.MP_ACCESS_TOKEN ||
      (typeof process !== 'undefined' ? process.env?.MP_ACCESS_TOKEN : undefined);
    if (mpToken) {
      const searchRes = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(
          installmentId
        )}&sort=date_created&criteria=desc`,
        {
          headers: {
            Authorization: `Bearer ${mpToken}`,
          },
        }
      );

      if (searchRes.ok) {
        const searchData: any = await searchRes.json();
        const results: any[] = searchData.results || [];

        if (results.length > 0) {
          const latestPayment = results[0];
          const status = latestPayment.status;
          const paidAmount = Number(latestPayment.transaction_amount || 0);

          if (status === 'approved' && paidAmount >= installment.amount) {
            installment.status = 'paid';
            installment.paymentId = latestPayment.id.toString();
            installment.paymentMethod = latestPayment.payment_method_id || 'mercadopago';
            installment.paidAt = latestPayment.date_approved || new Date().toISOString();
            installment.paidAmount = paidAmount;
            installment.receiptHash = await computeReceiptHash(installment);
            installment.updatedAt = new Date().toISOString();

            if (kv && typeof kv.put === 'function') {
              await kv.put(KV_FINANCE_KEY, JSON.stringify(installments));
            }

            await recordAuditEvent(env, {
              type: 'CONTENT_PUBLISH',
              ip: request.headers.get('CF-Connecting-IP') || '127.0.0.1',
              userAgent: request.headers.get('User-Agent') || 'Active Verification',
              details: `Reconciliação ativa de pagamento aprovado: ${installment.label} (${installment.referenceMonth})`,
            });

            return new Response(
              JSON.stringify({
                success: true,
                status: 'paid',
                installment,
                reconciled: true,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          } else if (status === 'in_process' || status === 'pending') {
            installment.status = 'in_process';
            installment.paymentId = latestPayment.id.toString();
            installment.updatedAt = new Date().toISOString();
            if (kv && typeof kv.put === 'function') {
              await kv.put(KV_FINANCE_KEY, JSON.stringify(installments));
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: installment.status,
        installment,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Erro ao verificar parcela.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
