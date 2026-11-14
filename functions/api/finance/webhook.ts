/**
 * Cloudflare Pages Function: /api/finance/webhook
 *
 * POST: Receptor oficial do Webhook do Mercado Pago.
 *
 * Fluxo de Segurança:
 * 1. Extrai ID do evento e tipo;
 * 2. Valida assinatura criptográfica x-signature (HMAC-SHA256) contra MP_WEBHOOK_SECRET (fail-closed em produção);
 * 3. Consulta a API oficial do Mercado Pago (GET /v1/payments/{id}) com MP_ACCESS_TOKEN;
 * 4. Valida se o status real é 'approved' e se o valor pago é >= valor canônico do produto/agendamento;
 * 5. Garante idempotência (evita reprocessamento do mesmo payment_id);
 * 6. Marca o pedido/agendamento como quitado no KV;
 * 7. Grava log de auditoria com argumentos corretos.
 */

import {
  FinancialInstallment,
  getDefaultInstallments,
  KV_FINANCE_KEY,
} from '../../../lib/financeCanonical';
import { recordAuditEvent } from '../_auditHelper';
import { computeReceiptHash } from '../../../lib/generateReceiptPdf';
import { timingSafeEqualString } from '../_authHelper';
import { getFinanceInstallments, saveFinanceInstallments } from './_financeStore';

