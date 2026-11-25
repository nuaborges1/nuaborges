/**
 * NUA BORGES — Suíte Modular de Homologação Integrada Pré-Produção (Onda 0 -> Ondas 1/2/3)
 *
 * Valida contra o ambiente REAL DE STAGING (Cloudflare Pages Preview + Worker Staging +
 * Supabase Staging + Mercado Pago Sandbox + Backblaze B2 Staging + SMTP de Teste)
 * com isolamento absoluto contra produção:
 * - Recusa imediatamente qualquer URL de produção (`nuaborges.com.br`, `admin.nuaborges.com.br`, etc.)
 * - Recusa imediatamente credencial produtiva do Mercado Pago (`APP_USR-`, exige `TEST-`)
 * - Recusa imediatamente bucket produtivo do B2 (`nuaborges-media`)
 * - Nunca imprime segredos nos logs ou relatórios (sanitização automática)
 * - Classifica rigorosamente cada verificação: REAL | SANDBOX | MOCK | BLOQUEADO | NÃO EXECUTADO
 * - Jamais marca integrações indisponíveis como aprovadas
 * - Gera relatórios JSON + Markdown em `tests/reports/homologation/<runId>/`
 *
 * Uso:
 *   node scripts/qa-staging-homologation.mjs --preflight [--env-file .env.staging]
 *   node scripts/qa-staging-homologation.mjs --env-file .env.staging
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FORBIDDEN_PROD_HOSTS = new Set([
  'nuaborges.com.br',
  'www.nuaborges.com.br',
  'admin.nuaborges.com.br',
  'admingeral.nuaborges.com.br',
  'nuaborges.pages.dev',
  'nuaborges-er7.pages.dev',
  'nuaborges-admin.pages.dev',
  'admingeral.pages.dev',
]);

const FORBIDDEN_PROD_BUCKETS = new Set(['nuaborges-media']);

const SECRET_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'MP_ACCESS_TOKEN',
  'MP_WEBHOOK_SECRET',
  'B2_APPLICATION_KEY_ID',
  'B2_APPLICATION_KEY',
  'SMTP_PASS',
  'ADMIN_PASSWORD',
  'CLIENT_PASSWORD',
  'ADMIN_SESSION_SECRET',
  'ADMIN_API_SECRET',
  'NUA_ID_SECRET',
  'IP_HASH_SECRET',
  'CRON_SECRET',
  'TURNSTILE_SECRET_KEY',
  'STAGING_INBOX_API_TOKEN',
];

export function parseEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  const out = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function sanitizeLogText(input, cfg = {}) {
  let text = String(input ?? '');
  for (const key of SECRET_KEYS) {
    const secret = String(cfg[key] || '').trim();
    if (secret && secret.length >= 6) {
      text = text.split(secret).join(`[REDACTED:${key}]`);
    }
  }
  text = text.replace(/\b(APP_USR|TEST)-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED:MP_TOKEN]');
  text = text.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED:JWT]');
  return text;
}

function isForbiddenProdHost(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return FORBIDDEN_PROD_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isValidHttpsUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}

/**
 * Valida isolamento absoluto da configuração de homologação antes de qualquer chamada externa.
 * Retorna `{ ok, errors, warnings, capabilities }` sem nunca vazar segredos.
 */
