/**
 * Cloudflare Pages Function: POST /api/id/request-code
 *
 * Solicita código OTP de 6 dígitos para autenticação sem senha (NUA ID).
 * - Valida formato de e-mail
 * - Verifica Turnstile
 * - Rate limit persistente por IP e por e-mail
 * - Gera código via CSPRNG e salva apenas hash SHA-256 com sal (validade 10 min, uso único, máx 5 tentativas)
 * - Resposta idêntica exista a conta ou não (anti-enumeração)
 */

import { getSupabaseClient } from '../_supabaseClient';
import { generateOtpCode, hashClientIp, hashOtpCode } from './_crypto';
import { getClientIp, getIdSecret } from './_customerGuard';
import { renderAccessCodeEmailHtml } from './_emailTemplates';
import {
  getProfileByEmail,
  isValidEmailStrict,
  normalizeEmail,
  NuaIdEnv,
  recordCustomerAuditEvent,
  recordNotificationEvent,
  saveOtpChallenge,
} from './_nuaIdStore';
import { checkAndConsumeRateLimit } from './_rateLimiter';
import { verifyTurnstileToken } from './_turnstile';
import { dispatchTransactionalEmail } from './_emailDispatch';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

const UNIFORM_SUCCESS_RESPONSE = {
  success: true,
  expiresInMinutes: OTP_TTL_MINUTES,
  message:
    'Se houver uma conta ou pedido vinculado a este e-mail, você receberá um código de 6 dígitos em instantes.',
};

