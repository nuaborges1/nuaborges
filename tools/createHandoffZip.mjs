import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const desktopDir = 'C:\\Users\\Philippe\\Desktop';
const zipOutputPath = path.join(desktopDir, 'nuaborges_pacote_transferencia.zip');
const stagingDir = path.join(projectRoot, 'temp_handoff_staging');

const IGNORE_PATTERNS = [
  'node_modules',
  '.next',
  'out',
  '.wrangler',
  '.playwright-mcp',
  'scratch',
  '.git',
  '.DS_Store',
  'tsconfig.tsbuildinfo',
  'temp_handoff_staging',
  'nuasite.zip',
  'nuaborges.zip'
];

function shouldInclude(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  for (const pattern of IGNORE_PATTERNS) {
    if (normalized === pattern || normalized.startsWith(pattern + '/') || normalized.endsWith('/' + pattern)) {
      return false;
    }
    if (normalized.endsWith('.log') || normalized.endsWith('.tsbuildinfo')) {
      return false;
    }
  }
  return true;
}

function copyRecursive(src, dest, baseSrc) {
  const stat = fs.statSync(src);
  const relPath = path.relative(baseSrc, src);

  if (!relPath || shouldInclude(relPath)) {
    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const entries = fs.readdirSync(src);
      for (const entry of entries) {
        copyRecursive(path.join(src, entry), path.join(dest, entry), baseSrc);
      }
    } else {
      const parent = path.dirname(dest);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      fs.copyFileSync(src, dest);
    }
  }
}

async function main() {
  console.log('--- PREPARANDO PACOTE LIMPO PARA TRANSFERÊNCIA ---');
  console.log('Origem:', projectRoot);
  console.log('Destino ZIP:', zipOutputPath);

  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  if (fs.existsSync(zipOutputPath)) {
    fs.unlinkSync(zipOutputPath);
  }

  fs.mkdirSync(stagingDir, { recursive: true });

  console.log('Copiando arquivos essenciais...');
  copyRecursive(projectRoot, stagingDir, projectRoot);

  console.log('Compactando arquivo ZIP via PowerShell...');
  const psCmd = `powershell.exe -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipOutputPath}' -CompressionLevel Optimal -Force"`;
  execSync(psCmd, { stdio: 'inherit' });

  console.log('Removendo diretório temporário de staging...');
  fs.rmSync(stagingDir, { recursive: true, force: true });

  const zipStat = fs.statSync(zipOutputPath);
  const sizeMb = (zipStat.size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ PACOTE CRIADO COM SUCESSO!`);
  console.log(`Local: ${zipOutputPath}`);
  console.log(`Tamanho: ${sizeMb} MB`);
}

main().catch((err) => {
  console.error('Erro ao gerar pacote:', err);
  process.exit(1);
});