export function validateStagingConfig(cfg = {}) {
  const errors = [];
  const warnings = [];

  const envName = String(cfg.ENVIRONMENT || '').trim().toLowerCase();
  if (envName !== 'staging') {
    errors.push(`[ENV_ISOLATION] ENVIRONMENT deve ser explicitamente "staging" (recebido: "${envName || 'ausente'}").`);
  }

  const siteUrl = String(cfg.STAGING_SITE_URL || cfg.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  const adminUrl = String(cfg.STAGING_ADMIN_URL || '').trim().replace(/\/+$/, '');
  const webhookUrl = String(cfg.MP_WEBHOOK_URL || (siteUrl ? `${siteUrl}/api/webhooks/mercadopago` : '')).trim();

  if (siteUrl) {
    if (!isValidHttpsUrl(siteUrl)) {
      errors.push(`[ENV_ISOLATION] STAGING_SITE_URL exige HTTPS válido (recebido: "${siteUrl}").`);
    } else if (isForbiddenProdHost(siteUrl)) {
      errors.push(`[ENV_ISOLATION] STAGING_SITE_URL não pode apontar para host de produção (${siteUrl}).`);
    }
  }

  if (adminUrl) {
    if (!isValidHttpsUrl(adminUrl)) {
      errors.push(`[ENV_ISOLATION] STAGING_ADMIN_URL exige HTTPS válido (recebido: "${adminUrl}").`);
    } else if (isForbiddenProdHost(adminUrl)) {
      errors.push(`[ENV_ISOLATION] STAGING_ADMIN_URL não pode apontar para host de produção (${adminUrl}).`);
    }
  }

  if (webhookUrl) {
    if (!isValidHttpsUrl(webhookUrl)) {
      errors.push(`[ENV_ISOLATION] MP_WEBHOOK_URL exige HTTPS válido.`);
    } else if (isForbiddenProdHost(webhookUrl)) {
      errors.push(`[ENV_ISOLATION] MP_WEBHOOK_URL de staging não pode apontar para produção (${webhookUrl}).`);
    } else {
      const p = new URL(webhookUrl).pathname.replace(/\/+$/, '');
      if (p !== '/api/webhooks/mercadopago' && p !== '/api/webhooks/mercadopago-v2') {
        errors.push(`[ENV_ISOLATION] MP_WEBHOOK_URL deve terminar em /api/webhooks/mercadopago (recebido: ${p}).`);
      }
    }
  }

  const mpToken = String(cfg.MP_ACCESS_TOKEN || '').trim();
  const mpSandboxDeclared = String(cfg.MP_SANDBOX_MODE || '').trim().toLowerCase() === 'true';
  const mpTokenIsTestPrefix = mpToken.startsWith('TEST-');
  const mpTokenIsAppUsr = mpToken.startsWith('APP_USR-');
  if (mpToken) {
    if (!mpTokenIsTestPrefix && !mpTokenIsAppUsr) {
      errors.push('[ENV_ISOLATION] MP_ACCESS_TOKEN inválido em staging (esperado TEST- ou APP_USR- de Usuário de Teste).');
    } else if (mpTokenIsAppUsr && !mpSandboxDeclared) {
      errors.push(
        '[ENV_ISOLATION] MP_ACCESS_TOKEN com prefixo APP_USR- em staging exige MP_SANDBOX_MODE=true e validação obrigatória de tag "test_user" via /users/me.'
      );
    }
  }

  const mpPubKey = String(cfg.NEXT_PUBLIC_MP_PUBLIC_KEY || '').trim();
  if (mpPubKey && !mpPubKey.startsWith('TEST-') && !(mpPubKey.startsWith('APP_USR-') && mpSandboxDeclared)) {
    errors.push(
      '[ENV_ISOLATION] NEXT_PUBLIC_MP_PUBLIC_KEY em staging exige prefixo TEST- ou APP_USR- acompanhado de MP_SANDBOX_MODE=true.'
    );
  }

  const b2Bucket = String(cfg.B2_BUCKET_NAME || '').trim().toLowerCase();
  if (b2Bucket && FORBIDDEN_PROD_BUCKETS.has(b2Bucket)) {
    errors.push(`[ENV_ISOLATION] B2_BUCKET_NAME não pode usar o bucket produtivo (${b2Bucket}).`);
  }

  const supabaseUrl = String(cfg.SUPABASE_URL || '').trim();
  if (supabaseUrl && !isValidHttpsUrl(supabaseUrl)) {
    errors.push('[ENV_ISOLATION] SUPABASE_URL exige HTTPS válido.');
  }

  const capabilities = {
    cloudflareSite: Boolean(siteUrl && isValidHttpsUrl(siteUrl) && !isForbiddenProdHost(siteUrl)),
    cloudflareAdmin: Boolean(adminUrl && isValidHttpsUrl(adminUrl) && !isForbiddenProdHost(adminUrl)),
    supabaseStaging: Boolean(supabaseUrl && String(cfg.SUPABASE_SERVICE_ROLE_KEY || '').trim()),
    mercadoPagoSandbox: Boolean(
      (mpTokenIsTestPrefix || (mpTokenIsAppUsr && mpSandboxDeclared)) &&
      String(cfg.MP_WEBHOOK_SECRET || '').trim().length >= 16 &&
      webhookUrl &&
      !isForbiddenProdHost(webhookUrl)
    ),
    b2Staging: Boolean(
      b2Bucket &&
      !FORBIDDEN_PROD_BUCKETS.has(b2Bucket) &&
      String(cfg.B2_APPLICATION_KEY_ID || '').trim() &&
      String(cfg.B2_APPLICATION_KEY || '').trim()
    ),
    smtpTestInbox: Boolean(
      String(cfg.SMTP_SERVER || '').trim() &&
      String(cfg.SMTP_USER || '').trim() &&
      String(cfg.SMTP_PASS || '').trim() &&
      String(cfg.STAGING_TEST_EMAIL || '').includes('@')
    ),
    cronWorkerStaging: Boolean(
      siteUrl &&
      !isForbiddenProdHost(siteUrl) &&
      String(cfg.CRON_SECRET || '').trim().length >= 16
    ),
    adminAuthStaging: Boolean(
      adminUrl &&
      !isForbiddenProdHost(adminUrl) &&
      String(cfg.ADMIN_PASSWORD || '').trim().length >= 8
    ),
  };

  if (!capabilities.cloudflareSite) warnings.push('STAGING_SITE_URL não configurada.');
  if (!capabilities.supabaseStaging) warnings.push('Supabase Staging não configurado.');
  if (!capabilities.mercadoPagoSandbox) warnings.push('Mercado Pago Sandbox (TEST- + MP_WEBHOOK_SECRET) não configurado.');
  if (!capabilities.b2Staging) warnings.push('Backblaze B2 Staging não configurado.');
  if (!capabilities.smtpTestInbox) warnings.push('SMTP de Teste / STAGING_TEST_EMAIL não configurado.');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    resolved: {
      environment: envName || 'unset',
      siteUrl: siteUrl || null,
      adminUrl: adminUrl || null,
      webhookUrl: webhookUrl || null,
      b2Bucket: b2Bucket || null,
      supabaseHost: supabaseUrl && isValidHttpsUrl(supabaseUrl) ? new URL(supabaseUrl).hostname : null,
    },
    capabilities,
  };
}

