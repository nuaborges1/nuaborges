/**
 * Cloudflare Pages Function: /api/finance/pix
 *
 * POST: Gera cobrança Pix direta e dinâmica no Mercado Pago (API /v1/payments),
 * retornando a imagem do QR Code em Base64 e o código "Pix Copia e Cola".
 */

import {
  FinancialInstallment,
  getDefaultInstallments,
  KV_FINANCE_KEY,
} from '../../../lib/financeCanonical';
import { CLIENT_INFO } from '../../../lib/contractCanonical';
import {
  generateRealPixCopiaECola,
  generatePixQrCodePngDataUrl,
} from '../../../lib/pixPayload';

interface Env {
  NUA_CONTENT?: any;
  CONTENT_KV?: any;
  MP_ACCESS_TOKEN?: string;
  NEXT_PUBLIC_SITE_URL?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const kv = env.NUA_CONTENT || env.CONTENT_KV;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      installmentId?: string;
    };
    const installmentId = body.installmentId;

    if (!installmentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'installmentId obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Carrega parcelas do KV
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

    if (installment.status === 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta parcela já está quitada.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const reqUrl = new URL(request.url);
    const baseUrl = env.NEXT_PUBLIC_SITE_URL
      ? env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
      : `${reqUrl.protocol}//${reqUrl.host}`;

    const notificationUrl = `${baseUrl}/api/finance/webhook`;

    // 2. Chamada à API oficial do Mercado Pago para gerar Pix
    const mpToken =
      env.MP_ACCESS_TOKEN ||
      (typeof process !== 'undefined' ? process.env?.MP_ACCESS_TOKEN : undefined);

    if (mpToken) {
      const idempotencyKey = crypto.randomUUID();
      const pixPayload = {
        transaction_amount: installment.amount,
        description: `Nua Borges — ${installment.label} (${installment.referenceMonth})`,
        payment_method_id: 'pix',
        payer: {
          email: CLIENT_INFO.email,
          first_name: 'Nayara',
          last_name: 'Borges',
          identification: {
            type: 'CPF',
            number: CLIENT_INFO.cpfClean,
          },
        },
        external_reference: installment.id,
        notification_url: notificationUrl,
      };

      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(pixPayload),
      });

      const mpData: any = await mpRes.json();

      if (mpRes.ok && mpData.point_of_interaction?.transaction_data) {
        const td = mpData.point_of_interaction.transaction_data;
        installment.paymentId = mpData.id?.toString();
        installment.paymentMethod = 'pix';
        installment.updatedAt = new Date().toISOString();

        if (kv && typeof kv.put === 'function') {
          await kv.put(KV_FINANCE_KEY, JSON.stringify(installments));
        }

        return new Response(
          JSON.stringify({
            success: true,
            paymentId: mpData.id,
            qrCode: td.qr_code,
            qrCodeBase64: td.qr_code_base64,
            ticketUrl: td.ticket_url,
            amount: installment.amount,
            installment,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: mpData.message || 'Falha ao gerar QR Code Pix no Mercado Pago.',
          details: mpData,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gera o código Pix Copia e Cola Oficial (padrão EMVCo BR Code do Banco Central) com a chave Pix do desenvolvedor
    const realPixCode = generateRealPixCopiaECola({
      pixKey: '05379507107',
      merchantName: 'JOAO PHILIPPE O BOECHAT',
      merchantCity: 'BRASILIA',
      amount: installment.amount,
      txid: `NUA${installment.number}`,
    });

    // Gera a imagem oficial do QR Code em PNG de alta resolução
    const qrDataUrl = await generatePixQrCodePngDataUrl(realPixCode);
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');

    installment.paymentId = `PIX-${installment.id}-${Date.now()}`;
    installment.paymentMethod = 'pix';
    installment.updatedAt = new Date().toISOString();

    if (kv && typeof kv.put === 'function') {
      await kv.put(KV_FINANCE_KEY, JSON.stringify(installments));
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: installment.paymentId,
        qrCode: realPixCode,
        qrCodeBase64: qrBase64,
        isPngBase64: true,
        amount: installment.amount,
        installment,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Erro ao gerar Pix.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
