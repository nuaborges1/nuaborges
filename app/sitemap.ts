import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { publicPages } from '@/lib/pageSeo';
import { readPublishedPacks } from '@/lib/publishedSeoData';

export const dynamic = 'force-static';

const routeMeta: Record<string, { changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = {
  '/': { changeFrequency: 'weekly', priority: 1.0 },
  '/avulsos': { changeFrequency: 'weekly', priority: 0.9 },
  '/acervo': { changeFrequency: 'weekly', priority: 0.8 },
  '/sobre': { changeFrequency: 'monthly', priority: 0.8 },
  '/chamadas': { changeFrequency: 'monthly', priority: 0.8 },
  '/personalizados': { changeFrequency: 'monthly', priority: 0.8 },
  '/contato': { changeFrequency: 'monthly', priority: 0.6 },
  '/termos': { changeFrequency: 'yearly', priority: 0.3 },
  '/privacidade': { changeFrequency: 'yearly', priority: 0.3 },
};

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = Object.keys(publicPages).map(route => ({
    url: new URL(route, SITE_URL).href,
    lastModified: now,
    changeFrequency: routeMeta[route]?.changeFrequency ?? 'monthly',
    priority: routeMeta[route]?.priority ?? 0.7,
  }));

  const packEntries: MetadataRoute.Sitemap = readPublishedPacks().map(pack => ({
    url: new URL(`/avulsos/${pack.slug}`, SITE_URL).href,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticEntries, ...packEntries];
}
