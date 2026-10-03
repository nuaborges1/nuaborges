/**
 * ==============================================================================
 * SEO ENGINE — NUA BORGES
 * ==============================================================================
 * Sistema automático de SEO. Gera títulos, descriptions, Open Graph,
 * JSON-LD e alt texts a partir do conteúdo real do site.
 *
 * A cliente NÃO precisa configurar nada. Este módulo funciona nos bastidores.
 * ==============================================================================
 */

import { SiteContent, LibraryImageItem } from './types';
import { SITE_URL } from './site';

const SITE_NAME = 'Nua Borges';
const SITE_HANDLE = '@nuaborges';
const DEFAULT_OG_IMAGE = '/images/nua/hero/hero-1.jpg';

// ---------------------------------------------------------------------------
// 1. Slug Generator — URLs amigáveis
// ---------------------------------------------------------------------------

/**
 * Converte texto em slug URL-safe, normalizando acentos e caracteres especiais.
 */
export function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-')            // Espaços → hífens
    .replace(/-+/g, '-')             // Múltiplos hífens → um
    .substring(0, 80);               // Máximo 80 chars
}

// ---------------------------------------------------------------------------
// 2. Title Builder
// ---------------------------------------------------------------------------

export function buildPageTitle(pageName?: string): string {
  if (!pageName || pageName.trim() === '') return SITE_NAME;
  return `${pageName.trim()} | ${SITE_NAME}`;
}

export function buildHomeTitle(content?: SiteContent): string {
  const name = content?.header?.brandName || SITE_NAME;
  const role = content?.about?.role;
  if (role && role.length > 0 && role.length < 60) {
    return `${name} — ${role}`;
  }
  return name;
}

// ---------------------------------------------------------------------------
// 3. Description Builder
// ---------------------------------------------------------------------------

/**
 * Gera description automática a partir do conteúdo da hero/about.
 * Nunca retorna string vazia, null ou undefined.
 */
export function buildHomeDescription(content?: SiteContent): string {
  // Prioridade 1: description personalizada da hero
  const heroDesc = content?.hero?.description?.trim();
  if (heroDesc && heroDesc.length >= 50 && heroDesc.length <= 160) {
    return heroDesc;
  }

  // Prioridade 2: tagline + pull quote do about
  const tagline = content?.hero?.tagline?.trim();
  const pullQuote = content?.about?.pullQuote?.trim();

  if (tagline && pullQuote) {
    const combined = `${tagline} ${pullQuote}`;
    if (combined.length <= 160) return combined;
    return tagline.length <= 160 ? tagline : tagline.substring(0, 157) + '...';
  }

  if (tagline && tagline.length >= 30) return tagline;

  // Prioridade 3: about paragraph1
  const p1 = content?.about?.paragraph1?.trim();
  if (p1 && p1.length >= 50) {
    return p1.length <= 160 ? p1 : p1.substring(0, 157) + '...';
  }

  // Fallback curado
  return 'Educadora sexual e sexóloga em formação. Corpo, relações e liberdade. Deixa de vergonha.';
}

export function buildAlbumDescription(albumName: string, albumDesc?: string): string {
  if (albumDesc && albumDesc.trim().length >= 20) {
    const d = albumDesc.trim();
    return d.length <= 160 ? d : d.substring(0, 157) + '...';
  }
  return `${albumName} — Acervo fotográfico autoral de ${SITE_NAME}.`;
}

// ---------------------------------------------------------------------------
// 4. Open Graph Image Picker
// ---------------------------------------------------------------------------

/**
 * Seleciona a melhor imagem para Open Graph automaticamente.
 * Prioriza a primeira foto da hero, depois a do about.
 */
export function pickOgImage(content?: SiteContent): string {
  // Prioridade 1: primeira foto da hero (maior destaque visual)
  const heroPhotos = content?.hero?.photos;
  if (heroPhotos && heroPhotos.length > 0) {
    const firstHero = heroPhotos[0]?.imageUrl;
    if (firstHero && firstHero.startsWith('/')) {
      return firstHero;
    }
    if (firstHero && firstHero.startsWith('http')) {
      return firstHero;
    }
  }

  // Prioridade 2: SEO og image configurada
  const seoOg = content?.seo?.ogImage;
  if (seoOg && seoOg.trim()) return seoOg;

  // Prioridade 3: foto do about
  const aboutPhoto = content?.about?.photoUrl;
  if (aboutPhoto && aboutPhoto.trim()) return aboutPhoto;

  // Fallback padrão
  return DEFAULT_OG_IMAGE;
}

// ---------------------------------------------------------------------------
// 5. Canonical URL Builder
// ---------------------------------------------------------------------------

export function buildCanonicalUrl(path: string = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}

// ---------------------------------------------------------------------------
// 6. Alt Text Generator
// ---------------------------------------------------------------------------

