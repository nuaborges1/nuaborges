import { getSiteContentFromSupabase } from './api/supabase/content';
import type { SupabaseEnv } from './api/_supabaseClient';
import { catalogFallbackSlug, findPublicPack, isPublicPack, type PublicPack } from '../lib/publicCatalog';

export type CatalogEnv = SupabaseEnv & { ASSETS: { fetch: typeof fetch } };
type CatalogIndex = { slugs: string[]; aliases: Record<string, string>; ids?: Record<string, string> };
type PublishedCatalog = Promise<PublicPack[]>;

let currentCatalog: { env: CatalogEnv; expiresAt: number; packs: PublishedCatalog } | undefined;

function currentPacks(env: CatalogEnv): PublishedCatalog {
  if (currentCatalog?.env === env && currentCatalog.expiresAt > Date.now()) return currentCatalog.packs;
  const packs = getSiteContentFromSupabase(env, 'published_content', { strict: true }).then(content => {
    const catalog = content?.avulsos;
    if (catalog?.active === false || !Array.isArray(catalog?.items)) return [];
    return catalog.items.filter(isPublicPack);
  });
  currentCatalog = { env, expiresAt: Date.now() + 15_000, packs };
  return packs;
}

async function notFound(request: Request, env: CatalogEnv, url: URL) {
  const result = await env.ASSETS.fetch(new URL('/404', url));
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'X-Robots-Tag': 'noindex',
    'Cache-Control': 'no-store',
  });
  return new Response(request.method === 'HEAD' ? null : result.ok ? result.body : 'Conteúdo não encontrado.', { status: 404, headers });
}

function unavailable() {
  return new Response('O catálogo está temporariamente indisponível.', {
    status: 503,
    headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
  });
}

export async function serveCatalogRoute(request: Request, env: CatalogEnv, url: URL, next: () => Promise<Response>) {
  if (url.pathname === '/catalogo-publicado.json') {
    const asset = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(asset.headers);
    headers.set('X-Robots-Tag', 'noindex');
    return new Response(request.method === 'HEAD' ? null : asset.body, { status: asset.status, headers });
  }
  const match = /^\/avulsos\/([^/]+?)(\.txt|\.html)?\/?$/i.exec(url.pathname);
  if (!match) return notFound(request, env, url);
  let slug: string;
  try {
    slug = decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return notFound(request, env, url);
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(slug)) return notFound(request, env, url);
  const flightFile = match[2]?.toLowerCase() === '.txt';
  const flight = flightFile || request.headers.get('rsc') === '1' || url.searchParams.has('_rsc');
  const indexAsset = await env.ASSETS.fetch(new URL('/catalogo-publicado.json', url));
  if (!indexAsset.ok) return unavailable();

  let index: CatalogIndex;
  try { index = await indexAsset.json() as CatalogIndex; } catch { return unavailable(); }
  if (!Array.isArray(index.slugs) || !index.aliases) return unavailable();

  const builtSlug = index.slugs.includes(slug) ? slug : Object.hasOwn(index.aliases, slug) ? index.aliases[slug] : undefined;
  let packs: PublicPack[];
  try {
    packs = await currentPacks(env);
  } catch {
    // Falha de conexão não confirma publicação nem remoção.
    return unavailable();
  }
  const builtId = builtSlug && index.ids && Object.hasOwn(index.ids, builtSlug) ? index.ids[builtSlug] : undefined;
  const pack = findPublicPack(packs, slug) ?? packs.find(item => builtId ? item.id === builtId : item.slug === builtSlug);
  if (!pack) return notFound(request, env, url);
  const canonicalSlug = pack.slug;
  const inBuild = index.slugs.includes(canonicalSlug) && (!index.ids || index.ids[canonicalSlug] === pack.id);
  const pagePath = '/avulsos/' + canonicalSlug;
  if (url.pathname !== pagePath && url.pathname !== pagePath + '.txt') {
    const destination = new URL(flightFile ? pagePath + '.txt' : pagePath, url);
    destination.search = url.search;
    return Response.redirect(destination, 308);
  }

  if (inBuild && !flight) return next();
  const assetPath = (inBuild ? pagePath : '/avulsos/' + catalogFallbackSlug) + (flight ? '.txt' : '');
  const asset = await env.ASSETS.fetch(new Request(new URL(assetPath, url), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: flight ? { Accept: 'text/x-component, text/plain, */*' } : {},
  }));
  if (!asset.ok || (flight && asset.headers.get('content-type')?.includes('text/html'))) return unavailable();
  const headers = new Headers(asset.headers);
  headers.set('Content-Type', flight ? 'text/x-component; charset=utf-8' : 'text/html; charset=utf-8');
  headers.set('Cache-Control', inBuild ? 'public, max-age=0, must-revalidate' : 'no-store');
  headers.append('Vary', 'RSC');
  if (!inBuild) headers.set('X-Robots-Tag', 'noindex, follow');
  return new Response(request.method === 'HEAD' ? null : asset.body, { status: 200, headers });
}

export async function serveCatalogSitemap(request: Request, env: CatalogEnv, response: Response) {
  if (!response.ok) return response;
  const head = request.method === 'HEAD';
  const xml = await response.text();
  const packEntries = /<url>\s*<loc>https?:\/\/[^/<>]+\/avulsos\/([a-z0-9-]+)<\/loc>[\s\S]*?<\/url>/g;
  if (!packEntries.test(xml)) return new Response(head ? null : xml, response);

  const indexAsset = await env.ASSETS.fetch(new URL('/catalogo-publicado.json', request.url));
  if (!indexAsset.ok) return unavailable();
  try {
    const index: CatalogIndex = await indexAsset.json();
    const published = new Map((await currentPacks(env)).map(pack => [pack.slug, pack.id]));
    const sitemap = xml.replace(packEntries, (entry, slug: string) =>
      published.has(slug) && (!index.ids || index.ids[slug] === published.get(slug)) ? entry : '');
    const headers = new Headers(response.headers);
    for (const name of ['Content-Length', 'ETag', 'Last-Modified']) headers.delete(name);
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return new Response(head ? null : sitemap, { status: response.status, headers });
  } catch {
    return unavailable();
  }
}
