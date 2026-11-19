/**
 * Cloudflare Pages Function: POST /api/id/email-change
 *
 * Troca de e-mail com confirmação dupla (código no e-mail atual + código no novo e-mail).
 * Invariante: trocar e-mail NUNCA transfere automaticamente pedidos de outro endereço.
 */

import { generateOtpCode, hashClientIp, hashOtpCode, timingSafeEqual } from './_crypto';
import { getClientIp, getIdSecret, requireCustomer } from './_customerGuard';
import { renderEmailChangeCodeEmailHtml } from './_emailTemplates';
import {
  deleteOtpChallenge,
  getNuaIdAdapter,
  getOtpChallenge,
  getProfileByEmail,
  isValidEmailStrict,
  normalizeEmail,
  NuaIdEnv,
  recordCustomerAuditEvent,
  revokeAllCustomerSessions,
  saveOtpChallenge,
  saveProfile,
} from './_nuaIdStore';
import { checkAndConsumeRateLimit } from './_rateLimiter';
import { dispatchTransactionalEmail } from './_emailDispatch';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const PRIVATE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

const CHANGE_TTL_MINUTES = 15;

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const auth = await requireCustomer(request, env);
  if (!auth.ok) return auth.response;

  const body: any = await request.json().catch(() => ({}));
  const step = String(body?.step || 'request');
  const newEmail = normalizeEmail(body?.newEmail || '');
  const currentEmail = auth.profile.emailNormalized;

  if (!isValidEmailStrict(newEmail)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Informe um novo endereço de e-mail válido.' }),
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  if (newEmail === currentEmail) {
    return new Response(
      JSON.stringify({ success: false, error: 'O novo e-mail deve ser diferente do atual.' }),
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  const secret = getIdSecret(env) || 'nua-id';
  const ipHash = await hashClientIp(getClientIp(request), secret);

  // ETAPA 1: Solicitar códigos nos DOIS endereços
  if (step === 'request') {
    const rl = await checkAndConsumeRateLimit(env, `email_change:${auth.profile.id}`, 3, 3600);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Limite de alterações de e-mail atingido. Tente novamente mais tarde.',
        }),
        { status: 429, headers: PRIVATE_HEADERS }
      );
    }

    const existingOwner = await getProfileByEmail(env, newEmail);
    if (existingOwner && existingOwner.id !== auth.profile.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Não é possível utilizar este endereço de e-mail.',
        }),
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }

    const currentCode = generateOtpCode();
    const newCode = generateOtpCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CHANGE_TTL_MINUTES * 60 * 1000).toISOString();

    const saltCurrent = crypto.randomUUID();
    const saltNew = crypto.randomUUID();

    await saveOtpChallenge(env, {
      emailNormalized: currentEmail,
      codeHash: await hashOtpCode(currentCode, saltCurrent),
      salt: saltCurrent,
      attempts: 0,
      maxAttempts: 5,
      purpose: 'email_change_current',
      meta: { profileId: auth.profile.id, targetNewEmail: newEmail },
      createdAt: now.toISOString(),
      expiresAt,
    });

    await saveOtpChallenge(env, {
      emailNormalized: newEmail,
      codeHash: await hashOtpCode(newCode, saltNew),
      salt: saltNew,
      attempts: 0,
      maxAttempts: 5,
      purpose: 'email_change_new',
      meta: { profileId: auth.profile.id, sourceCurrentEmail: currentEmail },
      createdAt: now.toISOString(),
      expiresAt,
    });

    const msgCurrent = renderEmailChangeCodeEmailHtml({
      code: currentCode,
      stage: 'current',
      expiresMinutes: CHANGE_TTL_MINUTES,
    });
    const msgNew = renderEmailChangeCodeEmailHtml({
      code: newCode,
      stage: 'new',
      expiresMinutes: CHANGE_TTL_MINUTES,
    });

    await Promise.all([
      dispatchTransactionalEmail(env, {
        to: currentEmail,
        subject: msgCurrent.subject,
        html: msgCurrent.html,
        meta: { code: currentCode, stage: 'current' },
      }),
      dispatchTransactionalEmail(env, {
        to: newEmail,
        subject: msgNew.subject,
        html: msgNew.html,
        meta: { code: newCode, stage: 'new' },
      }),
    ]);

    await recordCustomerAuditEvent(env, {
      profileId: auth.profile.id,
      action: 'email_change_requested',
      actorIpHash: ipHash,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Enviamos códigos de confirmação para o seu e-mail atual e para o novo endereço.',
      }),
      { status: 200, headers: PRIVATE_HEADERS }
    );
  }

  // ETAPA 2: Confirmar ambos os códigos
  if (step === 'confirm') {
    const currentCode = String(body?.currentEmailCode || '').replace(/\s+/g, '');
    const newCode = String(body?.newEmailCode || '').replace(/\s+/g, '');

    if (!/^\d{6}$/.test(currentCode) || !/^\d{6}$/.test(newCode)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Informe os dois códigos de 6 dígitos (e-mail atual e novo e-mail).',
        }),
        { status: 400, headers: PRIVATE_HEADERS }
      );
    }

    const chCurrent = await getOtpChallenge(env, currentEmail, 'email_change_current');
    const chNew = await getOtpChallenge(env, newEmail, 'email_change_new');

    if (
      !chCurrent ||
      !chNew ||
      chCurrent.meta?.profileId !== auth.profile.id ||
      chNew.meta?.profileId !== auth.profile.id ||
      chCurrent.meta?.targetNewEmail !== newEmail
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Solicitação de alteração de e-mail inválida ou expirada.',
        }),
        { status: 401, headers: PRIVATE_HEADERS }
      );
    }

    const nowMs = Date.now();
    if (
      nowMs > new Date(chCurrent.expiresAt).getTime() ||
      nowMs > new Date(chNew.expiresAt).getTime()
    ) {
      await deleteOtpChallenge(env, currentEmail, 'email_change_current');
      await deleteOtpChallenge(env, newEmail, 'email_change_new');
      return new Response(
        JSON.stringify({ success: false, error: 'Códigos expirados. Solicite novamente.' }),
        { status: 401, headers: PRIVATE_HEADERS }
      );
    }

    const hashCurrent = await hashOtpCode(currentCode, chCurrent.salt);
    const hashNew = await hashOtpCode(newCode, chNew.salt);

    if (
      !timingSafeEqual(hashCurrent, chCurrent.codeHash) ||
      !timingSafeEqual(hashNew, chNew.codeHash)
    ) {
      chCurrent.attempts += 1;
      chNew.attempts += 1;
      if (chCurrent.attempts >= chCurrent.maxAttempts || chNew.attempts >= chNew.maxAttempts) {
        await deleteOtpChallenge(env, currentEmail, 'email_change_current');
        await deleteOtpChallenge(env, newEmail, 'email_change_new');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Excesso de tentativas inválidas. Inicie o processo novamente.',
          }),
          { status: 429, headers: PRIVATE_HEADERS }
        );
      }
      await saveOtpChallenge(env, chCurrent);
      await saveOtpChallenge(env, chNew);
      return new Response(
        JSON.stringify({ success: false, error: 'Um ou ambos os códigos estão incorretos.' }),
        { status: 401, headers: PRIVATE_HEADERS }
      );
    }

    // Revalida unicidade do novo e-mail
    const conflictOwner = await getProfileByEmail(env, newEmail);
    if (conflictOwner && conflictOwner.id !== auth.profile.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Endereço indisponível.' }),
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }

    // Queima os desafios imediatamente
    await deleteOtpChallenge(env, currentEmail, 'email_change_current');
    await deleteOtpChallenge(env, newEmail, 'email_change_new');

    const adapter = getNuaIdAdapter(env);
    if (adapter) {
      await adapter.kvDelete(`nua_id:email:${currentEmail}`);
      if (adapter.updateAuthUserEmail) {
        await adapter.updateAuthUserEmail(auth.profile.id, newEmail);
      }
    }

    const updated = {
      ...auth.profile,
      email: newEmail,
      emailNormalized: newEmail,
    };
    await saveProfile(env, updated);

    // Revoga sessões em outros dispositivos por segurança
    await revokeAllCustomerSessions(env, auth.profile.id, auth.session.id);

    await recordCustomerAuditEvent(env, {
      profileId: auth.profile.id,
      action: 'email_changed',
      actorIpHash: ipHash,
    });

    return new Response(
      JSON.stringify({
        success: true,
        email: newEmail,
        message: 'E-mail atualizado com sucesso. Pedidos de outros endereços não são transferidos automaticamente.',
      }),
      { status: 200, headers: PRIVATE_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({ success: false, error: 'Etapa inválida.' }),
    { status: 400, headers: PRIVATE_HEADERS }
  );
};
