/**
 * Cloudflare Pages Function: POST /api/payments/recover-access
 *
 * Recuperação de acesso de compra através de autorização OTP segura por e-mail.
 * Consulta direta no Supabase PostgreSQL.
 */

import { getOrderFromSupabase } from '../_supabaseStore';
import { getSupabaseClient } from '../_supabaseClient';

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
      search?: string;
      orderId?: string;
    };

    const query = (body.search || body.orderId || '').trim().toLowerCase();
    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Informe o número do pedido ou e-mail cadastrado.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let foundOrder: any = null;

    // 1. Tenta por ID / token
    const direct = await getOrderFromSupabase(env, query);
    if (direct) {
      foundOrder = direct;
    } else if (query.includes('@')) {
      // 2. Tenta por e-mail
      const sb = getSupabaseClient(env);
      if (sb) {
        const { data } = await sb
          .from('orders')
          .select('*')
          .eq('customer_email', query)
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          foundOrder = {
            id: data.id,
            purchaseToken: data.purchase_token,
            packId: data.pack_id,
            amount: Number(data.amount),
            status: data.status,
            customerEmail: data.customer_email,
            customerName: data.customer_name,
            createdAt: data.created_at,
          };
        }
      }
    }

    if (!foundOrder || (foundOrder.status !== 'paid' && foundOrder.status !== 'approved')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma compra aprovada foi localizada com esses dados.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slug = foundOrder.packId || '';
    const payerEmail = foundOrder.customerEmail || 'contato@nuaborges.com.br';

    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        requireOtp: true,
        orderId: foundOrder.id,
        slug,
        itemTitle: foundOrder.packId || 'Ensaio Autoral VIP',
        maskedEmail: maskEmail(payerEmail),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Erro ao recuperar acesso.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestGet = onRequestPost;
export const onRequest = onRequestPost;
