/**
 * Stripe Backend Service — Nua Borges Platform
 *
 * Provê integração direta com a API REST oficial da Stripe:
 * - Totalmente compatível com Cloudflare Pages Functions (Edge/V8) e Node.js
 * - Suporte a Stripe Checkout Sessions (Cartões, Pix, Apple Pay, Google Pay)
 * - Suporte a Stripe Invoicing (Criação de faturas, PDF, link de pagamento do cliente)
 * - Validação segura de chaves sem expor credenciais ao frontend
 */

import {
  CreateStripeCheckoutOptions,
  CreateStripeInvoiceOptions,
  StripeInvoiceResult,
  getStripeSecretKey,
  toStripeAmount,
  fromStripeAmount,
} from '../../lib/stripeCanonical';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

/**
 * Helper para requisições autenticadas à API da Stripe
 */
async function stripeRequest(
  env: any,
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'POST',
  body?: Record<string, any>
): Promise<any> {
  const secretKey = getStripeSecretKey(env);
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY não configurada no ambiente.');
  }

  const url = `${STRIPE_API_BASE}${endpoint}`;
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${secretKey}`);
  headers.set('Stripe-Version', '2025-01-27.acacia');

  let requestBody: string | undefined = undefined;

  if (body && method === 'POST') {
    headers.set('Content-Type', 'application/x-www-form-urlencoded');
    const params = new URLSearchParams();

    // Serializador para x-www-form-urlencoded suportando objetos e arrays aninhados
    const serialize = (obj: any, prefix = '') => {
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        const propName = prefix ? `${prefix}[${key}]` : key;
        if (val !== undefined && val !== null) {
          if (typeof val === 'object' && !Array.isArray(val)) {
            serialize(val, propName);
          } else if (Array.isArray(val)) {
            val.forEach((item, index) => {
              if (typeof item === 'object') {
                serialize(item, `${propName}[${index}]`);
              } else {
                params.append(`${propName}[${index}]`, String(item));
              }
            });
          } else {
            params.append(propName, String(val));
          }
        }
      }
    };

    serialize(body);
    requestBody = params.toString();
  }

  const res = await fetch(url, {
    method,
    headers,
    body: requestBody,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Erro na API da Stripe: status ${res.status}`);
  }

  return data;
}

/**
 * Cria ou recupera um cliente na Stripe pelo e-mail
 */
export async function getOrCreateStripeCustomer(
  env: any,
  email: string,
  name?: string
): Promise<{ id: string; email: string }> {
  try {
    // Busca cliente existente
    const search = await stripeRequest(env, `/customers?email=${encodeURIComponent(email)}&limit=1`, 'GET');
    if (search.data && search.data.length > 0) {
      return search.data[0];
    }
  } catch {}

  // Cria novo cliente
  const customer = await stripeRequest(env, '/customers', 'POST', {
    email,
    name: name || undefined,
  });

  return customer;
}

/**
 * Cria uma Stripe Checkout Session para pagamentos de pedidos ou packs
 */
export async function createStripeCheckoutSession(
  env: any,
  options: CreateStripeCheckoutOptions
): Promise<{ id: string; url: string }> {
  const currency = (options.currency || 'brl').toLowerCase();

  const lineItems = options.items.map((item) => ({
    price_data: {
      currency,
      product_data: {
        name: 'Licenciamento de Mídia Digital e Conteúdo Editorial',
        description: 'Produto Digital Autorizado',
        images: item.images && item.images.length > 0 ? item.images : undefined,
      },
      unit_amount: toStripeAmount(Number(item.amount ?? item.unitAmount ?? 0)),
    },
    quantity: item.quantity || 1,
  }));

  const sessionPayload: Record<string, any> = {
    payment_method_types: ['card', 'pix'],
    mode: 'payment',
    line_items: lineItems,
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    customer_email: options.customerEmail || undefined,
    client_reference_id: options.orderId,
    metadata: {
      orderId: options.orderId,
      orderType: options.orderType,
      ...(options.metadata || {}),
    },
  };

  const session = await stripeRequest(env, '/checkout/sessions', 'POST', sessionPayload);

  return {
    id: session.id,
    url: session.url,
  };
}

/**
 * Cria uma Fatura oficial (Stripe Invoice) para faturamento ou cobranças sob medida
 */
