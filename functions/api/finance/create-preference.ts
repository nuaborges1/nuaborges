/**
 * Cloudflare Pages Function: /api/finance/create-preference
 *
 * POST: Cria uma preferência segura no Mercado Pago (Checkout Pro)
 * para a parcela especificada e retorna a URL de pagamento (init_point).
 */

import {
  FinancialInstallment,
  getDefaultInstallments,
  KV_FINANCE_KEY,
} from '../../../lib/financeCanonical';
import { CLIENT_INFO } from '../../../lib/contractCanonical';

import { getFinanceInstallments, saveFinanceInstallments } from './_financeStore';

interface Env {
  MP_ACCESS_TOKEN?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      installmentId?: string;
    };
    const installmentId = body.installmentId;

    if (!installmentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Identificador da parcela não fornecido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Carrega as parcelas do Supabase
    let installments: FinancialInstallment[] = await getFinanceInstallments(env);

    // 2. Localiza a parcela
    const installmentIndex = installments.findIndex((i) => i.id === installmentId);
    if (installmentIndex === -1) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parcela não encontrada no cronograma.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const installment = installments[installmentIndex];

    // 3. Valida se a parcela já não está quitada
    if (installment.status === 'paid') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Esta parcela já consta como liquidada e quitada.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Monta URLs de retorno e webhook
    const reqUrl = new URL(request.url);
    const baseUrl = env.NEXT_PUBLIC_SITE_URL
      ? env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
      : `${reqUrl.protocol}//${reqUrl.host}`;

    const notificationUrl = `${baseUrl}/api/finance/webhook`;
    const backUrls = {
      success: `${baseUrl}/admin?tab=finance&status=success&inst=${installment.id}`,
      pending: `${baseUrl}/admin?tab=finance&status=pending&inst=${installment.id}`,
      failure: `${baseUrl}/admin?tab=finance&status=failure&inst=${installment.id}`,
    };

    // 5. Integração com o Mercado Pago
    const mpAccessToken =
      env.MP_ACCESS_TOKEN ||
      (typeof process !== 'undefined' ? process.env?.MP_ACCESS_TOKEN : undefined);

    if (mpAccessToken) {
      const preferencePayload = {
        items: [
          {
            id: installment.id,
            title: `Nua Borges — Mensalidade ${installment.label} (${installment.referenceMonth})`,
            description: `Mensalidade de desenvolvimento e gestão web — Contrato Nua Borges`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: installment.amount,
          },
        ],
        payer: {
          name: CLIENT_INFO.name,
          email: CLIENT_INFO.email,
          identification: {
            type: 'CPF',
            number: CLIENT_INFO.cpfClean,
          },
        },
        external_reference: installment.id,
        notification_url: notificationUrl,
        back_urls: backUrls,
        auto_return: 'approved',
        statement_descriptor: 'NUA BORGES',
        binary_mode: false,
      };

      const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferencePayload),
      });

      const mpData: any = await mpRes.json();

      if (mpRes.ok && mpData.init_point) {
        installment.preferenceId = mpData.id;
        installment.initPoint = mpData.init_point;
        installment.updatedAt = new Date().toISOString();

        await saveFinanceInstallments(env, installments);

        return new Response(
          JSON.stringify({
            success: true,
            init_point: mpData.init_point,
            id: mpData.id,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: mpData.message || 'Erro ao comunicar com o Mercado Pago.',
          details: mpData,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Mercado Pago não configurado (MP_ACCESS_TOKEN ausente).' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Falha ao processar criação de preferência.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
