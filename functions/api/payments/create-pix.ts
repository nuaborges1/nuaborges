/**
 * Cloudflare Pages Function: /api/payments/create-pix
 *
 * Gera cobrança Pix oficial no Mercado Pago para qualquer pack existente ou futuro.
 */

import { DEFAULT_SITE_CONTENT } from '../../../lib/defaultContent';
import { createStripePixPaymentIntent } from '../_stripe';
import { isLocalhostPaymentSimulationAllowed } from '../_security';
import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';
import {
  saveOrderToSupabase,
  getAppointmentByIdFromSupabase,
  getPersonalizadoOrderFromSupabase,
  getSiteContentFromSupabase,
} from '../_supabaseStore';

interface Env {
  STRIPE_SECRET_KEY?: string;
  ENVIRONMENT?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_ANON_KEY?: string;
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
      type = 'avulso',
      slug,
      planId,
      payerEmail,
      payerName,
      title,
      price,
      productId,
      simulate,
      isTestMode,
    } = body;

    let targetTitle = 'Nua Borges — Conteúdo Autoral';
    let canonicalPrice = 29.9;
    let itemSlug = slug || productId || 'ensaio-avulso';

    if (type === 'avulso') {
      let items: any[] = [];

      try {
        const content = await getSiteContentFromSupabase(env, 'published_content');
        if (content?.avulsos?.items && Array.isArray(content.avulsos.items)) {
          items = content.avulsos.items;
        }
      } catch (supabaseErr) {
        console.warn('[CreatePix] Falha ao consultar Supabase:', supabaseErr);
      }

      if (!items || items.length === 0) {
        items = DEFAULT_SITE_CONTENT.avulsos?.items || [];
      }

      const cleanSlug = (slug || productId || '').trim().toLowerCase();
      const product = items.find((item: any) => {
        const itemSlugStr = (item.slug || '').trim().toLowerCase();
        const itemId = (item.id || '').trim().toLowerCase();
        const cleanId = itemId.replace(/^avulso-/, '');
        return cleanSlug === itemSlugStr || cleanSlug === itemId || cleanSlug === cleanId;
      });

      if (!product || product.active === false) {
        return new Response(
          JSON.stringify({
            error: 'Conteúdo avulso não encontrado ou indisponível para aquisição no catálogo oficial.',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      targetTitle = product.title;
      canonicalPrice =
        product.numericPrice ||
        parseFloat(String(product.price || '29.9').replace(/[^\d,.]/g, '').replace(',', '.')) ||
        29.9;
      itemSlug = product.slug || product.id.replace(/^avulso-/, '');
    } else if (type === 'chamada' || type === 'appointment') {
      const targetBookingId = body.bookingId || body.appointmentId || slug || productId;
      let app = null;
      if (targetBookingId) {
        app = await getAppointmentByIdFromSupabase(env, targetBookingId);
      }
      if (!app) {
        return new Response(
          JSON.stringify({
            error: 'Agendamento não encontrado para emissão do pagamento.',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      targetTitle = `Chamada ${app.modalityName} (${app.durationMinutes} min)`;
      canonicalPrice = Number(app.price) || 150;
      itemSlug = app.id;
    } else if (type === 'personalizado') {
      const targetOrderId = body.personalizadoId || body.orderId || slug || productId;
      let pers = null;
      if (targetOrderId) {
        pers = await getPersonalizadoOrderFromSupabase(env, targetOrderId);
      }
      if (!pers) {
        return new Response(
          JSON.stringify({
            error: 'Encomenda personalizada não encontrada para emissão do pagamento.',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
      targetTitle = `Produção Personalizada (${pers.photoCount} fotos)`;
      canonicalPrice = Number(pers.totalPrice || pers.payment?.amount) || 100;
      itemSlug = pers.id;
    } else if (type === 'vip') {
      targetTitle = title || 'Assinatura Clube VIP Nua Borges';
      canonicalPrice = Number(price) && Number(price) > 0 ? Number(price) : 49.9;
      itemSlug = planId || slug || 'mensal';
    }

    const orderId = `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const purchaseToken = `ptok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const externalReference = `nua_${type}_${itemSlug}_${orderId}`;

    // TRAVA ABSOLUTA DE SEGURANÇA: Simulação restrita a localhost
    const isSimulationRequested = simulate === true || isTestMode === true;
    if (isSimulationRequested) {
      if (!isLocalhostPaymentSimulationAllowed(request, env)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Acesso negado: pagamentos simulados são estritamente proibidos em produção.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Simulação estritamente em localhost
      const now = new Date();
      const simulatedQrCode = `00020126580014br.gov.bcb.pix0136nua-simulado-${itemSlug}-${orderId}5204000053039865405${canonicalPrice.toFixed(2)}5802BR5910NUA BORGES6009SAO PAULO62070503***6304ABCD`;
      const simulatedQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(simulatedQrCode)}`;

      const orderData = {
        orderId,
        purchaseToken,
        type,
        itemSlug,
        itemTitle: targetTitle,
        canonicalPrice,
        amount: canonicalPrice,
        status: 'pending',
        isTestMode: true,
        paymentMethod: 'simulated_local_pix',
        externalReference,
        qrCode: simulatedQrCode,
        qrCodeUrl: simulatedQrCodeUrl,
        payerEmail: payerEmail || undefined,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 20 * 60 * 1000).toISOString(),
      };

      // Persiste no Supabase PostgreSQL (Fonte de Verdade)
      const saveRes = await saveOrderToSupabase(env, {
        id: orderId,
        purchaseToken,
        packId: itemSlug,
        amount: canonicalPrice,
        status: 'pending',
        customerEmail: payerEmail || '',
        customerName: payerName || '',
        paymentMethod: 'simulated_local_pix',
        expiresAt: orderData.expiresAt,
        createdAt: orderData.createdAt,
        updatedAt: orderData.createdAt,
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
          orderId,
          purchaseToken,
          paymentId: `sim_${orderId}`,
          qrCode: simulatedQrCode,
          qrCodeUrl: simulatedQrCodeUrl,
          qrCodeBase64: simulatedQrCodeUrl,
          amount: canonicalPrice,
          isTestMode: true,
          itemSlug,
          itemTitle: targetTitle,
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Geração do Pix oficial nativo via Stripe (Ambiente Real)
    const stripeResult = await createStripePixPaymentIntent(env, {
      amount: canonicalPrice,
      description: `Licenciamento de Mídia Digital e Conteúdo Editorial — REF: ${orderId}`,
      orderId,
      orderType: type as any,
      payerEmail: payerEmail || 'contato@nuaborges.com.br',
      payerName: payerName || 'Cliente',
      metadata: {
        orderId,
        orderType: type,
        externalReference,
      },
    });

    if (!stripeResult.qrCode) {
      throw new Error('A Stripe não retornou o código Pix. Verifique se o Pix está ativado na conta Stripe.');
    }

    const now = new Date();
    const orderData = {
      orderId,
      purchaseToken,
      type,
      itemSlug,
      itemTitle: targetTitle,
      canonicalPrice,
      amount: stripeResult.amount,
      status: 'pending',
      stripePaymentIntentId: stripeResult.id,
      paymentMethod: 'stripe_pix',
      externalReference,
      qrCode: stripeResult.qrCode,
      qrCodeUrl: stripeResult.qrCodeUrl,
      payerEmail: payerEmail || undefined,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 20 * 60 * 1000).toISOString(),
    };

    // Salva na tabela orders do Supabase PostgreSQL (Master Database - Fonte de Verdade)
    const saveRes = await saveOrderToSupabase(env, {
      id: orderId,
      purchaseToken,
      packId: itemSlug,
      amount: stripeResult.amount,
      status: 'pending',
      customerEmail: payerEmail || '',
      customerName: payerName || '',
      stripePaymentIntentId: stripeResult.id,
      paymentMethod: 'stripe_pix',
      expiresAt: orderData.expiresAt,
      createdAt: orderData.createdAt,
      updatedAt: orderData.createdAt,
    });

    if (!saveRes.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao persistir pedido no banco de dados oficial.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        purchaseToken,
        paymentId: stripeResult.id,
        stripePaymentIntentId: stripeResult.id,
        clientSecret: stripeResult.clientSecret,
        qrCode: stripeResult.qrCode,
        qrCodeUrl: stripeResult.qrCodeUrl,
        qrCodeBase64: stripeResult.qrCodeUrl, // Compatibilidade com frontend (recebe URL da imagem ou base64)
        amount: stripeResult.amount,
        itemSlug,
        itemTitle: targetTitle,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Create Pix Error]:', err?.message || err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Não foi possível gerar o Pix agora. Tente novamente em instantes.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const onRequestGet = onRequestPost;
export const onRequest = onRequestPost;