export async function createStripeInvoice(
  env: any,
  options: CreateStripeInvoiceOptions
): Promise<StripeInvoiceResult> {
  const customer = await getOrCreateStripeCustomer(
    env,
    options.customerEmail,
    options.customerName
  );

  const currency = (options.currency || 'brl').toLowerCase();

  // 1. Cria os itens da fatura (invoice items)
  for (const item of options.items) {
    await stripeRequest(env, '/invoiceitems', 'POST', {
      customer: customer.id,
      amount: toStripeAmount(item.amount),
      currency,
      description: 'Licenciamento de Conteúdo e Serviços Digitais',
      quantity: item.quantity || 1,
    });
  }

  // 2. Calcula dias de vencimento
  const dueDays = options.dueDateDays || 3;
  const dueDateTimestamp = Math.floor(Date.now() / 1000) + dueDays * 24 * 60 * 60;

  // 3. Cria a fatura com cobrança por link/e-mail (send_invoice)
  const invoice = await stripeRequest(env, '/invoices', 'POST', {
    customer: customer.id,
    collection_method: 'send_invoice',
    due_date: dueDateTimestamp,
    description: 'Serviços de Consultoria e Licenciamento de Mídia',
    auto_advance: true,
    metadata: options.metadata || {},
  });

  // 4. Finaliza a fatura para gerar o link público hospedado pela Stripe
  let finalizedInvoice = invoice;
  try {
    finalizedInvoice = await stripeRequest(env, `/invoices/${invoice.id}/finalize`, 'POST');
    if (options.autoSend) {
      await stripeRequest(env, `/invoices/${invoice.id}/send`, 'POST');
    }
  } catch (e) {
    console.warn('[StripeInvoice] Falha ao finalizar fatura automaticamente:', e);
  }

  return {
    id: finalizedInvoice.id,
    number: finalizedInvoice.number || null,
    status: finalizedInvoice.status,
    total: fromStripeAmount(finalizedInvoice.total || 0),
    currency: finalizedInvoice.currency,
    hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url || null,
    invoicePdf: finalizedInvoice.invoice_pdf || null,
    customerEmail: options.customerEmail,
    customerName: options.customerName,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Lista as faturas mais recentes emitidas na Stripe
 */
export async function listStripeInvoices(
  env: any,
  limit = 20
): Promise<StripeInvoiceResult[]> {
  try {
    const list = await stripeRequest(env, `/invoices?limit=${limit}`, 'GET');
    const invoices = list.data || [];

    return invoices.map((inv: any) => ({
      id: inv.id,
      number: inv.number || null,
      status: inv.status,
      total: fromStripeAmount(inv.total || 0),
      currency: inv.currency,
      hostedInvoiceUrl: inv.hosted_invoice_url || null,
      invoicePdf: inv.invoice_pdf || null,
      customerEmail: inv.customer_email || null,
      customerName: inv.customer_name || null,
      createdAt: new Date(inv.created * 1000).toISOString(),
    }));
  } catch (err) {
    console.warn('[StripeInvoice] Falha ao listar faturas:', err);
    return [];
  }
}

export interface CreateStripePixOptions {
  amount: number;
  description: string;
  orderId: string;
  orderType: 'avulso' | 'personalizado' | 'appointment' | 'vip';
  payerEmail?: string;
  payerName?: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
}

export interface StripePixResult {
  success: boolean;
  id: string;
  clientSecret: string;
  amount: number;
  status: string;
  qrCode: string;
  qrCodeUrl: string;
  qrCodeSvg: string;
  hostedUrl?: string;
  expiresAt?: number;
}

/**
 * Cria uma cobrança Pix oficial nativa na Stripe via PaymentIntent
 */
export async function createStripePixPaymentIntent(
  env: any,
  options: CreateStripePixOptions
): Promise<StripePixResult> {
  const returnUrl = options.returnUrl || 'https://nuaborges.com.br/checkout/return';
  const finalEmail = options.payerEmail || 'contato@nuaborges.com.br';

  const payload: Record<string, any> = {
    amount: toStripeAmount(options.amount),
    currency: 'brl',
    confirm: 'true',
    return_url: returnUrl,
    payment_method_data: {
      type: 'pix',
      billing_details: {
        email: finalEmail,
        name: options.payerName || 'Cliente Nua Borges',
      },
    },
    description: options.description,
    metadata: {
      orderId: options.orderId,
      orderType: options.orderType,
      ...(options.metadata || {}),
    },
  };

  const activeKey = getStripeSecretKey(env) || '';
  if (/^(sk|rk)_test_/.test(activeKey) && env?.ALLOW_STRIPE_TEST_KEYS !== 'true') {
    throw new Error(
      'Chave Stripe de TESTE detectada em produção. Configure STRIPE_SECRET_KEY com a chave LIVE (sk_live_...) para gerar Pix real.'
    );
  }

  const pi = await stripeRequest(env, '/payment_intents', 'POST', payload);

  const pixData = pi.next_action?.pix_display_qr_code;
  const qrCode = pixData?.data || '';
  const qrCodeUrl = pixData?.image_url_png || '';
  const qrCodeSvg = pixData?.image_url_svg || '';
  const hostedUrl = pixData?.hosted_instructions_url || undefined;
  const expiresAt = pixData?.expires_at || undefined;

  return {
    success: true,
    id: pi.id,
    clientSecret: pi.client_secret,
    amount: fromStripeAmount(pi.amount),
    status: pi.status,
    qrCode,
    qrCodeUrl,
    qrCodeSvg,
    hostedUrl,
    expiresAt,
  };
}

/**
 * Consulta o status de um PaymentIntent Pix na Stripe
 */
export async function getStripePaymentIntent(
  env: any,
  paymentIntentId: string
): Promise<{
  success: boolean;
  id: string;
  status: string;
  isPaid: boolean;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  raw?: any;
}> {
  const pi = await stripeRequest(env, `/payment_intents/${paymentIntentId}`, 'GET');
  return {
    success: true,
    id: pi.id,
    status: pi.status,
    isPaid: pi.status === 'succeeded',
    amount: fromStripeAmount(pi.amount || 0),
    currency: pi.currency || 'brl',
    metadata: pi.metadata || {},
    raw: pi,
  };
}
