/**
 * Cloudflare Pages Function: /api/payments/update-email
 *
 * Atualiza o e-mail do cliente em um pedido aprovado e dispara o e-mail de acesso.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../_supabaseClient';

interface Env {
  CLOUDFLARE_EMAIL_API_KEY?: string;
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
      orderId?: string;
      email?: string;
    };
    const orderId = (body.orderId || '').trim();
    const email = (body.email || '').trim().toLowerCase();

    if (!orderId || !email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Informe um número de pedido e um e-mail válidos.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Atualiza no Supabase se configurado
    if (isSupabaseConfigured(env)) {
      const sb = getSupabaseClient(env);
      if (sb) {
        await sb
          .from('orders')
          .update({ customer_email: email, updated_at: new Date().toISOString() })
          .eq('id', orderId);
      }
    }

    // Dispara envio do OTP / Acesso por e-mail utilizando a API interna de send-otp
    try {
      const sendOtpUrl = new URL('/api/payments/send-otp', request.url).toString();
      await fetch(sendOtpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
    } catch (e) {
      console.warn('[UpdateEmail] Falha ao despachar OTP pós-atualização:', e);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'E-mail atualizado e instruções enviadas com sucesso.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erro ao atualizar e-mail.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
