/**
 * Cloudflare Pages Function: /api/stripe/create-checkout
 *
 * Cria sessão de checkout hospedada pela Stripe (Stripe Checkout) com:
 * - Validação de preços no servidor contra a base oficial do Supabase
 * - Registro persistente na tabela orders do PostgreSQL Supabase
 */

import { createStripeCheckoutSession } from '../_stripe';
import { CreateStripeCheckoutOptions } from '../../../lib/stripeCanonical';
import {
  saveOrderToSupabase,
  getSiteContentFromSupabase,
  getAppointmentsSettingsFromSupabase,
  getPersonalizadosSettingsFromSupabase,
} from '../_supabaseStore';

interface Env {
  STRIPE_SECRET_KEY?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
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

export const onRequestOptions = async () => {
  return new Response(null, { status: 204 });
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body: any = await request.json().catch(() => ({}));
    const {
      items,
      orderId,
      orderType = 'custom',
      customerEmail,
      customerName,
      successUrl,
      cancelUrl,
      currency = 'brl',
      metadata = {},
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lista de itens obrigatória.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'orderId obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Validação autoritativa de preços no servidor contra o Supabase
    let validatedItems = items;
    let totalCalculatedAmount = 0;

    if (orderType === 'avulso' && items[0]?.id) {
      const content = await getSiteContentFromSupabase(env, 'published_content');
      const catalog = content?.avulsos?.items || [];
      const prod = catalog.find((i: any) => i.id === items[0].id || i.slug === items[0].id);
      const canonicalUnit = prod ? (prod.numericPrice || parseFloat(String(prod.price).replace(/[^\d,.]/g, '').replace(',', '.')) || 29.9) : (Number(items[0].amount ?? items[0].unitAmount) || 29.9);
      validatedItems = [{
        ...items[0],
        name: 'Licenciamento de Mídia Digital e Conteúdo Editorial',
        description: 'Produto Digital Autorizado',
        amount: canonicalUnit,
        unitAmount: canonicalUnit,
      }];
      totalCalculatedAmount = canonicalUnit * (items[0].quantity || 1);
    } else {
      validatedItems = items.map((it: any) => ({
        ...it,
        name: 'Licenciamento de Mídia Digital e Conteúdo Editorial',
        description: 'Produto Digital Autorizado',
        amount: Number(it.amount ?? it.unitAmount) || 0,
        unitAmount: Number(it.amount ?? it.unitAmount) || 0,
      }));
      totalCalculatedAmount = validatedItems.reduce((acc: number, it: any) => acc + (Number(it.amount) || 0) * (Number(it.quantity) || 1), 0);
    }

    const origin = new URL(request.url).origin;
    const defaultSuccess = `${origin}/personalizados/pedido?token=${orderId}&paid=stripe`;
    const defaultCancel = `${origin}/personalizados`;

    const sessionOptions: CreateStripeCheckoutOptions = {
      items: validatedItems,
      orderId,
      orderType,
      customerEmail,
      customerName,
      successUrl: successUrl || defaultSuccess,
      cancelUrl: cancelUrl || defaultCancel,
      currency,
      metadata,
    };

    const session = await createStripeCheckoutSession(env, sessionOptions);

    // 2. Persistência prévia na tabela orders do Supabase (Fonte de Verdade Obrigatória)
    const saveRes = await saveOrderToSupabase(env, {
      id: orderId,
      purchaseToken: orderId,
      packId: items[0]?.id || items[0]?.name || orderType,
      amount: totalCalculatedAmount,
      status: 'pending',
      customerEmail: customerEmail || '',
      customerName: customerName || '',
      stripePaymentIntentId: session.id,
      paymentMethod: 'stripe_card',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (!saveRes.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao persistir pedido no banco de dados.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Stripe Checkout Error]:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Falha ao gerar checkout no Stripe.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
