/**
 * Guard Centralizador de Backup Git & Trava de Concorrência — NUA Borges
 *
 * REGRA INEGOCIÁVEL:
 * SEM BACKUP INTEGRAL DO CÓDIGO-FONTE CONFIRMADO DIRETO NO REPOSITÓRIO GIT REMOTO, SEM DEPLOY.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditSecretShield } from './secretShield.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCK_FILE_PATH = path.join(os.tmpdir(), 'nua-deploy-global.lock');

/**
 * Obtém a data e hora formatadas no horário de Brasília (America/Sao_Paulo)
 */
function getBrasiliaTimestamp() {
  const now = new Date();
  const options = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat('pt-BR', options).formatToParts(now);
  const p = {};
  for (const part of parts) {
    if (part.type !== 'literal') p[part.type] = part.value;
  }
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/**
 * Gerencia a trava global de concorrência anti-execução simultânea
 */
export function acquireGlobalLock() {
  if (fs.existsSync(LOCK_FILE_PATH)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE_PATH, 'utf-8'));
      const pid = lockData.pid;
      // Verificar se o processo ainda está ativo no Windows/Unix
      try {
        process.kill(pid, 0);
        throw new Error(`Outro processo de deploy/backup já está em execução (PID: ${pid}, iniciado em: ${lockData.timestamp}).`);
      } catch (err) {
        if (err.message && err.message.includes('Outro processo')) {
          throw err;
        }
        // Processo anterior encerrou anormalmente; limpa lock órfão
        console.log('⚠️ Removendo trava de concorrência órfã de execução anterior.');
        fs.unlinkSync(LOCK_FILE_PATH);
      }
    } catch (err) {
      if (err.message && err.message.includes('Outro processo')) {
        throw err;
      }
      // Se arquivo corrompido, limpa
      try { fs.unlinkSync(LOCK_FILE_PATH); } catch {}
    }
  }

  const payload = {
    pid: process.pid,
    timestamp: getBrasiliaTimestamp(),
    user: process.env.USERNAME || process.env.USER || 'NuaDeployer',
  };
  fs.writeFileSync(LOCK_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}

export function releaseGlobalLock() {
  if (fs.existsSync(LOCK_FILE_PATH)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE_PATH, 'utf-8'));
      if (lockData.pid === process.pid) {
        fs.unlinkSync(LOCK_FILE_PATH);
      }
    } catch {
      try { fs.unlinkSync(LOCK_FILE_PATH); } catch {}
    }
  }
}

/**
 * Função Principal de Enforce de Backup & Segurança pré-deploy
 */
export async function enforceGitBackupGuard({ cwd = rootDir, targetName = 'Deploy' } = {}) {
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`🛡️  INICIANDO GUARDIÃO DE DEPLOY & BACKUP OBRIGATÓRIO GIT (${targetName.toUpperCase()})`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  acquireGlobalLock();

  try {
    // 1. Auditoria de Segredos via Secret Shield & Gitleaks
    const shieldResult = auditSecretShield({ cwd });
    if (!shieldResult.safe) {
      throw new Error('Secret Shield BLOQUEOU o processo devido a potenciais segredos ou arquivos proibidos detectados.');
    }

    // 2. Verificar branch ativa
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf-8' }).trim();
    console.log(`📌 Branch Git ativa: ${currentBranch}`);

    if (currentBranch !== 'nua-id' && currentBranch !== 'main') {
      console.log(`⚠️ Alerta: Trabalhando na branch '${currentBranch}'.`);
    }

    // 3. Verificar alterações locais (modified, untracked, deleted)
    const gitStatusPorcelain = execSync('git status --porcelain', { cwd, encoding: 'utf-8' }).trim();
    const hasChanges = gitStatusPorcelain.length > 0;

    let localCommitSha = '';

    if (hasChanges) {
      console.log('📦 Alterações detectadas no ecossistema NUA Borges. Preparando backup integral...');

      // Stage integral de todas as alterações versionáveis
      execSync('git add .', { cwd, stdio: 'inherit' });

      // Criar commit de backup padronizado em Horário de Brasília
      const bsTimestamp = getBrasiliaTimestamp();
      const commitMessage = `backup(pre-deploy): NUA Borges | ${bsTimestamp}`;
      console.log(`📝 Criando commit de backup: "${commitMessage}"...`);

      execSync(`git commit -m "${commitMessage}"`, { cwd, stdio: 'inherit' });
      localCommitSha = execSync('git rev-parse HEAD', { cwd, encoding: 'utf-8' }).trim();
      console.log(`✅ Commit de backup gerado com sucesso: ${localCommitSha}`);
    } else {
      localCommitSha = execSync('git rev-parse HEAD', { cwd, encoding: 'utf-8' }).trim();
      console.log(`ℹ️  Nenhuma alteração pendente. SHA local atual: ${localCommitSha}`);
    }

    // 4. Enviar ao repositório remoto (git push origin <branch>)
    console.log(`☁️  Enviando alterações e backup para o repositório remoto (origin/${currentBranch})...`);
    execSync(`git push origin ${currentBranch}`, { cwd, stdio: 'inherit' });

    // 5. Confirmação Direta no Servidor Remoto via `git ls-remote`
    console.log(`🔍 Confirmando SHA diretamente no servidor remoto GitHub...`);
    const lsRemoteOutput = execSync(`git ls-remote --exit-code origin refs/heads/${currentBranch}`, { cwd, encoding: 'utf-8' }).trim();
    const remoteCommitSha = lsRemoteOutput.split(/\s+/)[0];

    console.log(`  SHA Local:  ${localCommitSha}`);
    console.log(`  SHA Remoto: ${remoteCommitSha}`);

    if (localCommitSha !== remoteCommitSha) {
      throw new Error(`Divergência entre o commit local (${localCommitSha}) e o commit remoto (${remoteCommitSha}). O backup não foi confirmado no GitHub!`);
    }

    console.log('🎉 BACKUP INTEGRAL CONFIRMADO COM SUCESSO NO GIT REMOTO!');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    return {
      success: true,
      branch: currentBranch,
      commitSha: localCommitSha,
      timestamp: getBrasiliaTimestamp(),
    };

  } catch (err) {
    console.error(`\n❌ ERRO FATAL NO GUARDIÃO DE BACKUP: ${err.message}`);
    console.error('🛑 DEPLOY INTERROMPIDO IMEDIATAMENTE (SEM BACKUP CONFIRMADO, SEM DEPLOY).');
    throw err;
  } finally {
    releaseGlobalLock();
  }
}

// Permite acionamento via CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  enforceGitBackupGuard()
    .then((res) => {
      console.log(`Backup verificado: ${res.commitSha}`);
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}
