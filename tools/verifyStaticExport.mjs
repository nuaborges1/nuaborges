import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const nextBuildDir = path.join(root, '.next-build');
const output = path.join(root, 'out');

const requiredHtmlRoutes = [
  '/',
  '/admin',
  '/conta',
  '/cofre',
  '/avulsos',
  '/acervo',
  '/chamadas',
  '/personalizados',
  '/sobre',
];

const requiredFiles = [
  '404.html',
  'sitemap.xml',
  'catalogo-publicado.json',
];

async function isNonEmptyFile(filePath) {
  const stat = await fs.stat(filePath).catch(() => null);
  return stat?.isFile() === true && stat.size > 0;
}

async function listMatchingFiles(directory, extension) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listMatchingFiles(fullPath, extension)));
    } else if (entry.name.endsWith(extension)) {
      results.push(fullPath);
    }
  }
  return results;
}

function expectedFilesForRoute(route, isRouteHandler) {
  if (route === '/') return ['index.html', 'index.txt'];
  const rel = route.replace(/^\/+/, '');
  if (isRouteHandler) return [rel];
  return [`${rel}.html`, `${rel}.txt`];
}

function defaultExpectedFiles() {
  const expected = new Set(requiredFiles);
  for (const route of requiredHtmlRoutes) {
    for (const file of expectedFilesForRoute(route, false)) expected.add(file);
  }
  return [...expected].sort();
}

async function readManifestExpectations() {
  const prerenderRaw = await fs.readFile(path.join(nextBuildDir, 'prerender-manifest.json'), 'utf8').catch(() => null);
  const appPathRoutesRaw = await fs.readFile(path.join(nextBuildDir, 'app-path-routes-manifest.json'), 'utf8').catch(() => null);
  if (!prerenderRaw || !appPathRoutesRaw) {
    return null;
  }
  const prerender = JSON.parse(prerenderRaw);
  const appPathRoutes = JSON.parse(appPathRoutesRaw);
  const routeToAppPage = new Map(Object.entries(appPathRoutes).map(([appPage, routePath]) => [routePath, appPage]));
  const expected = new Set(defaultExpectedFiles());
  const notFound = new Set(prerender.notFoundRoutes || []);
  for (const [route, meta] of Object.entries(prerender.routes || {})) {
    if (route === '/_not-found' || notFound.has(route)) continue;
    const appPage = routeToAppPage.get(meta?.srcRoute || route);
    const isRouteHandler = typeof appPage === 'string' && appPage.endsWith('/route');
    for (const file of expectedFilesForRoute(route, isRouteHandler)) expected.add(file);
  }
  return [...expected].sort();
}

async function inspectExport(directory, expectedRelativeFiles) {
  const missing = [];
  await Promise.all(
    expectedRelativeFiles.map(async (rel) => {
      if (!(await isNonEmptyFile(path.join(directory, rel)))) {
        missing.push(rel);
      }
    }),
  );

  const staticRoot = path.join(directory, '_next', 'static');
  const [cssFiles, jsFiles, fontFiles] = await Promise.all([
    listMatchingFiles(path.join(staticRoot, 'css'), '.css'),
    listMatchingFiles(path.join(staticRoot, 'chunks'), '.js'),
    listMatchingFiles(path.join(staticRoot, 'media'), '.woff2'),
  ]);

  if (cssFiles.length === 0) missing.push('_next/static/css/*.css');
  if (jsFiles.length === 0) missing.push('_next/static/chunks/*.js');
  if (fontFiles.length < 4) missing.push(`_next/static/media/*.woff2 (encontradas ${fontFiles.length}, esperadas >= 4)`);

  return {
    ok: missing.length === 0,
    missing: missing.sort(),
    counts: {
      verifiedFiles: expectedRelativeFiles.length,
      css: cssFiles.length,
      js: jsFiles.length,
      fonts: fontFiles.length,
    },
  };
}

// No Next.js 15 com `output: 'export'` e `distDir: '.next-build'`, o exportador grava os
// arquivos estáticos diretamente em `.next-build/` (isolado de `.next/` do `next dev`).
// Quando `.next-build/index.html` está presente, validamos e sincronizamos para `out/`.
const directBuildExported = await isNonEmptyFile(path.join(nextBuildDir, 'index.html'));
const manifestExpected = await readManifestExpectations();
const expectedFiles = manifestExpected || defaultExpectedFiles();

if (directBuildExported) {
  const stagedReport = await inspectExport(nextBuildDir, expectedFiles);
  if (!stagedReport.ok) {
    throw new Error(`Exportação estática em .next-build/ incompleta. Ausentes: ${stagedReport.missing.join(', ')}`);
  }
  await fs.rm(output, { recursive: true, force: true });
  await fs.cp(nextBuildDir, output, { recursive: true });
}

let report = await inspectExport(output, expectedFiles);

if (!report.ok && manifestExpected) {
  // Fallback legado caso o build tenha mantido manifestos sem copiar para out/
  const require = createRequire(import.meta.url);
  const { trace } = require('next/dist/trace');
  const exportModule = require('next/dist/export');
  if (typeof exportModule?.default !== 'function') {
    throw new Error(`Exportador interno do Next.js incompatível. Ausentes em out/: ${report.missing.join(', ')}`);
  }
  const requiredServerFiles = JSON.parse(await fs.readFile(path.join(nextBuildDir, 'required-server-files.json'), 'utf8'));
  const config = requiredServerFiles.config;
  if (config?.output !== 'export') {
    throw new Error('A compilação não foi configurada para exportação estática.');
  }

  const temporary = await fs.mkdtemp(path.join(nextBuildDir, 'nua-export-'));
  try {
    await exportModule.default(
      root,
      {
        buildExport: false,
        enabledDirectories: { app: true, pages: false },
        nextConfig: config,
        numWorkers: 1,
        outdir: temporary,
        silent: true,
      },
      trace('nua-verify-static-export'),
    );
    const recovered = await inspectExport(temporary, expectedFiles);
    if (!recovered.ok) {
      throw new Error(`Exportação estática incompleta mesmo após recuperação. Ausentes: ${recovered.missing.join(', ')}`);
    }
    await fs.cp(temporary, output, { recursive: true });
    report = await inspectExport(output, expectedFiles);
  } finally {
    if (path.dirname(temporary) === nextBuildDir && path.basename(temporary).startsWith('nua-export-')) {
      await fs.rm(temporary, { recursive: true, force: true });
    }
  }
}

if (!report.ok) {
  throw new Error(`Falha na verificação do export estático em out/. Ausentes: ${report.missing.join(', ')}`);
}

console.log(
  `Exportação estática verificada: ${report.counts.verifiedFiles} páginas/payloads, ${report.counts.css} CSS, ${report.counts.js} chunks JS e ${report.counts.fonts} fontes WOFF2.`,
);
