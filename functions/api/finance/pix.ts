/**
 * Cloudflare Pages Function: POST /api/finance/pix
 *
 * Mensalidade desvinculada do Mercado Pago (NUA-AUD-001):
 * Gera cobrança Pix estática oficial (EMVCo BR Code + QR Code PNG) usando
 * exclusivamente a variável secreta `env.DEV_PIX_KEY` (chave CPF do desenvolvedor),
 * nunca hardcoded no código-fonte. A quitação é confirmada manualmente em `/api/finance/admin`.
 */

import { FinancialInstallment } from '../../../lib/financeCanonical';
import {
  generateRealPixCopiaECola,
  generatePixQrCodePngDataUrl,
} from '../../../lib/pixPayload';
import { getFinanceInstallments, saveFinanceInstallments } from './_financeStore';
import { safeInternalError } from '../_central/errorHandler';

interface Env {
  DEV_PIX_KEY?: string;
  DEV_PIX_MERCHANT_NAME?: string;
  DEV_PIX_MERCHANT_CITY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      installmentId?: string;
    };
    const installmentId = String(body.installmentId || '').trim();

    if (!installmentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'installmentId obrigatório.' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const installments: FinancialInstallment[] = await getFinanceInstallments(env);
    const installment = installments.find((i) => i.id === installmentId);
    if (!installment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parcela não encontrada.' }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    if (installment.status === 'paid') {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta parcela já está quitada.' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const rawDevPixKey = String(env.DEV_PIX_KEY || '').trim();
    // Se for CPF formatado (000.000.000-00), normaliza para 11 dígitos conforme padrão EMVCo Bacen
    const devPixKey = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(rawDevPixKey)
      ? rawDevPixKey.replace(/\D/g, '')
      : rawDevPixKey;
    const devMerchantName = String(env.DEV_PIX_MERCHANT_NAME || 'PHILIPPE BOECHAT').trim();
    const devMerchantCity = String(env.DEV_PIX_MERCHANT_CITY || 'BRASILIA').trim();

    if (!devPixKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Chave Pix da mensalidade não configurada no servidor (DEV_PIX_KEY).',
        }),
        { status: 503, headers: JSON_HEADERS }
      );
    }

    const txid = `NUAMENSAL${String(installment.number).padStart(2, '0')}`;
    const realPixCode = generateRealPixCopiaECola({
      pixKey: devPixKey,
      merchantName: devMerchantName,
      merchantCity: devMerchantCity,
      amount: installment.amount,
      txid,
    });

    const qrDataUrl = await generatePixQrCodePngDataUrl(realPixCode);
    const isSvgDataUrl = qrDataUrl.startsWith('data:image/svg+xml');
    const qrBase64 = isSvgDataUrl ? qrDataUrl : qrDataUrl.replace(/^data:image\/png;base64,/, '');

    installment.paymentId = `PIX-MANUAL-${installment.id}-${Date.now()}`;
    installment.paymentMethod = 'pix';
    installment.updatedAt = new Date().toISOString();

    await saveFinanceInstallments(env, installments);

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'static_pix',
        paymentId: installment.paymentId,
        txid,
        qrCode: realPixCode,
        qrCodeBase64: qrBase64,
        isPngBase64: !isSvgDataUrl,
        amount: installment.amount,
        recipientName: devMerchantName,
        installment,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    return safeInternalError('finance/pix', err, {}, 'Não foi possível gerar o QR Code Pix agora.');
  }
};