async function hasKnownPurchaseByEmail(env: NuaIdEnv, emailNormalized: string): Promise<boolean> {
  const fixtures = env?.__CUSTOMER_DATA_FIXTURES__;
  if (fixtures) {
    const inOrders = Object.values(fixtures.orders || {}).some(
      (o: any) => normalizeEmail(o?.customerEmail || '') === emailNormalized
    );
    const inApts = Object.values(fixtures.appointments || {}).some(
      (a: any) => normalizeEmail(a?.clientEmail || '') === emailNormalized
    );
    const inPers = Object.values(fixtures.personalizados || {}).some(
      (p: any) => normalizeEmail(p?.clientContact || '') === emailNormalized
    );
    return inOrders || inApts || inPers;
  }

  const sb = getSupabaseClient(env);
  if (!sb) throw new Error('Consulta de clientes indisponível.');

  const escapedEmail = emailNormalized.replace(/[%_\\]/g, '\\$&');
  const results = await Promise.all([
    sb.from('orders').select('id').ilike('customer_email', escapedEmail).limit(1),
    sb.from('appointments').select('id').ilike('client_instagram', escapedEmail).limit(1),
    sb.from('appointments').select('id').ilike('notes', `%${escapedEmail}%`).limit(1),
    sb.from('personalizados_orders').select('id').ilike('client_contact', escapedEmail).limit(1),
  ]);
  if (results.some(result => result.data?.length)) return true;
  if (results.some(result => result.error)) throw new Error('Consulta de clientes indisponível.');
  return false;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  };

  try {
    const body: any = await request.json().catch(() => ({}));
    const rawEmail = String(body?.email || '');
    const emailNormalized = normalizeEmail(rawEmail);
    const turnstileToken = body?.turnstileToken ? String(body.turnstileToken) : undefined;
    const intent = String(body?.intent || 'default').trim().toLowerCase();

    if (!isValidEmailStrict(emailNormalized)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Informe um endereço de e-mail válido.',
        }),
        { status: 400, headers }
      );
    }

    const clientIp = getClientIp(request);
    const { getIpHashSecret } = await import('../_central/secrets');
    const secret = getIdSecret(env) || getIpHashSecret(env as any);
    const ipHash = await hashClientIp(clientIp, secret);

    // 1. Cloudflare Turnstile
    const turnstile = await verifyTurnstileToken(env, turnstileToken, clientIp, request.url);
    if (!turnstile.success) {
      return new Response(
        JSON.stringify({ success: false, error: turnstile.error }),
        { status: 403, headers }
      );
    }

    // 2. Rate Limit persistente por IP (máx 12 pedidos / 15 min) e por e-mail (máx 4 pedidos / 15 min)
    const ipLimit = await checkAndConsumeRateLimit(env, `otp_ip:${ipHash}`, 12, 900);
    if (!ipLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Muitas solicitações recentes. Aguarde alguns minutos antes de tentar novamente.',
          retryAfterSeconds: ipLimit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: { ...headers, 'Retry-After': String(ipLimit.retryAfterSeconds) },
        }
      );
    }

    const emailLimit = await checkAndConsumeRateLimit(env, `otp_email:${emailNormalized}`, 4, 900);
    if (!emailLimit.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Limite de códigos para este e-mail atingido. Aguarde alguns minutos.',
          retryAfterSeconds: emailLimit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: { ...headers, 'Retry-After': String(emailLimit.retryAfterSeconds) },
        }
      );
    }

    // 3. Verifica se a conta existe (apenas para auditoria interna — NÃO altera a resposta!)
    const existingProfile = await getProfileByEmail(env, emailNormalized);
    if (existingProfile && existingProfile.status === 'suspended') {
      // Ainda retorna resposta uniforme para evitar enumeração de contas suspensas
      await recordCustomerAuditEvent(env, {
        profileId: existingProfile.id,
        action: 'request_code_blocked_suspended',
        actorIpHash: ipHash,
      });
      return new Response(JSON.stringify(UNIFORM_SUCCESS_RESPONSE), { status: 200, headers });
    }

    // 3.1 Trava "Somente Clientes" no portal sigiloso (/minha-nua):
    // Visitantes sem perfil nem pedidos registrados não disparam SMTP nem criam contas vazias.
    if (intent === 'portal_login' && !existingProfile) {
      const hasOrder = await hasKnownPurchaseByEmail(env, emailNormalized);
      if (!hasOrder) {
        await recordCustomerAuditEvent(env, {
          profileId: null,
          action: 'request_code_ignored_non_customer',
          actorIpHash: ipHash,
        });
        return new Response(JSON.stringify(UNIFORM_SUCCESS_RESPONSE), { status: 200, headers });
      }
    }

    // 4. Gera código OTP de 6 dígitos via CSPRNG e armazena apenas hash com sal
    const code = generateOtpCode();
    const salt = crypto.randomUUID();
    const codeHash = await hashOtpCode(code, salt);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

    const saved = await saveOtpChallenge(env, {
      emailNormalized,
      codeHash,
      salt,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      purpose: 'login',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    if (!saved) throw new Error('Armazenamento do código indisponível');

    // 5. Dispara e-mail transacional via Hostinger SMTP (ou sender de teste injetado)
    const { subject, html } = renderAccessCodeEmailHtml({
      code,
      expiresMinutes: OTP_TTL_MINUTES,
    });

    const dispatch = await dispatchTransactionalEmail(env, {
      to: emailNormalized,
      subject,
      html,
      meta: { code },
    });
    const emailSent = dispatch.sent;
    const emailError = dispatch.error;

    await recordNotificationEvent(env, {
      profileId: existingProfile?.id || null,
      recipientEmail: emailNormalized,
      kind: 'access_code',
      status: emailSent ? 'sent' : 'failed',
      errorMessage: emailError,
    });

    await recordCustomerAuditEvent(env, {
      profileId: existingProfile?.id || null,
      action: 'request_code',
      actorIpHash: ipHash,
      details: { delivered: emailSent },
    });

    if (!emailSent) {
      return new Response(JSON.stringify({ success: false, error: 'Não foi possível enviar o código agora. Tente novamente.' }), { status: 503, headers });
    }
    return new Response(JSON.stringify(UNIFORM_SUCCESS_RESPONSE), { status: 200, headers });
  } catch (err) {
    console.error('[NUA ID request-code] Erro inesperado:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Não foi possível processar sua solicitação agora. Tente novamente.',
      }),
      { status: 500, headers }
    );
  }
};
