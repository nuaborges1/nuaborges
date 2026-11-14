import { SiteContent, LibraryImageItem } from '../types';
import { DEFAULT_SITE_CONTENT } from '../defaultContent';
import { ADMIN_MODULES } from '../nuaAi/adminKnowledge';

function normalizeAdminUiModules(parsed: any): NonNullable<SiteContent['adminUi']>['modules'] {
  const configured = Array.isArray(parsed?.adminUi?.modules) ? parsed.adminUi.modules : [];
  const configuredById = new Map(configured.map((module: any) => [String(module?.id), module]));
  return Object.entries(ADMIN_MODULES).map(([id, knowledge]) => {
    const current: any = configuredById.get(id) || {};
    const base = DEFAULT_SITE_CONTENT.adminUi?.modules.find((module) => module.id === id);
    return {
      id,
      group: current.group || base?.group || knowledge.group,
      label: current.label || base?.label || knowledge.label,
      description: current.description || base?.description || knowledge.desc,
      enabled: current.enabled !== false,
      tabs: Array.isArray(current.tabs)
        ? current.tabs
        : (knowledge.subTabs || []).map((tab) => ({
            id: tab.id,
            label: tab.label,
            description: tab.desc,
            enabled: true,
          })),
      texts: current.texts && typeof current.texts === 'object' ? current.texts : {},
    };
  });
}