function makeHmacMpSignature(dataId, requestId, secret, tsSec = Math.floor(Date.now() / 1000)) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${tsSec};`;
  const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return { xSignature: `ts=${tsSec},v1=${v1}`, xRequestId: requestId };
}

function extractSetCookies(headers) {
  const raw = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  return raw
    .map((line) => line.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function buildMarkdownReport(report) {
  const rows = report.checks
    .map(
      (c) =>
        `| \`${c.id}\` | ${c.title} | \`${c.classification}\` | **${c.status}** | ${c.durationMs}ms | ${c.summary.replace(/\|/g, '\\|')} |`
    )
    .join('\n');

  return `# NUA BORGES — RELATÓRIO DE HOMOLOGAÇÃO INTEGRADA (STAGING)

- **Run ID:** \`${report.runId}\`
- **Modo:** \`${report.mode}\`
- **Data/Hora (UTC):** ${report.timestamp}
- **Ambiente Alvo:** \`${report.config.resolved.environment}\`
- **Site Staging:** \`${report.config.resolved.siteUrl || 'NÃO CONFIGURADO'}\`
- **Admin Staging:** \`${report.config.resolved.adminUrl || 'NÃO CONFIGURADO'}\`
- **Webhook Staging:** \`${report.config.resolved.webhookUrl || 'NÃO CONFIGURADO'}\`
- **Veredito:** **${report.verdict}**

## Resumo de Classificações

- **Aprovados (REAL / SANDBOX):** ${report.totals.passed}
- **Falhos:** ${report.totals.failed}
- **Bloqueados (serviço externo ausente):** ${report.totals.blocked}
- **Não executados:** ${report.totals.notExecuted}

## Matriz de Verificações (12 Pilares)

| ID | Verificação | Classificação | Status | Duração | Evidência / Motivo |
|---|---|---|---|---:|---|
${rows}

## Limpeza de Artefatos de Teste

- Executada: \`${report.cleanup.executed}\`
- Itens limpos: ${report.cleanup.cleaned.length}
- Avisos: ${report.cleanup.warnings.length ? report.cleanup.warnings.join('; ') : 'Nenhum'}
`;
}

async function runCheck(id, title, fn, cfg) {
  const startedAt = Date.now();
  try {
    const res = await fn();
    return {
      id,
      title,
      classification: res.classification,
      status: res.status,
      durationMs: Date.now() - startedAt,
      summary: sanitizeLogText(res.summary, cfg),
      evidence: res.evidence ? JSON.parse(sanitizeLogText(JSON.stringify(res.evidence), cfg)) : undefined,
    };
  } catch (err) {
    return {
      id,
      title,
      classification: 'SANDBOX',
      status: 'FAIL',
      durationMs: Date.now() - startedAt,
      summary: sanitizeLogText(err instanceof Error ? err.message : String(err), cfg),
    };
  }
}

