/**
 * Resolução Estrita de Ambiente e Isolamento de Webhooks/Pagamentos (`environment.ts`).
 *
 * Garantias (Onda 0 — Isolamento Absoluto Staging vs Produção):
 * - Identificação explícita de ambiente (`production` | `staging` | `development` | `test`)
 *   respeitando a convenção `ENVIRONMENT` já adotada no projeto.
 * - Staging NUNCA faz fallback para `https://nuaborges.com.br`.
 * - Staging NUNCA aceita URLs produtivas nem credenciais produtivas (`APP_USR-`) do Mercado Pago.
 * - Produção aceita EXCLUSIVAMENTE hosts produtivos autorizados.
 * - URLs fornecidas pelo cliente HTTP jamais são usadas como destino de webhook.
 * - Validação exige HTTPS, caminho canônico `/api/webhooks/mercadopago(-v2)` e host na allowlist.
 */

export type RuntimeEnvironment = 'production' | 'staging' | 'development' | 'test';

const PRODUCTION_HOSTS = new Set<string>([
  'nuaborges.com.br',
  'www.nuaborges.com.br',
]);

const FORBIDDEN_IN_STAGING_HOSTS = new Set<string>([
  'nuaborges.com.br',
  'www.nuaborges.com.br',
  'admin.nuaborges.com.br',
  'admingeral.nuaborges.com.br',
  'nuaborges.pages.dev',
  'nuaborges-er7.pages.dev',
  'nuaborges-admin.pages.dev',
  'admingeral.pages.dev',
]);

const STAGING_HOST_PATTERNS: readonly RegExp[] = [
  /^staging\.nuaborges\.com\.br$/,
  /^homolog\.nuaborges\.com\.br$/,
  /^hml\.nuaborges\.com\.br$/,
  /^nuaborges-staging\.pages\.dev$/,
  /^[a-z0-9-]{2,63}\.nuaborges-staging\.pages\.dev$/,
  /^[a-z0-9-]{2,63}\.nuaborges\.pages\.dev$/,
  /^[a-z0-9-]{2,63}\.nuaborges-er7\.pages\.dev$/,
];

const ALLOWED_WEBHOOK_PATHS = new Set<string>([
  '/api/webhooks/mercadopago',
  '/api/webhooks/mercadopago-v2',
]);

