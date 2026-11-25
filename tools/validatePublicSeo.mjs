import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const publicRoutes = ['/', '/sobre', '/avulsos', '/acervo', '/chamadas', '/personalizados', '/contato', '/termos', '/privacidade'];
const operationalRoutes = ['/cofre', '/conta', '/minha-nua', '/chamadas/status', '/chamadas/reserva', '/personalizados/pedido'];
const read = (directory, file) => fs.readFileSync(path.join(directory, file), 'utf8');
const html = (directory, route) => read(directory, route === '/' ? 'index.html' : route.slice(1) + '.html');
const attributes = (source, tag) => [...source.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'gi'))]
  .map(match => Object.fromEntries([...match[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value])));
const meta = (source, name) => attributes(source, 'meta').find(entry => entry.name === name || entry.property === name)?.content;

export function validatePublicSeo(directory) {
  const home = html(directory, '/');
  const canonical = source => attributes(source, 'link').filter(entry => entry.rel === 'canonical').map(entry => new URL(entry.href).href);
  const homeUrl = new URL(canonical(home)[0]);
  assert.equal(homeUrl.pathname, '/', 'A canônica da home deve apontar para a raiz.');

  const index = JSON.parse(read(directory, 'catalogo-publicado.json'));
  assert(Array.isArray(index.slugs), 'O catálogo publicado precisa listar os slugs.');
  const routes = [...publicRoutes, ...index.slugs.map(slug => '/avulsos/' + slug)];
  const urls = [...read(directory, 'sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
  assert.deepEqual(urls.sort(), routes.map(route => new URL(route, homeUrl).href).sort(), 'O sitemap e o catálogo publicado precisam ter as mesmas URLs públicas.');

  const titles = new Set();
  for (const route of routes) {
    const source = html(directory, route);
    const url = new URL(route, homeUrl).href;
    assert.deepEqual(canonical(source), [url], 'Canônica inválida em ' + route);
    assert(!meta(source, 'robots')?.includes('noindex'), 'Página pública excluída em ' + route);
    assert.equal(new URL(meta(source, 'og:url')).href, url, 'Endereço de compartilhamento inválido em ' + route);
    assert(meta(source, 'description'), 'Descrição ausente em ' + route);
    assert.match(source, /<h1\b/i, 'Título principal ausente em ' + route);
    const title = source.match(/<title>([^<]+)<\/title>/i)?.[1];
    assert(title && !titles.has(title), 'Título ausente ou duplicado em ' + route);
    titles.add(title);

    const image = new URL(meta(source, 'og:image'));
    assert.equal(image.protocol, 'https:', 'Imagem social sem HTTPS em ' + route);
    assert(!image.search && !image.hash, 'Imagem social instável em ' + route);
    if (image.origin === homeUrl.origin && image.pathname.startsWith('/images/')) {
      assert(fs.existsSync(path.join(directory, image.pathname.slice(1))), 'Imagem social ausente em ' + route);
    }
  }

  for (const route of operationalRoutes) {
    const source = html(directory, route);
    assert(meta(source, 'robots')?.includes('noindex'), 'Rota operacional elegível em ' + route);
    assert.deepEqual(canonical(source), [], 'Rota operacional com canônica pública em ' + route);
  }

  assert.match(home, /"@type":"WebSite"/);
  assert.match(html(directory, '/sobre'), /"@type":"ProfilePage"/);
  console.log('SEO validado em ' + routes.length + ' páginas públicas e ' + operationalRoutes.length + ' rotas operacionais.');
}
