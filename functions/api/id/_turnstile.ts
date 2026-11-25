/**
 * Cloudflare Turnstile Verification Helper — NUA ID
 *
 * Protege o pedido de código OTP contra bots e abuso automatizado.
 * Fail-closed em produção quando TURNSTILE_SECRET_KEY está configurado.
 */

export interface TurnstileResult {
  success: boolean;
  bypassed?: boolean;
  error?: string;
}

export async function verifyTurnstileToken(
  env: Record<string, any>,
  token: string | null | undefined,
  remoteIp?: string | null,
  requestUrl?: string
): Promise<TurnstileResult> {
  const secret =
    env?.TURNSTILE_SECRET_KEY ||
    (typeof process !== 'undefined' ? process.env?.TURNSTILE_SECRET_KEY : undefined);

  const envName = String(
    env?.ENVIRONMENT ||
      env?.NODE_ENV ||
      (typeof process !== 'undefined' ? process.env?.NODE_ENV : '') ||
      ''
  ).toLowerCase();

  const isProd = envName === 'production';

  let isLocalhost = false;
  if (requestUrl) {
    try {
      const host = new URL(requestUrl).hostname.toLowerCase();
      isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
    } catch {}
  }

  // Em produção real sem chave Turnstile: fail-closed (permite bypass apenas em localhost dev ou test store isolado)
  if (!secret) {
    if (isProd && !isLocalhost && !env?.__NUA_ID_TEST_STORE__) {
      console.error('[NUA ID Turnstile] TURNSTILE_SECRET_KEY ausente em produção (fail-closed).');
      return {
        success: false,
        error: 'Verificação de segurança indisponível no servidor. Tente novamente em instantes.',
      };
    }
    return { success: true, bypassed: true };
  }

  // Em localhost, permite token de teste oficial da Cloudflare ou bypass explícito de teste
  if (!isProd && isLocalhost && (!token || token === 'turnstile-local-bypass')) {
    return { success: true, bypassed: true };
  }

  if (!token || typeof token !== 'string' || token.trim().length < 10) {
    return { success: false, error: 'Verificação de segurança (Turnstile) obrigatória.' };
  }

  try {
    const formData = new URLSearchParams();
    formData.set('secret', secret);
    formData.set('response', token.trim());
    if (remoteIp) {
      formData.set('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10_000),
      body: formData.toString(),
    });

    if (!res.ok) {
      return { success: false, error: 'Falha ao validar verificação de segurança.' };
    }

    const data: any = await res.json();
    if (data?.success === true) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Verificação de segurança expirada ou inválida. Atualize e tente novamente.',
    };
  } catch (err) {
    console.error('[NUA ID Turnstile] Erro na verificação:', err);
    return { success: false, error: 'Serviço de verificação temporariamente indisponível.' };
  }
}
