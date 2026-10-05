import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'out');
const outAdminDir = path.join(rootDir, 'out-admin');
const outSiteDir = path.join(rootDir, 'out-site');
const outAdminGeralDir = path.join(rootDir, 'out-admingeral');

console.log('🚀 [Deploy Separator] Preparando Deploys: Site Público, Admin da Cliente e Central phdev (admingeral)...');

if (!fs.existsSync(outDir)) {
  console.error('❌ Diretório out/ não encontrado! Execute "npm run build" antes.');
  process.exit(1);
}

// Helper: copia diretório recursivamente
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper: remove o painel de monitoramento do desenvolvedor (/admingeral) dos pacotes da cliente
function stripDeveloperPanel(dir) {
  for (const name of ['admingeral.html', 'admingeral.txt', 'admingeral']) {
    const target = path.join(dir, name);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
}

// 1. Limpa diretórios antigos se existirem
if (fs.existsSync(outAdminDir)) {
  fs.rmSync(outAdminDir, { recursive: true, force: true });
}
if (fs.existsSync(outSiteDir)) {
  fs.rmSync(outSiteDir, { recursive: true, force: true });
}

// 2. Prepara Deploy do ADMIN (nuaborges-admin)
console.log('📦 Gerando pacote de deploy: ADMIN (nuaborges-admin)...');
copyDirRecursive(outDir, outAdminDir);
stripDeveloperPanel(outAdminDir);

// Transforma a raiz / do out-admin no Painel Administrativo direto
const adminHtmlPath = path.join(outDir, 'admin.html');
const adminTxtPath = path.join(outDir, 'admin.txt');

if (fs.existsSync(adminHtmlPath)) {
  fs.copyFileSync(adminHtmlPath, path.join(outAdminDir, 'index.html'));
}
if (fs.existsSync(adminTxtPath)) {
  fs.copyFileSync(adminTxtPath, path.join(outAdminDir, 'index.txt'));
}

// _redirects para o Admin
const adminRedirects = [
  '/admin / 301',
  '/admin/* / 301',
  '/* /index.html 200',
].join('\n');
fs.writeFileSync(path.join(outAdminDir, '_redirects'), adminRedirects, 'utf-8');

// _headers para o Admin (Segurança e no-store)
const adminHeaders = [
  '/*',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  X-Frame-Options: SAMEORIGIN',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '/index.html',
  '  Cache-Control: no-cache, no-store, must-revalidate',
].join('\n');
fs.writeFileSync(path.join(outAdminDir, '_headers'), adminHeaders, 'utf-8');

console.log('✅ Pacote ADMIN pronto em out-admin/ (Raiz configurada como Painel Oficial)');

// 3. Prepara Deploy do SITE PÚBLICO (nuaborges)
// 3. Prepara Deploy do SITE PÚBLICO (nuaborges)
console.log('📦 Gerando pacote de deploy: SITE PÚBLICO (nuaborges)...');
copyDirRecursive(outDir, outSiteDir);
stripDeveloperPanel(outSiteDir);

// _redirects para o Site Público:
// Bloqueia /admingeral (painel do dev) e /blog redirecionando para a home
// Mantém /admin funcionando diretamente na plataforma oficial da Nua Borges
const siteRedirects = [
  '/admingeral / 302',
  '/admingeral/* / 302',
  '/blog / 302',
  '/blog/* / 302',
].join('\n');
fs.writeFileSync(path.join(outSiteDir, '_redirects'), siteRedirects, 'utf-8');

console.log('✅ Pacote SITE PÚBLICO pronto em out-site/ (Admin da cliente ativo diretamente em /admin)');

// 4. Prepara Deploy da CENTRAL DO DESENVOLVEDOR (admingeral)
console.log('📦 Gerando pacote de deploy: CENTRAL DO DESENVOLVEDOR (admingeral)...');
if (fs.existsSync(outAdminGeralDir)) {
  fs.rmSync(outAdminGeralDir, { recursive: true, force: true });
}
copyDirRecursive(outDir, outAdminGeralDir);

// Transforma a raiz / do out-admingeral na Central do Desenvolvedor direta
const adminGeralHtmlPath = path.join(outDir, 'admingeral.html');
const adminGeralTxtPath = path.join(outDir, 'admingeral.txt');

if (fs.existsSync(adminGeralHtmlPath)) {
  fs.copyFileSync(adminGeralHtmlPath, path.join(outAdminGeralDir, 'index.html'));
}
if (fs.existsSync(adminGeralTxtPath)) {
  fs.copyFileSync(adminGeralTxtPath, path.join(outAdminGeralDir, 'index.txt'));
}

// _redirects para a Central do Dev (SPA fallback na raiz)
const adminGeralRedirects = [
  '/admingeral / 301',
  '/admingeral/* / 301',
  '/* /index.html 200',
].join('\n');
fs.writeFileSync(path.join(outAdminGeralDir, '_redirects'), adminGeralRedirects, 'utf-8');

// _headers para a Central do Dev (Segurança máxima, sem indexação)
const adminGeralHeaders = [
  '/*',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  X-Frame-Options: SAMEORIGIN',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '/index.html',
  '  Cache-Control: no-cache, no-store, must-revalidate',
].join('\n');
fs.writeFileSync(path.join(outAdminGeralDir, '_headers'), adminGeralHeaders, 'utf-8');

console.log('✅ Pacote CENTRAL DO DESENVOLVEDOR pronto em out-admingeral/ (Raiz configurada como Central phdev)');
console.log('🎉 Todos os pacotes foram criados com sucesso!');

