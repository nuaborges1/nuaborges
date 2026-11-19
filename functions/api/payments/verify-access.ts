/**
 * Cloudflare Pages Function: POST /api/payments/verify-access
 *
 * Validação segura de token de sessão / compra de pack avulso/VIP via Supabase PostgreSQL.
 */

import { getOrderFromSupabase, getSystemKVFromSupabase, updateOrderInSupabase } from '../_supabaseStore';
import { getMercadoPagoPayment } from '../_mercadopago';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'e***l@dominio.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}${user[1]}***${user[user.length - 1]}@${domain}`;
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      sessionToken?: string;
      purchaseToken?: string;
      slug?: string;
    };

    const token = (body.sessionToken || body.token || body.purchaseToken || '').trim();
    const slug = (body.slug || '').trim().toLowerCase();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, authorized: false, error: 'Token de acesso não fornecido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let foundOrder: any = null;
    let foundSession: any = null;

    // 1. Consulta direta no PostgreSQL Supabase pelo token/ID
    const sbOrder = await getOrderFromSupabase(env, token);
    if (sbOrder) {
      const statusClean = String(sbOrder.status || '').toLowerCase().trim();
      const isApproved = ['approved', 'paid', 'pago', 'pago_liberado', 'liberado'].includes(statusClean);
      foundOrder = {
        orderId: sbOrder.id,
        purchaseToken: sbOrder.purchaseToken,
        itemSlug: sbOrder.packId,
        amount: sbOrder.amount,
        status: isApproved ? 'approved' : sbOrder.status,
        payerEmail: sbOrder.customerEmail,
        createdAt: sbOrder.createdAt,
        paymentId: sbOrder.paymentId || sbOrder.stripePaymentIntentId,
        stripePaymentIntentId: sbOrder.stripePaymentIntentId || sbOrder.paymentId,
      };
    }

    // 2. Se não encontrou direto, tenta via sessão registrada no Supabase
    if (!foundOrder) {
      foundSession = await getSystemKVFromSupabase(env, `session:${token}`);
      if (foundSession?.orderId) {
        const orderViaSession = await getOrderFromSupabase(env, foundSession.orderId);
        if (orderViaSession) {
          const statusClean = String(orderViaSession.status || '').toLowerCase().trim();
          const isApproved = ['approved', 'paid', 'pago', 'pago_liberado', 'liberado'].includes(statusClean);
          foundOrder = {
            orderId: orderViaSession.id,
            purchaseToken: orderViaSession.purchaseToken,
            itemSlug: orderViaSession.packId,
            amount: orderViaSession.amount,
            status: isApproved ? 'approved' : orderViaSession.status,
            payerEmail: orderViaSession.customerEmail,
            createdAt: orderViaSession.createdAt,
            paymentId: orderViaSession.paymentId || orderViaSession.stripePaymentIntentId,
            stripePaymentIntentId: orderViaSession.stripePaymentIntentId || orderViaSession.paymentId,
          };
        }
      }
    }

    if (!foundOrder) {
      return new Response(
        JSON.stringify({
          success: false,
          authorized: false,
          error: 'Sessão de acesso inválida ou compra não localizada.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ordStatus = String(foundOrder.status || '').toLowerCase().trim();
    let isApprovedOrder = ['approved', 'paid', 'pago', 'pago_liberado', 'liberado'].includes(ordStatus);

    // Fallback de Auto-Cura: Se no banco ainda constar 'pending', verifica diretamente no Mercado Pago
    if (!isApprovedOrder && (foundOrder.paymentId || foundOrder.stripePaymentIntentId)) {
      const mpPayId = foundOrder.paymentId || foundOrder.stripePaymentIntentId;
      try {
        const mpStatus = await getMercadoPagoPayment(env, mpPayId);
        if (mpStatus.success && mpStatus.status === 'approved') {
          // Atualiza o pedido no banco de dados imediatamente
          await updateOrderInSupabase(env, foundOrder.orderId, {
            status: 'paid',
            payment_id: mpPayId,
          });
          foundOrder.status = 'approved';
          isApprovedOrder = true;
        }
      } catch (mpErr) {
        console.warn(`[verify-access MP Fallback Error for order ${foundOrder.orderId}]:`, mpErr);
      }
    }

    if (!isApprovedOrder) {
      return new Response(
        JSON.stringify({
          success: false,
          authorized: false,
          error: 'O pagamento desta compra ainda não foi confirmado.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payerEmail = foundSession?.payerEmail || foundOrder.payerEmail || foundOrder.clientEmail || 'contato@nuaborges.com.br';
    const shortOrderId = (foundOrder.orderId || token).slice(-6).toUpperCase();

    // Recupera as mídias protegidas e blindadas diretamente do cofre privativo no Supabase
    let authorizedMedia: any = null;
    if (env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY);
        const { data: privContent } = await sb
          .from('site_content')
          .select('content')
          .eq('key', 'private_admin_content')
          .maybeSingle();

        const items = privContent?.content?.avulsos?.items || [];
        const targetClean = (foundOrder.itemSlug || foundOrder.slug || slug || '').trim().toLowerCase();
        const matchedItem = items.find((it: any) => {
          const cleanSlug = (it.slug || '').trim().toLowerCase();
          const cleanId = (it.id || '').trim().toLowerCase();
          return cleanSlug === targetClean || cleanId === targetClean || cleanId === `avulso-${targetClean}`;
        });

        if (matchedItem) {
          const exclusivePhotos =
            matchedItem.exclusivePhotos && matchedItem.exclusivePhotos.length > 0
              ? matchedItem.exclusivePhotos
              : matchedItem.imageUrl && !matchedItem.videos?.length
              ? [matchedItem.imageUrl]
              : [];

          authorizedMedia = {
            id: matchedItem.id,
            title: matchedItem.title,
            modality: matchedItem.modality,
            videos: matchedItem.videos || [],
            exclusivePhotos,
          };
        }
      } catch (mediaErr) {
        console.warn('[verify-access] Error fetching authorized media:', mediaErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorized: true,
        orderId: foundOrder.orderId,
        purchaseToken: token,
        sessionToken: foundSession?.sessionToken || token,
        slug: foundOrder.itemSlug || foundOrder.slug || slug,
        itemTitle: foundOrder.itemTitle || foundOrder.title,
        paidAt: foundOrder.paidAt || foundOrder.createdAt,
        authorizedMedia,
        watermarkText: `NUA BORGES ♡ | CÓPIA PRIVATIVA AUTORIZADA | COMPRADOR: ${maskEmail(payerEmail)} | COMPRA #${shortOrderId}`,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, authorized: false, error: err.message || 'Erro de verificação.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestGet = onRequestPost;
export const onRequest = onRequestPost;
