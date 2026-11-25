/**
 * NUA BORGES — Deploy Seguro e Exclusivo de Homologação (Staging)
 *
 * Isolamento absoluto:
 * - Allowlist estrita: aceita SOMENTE os projetos dedicados `nuaborges-staging` (out-site)
 *   e `nuaborges-admin-staging` (out-admin). Recusa qualquer alvo de produção.
 * - Lê `.env.staging` (sem nunca imprimir valores) e sincroniza secrets apenas para
 *   os projetos dedicados de staging via `wrangler pages secret bulk` (arquivo temporário
 *   apagado imediatamente em `finally`).
 * - Gera `wrangler.toml` temporário isolado em `os.tmpdir()` com `ENVIRONMENT = "staging"`.
 *
 * Uso:
 *   node scripts/deploy-staging.mjs [--sync-secrets-only] [site|admin|all]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envStagingPath = path.join(rootDir, '.env.staging');

const ALLOWED_STAGING_TARGETS = {
  site: { project: 'nuaborges-staging', outDir: 'out-site', branch: 'staging' },
  admin: { project: 'nuaborges-admin-staging', outDir: 'out-admin', branch: 'staging' },
};

const FORBIDDEN_PROD_PROJECTS = new Set(['nuaborges', 'nuaborges-admin', 'admingeral']);

const SECRET_KEYS_TO_SYNC = [
  'ADMIN_PASSWORD',
  'CLIENT_PASSWORD',
  'ADMIN_SESSION_SECRET',
  'ADMIN_API_SECRET',
  'NUA_ID_SECRET',
  'IP_HASH_SECRET',
  'CRON_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MP_ACCESS_TOKEN',
  'MP_WEBHOOK_SECRET',
  'MP_TEST_USER_ACCOUNT_ID',
  'B2_APPLICATION_KEY_ID',
  'B2_APPLICATION_KEY',
  'SMTP_PASS',
  'SMTP_USER',
  'TURNSTILE_SECRET_KEY',
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo .env.staging não encontrado em: ${filePath}`);
  }
  const out = {};
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

function syncSecretsForProject(projectName, secretsObj) {
  if (FORBIDDEN_PROD_PROJECTS.has(projectName)) {
    throw new Error(`[ENV_ISOLATION] Proibido sincronizar secrets para projeto produtivo: ${projectName}`);
  }
  const keys = Object.keys(secretsObj);
  if (keys.length === 0) {
    console.log(`ℹ️ Nenhum secret não-vazio encontrado para ${projectName}.`);
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `nua-stg-sec-${projectName}-`));
  const secretJsonPath = path.join(tmpDir, 'secrets.json');
  try {
    fs.writeFileSync(secretJsonPath, JSON.stringify(secretsObj), { encoding: 'utf8', mode: 0o600 });
    const isWin = process.platform === 'win32';
    const bin = isWin ? 'cmd' : 'npx';
    const args = isWin
      ? ['/c', 'npx', '--no-install', 'wrangler', 'pages', 'secret', 'bulk', secretJsonPath, '--project-name', projectName]
      : ['--no-install', 'wrangler', 'pages', 'secret', 'bulk', secretJsonPath, '--project-name', projectName];
    console.log(`🔐 Sincronizando ${keys.length} secrets para ${projectName} (nomes: ${keys.join(', ')})...`);
    execFileSync(bin, args, { stdio: 'inherit', cwd: rootDir });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function deployProject(targetKey, target) {
  if (FORBIDDEN_PROD_PROJECTS.has(target.project)) {
    throw new Error(`[ENV_ISOLATION] Bloqueado deploy em projeto de produção: ${target.project}`);
  }
  const outAbs = path.join(rootDir, target.outDir);
  if (!fs.existsSync(outAbs)) {
    throw new Error(`Diretório ${target.outDir} não encontrado. Execute "npm run build && node tools/prepareDeploys.mjs" antes.`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `nua-stg-deploy-${targetKey}-`));
  try {
    const wranglerToml = [
      `name = "${target.project}"`,
      `pages_build_output_dir = "${outAbs.replace(/\\/g, '/')}"`,
      `compatibility_date = "2026-09-01"`,
      `compatibility_flags = ["nodejs_compat"]`,
      '',
      '[vars]',
      'ENVIRONMENT = "staging"',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(tmpDir, 'wrangler.toml'), wranglerToml, 'utf8');

    const isWin = process.platform === 'win32';
    const bin = isWin ? 'cmd' : 'npx';
    const args = isWin
      ? [
          '/c',
          'npx',
          '--no-install',
          'wrangler',
          'pages',
          'deploy',
          outAbs,
          '--project-name',
          target.project,
          '--branch',
          target.branch,
          '--cwd',
          tmpDir,
        ]
      : [
          '--no-install',
          'wrangler',
          'pages',
          'deploy',
          outAbs,
          '--project-name',
          target.project,
          '--branch',
          target.branch,
          '--cwd',
          tmpDir,
        ];

    console.log(`🚀 Publicando staging "${target.project}" (${target.outDir}, branch=${target.branch})...`);
    const res = spawnSync(bin, args, { stdio: 'inherit', cwd: rootDir });
    if (res.status !== 0) {
      throw new Error(`Falha no deploy staging de ${target.project} (exit ${res.status}).`);
    }
    console.log(`✅ Deploy staging concluído: https://${target.project}.pages.dev`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  const syncSecretsOnly = args.includes('--sync-secrets-only');
  const posArg = args.find((a) => !a.startsWith('-')) || 'all';
  const selectedKeys =
    posArg === 'all' ? ['site', 'admin'] : ALLOWED_STAGING_TARGETS[posArg] ? [posArg] : null;

  if (!selectedKeys) {
    console.error('Uso: node scripts/deploy-staging.mjs [--sync-secrets-only] [site|admin|all]');
    process.exit(2);
  }

  const envVars = parseEnvFile(envStagingPath);
  if (String(envVars.ENVIRONMENT || '').trim().toLowerCase() !== 'staging') {
    throw new Error('[ENV_ISOLATION] .env.staging deve ter ENVIRONMENT=staging.');
  }
  const mpToken = String(envVars.MP_ACCESS_TOKEN || '').trim();
  if (mpToken && mpToken.startsWith('APP_USR-') && String(envVars.MP_SANDBOX_MODE || '').toLowerCase() !== 'true') {
    throw new Error('[ENV_ISOLATION] APP_USR- em .env.staging exige MP_SANDBOX_MODE=true.');
  }

  const secretsToSync = {};
  for (const key of SECRET_KEYS_TO_SYNC) {
    const v = String(envVars[key] || '').trim();
    if (v) secretsToSync[key] = v;
  }

  for (const key of selectedKeys) {
    const target = ALLOWED_STAGING_TARGETS[key];
    syncSecretsForProject(target.project, secretsToSync);
    if (!syncSecretsOnly) {
      deployProject(key, target);
    }
  }
}

main();
