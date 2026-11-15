/**
 * Cloudflare Pages Function: POST /api/payments/verify-access
 *
 * Validação segura de token de sessão / compra de pack avulso/VIP via Supabase PostgreSQL.
 */

import { getOrderFromSupabase, getSystemKVFromSupabase } from '../_supabaseStore';

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
    const isApprovedOrder = ['approved', 'paid', 'pago', 'pago_liberado', 'liberado'].includes(ordStatus);
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
        watermarkText: `NUA BORGES ♡ | CÓPIA PRIVATIVA AUTORIZADA | COMPRADOR: ${maskEmail(payerEmail)} | COMPRA #${shortOrderId}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
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
