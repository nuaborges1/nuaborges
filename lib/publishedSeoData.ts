import fs from 'node:fs';
import path from 'node:path';
import type { SiteContent } from './types';
import { isPublicPack, packAliases } from './publicCatalog';

export function readPublishedSeoContent(): SiteContent {
  const file = path.join(process.cwd(), 'data', 'published_content.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as SiteContent;
}

export function readPublishedPacks(content = readPublishedSeoContent()) {
  const catalog = content.avulsos;
  if (catalog?.active === false || !Array.isArray(catalog?.items)) return [];
  const packs = catalog.items.filter(isPublicPack);
  const slugs = new Set(packs.map(pack => pack.slug));
  if (slugs.size !== packs.length) throw new Error('Há mais de um pack publicado com o mesmo endereço.');
  return packs.map(pack => ({
    id: pack.id, slug: pack.slug, title: pack.title, active: pack.active, modality: pack.modality,
    description: pack.description, longDescription: pack.longDescription, badge: pack.badge,
    price: pack.price, numericPrice: pack.numericPrice, duration: pack.duration,
    imageUrl: pack.imageUrl, checkoutUrl: pack.checkoutUrl, buttonText: pack.buttonText,
    technicalDetails: pack.technicalDetails, previewImages: pack.previewImages,
    exclusivePhotosCount: pack.exclusivePhotosCount, videosCount: pack.videosCount,
    videos: pack.videos?.map(video => ({
      id: video.id, title: video.title, duration: video.duration, posterUrl: video.posterUrl, url: '',
    })),
  }));
}

export function readCatalogIndex() {
  const packs = readPublishedPacks();
  const slugs = packs.map(pack => pack.slug);
  const reserved = new Set(slugs);
  const aliases: Record<string, string> = Object.create(null);
  for (const pack of packs) {
    for (const alias of packAliases(pack)) {
      if (reserved.has(alias)) continue;
      if (aliases[alias] && aliases[alias] !== pack.slug) {
        throw new Error('O endereço antigo de um pack aponta para mais de uma produção publicada: ' + alias);
      }
      aliases[alias] = pack.slug;
    }
  }
  return { slugs, aliases, ids: Object.fromEntries(packs.map(pack => [pack.slug, pack.id])) };
}

const sharedSections = ['header', 'footer', 'institutional', 'channels'] as const;
type PublicSection = 'hero' | 'about' | 'gallery' | 'avulsos' | 'contact' | 'vipClub' | 'faqs' | 'personalizados';

export function readPublicPageContent(...sections: PublicSection[]): Partial<SiteContent> {
  const content = readPublishedSeoContent();
  const selected = Object.fromEntries([...sharedSections, ...sections].map(section => [section, content[section]]));
  if (sections.includes('avulsos') && content.avulsos) {
    selected.avulsos = { ...content.avulsos, items: readPublishedPacks(content) };
  }
  if (sections.includes('gallery') && content.gallery) {
    selected.gallery = {
      ...content.gallery,
      photos: (content.gallery.photos || []).filter(photo => photo.active !== false && !photo.isPendingPublish),
    };
  }
  return selected;
}
