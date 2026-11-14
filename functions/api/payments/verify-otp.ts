/**
 * Cloudflare Pages Function: POST /api/payments/verify-otp
 *
 * Valida o código OTP de 6 dígitos, aplica a trava de até 2 dispositivos e emite a sessão privativa.
 * Persistência 100% no Supabase PostgreSQL.
 */

import {
  getOrderFromSupabase,
  getSystemKVFromSupabase,
  setSystemKVInSupabase,
  deleteSystemKVFromSupabase,
} from '../_supabaseStore';

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
      orderId?: string;
      code?: string;
      deviceFingerprint?: string;
      slug?: string;
    };

    const orderId = (body.orderId || '').trim();
    const inputCode = (body.code || '').trim();
    const rawFingerprint = (body.deviceFingerprint || '').trim();

    const clientIp =
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For') ||
      '127.0.0.1';
    const userAgent = request.headers.get('User-Agent') || 'browser';

    // Gerar identificador do dispositivo se não enviado do frontend
    const fingerprint = rawFingerprint || `fp_${clientIp}_${userAgent.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '')}`;

    if (!orderId || !inputCode) {
      return new Response(
        JSON.stringify({ success: false, authorized: false, error: 'Informe o número do pedido e o código OTP.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Recupera OTP gravado no Supabase
    const foundOtp: any = await getSystemKVFromSupabase(env, `otp:${orderId}`);
    const foundOrder: any = await getOrderFromSupabase(env, orderId);

    if (!foundOtp) {
      return new Response(
        JSON.stringify({
          success: false,
          authorized: false,
          error: 'Código expirado ou inválido. Solicite um novo código de acesso.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar expiração do OTP (10 minutos)
    if (Date.now() > foundOtp.expiresAt) {
      return new Response(
        JSON.stringify({
          success: false,
          authorized: false,
          error: 'O código inserido expirou. Solicite um novo código de acesso por e-mail.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Comparar código OTP
    if (foundOtp.code !== inputCode) {
      return new Response(
        JSON.stringify({
          success: false,
          authorized: false,
          error: 'Código de verificação incorreto. Verifique o código em seu e-mail.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Trava de Dispositivos (Máximo 2 Dispositivos Autorizados)
    let devicesList: string[] = [];
    const rawDevices: any = await getSystemKVFromSupabase(env, `devices:${orderId}`);
    if (Array.isArray(rawDevices)) {
      devicesList = rawDevices;
    }

    const isExistingDevice = devicesList.includes(fingerprint);

    if (!isExistingDevice) {
      if (devicesList.length >= 2) {
        return new Response(
          JSON.stringify({
            success: false,
            authorized: false,
            error:
              'Limite de 2 dispositivos autorizados atingido para esta compra. Para autorizar este novo dispositivo, entre em contato com contato@nuaborges.com.br.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Adiciona o novo dispositivo e atualiza no Supabase
      devicesList.push(fingerprint);
      await setSystemKVInSupabase(env, `devices:${orderId}`, devicesList, 'VerifyOTP');
    }

    // Emite Session Token Privativo e registra sessão no Supabase
    const sessionToken = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const payerEmail = foundOtp.payerEmail || foundOrder?.customerEmail || 'contato@nuaborges.com.br';
    const itemSlug = foundOrder?.packId || body.slug || '';
    const itemTitle = foundOrder?.packId || 'Ensaio Autoral VIP';

    await setSystemKVInSupabase(env, `session:${sessionToken}`, {
      sessionToken,
      orderId,
      fingerprint,
      payerEmail,
      itemSlug,
      createdAt: Date.now(),
    }, 'VerifyOTP');

    // Deleta OTP consumido
    await deleteSystemKVFromSupabase(env, `otp:${orderId}`);

    const shortOrderId = orderId.slice(-6).toUpperCase();
    const watermarkText = `NUA BORGES ♡ | CÓPIA PRIVATIVA AUTORIZADA | COMPRADOR: ${maskEmail(payerEmail)} | COMPRA #${shortOrderId}`;

    return new Response(
      JSON.stringify({
        success: true,
        authorized: true,
        sessionToken,
        orderId,
        slug: itemSlug,
        itemTitle,
        watermarkText,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, authorized: false, error: err.message || 'Erro ao validar código OTP.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestGet = onRequestPost;
export const onRequest = onRequestPost;