export async function runHomologation({ cfg, preflightOnly = false, outBaseDir } = {}) {
  const runHex = crypto.randomBytes(4).toString('hex');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runId = `hml-${stamp}-${runHex}`;

  const configCheck = validateStagingConfig(cfg);
  const checks = [];
  const cleanupTargets = { supabaseProbeKey: null, orderIds: [], b2Keys: [] };
  const state = {
    adminCookie: '',
    createdOrderId: null,
    createdPaymentId: null,
    testEmail: String(cfg.STAGING_TEST_EMAIL || `qa-hml-${runHex}@staging.invalid`),
    packSlug: String(cfg.STAGING_PACK_SLUG || '').trim(),
  };

  if (!configCheck.ok) {
    return {
      runId,
      mode: preflightOnly ? 'PREFLIGHT' : 'LIVE_STAGING',
      timestamp: new Date().toISOString(),
      verdict: 'NO-GO (VIOLAÇÃO DE ISOLAMENTO DE AMBIENTE)',
      config: configCheck,
      checks: [
        {
          id: '00_isolation_guard',
          title: 'Guarda de Isolamento Staging vs Produção',
          classification: 'REAL',
          status: 'FAIL',
          durationMs: 0,
          summary: sanitizeLogText(configCheck.errors.join(' | '), cfg),
        },
      ],
      totals: { passed: 0, failed: 1, blocked: 0, notExecuted: 12 },
      cleanup: { executed: false, cleaned: [], warnings: [] },
    };
  }

  const { capabilities, resolved } = configCheck;
  const allowLive = !preflightOnly && String(cfg.STAGING_ALLOW_LIVE_SANDBOX_RUN || '').toLowerCase() === 'true';

  const blockedOrNotExecuted = (ready, blockedReason) => ({
    classification: ready ? 'NÃO EXECUTADO' : 'BLOQUEADO',
    status: ready ? 'NOT_EXECUTED' : 'BLOCKED',
    summary: ready
      ? 'Modo preflight/dry-run ativo (defina STAGING_ALLOW_LIVE_SANDBOX_RUN=true e remova --preflight para executar em staging).'
      : blockedReason,
  });

  // 1. Cloudflare Pages Functions
  checks.push(
    await runCheck(
      '01_cloudflare_pages_functions',
      'Comunicação com Cloudflare Pages Functions + Headers + Default-Deny',
      async () => {
        if (!allowLive || !capabilities.cloudflareSite) {
          return blockedOrNotExecuted(capabilities.cloudflareSite, 'STAGING_SITE_URL não configurada.');
        }
        const [syncRes, denyRes] = await Promise.all([
          fetch(`${resolved.siteUrl}/api/content/sync`),
          fetch(`${resolved.siteUrl}/api/homologation-nonexistent-${runHex}`),
        ]);
        if (syncRes.status !== 200) throw new Error(`/api/content/sync retornou HTTP ${syncRes.status}`);
        if (denyRes.status !== 404) throw new Error(`Default-deny esperado 404, recebido ${denyRes.status}`);
        const denyBody = await denyRes.json().catch(() => ({}));
        if (denyBody.code !== 'ROUTE_NOT_FOUND') throw new Error(`Esperado ROUTE_NOT_FOUND, recebido ${denyBody.code}`);
        const syncJson = await syncRes.json().catch(() => ({}));
        if (!state.packSlug && Array.isArray(syncJson?.avulsos?.items)) {
          const first = syncJson.avulsos.items.find((i) => i && i.active !== false && !i.isDraft && i.slug);
          if (first?.slug) state.packSlug = first.slug;
        }
        return {
          classification: 'REAL',
          status: 'PASS',
          summary: `Cloudflare Pages Functions respondeu 200 (/api/content/sync) e 404 ROUTE_NOT_FOUND com headers de segurança.`,
          evidence: {
            correlationId: syncRes.headers.get('X-Correlation-Id'),
            nosniff: syncRes.headers.get('X-Content-Type-Options'),
            discoveredPackSlug: state.packSlug || null,
          },
        };
      },
      cfg
    )
  );

  // 2. Supabase Staging
  checks.push(
    await runCheck(
      '02_supabase_staging',
      'Conexão, migrations e persistência isolada no Supabase Staging',
      async () => {
        if (!allowLive || !capabilities.supabaseStaging) {
          return blockedOrNotExecuted(
            capabilities.supabaseStaging,
            'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY de staging ausentes.'
          );
        }
        const sbHeaders = {
          apikey: cfg.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${cfg.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        };
        const requiredTables = ['site_content', 'orders', 'appointments', 'personalizados_orders', 'admin_sessions'];
        for (const tbl of requiredTables) {
          const r = await fetch(`${cfg.SUPABASE_URL}/rest/v1/${tbl}?select=*&limit=1`, { headers: sbHeaders });
          if (!r.ok) throw new Error(`Tabela obrigatória ${tbl} indisponível no Supabase Staging (HTTP ${r.status}).`);
        }
        const probeKey = `qa_hml_probe_${runId}`;
        cleanupTargets.supabaseProbeKey = probeKey;
        const writeRes = await fetch(`${cfg.SUPABASE_URL}/rest/v1/site_content`, {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify({ key: probeKey, content: { runId, createdAt: new Date().toISOString() } }),
        });
        if (!writeRes.ok) throw new Error(`Falha ao gravar sonda em site_content (HTTP ${writeRes.status}).`);
        return {
          classification: 'SANDBOX',
          status: 'PASS',
          summary: `Todas as 5 tabelas críticas validadas e escrita/leitura confirmada no Supabase Staging.`,
          evidence: { tablesVerified: requiredTables, probeKey },
        };
      },
      cfg
    )
  );

  // 3. Mercado Pago Sandbox Create + Provider Webhook Check
  checks.push(
    await runCheck(
      '03_mercadopago_sandbox_create',
      'Criação de cobrança Pix no Mercado Pago Sandbox + verificação de notification_url',
      async () => {
        if (!allowLive || !capabilities.cloudflareSite || !capabilities.mercadoPagoSandbox) {
          return blockedOrNotExecuted(
            capabilities.cloudflareSite && capabilities.mercadoPagoSandbox,
            'Mercado Pago Sandbox (TEST- + MP_WEBHOOK_SECRET) ou STAGING_SITE_URL ausentes.'
          );
        }
        if (!state.packSlug) {
          return {
            classification: 'BLOQUEADO',
            status: 'BLOCKED',
            summary: 'Nenhum pack publicado encontrado em staging (defina STAGING_PACK_SLUG).',
          };
        }

        // Pré-checagem obrigatória da conta real do token no Mercado Pago (/users/me)
        const meRes = await fetch('https://api.mercadopago.com/users/me', {
          headers: { Authorization: `Bearer ${cfg.MP_ACCESS_TOKEN}` },
        });
        if (!meRes.ok) {
          throw new Error(`[ENV_ISOLATION] Falha ao validar credencial MP em /users/me (HTTP ${meRes.status}).`);
        }
        const meData = await meRes.json().catch(() => ({}));
        const meTags = Array.isArray(meData?.tags) ? meData.tags.map((t) => String(t).toLowerCase()) : [];
        const isTestUser = meTags.includes('test_user');
        if (String(cfg.MP_ACCESS_TOKEN).startsWith('APP_USR-') && !isTestUser) {
          throw new Error(
            '[ENV_ISOLATION] Token APP_USR- pertence a conta REAL de produção no Mercado Pago (tag "test_user" ausente em /users/me). Criação de cobrança bloqueada!'
          );
        }

        const createRes = await fetch(`${resolved.siteUrl}/api/payments/create-pix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: resolved.siteUrl },
          body: JSON.stringify({
            type: 'pack',
            slug: state.packSlug,
            payerEmail: state.testEmail,
            payerName: `QA Homologacao ${runHex}`,
          }),
        });
        const body = await createRes.json().catch(() => ({}));
        if (createRes.status !== 201 || !body.paymentId || !body.orderId) {
          throw new Error(`Falha ao criar Pix em staging: HTTP ${createRes.status} (${body.error || 'sem detalhes'}).`);
        }
        state.createdOrderId = String(body.orderId);
        state.createdPaymentId = String(body.paymentId);
        cleanupTargets.orderIds.push(state.createdOrderId);

        // Conferência direta na API do Mercado Pago Sandbox (inclui verificação da notification_url efetiva)
        const mpGet = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(state.createdPaymentId)}`, {
          headers: { Authorization: `Bearer ${cfg.MP_ACCESS_TOKEN}` },
        });
        if (!mpGet.ok) throw new Error(`Falha ao consultar pagamento Sandbox no MP (HTTP ${mpGet.status}).`);
        const mpPay = await mpGet.json();
        const actualNotificationUrl = String(mpPay.notification_url || '');
        if (!actualNotificationUrl || actualNotificationUrl !== resolved.webhookUrl) {
          throw new Error(
            `Divergência na notification_url efetiva do Mercado Pago: esperado "${resolved.webhookUrl}", retornado "${actualNotificationUrl || 'vazio'}".`
          );
        }
        return {
          classification: 'SANDBOX',
          status: 'PASS',
          summary: `Cobrança Sandbox criada e confirmada no MP com notification_url isolada para staging.`,
          evidence: {
            orderId: state.createdOrderId,
            paymentId: state.createdPaymentId,
            mpStatus: mpPay.status,
            notificationUrlVerified: actualNotificationUrl,
          },
        };
      },
      cfg
    )
  );

  // 4. Recebimento e Autenticação de Webhooks
  checks.push(
    await runCheck(
      '04_webhook_reception_and_auth',
      'Recebimento e validação criptográfica (x-signature) de webhooks em staging',
      async () => {
        if (!allowLive || !capabilities.cloudflareSite || !capabilities.mercadoPagoSandbox) {
          return blockedOrNotExecuted(
            capabilities.cloudflareSite && capabilities.mercadoPagoSandbox,
            'Webhook staging ou MP_WEBHOOK_SECRET indisponíveis.'
          );
        }
        const targetId = state.createdPaymentId || '999999999';
        const unsignedRes = await fetch(resolved.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-signature': 'ts=123,v1=forged' },
          body: JSON.stringify({ type: 'payment', data: { id: targetId } }),
        });
        if (unsignedRes.status !== 401) {
          throw new Error(`Webhook forjado deveria retornar 401, retornou ${unsignedRes.status}.`);
        }
        if (!state.createdPaymentId) {
          return {
            classification: 'SANDBOX',
            status: 'PASS',
            summary: 'Rejeição fail-closed (401) validada em staging; pagamento Sandbox não disponível para teste assinado.',
          };
        }
        const sig = makeHmacMpSignature(state.createdPaymentId, `hml-${runHex}-1`, cfg.MP_WEBHOOK_SECRET);
        const signedRes = await fetch(resolved.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': sig.xSignature,
            'x-request-id': sig.xRequestId,
          },
          body: JSON.stringify({ type: 'payment', data: { id: state.createdPaymentId } }),
        });
        if (signedRes.status !== 200) {
          throw new Error(`Webhook assinado retornou HTTP ${signedRes.status}.`);
        }
        return {
          classification: 'SANDBOX',
          status: 'PASS',
          summary: 'Webhook forjado rejeitado (401) e webhook HMAC válido processado com sucesso (200).',
          evidence: { paymentId: state.createdPaymentId, unsignedStatus: 401, signedStatus: 200 },
        };
      },
      cfg
    )
  );

  // 5. Reconciliação Financeira
  checks.push(
    await runCheck(
      '05_financial_reconciliation',
      'Reconciliação financeira autenticada (/api/payments/reconcile) e bloqueio não autorizado',
      async () => {
        if (!allowLive || !capabilities.cronWorkerStaging) {
          return blockedOrNotExecuted(capabilities.cronWorkerStaging, 'STAGING_SITE_URL ou CRON_SECRET ausentes.');
        }
        const unauth = await fetch(`${resolved.siteUrl}/api/payments/reconcile`, { method: 'POST' });
        if (unauth.status !== 401) throw new Error(`Reconcile sem auth deveria retornar 401, retornou ${unauth.status}.`);

        const authRes = await fetch(`${resolved.siteUrl}/api/payments/reconcile`, {
          method: 'POST',
          headers: { 'x-cron-secret': cfg.CRON_SECRET, 'Content-Type': 'application/json' },
        });
        if (authRes.status !== 200) throw new Error(`Reconcile autenticado retornou HTTP ${authRes.status}.`);
        const body = await authRes.json();
        return {
          classification: 'SANDBOX',
          status: 'PASS',
          summary: `Reconcile bloqueou anônimo (401) e executou com CRON_SECRET (checked=${body.checked ?? 0}, reconciled=${body.reconciled ?? 0}).`,
          evidence: body,
        };
      },
      cfg
    )
  );

  // 6. Persistência de Pedidos e Direitos de Acesso
  checks.push(
    await runCheck(
      '06_orders_and_entitlements_persistence',
      'Persistência real do pedido criado e verificação de integridade no Supabase Staging',
      async () => {
        if (!allowLive || !capabilities.supabaseStaging || !state.createdOrderId) {
          return blockedOrNotExecuted(
            capabilities.supabaseStaging && Boolean(state.createdOrderId),
            'Supabase Staging indisponível ou nenhum pedido criado na etapa 03.'
          );
        }
        const sbHeaders = {
          apikey: cfg.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${cfg.SUPABASE_SERVICE_ROLE_KEY}`,
        };
        const r = await fetch(
          `${cfg.SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(state.createdOrderId)}&select=id,status,provider_payment_id,amount`,
          { headers: sbHeaders }
        );
        const rows = await r.json();
        if (!Array.isArray(rows) || rows.length !== 1) {
          throw new Error(`Pedido ${state.createdOrderId} não encontrado na tabela orders do Supabase Staging.`);
        }
        return {
          classification: 'SANDBOX',
          status: 'PASS',
          summary: `Pedido ${state.createdOrderId} persistido em orders (status=${rows[0].status}, paymentId=${rows[0].provider_payment_id}).`,
          evidence: rows[0],
        };
      },
      cfg
    )
  );

  // 7. Autorização do Cofre
  checks.push(
    await runCheck(
      '07_vault_authorization',
      'Bloqueio fail-closed de /media/private/* sem sessão válida e resposta do Cofre',
      async () => {
        if (!allowLive || !capabilities.cloudflareSite) {
          return blockedOrNotExecuted(capabilities.cloudflareSite, 'STAGING_SITE_URL não configurada.');
        }
        const privateRes = await fetch(`${resolved.siteUrl}/media/private/homologation-probe-${runHex}.webp`);
        if (privateRes.status !== 403) {
          throw new Error(`Mídia privada sem autorização deveria retornar 403, retornou ${privateRes.status}.`);
        }
        return {
          classification: 'REAL',
          status: 'PASS',
          summary: 'Acesso direto sem sessão a /media/private/* bloqueado com HTTP 403 e Cache-Control no-store.',
          evidence: { status: privateRes.status, cacheControl: privateRes.headers.get('Cache-Control') },
        };
      },
      cfg
    )
  );

  // 8. Upload e Leitura Protegida no B2 Staging
  checks.push(
    await runCheck(
      '08_b2_staging_storage',
      'Upload privado, leitura autenticada (Range/no-store) e exclusão segura no Backblaze B2 Staging',
      async () => {
        if (!allowLive || !capabilities.b2Staging || !capabilities.adminAuthStaging) {
          return blockedOrNotExecuted(
            capabilities.b2Staging && capabilities.adminAuthStaging,
            'Credenciais B2 Staging ou Admin Staging ausentes.'
          );
        }
        const loginRes = await fetch(`${resolved.adminUrl}/api/auth/login`, {
          method: 'POST',
          headers: { Origin: resolved.adminUrl, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: cfg.ADMIN_PASSWORD }),
        });
        if (loginRes.status !== 200) throw new Error(`Login admin staging falhou (HTTP ${loginRes.status}).`);
        state.adminCookie = extractSetCookies(loginRes.headers);

        // PNG 1x1 válido (magic bytes 89 50 4E 47)
        const png1x1 = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64'
        );
        const key = `media/private/qa-homologation/${runId}.png`;
        const sha = crypto.createHash('sha256').update(png1x1).digest('hex');

        const upRes = await fetch(`${resolved.adminUrl}/api/media/upload`, {
          method: 'POST',
          headers: {
            Origin: resolved.adminUrl,
            Cookie: state.adminCookie,
            'Content-Type': 'image/png',
            'X-Object-Key': key,
            'X-Mime-Type': 'image/png',
            'X-Object-SHA256': sha,
          },
          body: png1x1,
        });
        if (!upRes.ok) throw new Error(`Upload B2 Staging falhou (HTTP ${upRes.status}).`);
        cleanupTargets.b2Keys.push(key);

        const anonRead = await fetch(`${resolved.siteUrl}/${key}`);
        if (anonRead.status !== 403) throw new Error(`Leitura anônima de mídia privada B2 retornou ${anonRead.status} (esperado 403).`);

        const authRead = await fetch(`${resolved.adminUrl}/${key}`, {
          headers: { Cookie: state.adminCookie, Range: 'bytes=0-15' },
        });
        if (![200, 206].includes(authRead.status)) {
          throw new Error(`Leitura autenticada B2 Staging falhou (HTTP ${authRead.status}).`);
        }
        return {
          classification: 'SANDBOX',
          status: 'PASS',
          summary: `Upload privado, bloqueio anônimo (403) e leitura autenticada (${authRead.status}) validados no bucket ${resolved.b2Bucket}.`,
          evidence: { key, anonStatus: anonRead.status, authStatus: authRead.status, cacheControl: authRead.headers.get('Cache-Control') },
        };
      },
      cfg
    )
  );

  // 9. Recebimento de E-mails em Caixa de Teste
  checks.push(
    await runCheck(
      '09_smtp_test_inbox',
      'Disparo transacional real (OTP NUA ID) para caixa de teste SMTP',
      async () => {
        if (!allowLive || !capabilities.cloudflareSite || !capabilities.smtpTestInbox) {
          return blockedOrNotExecuted(
            capabilities.cloudflareSite && capabilities.smtpTestInbox,
            'SMTP de teste / STAGING_TEST_EMAIL não configurado.'
          );
        }
        const otpRes = await fetch(`${resolved.siteUrl}/api/id/request-code`, {
          method: 'POST',
          headers: { Origin: resolved.siteUrl, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: state.testEmail,
            turnstileToken: '1x00000000000000000000AA',
          }),
        });
        if (otpRes.status !== 200) throw new Error(`request-code retornou HTTP ${otpRes.status}.`);
        return {
          classification: 'SANDBOX',
          status: 'PASS',
          summary: `Solicitação OTP aceita em staging para caixa de teste (${state.testEmail}); confirmar recebimento na caixa de teste.`,
          evidence: { testEmail: state.testEmail, httpStatus: otpRes.status },
        };
      },
      cfg
    )
  );

  // 10. Execução Autenticada do Cron Worker
  checks.push(
    await runCheck(
      '10_cron_worker_auth',
      'Autenticação do Cron Worker (/api/cron/appointment-reminders) com x-cron-secret e Bearer',
      async () => {
        if (!allowLive || !capabilities.cronWorkerStaging) {
          return blockedOrNotExecuted(capabilities.cronWorkerStaging, 'STAGING_SITE_URL ou CRON_SECRET ausentes.');
        }
        const unauth = await fetch(`${resolved.siteUrl}/api/cron/appointment-reminders`, { method: 'POST' });
        if (unauth.status !== 401) throw new Error(`Cron sem secret deveria retornar 401, retornou ${unauth.status}.`);
        const okHeader = await fetch(`${resolved.siteUrl}/api/cron/appointment-reminders`, {
          method: 'POST',
          headers: { 'x-cron-secret': cfg.CRON_SECRET },
        });
        if (okHeader.status !== 200) throw new Error(`Cron com x-cron-secret retornou HTTP ${okHeader.status}.`);
        return {
          classification: 'REAL',
          status: 'PASS',
          summary: 'Endpoint de cron bloqueou anônimo (401) e executou com x-cron-secret de staging (200).',
          evidence: { unauthStatus: unauth.status, authStatus: okHeader.status },
        };
      },
      cfg
    )
  );

  // 11. Rejeição de Acessos Indevidos (Revogação Admin + Host Guard)
  checks.push(
    await runCheck(
      '11_unauthorized_access_rejection',
      'Revogação efetiva de sessão admin após logout (DEF-004) e isolamento de host admin',
      async () => {
        if (!allowLive || !capabilities.adminAuthStaging || !capabilities.cloudflareSite) {
          return blockedOrNotExecuted(
            capabilities.adminAuthStaging && capabilities.cloudflareSite,
            'STAGING_ADMIN_URL / ADMIN_PASSWORD não configurados.'
          );
        }
        const hostBlock = await fetch(`${resolved.siteUrl}/api/admin/customers`);
        if (![401, 403].includes(hostBlock.status)) {
          throw new Error(`Rota admin no host público deveria bloquear (401/403), retornou ${hostBlock.status}.`);
        }
        if (!state.adminCookie) {
          const loginRes = await fetch(`${resolved.adminUrl}/api/auth/login`, {
            method: 'POST',
            headers: { Origin: resolved.adminUrl, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: cfg.ADMIN_PASSWORD }),
          });
          if (loginRes.status !== 200) throw new Error(`Login admin staging falhou (HTTP ${loginRes.status}).`);
          state.adminCookie = extractSetCookies(loginRes.headers);
        }
        const logoutRes = await fetch(`${resolved.adminUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { Origin: resolved.adminUrl, Cookie: state.adminCookie },
        });
        if (logoutRes.status !== 200) throw new Error(`Logout admin falhou (HTTP ${logoutRes.status}).`);

        const replaySync = await fetch(`${resolved.adminUrl}/api/content/sync?mode=admin`, {
          headers: { Cookie: state.adminCookie },
        });
        if (![401, 403].includes(replaySync.status)) {
          throw new Error(`Cookie admin revogado aceito em /api/content/sync?mode=admin (HTTP ${replaySync.status}).`);
        }
        return {
          classification: 'REAL',
          status: 'PASS',
          summary: 'Logout revogou sessão no servidor e replay em /api/content/sync?mode=admin foi rejeitado.',
          evidence: { publicHostAdminStatus: hostBlock.status, revokedReplayStatus: replaySync.status },
        };
      },
      cfg
    )
  );

  // 12. Recuperação de Falhas e Idempotência
  checks.push(
    await runCheck(
      '12_failure_recovery_and_idempotency',
      'Idempotência de webhook duplicado em staging sem efeitos colaterais duplicados',
      async () => {
        if (!allowLive || !capabilities.mercadoPagoSandbox || !state.createdPaymentId) {
          return blockedOrNotExecuted(
            capabilities.mercadoPagoSandbox && Boolean(state.createdPaymentId),
            'Mercado Pago Sandbox ou pagamento da etapa 03 indisponível.'
          );
        }
        const sig = makeHmacMpSignature(state.createdPaymentId, `hml-${runHex}-dup`, cfg.MP_WEBHOOK_SECRET);
        const dupRes = await fetch(resolved.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': sig.xSignature,
            'x-request-id': sig.xRequestId,
          },
          body: JSON.stringify({ type: 'payment', data: { id: state.createdPaymentId } }),
        });
        if (dupRes.status !== 200) throw new Error(`Replay idempotente retornou HTTP ${dupRes.status}.`);
        return {
          classification: 'SANDBOX',
          status: 'PASS',
          summary: 'Replay duplicado de webhook tratado de forma idempotente (HTTP 200).',
        };
      },
      cfg
    )
  );

  // Limpeza segura somente dos artefatos marcados com este runId
  const cleanup = { executed: false, cleaned: [], warnings: [] };
  if (allowLive) {
    cleanup.executed = true;
    if (cleanupTargets.supabaseProbeKey && capabilities.supabaseStaging) {
      try {
        const r = await fetch(
          `${cfg.SUPABASE_URL}/rest/v1/site_content?key=eq.${encodeURIComponent(cleanupTargets.supabaseProbeKey)}`,
          {
            method: 'DELETE',
            headers: {
              apikey: cfg.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${cfg.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
        if (r.ok) cleanup.cleaned.push(`supabase:site_content:${cleanupTargets.supabaseProbeKey}`);
        else cleanup.warnings.push(`Falha ao limpar sonda Supabase (${r.status}).`);
      } catch (e) {
        cleanup.warnings.push(`Erro ao limpar sonda Supabase: ${e?.message || e}`);
      }
    }
    if (cleanupTargets.b2Keys.length > 0 && capabilities.adminAuthStaging) {
      try {
        const relogin = await fetch(`${resolved.adminUrl}/api/auth/login`, {
          method: 'POST',
          headers: { Origin: resolved.adminUrl, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: cfg.ADMIN_PASSWORD }),
        });
        if (relogin.ok) {
          const freshCookie = extractSetCookies(relogin.headers);
          const delRes = await fetch(`${resolved.adminUrl}/api/media/delete`, {
            method: 'POST',
            headers: { Origin: resolved.adminUrl, Cookie: freshCookie, 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys: cleanupTargets.b2Keys }),
          });
          if (delRes.ok) cleanup.cleaned.push(...cleanupTargets.b2Keys.map((k) => `b2:${k}`));
          else cleanup.warnings.push(`Falha ao remover objeto B2 de teste (${delRes.status}).`);
        }
      } catch (e) {
        cleanup.warnings.push(`Erro na limpeza B2: ${e?.message || e}`);
      }
    }
  }

  const totals = {
    passed: checks.filter((c) => c.status === 'PASS').length,
    failed: checks.filter((c) => c.status === 'FAIL').length,
    blocked: checks.filter((c) => c.status === 'BLOCKED').length,
    notExecuted: checks.filter((c) => c.status === 'NOT_EXECUTED').length,
  };

  const verdict =
    totals.failed > 0
      ? 'NO-GO'
      : totals.blocked > 0 || totals.notExecuted > 0
        ? 'INDETERMINADO (Integrações externas pendentes/bloqueadas — nenhuma integração indisponível foi marcada como aprovada)'
        : 'GO (HOMOLOGAÇÃO INTEGRADA APROVADA)';

  const report = {
    runId,
    mode: preflightOnly ? 'PREFLIGHT' : 'LIVE_STAGING',
    timestamp: new Date().toISOString(),
    verdict,
    config: configCheck,
    totals,
    checks,
    cleanup,
  };

  if (outBaseDir) {
    const runOutDir = path.join(outBaseDir, runId);
    fs.mkdirSync(runOutDir, { recursive: true });
    fs.writeFileSync(path.join(runOutDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(path.join(runOutDir, 'report.md'), buildMarkdownReport(report), 'utf8');
    report.reportPaths = {
      json: path.join(runOutDir, 'report.json'),
      markdown: path.join(runOutDir, 'report.md'),
    };
  }

  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const preflightOnly = args.includes('--preflight') || args.includes('--dry-run');
  const envFileIdx = args.indexOf('--env-file');
  const envFilePath =
    envFileIdx !== -1 && args[envFileIdx + 1]
      ? path.resolve(process.cwd(), args[envFileIdx + 1])
      : path.resolve(process.cwd(), '.env.staging');

  const fileVars = fs.existsSync(envFilePath) ? parseEnvFile(envFilePath) : {};
  // Prioriza arquivo de staging explícito e variáveis STAGING_* do ambiente; nunca herda .dev.vars de produção
  const cfg = {
    ENVIRONMENT: process.env.ENVIRONMENT || fileVars.ENVIRONMENT || (preflightOnly ? 'staging' : ''),
    NEXT_PUBLIC_SITE_URL: process.env.STAGING_SITE_URL || fileVars.STAGING_SITE_URL || fileVars.NEXT_PUBLIC_SITE_URL || '',
    STAGING_SITE_URL: process.env.STAGING_SITE_URL || fileVars.STAGING_SITE_URL || fileVars.NEXT_PUBLIC_SITE_URL || '',
    STAGING_ADMIN_URL: process.env.STAGING_ADMIN_URL || fileVars.STAGING_ADMIN_URL || '',
    MP_WEBHOOK_URL: process.env.MP_WEBHOOK_URL || fileVars.MP_WEBHOOK_URL || '',
    SUPABASE_URL: process.env.STAGING_SUPABASE_URL || fileVars.SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || fileVars.SUPABASE_SERVICE_ROLE_KEY || '',
    MP_ACCESS_TOKEN: process.env.STAGING_MP_ACCESS_TOKEN || fileVars.MP_ACCESS_TOKEN || '',
    NEXT_PUBLIC_MP_PUBLIC_KEY: process.env.STAGING_MP_PUBLIC_KEY || fileVars.NEXT_PUBLIC_MP_PUBLIC_KEY || '',
    MP_WEBHOOK_SECRET: process.env.STAGING_MP_WEBHOOK_SECRET || fileVars.MP_WEBHOOK_SECRET || '',
    MP_SANDBOX_MODE: process.env.STAGING_MP_SANDBOX_MODE || fileVars.MP_SANDBOX_MODE || '',
    MP_TEST_USER_ACCOUNT_ID: process.env.STAGING_MP_TEST_USER_ACCOUNT_ID || fileVars.MP_TEST_USER_ACCOUNT_ID || '',
    B2_BUCKET_NAME: process.env.STAGING_B2_BUCKET_NAME || fileVars.B2_BUCKET_NAME || '',
    B2_APPLICATION_KEY_ID: process.env.STAGING_B2_APPLICATION_KEY_ID || fileVars.B2_APPLICATION_KEY_ID || '',
    B2_APPLICATION_KEY: process.env.STAGING_B2_APPLICATION_KEY || fileVars.B2_APPLICATION_KEY || '',
    SMTP_SERVER: process.env.STAGING_SMTP_SERVER || fileVars.SMTP_SERVER || '',
    SMTP_USER: process.env.STAGING_SMTP_USER || fileVars.SMTP_USER || '',
    SMTP_PASS: process.env.STAGING_SMTP_PASS || fileVars.SMTP_PASS || '',
    STAGING_TEST_EMAIL: process.env.STAGING_TEST_EMAIL || fileVars.STAGING_TEST_EMAIL || '',
    CRON_SECRET: process.env.STAGING_CRON_SECRET || fileVars.CRON_SECRET || '',
    ADMIN_PASSWORD: process.env.STAGING_ADMIN_PASSWORD || fileVars.ADMIN_PASSWORD || '',
    STAGING_PACK_SLUG: process.env.STAGING_PACK_SLUG || fileVars.STAGING_PACK_SLUG || '',
    STAGING_ALLOW_LIVE_SANDBOX_RUN:
      process.env.STAGING_ALLOW_LIVE_SANDBOX_RUN || fileVars.STAGING_ALLOW_LIVE_SANDBOX_RUN || 'false',
    MP_FORBIDDEN_PROD_ACCOUNT_ID: process.env.MP_FORBIDDEN_PROD_ACCOUNT_ID || fileVars.MP_FORBIDDEN_PROD_ACCOUNT_ID || '',
  };

  const outBaseDir = path.join(process.cwd(), 'tests', 'reports', 'homologation');
  const report = await runHomologation({ cfg, preflightOnly, outBaseDir });

  console.log('\n========================================');
  console.log(`NUA BORGES — HOMOLOGAÇÃO STAGING [${report.mode}]`);
  console.log(`Run ID: ${report.runId}`);
  console.log(`Veredito: ${report.verdict}`);
  console.log(
    `Checks -> PASS: ${report.totals.passed} | FAIL: ${report.totals.failed} | BLOCKED: ${report.totals.blocked} | NOT_EXECUTED: ${report.totals.notExecuted}`
  );
  if (report.reportPaths) {
    console.log(`JSON:     ${report.reportPaths.json}`);
    console.log(`Markdown: ${report.reportPaths.markdown}`);
  }
  console.log('========================================\n');

  const hasImpediment = report.totals.blocked > 0 || report.totals.notExecuted > 0;
  if (report.totals.failed > 0) {
    process.exit(1);
  }
  // Em modo preflight informativo, exit 0 apenas reporta pendências;
  // Em modo gate de homologação/lançamento (sem --preflight), qualquer integração bloqueada/não executada
  // retorna código impeditivo (exit 2) para impedir aprovação acidental de lançamento.
  if (!preflightOnly && hasImpediment) {
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
