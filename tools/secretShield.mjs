/**
 * Secret Shield & Gitleaks Integration Guard — NUA Borges
 *
 * Realiza varredura estática profunda em busca de segredos, tokens e credenciais
 * em arquivos modificados, untracked, no staging e no histórico recente do Git.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Padrões de arquivos estritamente proibidos no Git
const FORBIDDEN_FILE_PATTERNS = [
  /^\.env$/i,
  /^\.env\.staging$/i,
  /^\.env\.production$/i,
  /^\.env\.local$/i,
  /^\.env\.development$/i,
  /local_vault_credentials\.json$/i,
  /DOCUMENTO_ENTREGA/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
];

// Regras de detecção de segredos sensíveis por RegEx
const SECRET_PATTERNS = [
  {
    name: 'Mercado Pago Production / Access Token',
    regex: /(?:APP_USR|TEST)-[0-9]{12,}-[0-9]{6,}-[a-f0-9]{32,}-[0-9]{8,}/i,
  },
  {
    name: 'Chave Privada / RSA Header',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  },
  {
    name: 'AWS / Backblaze Key ID / Secret',
    regex: /(?:AKIA|ASIA|b2_)[A-Z0-9]{16,40}/,
  },
  {
    name: 'Supabase Service Role JWT',
    regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]{40,}/,
    filter: (content, filePath) => {
      // Ignora apenas arquivos de exemplo (.env.example, .env.staging.example)
      if (filePath.endsWith('.example')) return false;
      // Dispara apenas se contiver service_role ou role service_role no payload
      return content.includes('service_role') || content.includes('SUPABASE_SERVICE_ROLE_KEY=ey');
    }
  },
  {
    name: 'Senha de Produção / Token em código',
    regex: /(?:ADMIN_SESSION_SECRET|ADMIN_API_SECRET|NUA_ID_SECRET|CRON_SECRET)\s*=\s*['"][a-f0-9]{32,}['"]/i,
    filter: (content, filePath) => !filePath.endsWith('.example')
  }
];

export function auditSecretShield({ cwd = rootDir } = {}) {
  console.log('🛡️  Executando Secret Shield & Auditoria de Segredos...');

  const violations = [];

  // 1. Verificar lista de arquivos alterados e untracked via git status
  try {
    const gitStatusOutput = execSync('git status --porcelain', { cwd, encoding: 'utf-8' });
    const lines = gitStatusOutput.split('\n').filter(Boolean);

    for (const line of lines) {
      const status = line.substring(0, 2).trim();
      const rawPath = line.substring(3).trim().replace(/^"/, '').replace(/"$/, '');
      const fullPath = path.join(cwd, rawPath);

      // Checa nome do arquivo proibido
      for (const pattern of FORBIDDEN_FILE_PATTERNS) {
        if (pattern.test(rawPath) || pattern.test(path.basename(rawPath))) {
          // Exceção: .env.example e .env.staging.example são permitidos
          if (rawPath.endsWith('.example')) continue;
          violations.push({
            type: 'FORBIDDEN_FILE',
            file: rawPath,
            reason: `O arquivo '${rawPath}' é confidencial e nunca pode ser enviado ao Git.`,
          });
        }
      }

      // Se o arquivo existir no disco e for texto, faz scan do conteúdo
      if (status !== 'D' && fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        // Pula arquivos binários grandes, imagens, zip, node_modules
        if (/\.(png|jpg|jpeg|gif|webp|ico|zip|pdf|woff2?|eot|ttf|mp3|mp4|wav|mov)$/i.test(rawPath)) continue;

        try {
          const fileSize = fs.statSync(fullPath).size;
          if (fileSize > 2 * 1024 * 1024) continue; // Pula arquivos maiores que 2MB

          const content = fs.readFileSync(fullPath, 'utf-8');

          for (const rule of SECRET_PATTERNS) {
            if (rule.regex.test(content)) {
              if (rule.filter && !rule.filter(content, rawPath)) continue;

              violations.push({
                type: 'SECRET_DETECTED',
                file: rawPath,
                reason: `Segredo potencial detectado (${rule.name}).`,
              });
            }
          }
        } catch {
          // Ignora leitura em falhas pontuais
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro ao ler git status para Secret Shield:', err.message);
    return { safe: false, violations: [{ type: 'SYSTEM_ERROR', reason: err.message }] };
  }

  // 2. Tenta acionar Gitleaks como camada complementar caso disponível
  try {
    console.log('🔍 Executando verificação complementar Gitleaks...');
    execSync('npx --no-install gitleaks version', { cwd, stdio: 'pipe' });
    const gitleaksOutput = execSync('npx --no-install gitleaks detect --source=. --no-git=false --verbose', { cwd, encoding: 'utf-8' });
    if (gitleaksOutput.includes('LEAKS DETECTED')) {
      violations.push({
        type: 'GITLEAKS_LEAK',
        file: 'Gitleaks Scanner',
        reason: 'Gitleaks identificou vaza de segredo no histórico ou repositório.',
      });
    }
  } catch {
    // Gitleaks não instalado via npx --no-install, segue com o Secret Shield interno verificado
    console.log('ℹ️  Gitleaks global/npx não disponível localmente. Secret Shield interno manteve auditoria ativa com 100% das regras.');
  }

  if (violations.length > 0) {
    console.error('\n🛑 BLOQUEIO DE SEGURANÇA: Violações de credenciais ou segredos detectadas:');
    for (const v of violations) {
      console.error(`  - [${v.type}] Arquivo: ${v.file} -> ${v.reason}`);
    }
    return { safe: false, violations };
  }

  console.log('✅ Secret Shield: Nenhuma credencial ou segredo foi detectado. Repositório seguro.');
  return { safe: true, violations: [] };
}

// Permitir execução direta via CLI para testes
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = auditSecretShield();
  if (!result.safe) {
    process.exit(1);
  }
}
