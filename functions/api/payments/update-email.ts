/**
 * Cloudflare Pages Function: POST /api/payments/update-email
 *
 * Atualiza o e-mail do comprador em um pedido e, se o pedido já estiver aprovado,
 * dispara imediatamente o e-mail de acesso privativo de forma idempotente.
 *
 * Segurança: exige prova de posse via `purchaseToken` correspondente ao pedido OU
 * sessão NUA ID autenticada vinculada ao pedido.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';
import { getOrderFromSupabase } from '../_supabaseStore';
import { timingSafeEqual } from '../id/_crypto';
import { resolveCustomerSession } from '../id/_customerGuard';
import { getOrderClaim } from '../id/_nuaIdStore';
import { finalizePaidPackOrder } from './_orderFulfillment';

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

const EMAIL_RE = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string;
      email?: string;
      purchaseToken?: string;
      token?: string;
    };
    const orderId = (body.orderId || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const providedToken = (body.purchaseToken || body.token || '').trim();

    if (!orderId || !EMAIL_RE.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Informe um número de pedido e um e-mail válidos.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingOrder = await getOrderFromSupabase(env, orderId);
    if (!existingOrder) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não localizado.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validação de posse: sessão autenticada dona do claim OU purchaseToken válido para pedido ainda não pago/vinculado
    const customer = await resolveCustomerSession(request, env);
    const claim = await getOrderClaim(env, orderId);
    const hasValidSession = Boolean(
      customer &&
        claim?.profileId === customer.profile.id &&
        email.toLowerCase() === customer.profile.emailNormalized
    );
    const hasValidPurchaseToken = Boolean(
      providedToken &&
        existingOrder.purchaseToken &&
        !claim?.profileId &&
        timingSafeEqual(providedToken, existingOrder.purchaseToken)
    );
    const authorized = hasValidSession || hasValidPurchaseToken;
    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token de verificação do pedido inválido ou ausente.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (isSupabaseConfigured(env)) {
      const sb = getSupabaseClient(env);
      if (sb) {
        await sb
          .from('orders')
          .update({ customer_email: email, updated_at: new Date().toISOString() })
          .eq('id', orderId);
      }
    }

    const isPaid = existingOrder.status === 'paid' || existingOrder.status === 'approved';
    let emailSent = false;
    if (isPaid) {
      const fulfillRes = await finalizePaidPackOrder(env, orderId);
      emailSent = fulfillRes.emailSent;
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        message: isPaid
          ? emailSent
            ? 'E-mail atualizado e link de acesso enviado com sucesso.'
            : 'E-mail salvo no pedido. Caso não receba em instantes, solicite o reenvio.'
          : 'E-mail vinculado ao pedido. O acesso será enviado automaticamente assim que o Pix for confirmado.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[payments/update-email] Erro:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Não foi possível atualizar o e-mail agora.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
