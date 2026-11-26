/**
 * Cloudflare Pages Function: POST /api/id/verify-code
 *
 * Valida o código OTP de 6 dígitos, cria/localiza a conta NUA ID (Supabase Auth + Profile),
 * emite sessão segura em cookie HttpOnly/Secure/SameSite=Lax e registra auditoria.
 */

import { generateSessionId, hashClientIp, hashOtpCode, timingSafeEqual } from './_crypto';
import {
  buildCustomerHintCookieHeader,
  buildCustomerSessionCookieHeader,
  getClientIp,
  getIdSecret,
  parseDeviceLabel,
  SESSION_DURATION_SECONDS,
} from './_customerGuard';
import { renderSecurityAlertEmailHtml } from './_emailTemplates';
import {
  deleteOtpChallenge,
  getNuaIdAdapter,
  getOrCreateProfileByEmail,
  getOtpChallenge,
  isValidEmailStrict,
  listCustomerSessions,
  normalizeEmail,
  NuaIdEnv,
  recordCustomerAuditEvent,
  saveCustomerSession,
  saveOtpChallenge,
} from './_nuaIdStore';
import { dispatchTransactionalEmail } from './_emailDispatch';
import { checkAndConsumeRateLimit } from './_rateLimiter';
import { digest as vaultDigest, setCookie as setVaultCookie, TRUST_SECONDS as VAULT_TRUST_SECONDS } from '../me/_vault';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  };

  try {
    const secret = getIdSecret(env);
    if (!secret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Serviço de autenticação não configurado no servidor.',
        }),
        { status: 503, headers: baseHeaders }
      );
    }

    const body: any = await request.json().catch(() => ({}));
    const emailNormalized = normalizeEmail(body?.email || '');
    const code = String(body?.code || '').replace(/\s+/g, '').trim();
    const displayName = body?.displayName ? String(body.displayName).trim().slice(0, 80) : undefined;

    // Rate limit por IP para bloquear tentativas paralelas de força bruta contra OTP
    const ipHashCheck = await hashClientIp(getClientIp(request), secret);
    const rl = await checkAndConsumeRateLimit(env, `otp_verify_ip:${ipHashCheck}`, 20, 600);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Muitas tentativas de verificação. Aguarde alguns minutos e tente novamente.',
        }),
        { status: 429, headers: baseHeaders }
      );
    }

    if (!isValidEmailStrict(emailNormalized) || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Informe o e-mail e o código de 6 dígitos.',
        }),
        { status: 400, headers: baseHeaders }
      );
    }

    const challenge = await getOtpChallenge(env, emailNormalized, 'login');
    if (!challenge) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Código inválido ou expirado. Solicite um novo código.',
        }),
        { status: 401, headers: baseHeaders }
      );
    }

    // 1. Verifica expiração
    if (Date.now() > new Date(challenge.expiresAt).getTime()) {
      await deleteOtpChallenge(env, emailNormalized, 'login');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Este código expirou. Solicite um novo código para continuar.',
        }),
        { status: 401, headers: baseHeaders }
      );
    }

    // 2. Verifica limite de tentativas
    if (challenge.attempts >= challenge.maxAttempts) {
      await deleteOtpChallenge(env, emailNormalized, 'login');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Número máximo de tentativas excedido. Solicite um novo código.',
        }),
        { status: 429, headers: baseHeaders }
      );
    }

    // 3. Comparação em tempo constante com hash salgado
    const computedHash = await hashOtpCode(code, challenge.salt);
    const matches = timingSafeEqual(computedHash, challenge.codeHash);

    if (!matches) {
      challenge.attempts += 1;
      if (challenge.attempts >= challenge.maxAttempts) {
        await deleteOtpChallenge(env, emailNormalized, 'login');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Código invalidado por excesso de tentativas incorretas. Solicite um novo código.',
          }),
          { status: 429, headers: baseHeaders }
        );
      }

      await saveOtpChallenge(env, challenge);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Código incorreto. Verifique os 6 dígitos e tente novamente.',
          attemptsRemaining: Math.max(0, challenge.maxAttempts - challenge.attempts),
        }),
        { status: 401, headers: baseHeaders }
      );
    }

    // 4. Uso único: invalida o OTP imediatamente antes de criar a sessão
    await deleteOtpChallenge(env, emailNormalized, 'login');

    // 5. Obtém ou cria conta/perfil no Supabase Auth + NUA ID
    const profile = await getOrCreateProfileByEmail(env, emailNormalized, displayName);
    if (!profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Não foi possível preparar sua conta agora. Tente novamente.',
        }),
        { status: 500, headers: baseHeaders }
      );
    }

    if (profile.status !== 'active') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Esta conta não está disponível para acesso.',
        }),
        { status: 403, headers: baseHeaders }
      );
    }

    // 6. Cria sessão persistente e emite cookie HttpOnly assinado
    const ua = request.headers.get('User-Agent') || '';
    const deviceLabel = parseDeviceLabel(ua);
    const ipHash = await hashClientIp(getClientIp(request), secret);

    const existingSessions = await listCustomerSessions(env, profile.id);
    const isKnownDevice = existingSessions.some((s) => s.deviceLabel === deviceLabel && s.ipHash === ipHash);

    const sessionId = generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);

    const sessionSaved = await saveCustomerSession(env, {
      id: sessionId,
      profileId: profile.id,
      deviceLabel,
      userAgent: ua.slice(0, 240),
      ipHash,
      isRevoked: false,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
    if (!sessionSaved) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível iniciar sua sessão. Solicite um novo código e tente novamente.' }),
        { status: 503, headers: baseHeaders }
      );
    }

    await recordCustomerAuditEvent(env, {
      profileId: profile.id,
      action: 'login_otp',
      actorIpHash: ipHash,
      details: { deviceLabel, sessionIdPrefix: sessionId.slice(0, 10) },
    });

    // Notificação discreta de segurança para novo dispositivo quando já havia sessões anteriores
    if (existingSessions.length > 0 && !isKnownDevice) {
      try {
        const atFormatted = new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'America/Sao_Paulo',
        }).format(now);
        const alert = renderSecurityAlertEmailHtml({
          deviceLabel,
          atFormatted,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
        });
        await dispatchTransactionalEmail(env, {
          to: profile.email,
          subject: alert.subject,
          html: alert.html,
        });
      } catch {
        // Falha de notificação nunca bloqueia o login
      }
    }

    const setCookie = await buildCustomerSessionCookieHeader(
      sessionId,
      secret,
      request,
      SESSION_DURATION_SECONDS
    );
    const hintCookie = buildCustomerHintCookieHeader(request, SESSION_DURATION_SECONDS);

    const responseHeaders = new Headers(baseHeaders);
    responseHeaders.append('Set-Cookie', setCookie);
    responseHeaders.append('Set-Cookie', hintCookie);

    // Unifica confiança do navegador: quem acabou de provar posse do e-mail via OTP + Turnstile
    // já recebe confiança de dispositivo para o Cofre neste navegador, evitando um segundo e-mail redundante.
    try {
      const store = getNuaIdAdapter(env);
      if (store) {
        const rawVaultDevice = crypto.randomUUID();
        const vaultDevice = {
          id: await vaultDigest(rawVaultDevice),
          label: deviceLabel,
          expires: Date.now() + VAULT_TRUST_SECONDS * 1000,
        };
        const savedDevice = await store.kvSet(
          'vault:device:' + profile.id + ':' + vaultDevice.id,
          vaultDevice
        );
        if (savedDevice) {
          setVaultCookie(responseHeaders, request, 'browser', rawVaultDevice, VAULT_TRUST_SECONDS);
        }
      }
    } catch {
      // Falha ao pré-autorizar o Cofre nunca bloqueia o login NUA ID
    }

    return new Response(
      JSON.stringify({
        success: true,
        authenticated: true,
        profile: {
          id: profile.id,
          email: profile.email,
          displayName: profile.displayName,
          marketingOptIn: profile.marketingOptIn,
          createdAt: profile.createdAt,
        },
      }),
      { status: 200, headers: responseHeaders }
    );
  } catch (err) {
    console.error('[NUA ID verify-code] Erro inesperado:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno ao validar o código. Tente novamente.',
      }),
      { status: 500, headers: baseHeaders }
    );
  }
};