function parseCsvHosts(raw: unknown): string[] {
  return String(raw || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter((h) => Boolean(h) && /^[a-z0-9.-]+$/.test(h));
}

/**
 * Classifica explicitamente o ambiente de execução atual.
 * Mantém default fail-closed (`production`) quando nenhuma variável de ambiente está definida.
 */
export function resolveRuntimeEnvironment(env?: Record<string, any>): RuntimeEnvironment {
  const rawEnv = String(env?.ENVIRONMENT || '').trim().toLowerCase();
  if (rawEnv === 'production' || rawEnv === 'prod') return 'production';
  if (rawEnv === 'staging' || rawEnv === 'stage' || rawEnv === 'homolog' || rawEnv === 'homologation' || rawEnv === 'preview') {
    return 'staging';
  }
  if (rawEnv === 'development' || rawEnv === 'dev') return 'development';
  if (rawEnv === 'test') return 'test';

  const nodeEnv = String(
    env?.NODE_ENV || (typeof process !== 'undefined' ? process.env?.NODE_ENV : '') || ''
  )
    .trim()
    .toLowerCase();
  if (nodeEnv === 'development' || nodeEnv === 'dev') return 'development';
  if (nodeEnv === 'test') return 'test';
  if (nodeEnv === 'staging') return 'staging';

  return 'production';
}

export function isStagingEnv(env?: Record<string, any>): boolean {
  return resolveRuntimeEnvironment(env) === 'staging';
}

export function isAuthorizedProductionHost(hostname: string, env?: Record<string, any>): boolean {
  const h = hostname.trim().toLowerCase();
  if (PRODUCTION_HOSTS.has(h)) return true;
  const extra = parseCsvHosts(env?.PRODUCTION_WEBHOOK_HOSTS);
  return extra.includes(h);
}

export function isAuthorizedStagingHost(hostname: string, env?: Record<string, any>): boolean {
  const h = hostname.trim().toLowerCase();
  if (FORBIDDEN_IN_STAGING_HOSTS.has(h)) return false;
  if (STAGING_HOST_PATTERNS.some((re) => re.test(h))) return true;
  const extra = parseCsvHosts(env?.STAGING_WEBHOOK_HOSTS);
  return extra.includes(h) && !FORBIDDEN_IN_STAGING_HOSTS.has(h);
}

/**
 * Valida se uma URL de webhook atende às garantias estritas de HTTPS, caminho e isolamento de ambiente.
 */
export function validateWebhookUrlForEnvironment(
  rawUrl: string,
  runtimeEnv: RuntimeEnvironment,
  env?: Record<string, any>
): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    throw new Error(
      `[ENV_ISOLATION] URL de webhook obrigatória ausente para o ambiente "${runtimeEnv}".`
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`[ENV_ISOLATION] URL de webhook inválida para o ambiente "${runtimeEnv}".`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('[ENV_ISOLATION] A URL de webhook exige protocolo HTTPS estrito.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('[ENV_ISOLATION] A URL de webhook não pode conter credenciais, query string ou fragmento.');
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/, '');
  if (!ALLOWED_WEBHOOK_PATHS.has(normalizedPath)) {
    throw new Error(
      `[ENV_ISOLATION] Caminho de webhook não permitido (${normalizedPath}). Use /api/webhooks/mercadopago.`
    );
  }

  const host = parsed.hostname.toLowerCase();

  if (runtimeEnv === 'staging') {
    if (FORBIDDEN_IN_STAGING_HOSTS.has(host)) {
      throw new Error(
        `[ENV_ISOLATION] Staging não pode utilizar URL de webhook de produção (${host}).`
      );
    }
    if (!isAuthorizedStagingHost(host, env)) {
      throw new Error(
        `[ENV_ISOLATION] Host de webhook não autorizado para staging (${host}). Configure MP_WEBHOOK_URL ou NEXT_PUBLIC_SITE_URL com host de homologação permitido.`
      );
    }
  } else if (runtimeEnv === 'production') {
    if (!isAuthorizedProductionHost(host, env)) {
      throw new Error(
        `[ENV_ISOLATION] Produção aceita exclusivamente URLs de webhook de produção autorizadas (recebido: ${host}).`
      );
    }
  } else {
    // development / test: proibido apontar webhook de desenvolvimento para produção
    if (FORBIDDEN_IN_STAGING_HOSTS.has(host)) {
      throw new Error(
        `[ENV_ISOLATION] Ambiente "${runtimeEnv}" não pode enviar webhooks para produção (${host}).`
      );
    }
  }

  return `${parsed.origin}${normalizedPath}`;
}

/**
 * Resolve de forma autoritativa e exclusivamente server-side a URL de webhook do Mercado Pago.
 * Nunca utiliza URL enviada por cliente HTTP e nunca faz fallback para produção em staging.
 */
export function resolveValidatedMercadoPagoWebhookUrl(env?: Record<string, any>): string | undefined {
  const runtimeEnv = resolveRuntimeEnvironment(env);
  const explicitWebhookUrl = String(env?.MP_WEBHOOK_URL || '').trim();
  const siteUrl = String(env?.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');

  if (runtimeEnv === 'staging') {
    const candidate = explicitWebhookUrl || (siteUrl ? `${siteUrl}/api/webhooks/mercadopago` : '');
    if (!candidate) {
      throw new Error(
        '[ENV_ISOLATION] Configuração obrigatória ausente em staging: defina MP_WEBHOOK_URL ou NEXT_PUBLIC_SITE_URL com host de homologação HTTPS autorizado.'
      );
    }
    return validateWebhookUrlForEnvironment(candidate, 'staging', env);
  }

  if (runtimeEnv === 'production') {
    const candidate =
      explicitWebhookUrl ||
      (siteUrl ? `${siteUrl}/api/webhooks/mercadopago` : 'https://nuaborges.com.br/api/webhooks/mercadopago');
    return validateWebhookUrlForEnvironment(candidate, 'production', env);
  }

  // development / test: só envia notification_url se explicitamente configurado e não produtivo
  if (explicitWebhookUrl) {
    return validateWebhookUrlForEnvironment(explicitWebhookUrl, runtimeEnv, env);
  }
  return undefined;
}

export type MercadoPagoTokenKind = 'TEST' | 'APP_USR' | 'UNKNOWN';

export function classifyMercadoPagoToken(token: string | null | undefined): MercadoPagoTokenKind {
  const clean = String(token || '').trim();
  if (clean.startsWith('TEST-')) return 'TEST';
  if (clean.startsWith('APP_USR-')) return 'APP_USR';
  return 'UNKNOWN';
}

export function isExplicitMercadoPagoSandboxMode(env?: Record<string, any>): boolean {
  return (
    String(
      env?.MP_SANDBOX_MODE ||
        (typeof process !== 'undefined' ? process.env?.MP_SANDBOX_MODE : '') ||
        ''
    )
      .trim()
      .toLowerCase() === 'true'
  );
}

/**
 * Valida a compatibilidade estrita entre credencial do Mercado Pago e o ambiente ativo.
 *
 * Modelo oficial do Mercado Pago (Payments API v1 — `/v1/payments`):
 * - Credenciais Sandbox de aplicação usam prefixo `TEST-`.
 * - Credenciais de Usuário de Teste (Test Seller User) podem usar prefixo `APP_USR-`, mas
 *   pertencem a uma conta marcada com tag `"test_user"` em `GET /users/me` (`live_mode: false`).
 *
 * Política fail-closed em staging:
 * - `TEST-`: aceito como credencial Sandbox.
 * - `APP_USR-`: aceito APENAS quando `MP_SANDBOX_MODE=true` está declarado explicitamente E
 *   exige validação adicional em runtime contra `GET /users/me` (`tags.includes('test_user')`).
 * - Qualquer `APP_USR-` sem `MP_SANDBOX_MODE=true` (ou pertencente a conta real) é BLOQUEADO.
 */
export function assertMercadoPagoEnvironmentSafety(
  env: Record<string, any> | undefined,
  token: string,
  options: { requireWebhookSecretInStaging?: boolean } = {}
): { runtimeEnv: RuntimeEnvironment; tokenKind: MercadoPagoTokenKind; requiresLiveTestUserCheck: boolean } {
  const runtimeEnv = resolveRuntimeEnvironment(env);
  const cleanToken = String(token || '').trim();
  const tokenKind = classifyMercadoPagoToken(cleanToken);

  if (!cleanToken) {
    throw new Error('Mercado Pago não configurado no servidor (MP_ACCESS_TOKEN ausente).');
  }

  if (runtimeEnv === 'staging') {
    if (tokenKind === 'UNKNOWN') {
      throw new Error(
        '[ENV_ISOLATION] Formato de MP_ACCESS_TOKEN inválido em staging (esperado TEST- ou APP_USR- de Usuário de Teste).'
      );
    }

    const requiresLiveTestUserCheck = tokenKind === 'APP_USR';
    if (tokenKind === 'APP_USR' && !isExplicitMercadoPagoSandboxMode(env)) {
      throw new Error(
        '[ENV_ISOLATION] Staging bloqueou token APP_USR- sem declaração explícita de Sandbox. Use credencial TEST- ou, se for credencial de Usuário de Teste (Test Seller), configure MP_SANDBOX_MODE=true para validação obrigatória via /users/me (tag test_user).'
      );
    }

    if (options.requireWebhookSecretInStaging) {
      const whSecret = String(
        env?.MP_WEBHOOK_SECRET ||
          (typeof process !== 'undefined' ? process.env?.MP_WEBHOOK_SECRET : '') ||
          ''
      ).trim();
      if (!whSecret) {
        throw new Error(
          '[ENV_ISOLATION] Configuração obrigatória ausente em staging: defina MP_WEBHOOK_SECRET para autenticar webhooks do Sandbox.'
        );
      }
    }
    return { runtimeEnv, tokenKind, requiresLiveTestUserCheck };
  }

  if (runtimeEnv === 'development' || runtimeEnv === 'test') {
    const testMode =
      env?.PAYMENT_TEST_MODE === 'true' ||
      (typeof process !== 'undefined' && process.env?.PAYMENT_TEST_MODE === 'true');
    if (!testMode || tokenKind !== 'TEST') {
      throw new Error(
        'Cobranças locais exigem PAYMENT_TEST_MODE=true e credencial de teste TEST- do Mercado Pago.'
      );
    }
    return { runtimeEnv, tokenKind, requiresLiveTestUserCheck: false };
  }

  return { runtimeEnv, tokenKind, requiresLiveTestUserCheck: false };
}