export type ImageContext = 'hero' | 'gallery' | 'about' | 'decorative' | 'library';

/**
 * Gera alt text contextual sem inventar informações.
 * Imagens decorativas recebem alt="" (correto para acessibilidade e SEO).
 */
export function buildAltText(
  context: ImageContext,
  options: {
    title?: string;
    caption?: string;
    customName?: string;
    index?: number;
  } = {}
): string {
  const { title, caption, customName, index } = options;

  switch (context) {
    case 'decorative':
      return ''; // Correto: imagem decorativa não precisa de alt

    case 'hero':
      if (title && title !== 'Nua Borges') {
        return `${SITE_NAME} — ${title}`;
      }
      if (index !== undefined && index > 0) {
        return `${SITE_NAME} — Retrato editorial ${index + 1}`;
      }
      return `${SITE_NAME} — Fotografia autoral`;

    case 'gallery':
      if (title && caption) return `${title} — ${caption}`;
      if (title) return `${title} por ${SITE_NAME}`;
      if (caption) return caption;
      return `Ensaio fotográfico autoral por ${SITE_NAME}`;

    case 'about':
      return `${SITE_NAME} — Retrato`;

    case 'library':
      if (customName) return customName;
      if (title) return `${title} por ${SITE_NAME}`;
      return `Fotografia de ${SITE_NAME}`;

    default:
      return `${SITE_NAME}`;
  }
}

// ---------------------------------------------------------------------------
// 7. JSON-LD Structured Data
// ---------------------------------------------------------------------------

/** Schema ProfilePage + Person — para o site de marca pessoal */
export function buildPersonSchema(content?: SiteContent) {
  const name = content?.header?.brandName || SITE_NAME;
  const description = buildHomeDescription(content);
  const ogImage = pickOgImage(content);
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `Perfil de ${name}`,
    url: SITE_URL,
    mainEntity: {
      '@type': 'Person',
      name,
      alternateName: SITE_HANDLE,
      url: SITE_URL,
      description,
      image: {
        '@type': 'ImageObject',
        url: imageUrl,
        name: `Foto de ${name}`,
      },
      sameAs: [
        'https://www.instagram.com/nuaborges',
        'https://onlyfans.com/nuaborges',
      ],
    },
  };
}

/** Schema WebSite com SearchAction (SiteLinks Searchbox para Google) */
export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'pt-BR',
  };
}

/** Schema BreadcrumbList para navegação interna */
export function buildBreadcrumbSchema(
  crumbs: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url.startsWith('http') ? crumb.url : `${SITE_URL}${crumb.url}`,
    })),
  };
}

/** Schema ImageGallery para a seção de galeria */
export function buildImageGallerySchema(
  photos: Array<{ title?: string; caption?: string; imageUrl: string }>,
  galleryTitle: string
) {
  const imageObjects = photos
    .filter((p) => p.imageUrl)
    .map((p) => ({
      '@type': 'ImageObject',
      name: p.title || galleryTitle,
      description: p.caption,
      contentUrl: p.imageUrl.startsWith('http')
        ? p.imageUrl
        : `${SITE_URL}${p.imageUrl}`,
      author: {
        '@type': 'Person',
        name: SITE_NAME,
      },
    }));

  if (imageObjects.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: galleryTitle,
    author: {
      '@type': 'Person',
      name: SITE_NAME,
    },
    image: imageObjects,
  };
}

// ---------------------------------------------------------------------------
// 8. Full Metadata Object (for Next.js generateMetadata)
// ---------------------------------------------------------------------------

export interface SeoMetadata {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  ogImageAlt: string;
  robots: string;
}

export function buildHomeMetadata(content?: SiteContent): SeoMetadata {
  const title = buildHomeTitle(content);
  const description = buildHomeDescription(content);
  const ogImage = pickOgImage(content);
  const canonical = buildCanonicalUrl('/');

  return {
    title,
    description,
    canonical,
    ogImage: ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`,
    ogImageAlt: `${SITE_NAME} — Fotografia autoral`,
    robots: 'index, follow',
  };
}

export function buildAdminMetadata(): SeoMetadata {
  return {
    title: 'Admin | Nua Borges',
    description: '',
    canonical: '',
    ogImage: '',
    ogImageAlt: '',
    robots: 'noindex, nofollow',
  };
}

// ---------------------------------------------------------------------------
// 9. Sitemap Entry Builder
// ---------------------------------------------------------------------------

export interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export function buildSitemapEntries(): SitemapEntry[] {
  const now = new Date().toISOString().split('T')[0];

  return [
    {
      url: SITE_URL,
      lastmod: now,
      changefreq: 'weekly',
      priority: 1.0,
    },
  ];
}

// ---------------------------------------------------------------------------
// 10. Export constants
// ---------------------------------------------------------------------------

export { SITE_NAME, SITE_URL, SITE_HANDLE, DEFAULT_OG_IMAGE };