export function normalizeSiteContent(parsed: any): SiteContent {
  if (!parsed || typeof parsed !== 'object') return DEFAULT_SITE_CONTENT;

  const onlyfansTags = Array.isArray(parsed.channels?.onlyfans?.tags)
    ? parsed.channels.onlyfans.tags
    : typeof parsed.channels?.onlyfans?.tags === 'string'
    ? parsed.channels.onlyfans.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
    : DEFAULT_SITE_CONTENT.channels.onlyfans.tags;

  const instagramTags = Array.isArray(parsed.channels?.instagram?.tags)
    ? parsed.channels.instagram.tags
    : typeof parsed.channels?.instagram?.tags === 'string'
    ? parsed.channels.instagram.tags.split(',').map((s: string) => s.trim()).filter(Boolean)
    : DEFAULT_SITE_CONTENT.channels.instagram.tags;

  const contactSubjects = Array.isArray(parsed.contact?.subjects)
    ? parsed.contact.subjects
    : typeof parsed.contact?.subjects === 'string'
    ? parsed.contact.subjects.split('\n').map((s: string) => s.trim()).filter(Boolean)
    : DEFAULT_SITE_CONTENT.contact.subjects;

  return {
    ...DEFAULT_SITE_CONTENT,
    ...parsed,
    adminUi: {
      ...DEFAULT_SITE_CONTENT.adminUi,
      ...(parsed.adminUi || {}),
      aiEnabled: parsed.adminUi?.aiEnabled !== false,
      texts: {
        ...(DEFAULT_SITE_CONTENT.adminUi?.texts || {}),
        ...(parsed.adminUi?.texts || {}),
      },
      modules: normalizeAdminUiModules(parsed),
    },
    seo: {
      ...DEFAULT_SITE_CONTENT.seo,
      ...(parsed.seo || {}),
    },
    header: {
      ...DEFAULT_SITE_CONTENT.header,
      ...(parsed.header || {}),
    },
    hero: {
      ...DEFAULT_SITE_CONTENT.hero,
      ...(parsed.hero || {}),
      useLogo: parsed.hero?.useLogo !== false,
      logoUrl:
        !parsed.hero?.logoUrl || parsed.hero.logoUrl.startsWith('data:image')
          ? '/images/nua/logo-oficial.webp'
          : parsed.hero.logoUrl,
      ctaUrl:
        !parsed.hero?.ctaUrl ||
        parsed.hero.ctaUrl === 'https://onlyfans.com/nuaborges' ||
        parsed.hero.ctaUrl === 'https://onlyfans.com/nuaborges/'
          ? '/acervo'
          : parsed.hero.ctaUrl,
      photos: Array.isArray(parsed.hero?.photos) && parsed.hero.photos.length > 0
        ? parsed.hero.photos
        : DEFAULT_SITE_CONTENT.hero.photos,
    },
    gallery: {
      ...DEFAULT_SITE_CONTENT.gallery,
      ...(parsed.gallery || {}),
      photos: Array.isArray(parsed.gallery?.photos)
        ? parsed.gallery.photos
        : DEFAULT_SITE_CONTENT.gallery.photos,
    },
    about: {
      ...DEFAULT_SITE_CONTENT.about,
      ...(parsed.about || {}),
    },
    channels: {
      ...DEFAULT_SITE_CONTENT.channels,
      ...(parsed.channels || {}),
      onlyfans: {
        ...DEFAULT_SITE_CONTENT.channels.onlyfans,
        ...(parsed.channels?.onlyfans || {}),
        tags: onlyfansTags,
      },
      instagram: {
        ...DEFAULT_SITE_CONTENT.channels.instagram,
        ...(parsed.channels?.instagram || {}),
        tags: instagramTags,
      },
      contactBanner: {
        ...DEFAULT_SITE_CONTENT.channels.contactBanner,
        ...(parsed.channels?.contactBanner || {}),
      },
    },
    contact: {
      ...DEFAULT_SITE_CONTENT.contact,
      ...(parsed.contact || {}),
      subjects: contactSubjects,
    },
    footer: {
      ...DEFAULT_SITE_CONTENT.footer,
      ...(parsed.footer || {}),
    },
    institutional: {
      sectionTitle:
        typeof parsed.institutional?.sectionTitle === 'string'
          ? parsed.institutional.sectionTitle
          : DEFAULT_SITE_CONTENT.institutional?.sectionTitle || 'Institucional',
      description:
        typeof parsed.institutional?.description === 'string'
          ? parsed.institutional.description
          : DEFAULT_SITE_CONTENT.institutional?.description || '',
      links:
        Array.isArray(parsed.institutional?.links) && parsed.institutional.links.length > 0
          ? parsed.institutional.links.map((link: any, idx: number) => ({
              id: link.id || `inst-${idx}-${Date.now()}`,
              name: link.name || link.label || 'Link Institucional',
              label: link.label || link.name || 'Link Institucional',
              description: link.description || '',
              url: link.url || '/',
              iconName: link.iconName || 'fileText',
              active: typeof link.active === 'boolean' ? link.active : true,
              order: typeof link.order === 'number' ? link.order : idx + 1,
              openInNewTab: Boolean(link.openInNewTab),
            }))
          : DEFAULT_SITE_CONTENT.institutional?.links || [],
    },
    avulsos: parsed.avulsos
      ? {
          ...(DEFAULT_SITE_CONTENT.avulsos || {}),
          ...parsed.avulsos,
          items: Array.isArray(parsed.avulsos.items)
            ? parsed.avulsos.items
            : DEFAULT_SITE_CONTENT.avulsos?.items || [],
        }
      : DEFAULT_SITE_CONTENT.avulsos,
    albums: (() => {
      const parsedAlbums = Array.isArray(parsed.albums) ? parsed.albums : [];
      const albumIds = new Set(parsedAlbums.map((a: any) => a.id));
      const mergedAlbums = [...parsedAlbums];
      (DEFAULT_SITE_CONTENT.albums || []).forEach((defAlb) => {
        if (!albumIds.has(defAlb.id)) {
          mergedAlbums.push(defAlb);
        }
      });
      return mergedAlbums;
    })(),
    library: (() => {
      const baseLibrary: LibraryImageItem[] = Array.isArray(parsed.library) ? [...parsed.library] : [];
      const knownUrls = new Set(baseLibrary.map((item) => item.url));
      const knownIds = new Set(baseLibrary.map((item) => item.id));

      (DEFAULT_SITE_CONTENT.library || []).forEach((defItem) => {
        if (!knownUrls.has(defItem.url) && !knownIds.has(defItem.id)) {
          baseLibrary.push(defItem);
          knownUrls.add(defItem.url);
          knownIds.add(defItem.id);
        }
      });

      const heroPhotos = Array.isArray(parsed.hero?.photos) && parsed.hero.photos.length > 0
        ? parsed.hero.photos
        : DEFAULT_SITE_CONTENT.hero.photos;

      heroPhotos.forEach((slide: any, idx: number) => {
        if (slide?.imageUrl && !knownUrls.has(slide.imageUrl)) {
          baseLibrary.push({
            id: slide.id || `lib-hero-${Date.now()}-${idx}`,
            name: slide.title ? `Capa — ${slide.title}` : `Foto da Capa 0${idx + 1}`,
            url: slide.imageUrl,
            uploadedAt: 'Oficial',
            favorite: false,
            albumIds: ['album-retratos'],
            usedIn: ['Hero'],
          });
          knownUrls.add(slide.imageUrl);
        }
      });

      const galleryPhotos = Array.isArray(parsed.gallery?.photos) && parsed.gallery.photos.length > 0
        ? parsed.gallery.photos
        : DEFAULT_SITE_CONTENT.gallery.photos;

      galleryPhotos.forEach((item: any, idx: number) => {
        if (item?.imageUrl && !knownUrls.has(item.imageUrl)) {
          baseLibrary.push({
            id: item.id || `lib-gal-${Date.now()}-${idx}`,
            name: item.title ? `Galeria — ${item.title}` : `Ensaio Autoral 0${idx + 1}`,
            url: item.imageUrl,
            uploadedAt: 'Oficial',
            favorite: false,
            albumIds: ['album-ensaios'],
            usedIn: ['Galeria'],
          });
          knownUrls.add(item.imageUrl);
        }
      });

      const aboutPhoto = parsed.about?.photoUrl || DEFAULT_SITE_CONTENT.about.photoUrl;
      if (aboutPhoto && !knownUrls.has(aboutPhoto)) {
        baseLibrary.push({
          id: `lib-about-${Date.now()}`,
          name: 'Sobre Mim — Retrato Autoral',
          url: aboutPhoto,
          uploadedAt: 'Oficial',
          favorite: true,
          albumIds: ['album-retratos', 'album-profissionais'],
          usedIn: ['Sobre Mim'],
        });
        knownUrls.add(aboutPhoto);
      }

      return baseLibrary;
    })(),
    _updatedAt: parsed?._updatedAt || (parsed as any)?.updatedAt,
    _version: parsed?._version || (parsed as any)?.version,
  };
}
