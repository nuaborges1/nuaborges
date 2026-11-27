import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { patchXmlBuilder } from './patchXmlBuilder.mjs';
import { validatePublicSeo } from './validatePublicSeo.mjs';

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

validatePublicSeo(outDir);

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

// Helper: remove o painel administrativo (/admin) do pacote do site público (admin exclusivo em admin.nuaborges.com.br)
function stripAdminPanel(dir) {
  for (const name of ['admin.html', 'admin.txt', 'admin']) {
    const target = path.join(dir, name);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
}

// Helper: remove os assets exclusivos do ambiente PHDEV do pacote do site público
function stripPhdevAssets(dir) {
  const target = path.join(dir, 'phdev');
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

// Helper: copia apenas a lista explícita de arquivos/pastas permitidos (isolamento estrito)
function copyAllowlist(srcDir, destDir, names) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  for (const name of names) {
    const srcPath = path.join(srcDir, name);
    if (!fs.existsSync(srcPath)) continue;
    const destPath = path.join(destDir, name);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const HARDENED_CSP_SITE =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://challenges.cloudflare.com https://sdk.mercadopago.com https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.backblazeb2.com https://nuaborges.com.br https://*.nuaborges.com.br https://i.ytimg.com https://*.youtube.com; media-src 'self' blob: data: https://*.backblazeb2.com https://*.googlevideo.com; connect-src 'self' https://nuaborges.com.br https://*.nuaborges.com.br https://*.backblazeb2.com https://*.supabase.co https://challenges.cloudflare.com https://api.mercadopago.com https://cloudflareinsights.com https://static.cloudflareinsights.com https://www.youtube.com; frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;";

const HARDENED_CSP_ADMINGERAL =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https://nuaborges.com.br https://*.nuaborges.com.br; connect-src 'self' https://admin.nuaborges.com.br https://admingeral.nuaborges.com.br; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;";

const DISALLOW_ALL_ROBOTS = ['User-agent: *', 'Disallow: /', ''].join('\n');

// 0. Cria _routes.json na raiz de out/ para garantir que o Cloudflare Pages roteie para as Functions (inclui /* e exclui apenas assets estáticos imutáveis)
const routesJsonContent = JSON.stringify({
  version: 1,
  include: ['/*'],
  exclude: ['/_next/*', '/images/*']
}, null, 2);

fs.writeFileSync(path.join(outDir, '_routes.json'), routesJsonContent, 'utf-8');
console.log('✅ Arquivo _routes.json gerado em out/ com include /* e exclude de assets estáticos');

// 0b. Compila as Cloudflare Pages Functions em _worker.js na raiz de out/
// Isso garante o suporte nativo ao Advanced Mode em todos os pacotes (out-admin, out-site e out-admingeral)
const tempWorkerDir = path.join(rootDir, '.temp_worker_build');
const workerDestPath = path.join(outDir, '_worker.js');
console.log('⚡ Compilando Cloudflare Pages Functions em _worker.js via --outdir...');
try {
  // Garante que o parser XML da AWS use a versão pura em JS (sem dependência de DOMParser do browser)
  patchXmlBuilder();

  if (fs.existsSync(tempWorkerDir)) {
    fs.rmSync(tempWorkerDir, { recursive: true, force: true });
  }
  const wranglerLogDir = process.env.WRANGLER_LOG_PATH || path.join(rootDir, '.wrangler', 'logs');
  fs.mkdirSync(wranglerLogDir, { recursive: true });
  const wranglerEnv = { ...process.env, WRANGLER_LOG_PATH: wranglerLogDir };
  const isWin = process.platform === 'win32';
  const cmd = isWin
    ? `cmd /c npx --no-install wrangler pages functions build functions --outdir "${tempWorkerDir}"`
    : `npx --no-install wrangler pages functions build functions --outdir "${tempWorkerDir}"`;
  execSync(cmd, { stdio: 'inherit', cwd: rootDir, env: wranglerEnv });
  const compiledJs = path.join(tempWorkerDir, 'index.js');
  if (fs.existsSync(compiledJs)) {
    fs.copyFileSync(compiledJs, workerDestPath);
    console.log('✅ Worker unificado _worker.js copiado com sucesso para out/ (JavaScript puro)');
  } else {
    console.error('❌ index.js não foi gerado em .temp_worker_build');
    process.exit(1);
  }
  fs.rmSync(tempWorkerDir, { recursive: true, force: true });
} catch (buildErr) {
  console.error('❌ Erro ao compilar Pages Functions com Wrangler:', buildErr);
  process.exit(1);
}

// 1. Limpa diretórios antigos se existirem
if (fs.existsSync(outAdminDir)) {
  fs.rmSync(outAdminDir, { recursive: true, force: true });
}
if (fs.existsSync(outSiteDir)) {
  fs.rmSync(outSiteDir, { recursive: true, force: true });
}

// 2. Prepara Deploy do ADMIN (nuaborges-admin) — isolamento por allowlist (sem páginas públicas do site)
console.log('📦 Gerando pacote de deploy: ADMIN (nuaborges-admin)...');
const adminAllowlist = [
  '_next',
  '_routes.json',
  '_worker.js',
  'images',
  'audio',
  'fonts',
  'phdev',
  'favicon.ico',
  'favicon.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'admin-favicon.svg',
  'icon.svg',
  'apple-icon.png',
  'manifest.json',
  '404.html',
  '404.txt',
];
copyAllowlist(outDir, outAdminDir, adminAllowlist);

// Transforma a raiz / do out-admin no Painel Administrativo direto
const adminHtmlPath = path.join(outDir, 'admin.html');
const adminTxtPath = path.join(outDir, 'admin.txt');

if (fs.existsSync(adminHtmlPath)) {
  fs.copyFileSync(adminHtmlPath, path.join(outAdminDir, 'index.html'));
} else {
  console.error('❌ admin.html não encontrado em out/!');
  process.exit(1);
}
if (fs.existsSync(adminTxtPath)) {
  fs.copyFileSync(adminTxtPath, path.join(outAdminDir, 'index.txt'));
}

// Copia subrotas de out/admin para a raiz de out-admin (permitindo /historico direto no admin.nuaborges.com.br)
const adminSubDir = path.join(outDir, 'admin');
if (fs.existsSync(adminSubDir)) {
  const adminEntries = fs.readdirSync(adminSubDir, { withFileTypes: true });
  for (const entry of adminEntries) {
    const src = path.join(adminSubDir, entry.name);
    const dest = path.join(outAdminDir, entry.name);
    if (!entry.isDirectory()) {
      fs.copyFileSync(src, dest);
    } else {
      copyDirRecursive(src, dest);
    }
  }
}

// robots.txt restritivo para o Admin
fs.writeFileSync(path.join(outAdminDir, 'robots.txt'), DISALLOW_ALL_ROBOTS, 'utf-8');

// _redirects para o Admin
const adminRedirects = [
  '/admin / 301',
  '/admin/* /:splat 301',
  '/* /index.html 200',
].join('\n');
fs.writeFileSync(path.join(outAdminDir, '_redirects'), adminRedirects, 'utf-8');

// _headers para o Admin (Hardened Security + noindex + no-store)
const adminHeaders = [
  '/*',
  '  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  X-Frame-Options: DENY',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=(self), usb=()',
  '  Cross-Origin-Opener-Policy: same-origin-allow-popups',
  `  Content-Security-Policy: ${HARDENED_CSP_SITE}`,
  '/*.html',
  '  Cache-Control: no-cache, no-store, must-revalidate',
  '/*.txt',
  '  Cache-Control: no-cache, no-store, must-revalidate',
  '  Content-Type: text/x-component; charset=utf-8',
  '/robots.txt',
  '  Cache-Control: public, max-age=3600',
  '  Content-Type: text/plain; charset=utf-8',
  '/_next/static/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/api/*',
  '  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate',
  '  Pragma: no-cache',
  '  Expires: 0',
].join('\n');
fs.writeFileSync(path.join(outAdminDir, '_headers'), adminHeaders, 'utf-8');

console.log('✅ Pacote ADMIN pronto em out-admin/ (Isolado por allowlist, sem vitrine pública)');

// 3. Prepara Deploy do SITE PÚBLICO (nuaborges)
console.log('📦 Gerando pacote de deploy: SITE PÚBLICO (nuaborges)...');
copyDirRecursive(outDir, outSiteDir);
stripDeveloperPanel(outSiteDir);
stripAdminPanel(outSiteDir);
stripPhdevAssets(outSiteDir);

// _redirects para o Site Público:
// /admin redireciona para o domínio dedicado admin.nuaborges.com.br; /admingeral e /blog redirecionam para a home
const siteRedirects = [
  '/admin https://admin.nuaborges.com.br 302',
  '/admin/* https://admin.nuaborges.com.br/:splat 302',
  '/admingeral / 302',
  '/admingeral/* / 302',
  '/blog / 302',
  '/blog/* / 302',
].join('\n');
fs.writeFileSync(path.join(outSiteDir, '_redirects'), siteRedirects, 'utf-8');

// _headers para o Site Público (Hardened Security + Cache imutável para _next/static + noindex nas rotas privadas)
const siteHeaders = [
  '/*',
  '  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
  '  X-Content-Type-Options: nosniff',
  '  X-Frame-Options: DENY',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  Permissions-Policy: camera=(self), microphone=(self), geolocation=(), payment=(self), usb=()',
  '  Cross-Origin-Opener-Policy: same-origin-allow-popups',
  '  Cross-Origin-Resource-Policy: same-site',
  `  Content-Security-Policy: ${HARDENED_CSP_SITE}`,
  '/*.html',
  '  Cache-Control: public, max-age=0, must-revalidate',
  '/*.txt',
  '  Cache-Control: public, max-age=0, must-revalidate',
  '  Content-Type: text/x-component; charset=utf-8',
  '/robots.txt',
  '  Cache-Control: public, max-age=3600',
  '  Content-Type: text/plain; charset=utf-8',
  '/catalogo-publicado.json',
  '  X-Robots-Tag: noindex',
  '/chamadas/reserva*',
  '  X-Robots-Tag: noindex, nofollow',
  '  Referrer-Policy: no-referrer',
  '  Cache-Control: private, no-store',
  '/chamadas/status*',
  '  X-Robots-Tag: noindex, nofollow',
  '  Referrer-Policy: no-referrer',
  '  Cache-Control: private, no-store',
  '/personalizados/pedido*',
  '  X-Robots-Tag: noindex, nofollow',
  '  Cache-Control: private, no-store',
  '/_next/static/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/images/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/api/*',
  '  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate',
  '  Pragma: no-cache',
  '  Expires: 0',
  '/contrato',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Cache-Control: private, no-store',
  '/contrato/*',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Cache-Control: private, no-store',
  '/cofre*',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Referrer-Policy: no-referrer',
  '  Cache-Control: private, no-store',
  '/conta',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Cache-Control: private, no-cache, no-store, must-revalidate',
  '/conta/*',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Cache-Control: private, no-cache, no-store, must-revalidate',
  '/minha-nua',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Cache-Control: private, no-cache, no-store, must-revalidate',
  '/minha-nua/*',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Cache-Control: private, no-cache, no-store, must-revalidate',
  '/assistir/*',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Referrer-Policy: no-referrer',
  '  Cache-Control: private, no-store',
  '/avaliacao*',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  Referrer-Policy: no-referrer',
  '  Cache-Control: private, no-store',
].join('\n');
fs.writeFileSync(path.join(outSiteDir, '_headers'), siteHeaders, 'utf-8');

console.log('✅ Pacote SITE PÚBLICO pronto em out-site/ (Hardened Headers + /admin redirecionado para admin.nuaborges.com.br)');

// 4. Prepara Deploy da CENTRAL DO DESENVOLVEDOR (admingeral) — estritamente isolado (sem _worker.js e sem páginas públicas/admin)
console.log('📦 Gerando pacote de deploy: CENTRAL DO DESENVOLVEDOR (admingeral)...');
if (fs.existsSync(outAdminGeralDir)) {
  fs.rmSync(outAdminGeralDir, { recursive: true, force: true });
}
fs.mkdirSync(outAdminGeralDir, { recursive: true });

const standaloneAdminGeralPath = path.join(rootDir, 'admingeral-standalone', 'index.html');
if (fs.existsSync(standaloneAdminGeralPath)) {
  const monitorDir = path.join(outAdminDir, 'monitoramento');
  fs.mkdirSync(monitorDir, { recursive: true });
  fs.copyFileSync(standaloneAdminGeralPath, path.join(monitorDir, 'index.html'));
  fs.copyFileSync(standaloneAdminGeralPath, path.join(outAdminGeralDir, 'index.html'));
  const standaloneCssPath = path.join(rootDir, 'admingeral-standalone', 'admingeral.css');
  if (fs.existsSync(standaloneCssPath)) {
    fs.copyFileSync(standaloneCssPath, path.join(outAdminGeralDir, 'admingeral.css'));
    fs.copyFileSync(standaloneCssPath, path.join(monitorDir, 'admingeral.css'));
  }
  console.log('✅ admingeral-standalone/index.html e admingeral.css copiados com sucesso para out-admingeral/');
} else {
  console.error('❌ admingeral-standalone/index.html não encontrado!');
  process.exit(1);
}

copyAllowlist(outDir, outAdminGeralDir, ['favicon.ico', 'icon.svg']);
fs.writeFileSync(path.join(outAdminGeralDir, 'robots.txt'), DISALLOW_ALL_ROBOTS, 'utf-8');

// _redirects para a Central do Dev
const adminGeralRedirects = [
  '/admingeral / 301',
  '/admingeral/* / 301',
  '/* /index.html 200',
].join('\n');
fs.writeFileSync(path.join(outAdminGeralDir, '_redirects'), adminGeralRedirects, 'utf-8');

// _headers para a Central do Dev (Segurança máxima, sem indexação, sem Worker exposto)
const adminGeralHeaders = [
  '/*',
  '  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
  '  X-Robots-Tag: noindex, nofollow, noarchive',
  '  X-Frame-Options: DENY',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: no-referrer',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  `  Content-Security-Policy: ${HARDENED_CSP_ADMINGERAL}`,
  '/index.html',
  '  Cache-Control: no-cache, no-store, must-revalidate',
  '/robots.txt',
  '  Cache-Control: public, max-age=3600',
  '  Content-Type: text/plain; charset=utf-8',
].join('\n');
fs.writeFileSync(path.join(outAdminGeralDir, '_headers'), adminGeralHeaders, 'utf-8');

console.log('✅ Pacote CENTRAL DO DESENVOLVEDOR pronto em out-admingeral/ (Estático isolado, sem _worker.js)');
console.log('🎉 Todos os pacotes foram criados com sucesso!');