interface Env {
  MP_ACCESS_TOKEN?: string;
  MP_WEBHOOK_SECRET?: string;
  ADMIN_API_SECRET?: string;
  ENVIRONMENT?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

/**
 * Validação criptográfica da assinatura HMAC-SHA256 do Mercado Pago
 */
async function verifyMPSignature(
  xSignature: string,
  dataId: string,
  secret: string,
  requestId = ''
): Promise<boolean> {
  if (!xSignature || !secret) return false;
  const parts = xSignature.split(',');
  let ts = '';
  let v1 = '';
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key?.trim() === 'ts') ts = value?.trim();
    if (key?.trim() === 'v1') v1 = value?.trim();
  }
  if (!ts || !v1) return false;

  // Proteção contra Replay Attack (tolerância máxima de 15 minutos)
  const tsNum = parseInt(ts, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (!isNaN(tsNum) && Math.abs(nowSec - tsNum) > 900) {
    return false;
  }

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret) as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Manifest de validação oficial do Mercado Pago:
    // id:[data.id_url];request-id:[x-request-id];ts:[ts];
    const manifestWithReq = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const manifestEmptyReq = `id:${dataId};request-id:;ts:${ts};`;

    const sig1 = await crypto.subtle.sign('HMAC', key, enc.encode(manifestWithReq) as unknown as BufferSource);
    const hex1 = Array.from(new Uint8Array(sig1)).map((b) => b.toString(16).padStart(2, '0')).join('');
    if (await timingSafeEqualString(hex1, v1)) return true;

    const sig2 = await crypto.subtle.sign('HMAC', key, enc.encode(manifestEmptyReq) as unknown as BufferSource);
    const hex2 = Array.from(new Uint8Array(sig2)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return await timingSafeEqualString(hex2, v1);
  } catch {
    return false;
  }
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const signatureHeader = request.headers.get('x-signature') || '';
    const requestIdHeader = request.headers.get('x-request-id') || '';

    // 1. Extração do Payload (JSON body ou Query String)
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    let topic = body.type || body.topic || body.action;
    let paymentId = body.data?.id;

    if (!paymentId) {
      topic = url.searchParams.get('topic') || url.searchParams.get('type') || topic;
      paymentId = url.searchParams.get('id') || url.searchParams.get('data.id');
    }

    // Suporte a teste direto / simulação: estritamente restrito a localhost em desenvolvimento (A2)
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (body.testSimulateApproval) {
      if (!isLocalhost || env.ENVIRONMENT === 'production') {
        return new Response(
          JSON.stringify({ error: 'Simulação de pagamento desabilitada em produção.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const targetInstId = body.installmentId;
      if (!targetInstId) {
        return new Response(JSON.stringify({ error: 'installmentId obrigatório para simulação.' }), { status: 400 });
      }

      let installments: FinancialInstallment[] = await getFinanceInstallments(env);

      const inst = installments.find((i) => i.id === targetInstId);
      if (!inst) {
        return new Response(JSON.stringify({ error: 'Parcela não encontrada.' }), { status: 404 });
      }

      inst.status = 'paid';
      inst.paymentId = `SIM-${Date.now()}`;
      inst.paymentMethod = body.paymentMethod || 'pix';
      inst.paidAt = new Date().toISOString();
      inst.paidAmount = inst.amount;
      inst.receiptHash = await computeReceiptHash(inst);
      inst.updatedAt = new Date().toISOString();

      await saveFinanceInstallments(env, installments);

      await recordAuditEvent(env, request, {
        type: 'CONTENT_PUBLISH' as any,
        summary: `Simulação de pagamento aprovado: ${inst.label} (${inst.referenceMonth})`,
        details: { installmentId: inst.id, amount: inst.amount },
      });

      return new Response(JSON.stringify({ success: true, simulated: true, installment: inst }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Se não for evento de pagamento, responde 200 para liberar o Mercado Pago
    const isPaymentTopic =
      topic === 'payment' ||
      topic?.startsWith('payment') ||
      topic === 'payment.created' ||
      topic === 'payment.updated';

    if (!isPaymentTopic || !paymentId) {
      return new Response(JSON.stringify({ success: true, message: 'Evento ignorado (não é pagamento).' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Validação Criptográfica da Assinatura (Fail-Closed)
    const webhookSecret =
      env.MP_WEBHOOK_SECRET ||
      (typeof process !== 'undefined' ? process.env?.MP_WEBHOOK_SECRET : undefined);

    if (webhookSecret) {
      if (!signatureHeader) {
        return new Response(JSON.stringify({ success: false, error: 'Cabeçalho x-signature ausente.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const isSigValid = await verifyMPSignature(
        signatureHeader,
        paymentId.toString(),
        webhookSecret,
        requestIdHeader
      );
      if (!isSigValid) {
        console.warn(`[MP Webhook] Assinatura inválida para paymentId=${paymentId}`);
        return new Response(JSON.stringify({ success: false, error: 'Assinatura inválida.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else if (env.ENVIRONMENT === 'production') {
      // Em produção, se o segredo de webhook não estiver configurado, REJEITA (fail-closed)
      return new Response(JSON.stringify({ success: false, error: 'MP_WEBHOOK_SECRET não configurado.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Consulta Oficial à API do Mercado Pago
    const mpToken =
      env.MP_ACCESS_TOKEN ||
      (typeof process !== 'undefined' ? process.env?.MP_ACCESS_TOKEN : undefined);
    if (!mpToken) {
      console.warn('[MP Webhook] MP_ACCESS_TOKEN ausente. Impossível verificar pagamento.');
      return new Response(JSON.stringify({ success: false, error: 'Token não configurado.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mpToken}`,
      },
    });

    if (!mpRes.ok) {
      console.warn(`[MP Webhook] Falha ao consultar pagamento ${paymentId}: ${mpRes.status}`);
      return new Response(JSON.stringify({ success: false, error: 'Erro ao consultar pagamento na API MP.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mpPayment: any = await mpRes.json();
    const externalRef = mpPayment.external_reference;
    const status = mpPayment.status;
    const paidAmount = Number(mpPayment.transaction_amount || 0);

    if (!externalRef) {
      return new Response(JSON.stringify({ success: true, message: 'external_reference ausente.' }), {
        status: 200,
      });
    }

    // 4. Roteamento Exclusivo: Parcelas de Contrato / Mensalidades do Site
    // Pagamentos comerciais da Nua Borges pertencem exclusivamente à Stripe.
    if (externalRef.startsWith('nua_')) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notificação ignorada no Mercado Pago: pagamentos comerciais da NUA pertencem exclusivamente ao Stripe.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let installments: FinancialInstallment[] = await getFinanceInstallments(env);

    const installment = installments.find((i) => i.id === externalRef);
    if (!installment) {
      console.warn(`[MP Webhook] Parcela correspondente não encontrada para external_reference: ${externalRef}`);
      return new Response(JSON.stringify({ success: true, message: 'Parcela não encontrada.' }), {
        status: 200,
      });
    }

    // 5. Verificação de Idempotência
    if (installment.status === 'paid' && installment.paymentId === paymentId.toString()) {
      return new Response(JSON.stringify({ success: true, message: 'Transação já processada (idempotente).' }), {
        status: 200,
      });
    }

    if (status === 'approved') {
      if (paidAmount < installment.amount) {
        console.warn(`[MP Webhook] Valor pago (R$ ${paidAmount}) menor que a parcela (R$ ${installment.amount})`);
        return new Response(JSON.stringify({ success: false, error: 'Valor pago inferior ao valor da parcela.' }), {
          status: 400,
        });
      }

      installment.status = 'paid';
      installment.paymentId = paymentId.toString();
      installment.paymentMethod = mpPayment.payment_method_id || 'pix';
      installment.paidAt = mpPayment.date_approved || new Date().toISOString();
      installment.paidAmount = paidAmount;
      installment.receiptHash = await computeReceiptHash(installment);
      installment.updatedAt = new Date().toISOString();

      await saveFinanceInstallments(env, installments);

      await recordAuditEvent(env, request, {
        type: 'CONTENT_PUBLISH' as any,
        summary: `Parcela quitada via Pix MP: ${installment.label} (${installment.referenceMonth}) — R$ ${paidAmount.toFixed(2)}`,
        details: { installmentId: installment.id, paymentId, paidAmount },
      });

      return new Response(
        JSON.stringify({
          success: true,
          installmentId: installment.id,
          status: 'paid',
          receiptHash: installment.receiptHash,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Status do pagamento é '${status}' (não aprovado).` }),
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[MP Webhook Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno ao processar webhook de finanças.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
