import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'out');
const outAdminDir = path.join(rootDir, 'out-admin');
const outSiteDir = path.join(rootDir, 'out-site');

console.log('🚀 [Deploy Separator] Preparando os 2 Deploys Independentes: Admin & Site...');

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
console.log('📦 Gerando pacote de deploy: SITE PÚBLICO (nuaborges)...');
copyDirRecursive(outDir, outSiteDir);

// _redirects para o Site Público:
// Redireciona /admin para o deploy do admin dedicado https://nuaborges-admin.pages.dev
// E bloqueia /blog redirecionando para a home
const siteRedirects = [
  '/admin https://nuaborges-admin.pages.dev 302',
  '/admin/* https://nuaborges-admin.pages.dev 302',
  '/blog https://nuaborges-er7.pages.dev 302',
  '/blog/* https://nuaborges-er7.pages.dev 302',
].join('\n');
fs.writeFileSync(path.join(outSiteDir, '_redirects'), siteRedirects, 'utf-8');

// Página de transição elegante caso /admin.html seja acessado diretamente
const adminRedirectHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=https://nuaborges-admin.pages.dev">
  <title>Redirecionando para o Painel Administrativo...</title>
  <script>window.location.replace("https://nuaborges-admin.pages.dev");</script>
  <style>
    body { background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; }
    a { color: #f4a7b9; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="box">
    <p>Redirecionando para o Painel Administrativo oficial da Nua Borges...</p>
    <p><a href="https://nuaborges-admin.pages.dev">Clique aqui se não for redirecionado automaticamente</a></p>
  </div>
</body>
</html>`;
fs.writeFileSync(path.join(outSiteDir, 'admin.html'), adminRedirectHtml, 'utf-8');

console.log('✅ Pacote SITE PÚBLICO pronto em out-site/ (Redirecionamento do admin ativo)');
console.log('🎉 Ambos os pacotes foram criados com sucesso!');
