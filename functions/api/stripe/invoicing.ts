/**
 * Cloudflare Pages Function: /api/stripe/invoicing
 *
 * Gestão de Faturas da Stripe (Stripe Invoicing):
 * - GET: Lista faturas emitidas recentemente
 * - POST: Emite uma nova fatura formal com link hospedado de pagamento e PDF
 */

import { createStripeInvoice, listStripeInvoices } from '../_stripe';
import { CreateStripeInvoiceOptions } from '../../../lib/stripeCanonical';

interface Env {
  STRIPE_SECRET_KEY?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204 });
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;

  try {
    const invoices = await listStripeInvoices(env, 25);
    return new Response(
      JSON.stringify({ success: true, invoices }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erro ao listar faturas.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body: any = await request.json().catch(() => ({}));
    const {
      customerEmail,
      customerName,
      items,
      dueDateDays = 3,
      memo = 'Nua Borges — Serviços & Produções Digitais',
      currency = 'brl',
      autoSend = true,
      metadata = {},
    } = body;

    if (!customerEmail || !customerEmail.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'E-mail do cliente válido obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pelo menos um item deve ser adicionado à fatura.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedItems = items.map((it: any) => ({
      ...it,
      description: 'Licenciamento de Conteúdo e Serviços Digitais',
    }));

    const invoiceOptions: CreateStripeInvoiceOptions = {
      customerEmail,
      customerName: customerName || customerEmail.split('@')[0],
      items: sanitizedItems,
      dueDateDays,
      memo: 'Serviços de Consultoria e Licenciamento de Mídia',
      currency,
      autoSend,
      metadata,
    };

    const invoice = await createStripeInvoice(env, invoiceOptions);

    return new Response(
      JSON.stringify({
        success: true,
        invoice,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Stripe Invoicing Error]:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Falha ao emitir fatura no Stripe.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
