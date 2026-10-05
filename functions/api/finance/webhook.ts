/**
 * Cloudflare Pages Function: /api/finance/webhook
 *
 * POST: Receptor oficial do Webhook do Mercado Pago.
 *
 * Fluxo de Segurança:
 * 1. Extrai ID do evento e tipo;
 * 2. Valida assinatura criptográfica x-signature (HMAC-SHA256) contra MP_WEBHOOK_SECRET;
 * 3. Consulta a API oficial do Mercado Pago (GET /v1/payments/{id}) com MP_ACCESS_TOKEN;
 * 4. Valida se o status real é 'approved' e se o valor bate com o contratado;
 * 5. Garante idempotência (evita reprocessamento do mesmo payment_id);
 * 6. Marca a parcela como quitada no KV e registra hash de autenticidade;
 * 7. Grava log de auditoria.
 */

import {
  FinancialInstallment,
  getDefaultInstallments,
  KV_FINANCE_KEY,
} from '../../../lib/financeCanonical';
import { recordAuditEvent } from '../_auditHelper';
import { computeReceiptHash } from '../../../lib/generateReceiptPdf';

interface Env {
  NUA_CONTENT?: any;
  CONTENT_KV?: any;
  MP_ACCESS_TOKEN?: string;
  MP_WEBHOOK_SECRET?: string;
  ADMIN_API_SECRET?: string;
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
    if (hex1 === v1) return true;

    const sig2 = await crypto.subtle.sign('HMAC', key, enc.encode(manifestEmptyReq) as unknown as BufferSource);
    const hex2 = Array.from(new Uint8Array(sig2)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex2 === v1;
  } catch {
    return false;
  }
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const kv = env.NUA_CONTENT || env.CONTENT_KV;

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

    // Suporte a teste direto / simulação autenticada por chave master de admin
    const masterKey = request.headers.get('X-Master-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
    const isMasterAuth = !!(env.ADMIN_API_SECRET && masterKey === env.ADMIN_API_SECRET);

    if (body.testSimulateApproval && (isMasterAuth || url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      const targetInstId = body.installmentId;
      if (!targetInstId) {
        return new Response(JSON.stringify({ error: 'installmentId obrigatório para simulação.' }), { status: 400 });
      }

      let installments: FinancialInstallment[] = [];
      if (kv && typeof kv.get === 'function') {
        const stored = await kv.get(KV_FINANCE_KEY);
        if (stored) installments = JSON.parse(stored);
      }
      if (installments.length === 0) installments = getDefaultInstallments();

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

      if (kv && typeof kv.put === 'function') {
        await kv.put(KV_FINANCE_KEY, JSON.stringify(installments));
      }

      await recordAuditEvent(env, {
        type: 'CONTENT_PUBLISH',
        ip: request.headers.get('CF-Connecting-IP') || '127.0.0.1',
        userAgent: request.headers.get('User-Agent') || 'Simulated Approval',
        details: `Simulação de pagamento aprovado: ${inst.label} (${inst.referenceMonth})`,
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

    // 2. Validação Criptográfica da Assinatura (se configurada)
    const webhookSecret =
      env.MP_WEBHOOK_SECRET ||
      (typeof process !== 'undefined' ? process.env?.MP_WEBHOOK_SECRET : undefined);

    if (webhookSecret) {
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
        status: 200, // Retorna 200 para evitar retentativas agressivas de pagamentos inexistentes
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mpPayment: any = await mpRes.json();
    const externalRef = mpPayment.external_reference; // ex: 'parcela-1'
    const status = mpPayment.status;
    const paidAmount = Number(mpPayment.transaction_amount || 0);

    if (!externalRef) {
      return new Response(JSON.stringify({ success: true, message: 'external_reference ausente.' }), {
        status: 200,
      });
    }

    // 4. Carrega as parcelas do KV
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

    const installment = installments.find((i) => i.id === externalRef);
    if (!installment) {
      console.warn(`[MP Webhook] Parcela correspondente não encontrada para external_reference: ${externalRef}`);
      return new Response(JSON.stringify({ success: true, message: 'Parcela não encontrada.' }), {
        status: 200,
      });
    }

    // 5. Verificação de Idempotência: já quitado com o mesmo ID
    if (installment.status === 'paid' && installment.paymentId === paymentId.toString()) {
      return new Response(JSON.stringify({ success: true, message: 'Transação já processada (idempotente).' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Atualização de Status
    if (status === 'approved') {
      // Proteção contra fraude de valor
      if (paidAmount < installment.amount) {
        installment.status = 'rejected';
        installment.paymentId = paymentId.toString();
        installment.updatedAt = new Date().toISOString();
        console.warn(`[MP Webhook] Alerta de fraude de valor: pago R$ ${paidAmount} < esperado R$ ${installment.amount}`);
      } else {
        installment.status = 'paid';
        installment.paymentId = paymentId.toString();
        installment.paymentMethod = mpPayment.payment_method_id || 'mercadopago';
        installment.paidAt = mpPayment.date_approved || new Date().toISOString();
        installment.paidAmount = paidAmount;
        installment.receiptHash = await computeReceiptHash(installment);
        installment.updatedAt = new Date().toISOString();

        // Registra evento de auditoria
        await recordAuditEvent(env, {
          type: 'CONTENT_PUBLISH',
          ip: request.headers.get('CF-Connecting-IP') || '127.0.0.1',
          userAgent: request.headers.get('User-Agent') || 'Mercado Pago Webhook',
          details: `Pagamento de mensalidade liquidado: ${installment.label} (${installment.referenceMonth}) — R$ ${paidAmount.toFixed(2)} (MP ID: ${paymentId})`,
        });
      }
    } else if (status === 'in_process' || status === 'pending') {
      if (installment.status !== 'paid') {
        installment.status = 'in_process';
        installment.paymentId = paymentId.toString();
        installment.updatedAt = new Date().toISOString();
      }
    } else if (status === 'rejected' || status === 'cancelled') {
      if (installment.status !== 'paid') {
        installment.status = 'rejected';
        installment.paymentId = paymentId.toString();
        installment.updatedAt = new Date().toISOString();
      }
    }

    // 7. Persiste no KV
    if (kv && typeof kv.put === 'function') {
      await kv.put(KV_FINANCE_KEY, JSON.stringify(installments));
    }

    return new Response(
      JSON.stringify({
        success: true,
        installmentId: installment.id,
        status: installment.status,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[MP Webhook] Erro inesperado:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Erro interno no processamento do webhook.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
