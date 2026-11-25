/**
 * Safe & Certified Cloudflare Pages Deploy Helper — NUA Borges
 *
 * REGRA INEGOCIÁVEL:
 * 1. Invoca a camada central enforceGitBackupGuard para garantir backup 100% verificado no remoto.
 * 2. Realiza o deploy do artefato confirmado pelo SHA.
 * 3. Cria e envia Tag Git de versão publicada pós-sucesso.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { enforceGitBackupGuard } from './enforceGitBackupGuard.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = {
  site: { config: 'wrangler.toml', outDir: 'out-site', project: 'nuaborges' },
  admin: { config: 'wrangler.admin.toml', outDir: 'out-admin', project: 'nuaborges-admin' },
  admingeral: { config: 'wrangler.admingeral.toml', outDir: 'out-admingeral', project: 'admingeral' },
};

const targetKey = (process.argv[2] || '').trim().toLowerCase();
const target = TARGETS[targetKey];
if (!target) {
  console.error('Uso: node tools/deployPages.mjs <site|admin|admingeral>');
  process.exit(1);
}

async function runDeployPipeline() {
  // 1. Execução do Guardião de Backup Remoto Obrigatório
  const guardResult = await enforceGitBackupGuard({ cwd: rootDir, targetName: targetKey });
  const { commitSha, branch } = guardResult;

  const configSrc = path.join(rootDir, target.config);
  const outAbs = path.join(rootDir, target.outDir);

  if (!fs.existsSync(configSrc)) {
    throw new Error(`Configuração do Wrangler não encontrada: ${configSrc}`);
  }
  if (!fs.existsSync(outAbs)) {
    throw new Error(`Diretório de build não encontrado: ${outAbs}. Execute 'npm run build:packages' antes de publicar.`);
  }

  // 2. Criação do diretório isolado de deploy com wrangler.toml ajustado
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `nua-deploy-${targetKey}-`));
  let deploySuccess = false;

  try {
    const rawToml = fs.readFileSync(configSrc, 'utf-8');
    const patchedToml = rawToml.replace(
      /pages_build_output_dir\s*=\s*"[^"]*"/,
      `pages_build_output_dir = "${outAbs.replace(/\\/g, '/')}"`
    );
    fs.writeFileSync(path.join(tmpDir, 'wrangler.toml'), patchedToml, 'utf-8');

    const isWin = process.platform === 'win32';
    const bin = isWin ? 'cmd' : 'npx';
    const args = isWin
      ? [
          '/c',
          'npx',
          'wrangler',
          'pages',
          'deploy',
          outAbs,
          '--project-name',
          target.project,
          '--branch',
          'main',
          '--cwd',
          tmpDir,
        ]
      : [
          'wrangler',
          'pages',
          'deploy',
          outAbs,
          '--project-name',
          target.project,
          '--branch',
          'main',
          '--cwd',
          tmpDir,
        ];

    console.log(`🚀 Publicando ${target.project} (${target.outDir}) referente ao Commit ${commitSha.substring(0, 7)}...`);
    execFileSync(bin, args, { stdio: 'inherit', cwd: rootDir });
    console.log(`✅ Deploy concluído com sucesso no Cloudflare Pages: ${target.project}`);
    deploySuccess = true;

    // 3. Criar e enviar Tag Git oficial de publicação
    try {
      const timestampStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
      const tagName = `deploy-${targetKey}-${commitSha.substring(0, 7)}-${timestampStr}`;
      console.log(`🏷️  Gerando Tag Git de Publicação: ${tagName}...`);

      execSync(`git tag -a "${tagName}" -m "Deploy ${target.project} publicado com sucesso em ${timestampStr} (SHA: ${commitSha})"`, { cwd: rootDir });
      execSync(`git push origin "${tagName}"`, { cwd: rootDir, stdio: 'inherit' });
      console.log(`✅ Tag de publicação enviada para o repositório remoto: ${tagName}`);
    } catch (tagErr) {
      console.warn(`⚠️ O deploy foi publicado com sucesso na Cloudflare, mas o envio da Tag Git falhou: ${tagErr.message}`);
    }

  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runDeployPipeline().catch((err) => {
  console.error(`❌ Falha no pipeline de deploy: ${err.message}`);
  process.exit(1);
});
