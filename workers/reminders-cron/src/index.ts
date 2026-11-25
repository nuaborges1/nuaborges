export interface Env {
  ENVIRONMENT?: string;
  CRON_SECRET: string;
  REMINDERS_TARGET_URL?: string;
  RECONCILE_TARGET_URL?: string;
  HYGIENE_TARGET_URL?: string;
  /** Opt-in explícito: só ativa reconciliação automática após verificação de isolamento/homologação. */
  ENABLE_PAYMENT_RECONCILE?: string;
  /** Opt-in explícito: só ativa limpeza diária de registros efêmeros expirados após autorização. */
  ENABLE_DAILY_HYGIENE?: string;
  /** Hosts de staging adicionais permitidos (CSV), opcional. Nunca aceita hosts de produção. */
  STAGING_ALLOWED_HOSTS?: string;
}

const PRODUCTION_HOSTS = new Set<string>(['nuaborges.com.br', 'www.nuaborges.com.br']);
const PRODUCTION_RECONCILE_HOSTS = new Set<string>([
  'admin.nuaborges.com.br',
  'admingeral.nuaborges.com.br',
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

export function resolveWorkerEnvironment(env: Pick<Env, 'ENVIRONMENT'>): 'production' | 'staging' {
  const raw = String(env?.ENVIRONMENT || 'production').trim().toLowerCase();
  if (raw === 'staging' || raw === 'stage' || raw === 'homolog' || raw === 'homologation' || raw === 'preview') {
    return 'staging';
  }
  return 'production';
}

export function validateCronWorkerTargetUrl(
  rawUrl: string | undefined,
  workerEnv: 'production' | 'staging',
  expectedPath: '/api/cron/appointment-reminders' | '/api/payments/reconcile' | '/api/cron/hygiene',
  extraAllowedHostsCsv?: string
): string {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    throw new Error(
      `[ENV_ISOLATION] URL obrigatória ausente para ${expectedPath} no Worker (${workerEnv}).`
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`[ENV_ISOLATION] URL inválida para ${expectedPath} no Worker (${workerEnv}).`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`[ENV_ISOLATION] Worker exige HTTPS estrito para ${expectedPath}.`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`[ENV_ISOLATION] URL de destino do Worker não pode conter credenciais ou query string.`);
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/, '');
  if (normalizedPath !== expectedPath) {
    throw new Error(
      `[ENV_ISOLATION] Caminho inesperado no Worker: esperado ${expectedPath}, recebido ${normalizedPath}.`
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (workerEnv === 'staging') {
    if (FORBIDDEN_IN_STAGING_HOSTS.has(host)) {
      throw new Error(
        `[ENV_ISOLATION] Worker de staging proibido de chamar endpoint produtivo (${host}).`
      );
    }
    const extraAllowed = String(extraAllowedHostsCsv || '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    const allowed =
      STAGING_HOST_PATTERNS.some((re) => re.test(host)) ||
      (extraAllowed.includes(host) && !FORBIDDEN_IN_STAGING_HOSTS.has(host));
    if (!allowed) {
      throw new Error(
        `[ENV_ISOLATION] Host não autorizado para Worker de staging (${host}).`
      );
    }
  } else {
    const allowedProdHosts =
      expectedPath === '/api/payments/reconcile' ? PRODUCTION_RECONCILE_HOSTS : PRODUCTION_HOSTS;
    if (!allowedProdHosts.has(host)) {
      throw new Error(
        `[ENV_ISOLATION] Worker de produção aceita exclusivamente hosts produtivos autorizados (recebido: ${host}).`
      );
    }
  }

  return `${parsed.origin}${normalizedPath}`;
}

const remindersCronWorker = {
  async scheduled(_controller: any, env: Env, _ctx: any): Promise<void> {
    const workerEnv = resolveWorkerEnvironment(env);

    if (!env.CRON_SECRET || !String(env.CRON_SECRET).trim()) {
      throw new Error(`[RemindersCron:${workerEnv}] CRON_SECRET não configurado neste Worker.`);
    }

    // Em staging NÃO há fallback para https://nuaborges.com.br (fail-closed)
    const rawRemindersUrl =
      workerEnv === 'staging'
        ? env.REMINDERS_TARGET_URL
        : env.REMINDERS_TARGET_URL || 'https://nuaborges.com.br/api/cron/appointment-reminders';

    const targetUrl = validateCronWorkerTargetUrl(
      rawRemindersUrl,
      workerEnv,
      '/api/cron/appointment-reminders',
      env.STAGING_ALLOWED_HOSTS
    );

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'x-cron-secret': env.CRON_SECRET,
        Authorization: `Bearer ${env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(25_000),
    });

    const bodyText = await res.text().catch(() => '');
    if (!res.ok) {
      throw new Error(`[RemindersCron:${workerEnv}] Falha HTTP ${res.status}: ${bodyText.slice(0, 300)}`);
    }
    console.log(`[RemindersCron:${workerEnv}] OK ${res.status}: ${bodyText.slice(0, 300)}`);

    // Reconciliação periódica somente quando explicitamente habilitada e validada para o ambiente
    if (String(env.ENABLE_PAYMENT_RECONCILE || '').trim().toLowerCase() === 'true') {
      const rawReconcileUrl =
        workerEnv === 'staging'
          ? env.RECONCILE_TARGET_URL
          : env.RECONCILE_TARGET_URL || 'https://admin.nuaborges.com.br/api/payments/reconcile';

      const reconcileUrl = validateCronWorkerTargetUrl(
        rawReconcileUrl,
        workerEnv,
        '/api/payments/reconcile',
        env.STAGING_ALLOWED_HOSTS
      );

      try {
        const recRes = await fetch(reconcileUrl, {
          method: 'POST',
          headers: {
            'x-cron-secret': env.CRON_SECRET,
            Authorization: `Bearer ${env.CRON_SECRET}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(25_000),
        });
        const recText = await recRes.text().catch(() => '');
        if (!recRes.ok) {
          console.error(`[ReconcileCron:${workerEnv}] Falha HTTP ${recRes.status}: ${recText.slice(0, 300)}`);
        } else {
          console.log(`[ReconcileCron:${workerEnv}] OK ${recRes.status}: ${recText.slice(0, 300)}`);
        }
      } catch (recErr: any) {
        console.error(`[ReconcileCron:${workerEnv}] Erro na chamada de reconciliação:`, recErr?.message || recErr);
      }
    }

    // Higiene diária de registros efêmeros expirados (OTPs, sessões, rate limits) somente quando habilitada
    if (String(env.ENABLE_DAILY_HYGIENE || '').trim().toLowerCase() === 'true') {
      const rawHygieneUrl =
        workerEnv === 'staging'
          ? env.HYGIENE_TARGET_URL
          : env.HYGIENE_TARGET_URL || 'https://nuaborges.com.br/api/cron/hygiene';

      const hygieneUrl = validateCronWorkerTargetUrl(
        rawHygieneUrl,
        workerEnv,
        '/api/cron/hygiene',
        env.STAGING_ALLOWED_HOSTS
      );

      try {
        const hygRes = await fetch(hygieneUrl, {
          method: 'POST',
          headers: {
            'x-cron-secret': env.CRON_SECRET,
            Authorization: `Bearer ${env.CRON_SECRET}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(25_000),
        });
        const hygText = await hygRes.text().catch(() => '');
        if (!hygRes.ok) {
          console.error(`[HygieneCron:${workerEnv}] Falha HTTP ${hygRes.status}: ${hygText.slice(0, 300)}`);
        } else {
          console.log(`[HygieneCron:${workerEnv}] OK ${hygRes.status}: ${hygText.slice(0, 300)}`);
        }
      } catch (hygErr: any) {
        console.error(`[HygieneCron:${workerEnv}] Erro na chamada de higiene:`, hygErr?.message || hygErr);
      }
    }
  },
};

export default remindersCronWorker;
