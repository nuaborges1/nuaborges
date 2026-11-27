import { mediaIdentity, normalizeObjectKey } from './media/objectKeys.mjs';
import { privatePath } from './media/vaultPath';
import { SiteContent, LibraryImageItem } from './types';

export interface MediaUsageRecord {
  sectionKey: 'hero' | 'about' | 'gallery' | 'seo' | 'album' | 'avulsos';
  label: string;
  detail: string;
}

/**
 * Hashes SHA-256 canônicos confirmados dos ativos estáticos em public/images.
 * Observe que /images/nua/hero/hero-1.jpg e /images/nua/about/about.jpg possuem
 * exatamente o mesmo conteúdo binário (131.308 bytes, SHA-256 b672572be8b11b32...).
 */
export const STATIC_ASSET_HASHES: Record<
  string,
  { fileHash: string; sizeBytes: number; canonicalName?: string }
> = {
  '/images/nua/hero/hero-1.jpg': {
    fileHash: 'sha256:b672572be8b11b32482994389c367c6a8d39f4c4592c3e97605f37e242009753',
    sizeBytes: 131308,
    canonicalName: 'Retrato Principal — Capa & Sobre Mim',
  },
  '/images/nua/about/about.jpg': {
    fileHash: 'sha256:b672572be8b11b32482994389c367c6a8d39f4c4592c3e97605f37e242009753',
    sizeBytes: 131308,
    canonicalName: 'Retrato Principal — Capa & Sobre Mim',
  },
  '/images/nua/hero/hero-2.jpg': {
    fileHash: 'sha256:c056817a86f21a1f73e9e429009899fb07068757d6a5bc0ecfd1fb895a10bd99',
    sizeBytes: 136464,
  },
  '/images/nua/gallery/gallery-1.png': {
    fileHash: 'sha256:f6525ebfd15e52f496c15f477caed27e54909356e17946894cc59fa31ca5ca41',
    sizeBytes: 1711867,
  },
  '/images/nua/gallery/gallery-2.png': {
    fileHash: 'sha256:4ef10506010bc980c2f7c1da5df4d21dc68036ab3ba5caebfd8aece9fc102b8e',
    sizeBytes: 1471261,
  },
  '/images/nua/gallery/gallery-3.png': {
    fileHash: 'sha256:c4f41cf333159b32113426f2eb7df7995b9ef6df2a655d8fb1c82b62165ca105',
    sizeBytes: 1621631,
  },
  '/images/nua/gallery/gallery-4.png': {
    fileHash: 'sha256:3227fc23ab862fd9ef8f9619b0404136eb25ca6cf0c78b33b2c04c2419eb0df1',
    sizeBytes: 1581077,
  },
  '/images/nua/logo-oficial.webp': {
    fileHash: 'sha256:c95d62898fc26eb3d665864eb5a80147f9706a011ca49b94c84fc36fc8bdce9d',
    sizeBytes: 34476,
  },
};

/**
 * Consolida itens da Biblioteca de Mídias que possuem exatamente o mesmo arquivo
 * (mesmo hash SHA-256 confirmado ou mesma URL), preservando todas as URLs associadas
 * em `aliasUrls` para que nenhuma referência no site seja quebrada.
 */
export function mediaUrlIdentity(url: string): string {
  const key = normalizeObjectKey(url);
  if (!key) return url;
  // Relative paths and B2/CDN URLs for the same site asset share an identity.
  if (/^(media|images)\//.test(key)) return mediaIdentity(key).folder;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return key;
  }
}

export function mediaItemHashes(item: LibraryImageItem): string[] {
  const embedded = mediaIdentity(normalizeObjectKey(item.objectKey || item.url)).sha256;
  return [...new Set([embedded, item.fileHash, item.fingerprint, STATIC_ASSET_HASHES[item.url]?.fileHash]
    .filter((hash): hash is string => Boolean(hash))
    .map(hash => hash.trim().toLowerCase().replace(/^([a-f0-9]{64})$/, 'sha256:$1'))
    .filter(Boolean))];
}

function scopeForMediaUrl(url?: string): 'private' | 'public' {
  return privatePath(url) || mediaIdentity(normalizeObjectKey(url)).scope === 'private' ? 'private' : 'public';
}

export function mediaItemScope(item: Pick<LibraryImageItem, 'url' | 'objectKey'>): 'private' | 'public' {
  return scopeForMediaUrl(item.url) === 'private' || scopeForMediaUrl(item.objectKey) === 'private' ? 'private' : 'public';
}

function mediaItemIdentity(item: LibraryImageItem): string[] {
  const scope = mediaItemScope(item);
  const urls = [item.url, item.objectKey, ...(item.aliasUrls || [])]
    .filter((url): url is string => Boolean(url) && scopeForMediaUrl(url) === scope)
    .map(url => `${scope}:asset:${mediaUrlIdentity(url.trim())}`);
  return [...new Set([...urls, ...mediaItemHashes(item).map(hash => `${scope}:hash:${hash}`)])];
}

export function findLibraryMedia(items: LibraryImageItem[], candidate: LibraryImageItem): LibraryImageItem | undefined {
  const keys = new Set(mediaItemIdentity(candidate));
  const scope = mediaItemScope(candidate);
  return items.find(item => mediaItemScope(item) === scope &&
    (item.id === candidate.id || mediaItemIdentity(item).some(key => keys.has(key))));
}

export function mediaUrlsInclude(urls: string[], candidate: string, item?: LibraryImageItem): boolean {
  const scope = scopeForMediaUrl(candidate);
  const aliases = (item?.aliasUrls || []).filter(url => scopeForMediaUrl(url) === scope);
  const identities = new Set([candidate, ...aliases].map(mediaUrlIdentity));
  return urls.some(url => identities.has(mediaUrlIdentity(url)));
}

export function deduplicateLibraryItems(items: LibraryImageItem[]): LibraryImageItem[] {
  const groups = new Map<number, { item: LibraryImageItem; keys: Set<string> }>();
  const index = new Map<string, number>();

  for (const raw of items || []) {
    if (!raw?.url?.trim()) continue;
    const url = raw.url.trim();
    const keys = new Set(mediaItemIdentity(raw));
    const matching = [...new Set([...keys].flatMap(key => index.has(key) ? [index.get(key)!] : []))].sort((a, b) => a - b);
    const staticMeta = STATIC_ASSET_HASHES[url];
    const current: LibraryImageItem = { ...raw, url, name: raw.customName || staticMeta?.canonicalName || raw.name };
    const hash = mediaItemHashes(raw)[0];
    if (hash) current.fileHash = hash;
    if (!current.sizeBytes && staticMeta?.sizeBytes) current.sizeBytes = staticMeta.sizeBytes;

    const id = matching[0] ?? index.size;
    if (!matching.length) {
      groups.set(id, { item: current, keys });
      for (const key of keys) index.set(key, id);
      continue;
    }
    const matches = matching.map(groupId => groups.get(groupId)!);
    const entries = [...matches.map(match => match.item), current];
    const first = entries[0];
    const customName = entries.find(item => item.customName)?.customName;
    const scope = mediaItemScope(first);
    const aliases = [...new Set(entries.flatMap(item => [item.url, ...(item.aliasUrls || [])]))]
      .filter(url => scopeForMediaUrl(url) === scope);
    const firstAsset = mediaUrlIdentity(first.objectKey || first.url);
    const related = entries.filter(item => mediaUrlIdentity(item.objectKey || item.url) === firstAsset);
    const variants = Object.assign({}, ...related.slice().reverse().map(item => item.variants));
    const details = related.slice().reverse().reduce((merged, item) => ({
      ...merged,
      ...Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined && value !== null)),
    }), {});
    const item: LibraryImageItem = {
      ...first,
      ...details,
      aliasIds: [...new Set(entries.flatMap(entry => [entry.id, ...(entry.aliasIds || [])]))].filter(id => id !== first.id),
      name: customName || entries.map(item => STATIC_ASSET_HASHES[item.url]?.canonicalName).find(Boolean) || first.name,
      customName,
      aliasUrls: aliases.length > 1 ? aliases : undefined,
      fileHash: entries.find(item => item.fileHash)?.fileHash,
      favorite: entries.some(item => item.favorite),
      albumIds: [...new Set(entries.flatMap(item => item.albumIds || []))],
      usedIn: [...new Set(entries.flatMap(item => item.usedIn || []))],
      variants: Object.keys(variants).length ? variants : undefined,
    };
    for (const match of matches) for (const key of match.keys) keys.add(key);
    for (const groupId of matching.slice(1)) groups.delete(groupId);
    groups.set(id, { item, keys });
    for (const key of keys) index.set(key, id);
  }

  return [...groups.values()].map(group => group.item);
}

/**
 * Calcula todos os locais ativos do site em que uma mídia (ou qualquer um de seus aliasUrls consolidados) está referenciada.
 */
export function getMediaUsage(
  item: LibraryImageItem,
  content: SiteContent
): MediaUsageRecord[] {
  const usages: MediaUsageRecord[] = [];
  const seenKeys = new Set<string>();
  const urlSet = new Set<string>(
    [item.url, ...(item.aliasUrls || [])]
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter(Boolean)
  );
  const targetId = item.id;

  const pushUnique = (record: MediaUsageRecord) => {
    const key = `${record.sectionKey}::${record.label}::${record.detail}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      usages.push(record);
    }
  };

  // 1. Hero slides & logo
  if (content.hero?.photos && Array.isArray(content.hero.photos)) {
    content.hero.photos.forEach((slide, index) => {
      if (slide.imageUrl && urlSet.has(slide.imageUrl.trim())) {
        pushUnique({
          sectionKey: 'hero',
          label: 'Capa Principal',
          detail: `Foto 0${index + 1} (${slide.title || 'Capa'})`,
        });
      }
    });
  }

  if (content.hero?.logoUrl && urlSet.has(content.hero.logoUrl.trim())) {
    pushUnique({
      sectionKey: 'hero',
      label: 'Logomarca da Capa',
      detail: 'Imagem da logomarca oficial na Capa',
    });
  }

  // 2. About photo
  if (content.about?.photoUrl && urlSet.has(content.about.photoUrl.trim())) {
    pushUnique({
      sectionKey: 'about',
      label: 'Sobre Mim',
      detail: 'Retrato principal da seção Sobre Mim',
    });
  }

  // 3. Gallery photos
  if (content.gallery?.photos && Array.isArray(content.gallery.photos)) {
    content.gallery.photos.forEach((photo) => {
      if (photo.imageUrl && urlSet.has(photo.imageUrl.trim())) {
        pushUnique({
          sectionKey: 'gallery',
          label: 'Galeria do Site',
          detail: photo.title || 'Ensaio Autoral',
        });
      }
    });
  }

  // 4. SEO OG image
  if (content.seo?.ogImage && urlSet.has(content.seo.ogImage.trim())) {
    pushUnique({
      sectionKey: 'seo',
      label: 'Divulgação & Google',
      detail: 'Imagem de destaque ao compartilhar o link',
    });
  }

  // 5. Conteúdos & Packs (Capa, Amostras e Conteúdo Protegido)
  if (content.avulsos?.items && Array.isArray(content.avulsos.items)) {
    content.avulsos.items.forEach((prod) => {
      const prodTitle = prod.title || 'Pack Avulso';
      if (prod.imageUrl && urlSet.has(prod.imageUrl.trim())) {
        pushUnique({
          sectionKey: 'avulsos',
          label: 'Conteúdos & Packs',
          detail: `Capa de "${prodTitle}"`,
        });
      }
      if (
        Array.isArray(prod.previewImages) &&
        prod.previewImages.some((u) => u && urlSet.has(u.trim()))
      ) {
        pushUnique({
          sectionKey: 'avulsos',
          label: 'Conteúdos & Packs',
          detail: `Amostra gratuita em "${prodTitle}"`,
        });
      }
      if (
        Array.isArray(prod.exclusivePhotos) &&
        prod.exclusivePhotos.some((u) => u && urlSet.has(u.trim()))
      ) {
        pushUnique({
          sectionKey: 'avulsos',
          label: 'Conteúdos & Packs',
          detail: `Foto protegida em "${prodTitle}"`,
        });
      }
      if (Array.isArray(prod.videos)) {
        prod.videos.forEach((vid) => {
          if (
            (vid.url && urlSet.has(vid.url.trim())) ||
            (vid.posterUrl && urlSet.has(vid.posterUrl.trim()))
          ) {
            pushUnique({
              sectionKey: 'avulsos',
              label: 'Conteúdos & Packs',
              detail: `Vídeo em "${prodTitle}"`,
            });
          }
        });
      }
    });
  }

  return usages;
}

/**
 * Aplica uma mídia diretamente a uma seção do site a partir do painel lateral da Biblioteca.
 */
export function applyMediaToSection(
  item: LibraryImageItem,
  target: 'hero-add' | 'hero-first' | 'about' | 'gallery-add',
  content: SiteContent
): { updatedContent: SiteContent; message: string } {
  const aliases = new Set([item.url, ...(item.aliasUrls || [])].filter(Boolean));
  const matches = (url?: string | null) => Boolean(url && aliases.has(url));

  if (target === 'hero-add') {
    if ((content.hero.photos || []).some((photo) => matches(photo.imageUrl))) {
      return { updatedContent: content, message: 'Esta foto já está no carrossel da capa.' };
    }
    const updatedPhotos = [
      ...(content.hero.photos || []),
      {
        id: 'hero-' + Date.now(),
        title: item.customName || item.name || 'Nua Borges',
        session: String((content.hero.photos?.length || 0) + 1).padStart(2, '0'),
        imageUrl: item.url,
      },
    ];
    return {
      updatedContent: { ...content, hero: { ...content.hero, photos: updatedPhotos } },
      message: 'Foto adicionada ao carrossel da capa.',
    };
  }

  if (target === 'hero-first') {
    const updatedPhotos = [...(content.hero.photos || [])];
    const existingIndex = updatedPhotos.findIndex((photo) => matches(photo.imageUrl));
    if (existingIndex === 0) {
      return { updatedContent: content, message: 'Esta já é a foto principal da capa.' };
    }
    if (existingIndex > 0) {
      const [existingPhoto] = updatedPhotos.splice(existingIndex, 1);
      updatedPhotos.unshift({ ...existingPhoto, imageUrl: item.url });
    } else if (updatedPhotos.length > 0) {
      updatedPhotos[0] = { ...updatedPhotos[0], imageUrl: item.url };
    } else {
      updatedPhotos.push({
        id: 'hero-' + Date.now(),
        title: item.customName || item.name || 'Nua Borges',
        session: '01',
        imageUrl: item.url,
      });
    }
    return {
      updatedContent: { ...content, hero: { ...content.hero, photos: updatedPhotos } },
      message: 'Foto definida como principal da capa.',
    };
  }

  if (target === 'about') {
    if (matches(content.about?.photoUrl)) {
      return { updatedContent: content, message: 'Esta já é a foto da seção Sobre Mim.' };
    }
    return {
      updatedContent: { ...content, about: { ...content.about, photoUrl: item.url } },
      message: 'Foto definida na seção Sobre Mim.',
    };
  }

  if (target === 'gallery-add') {
    const existing = (content.gallery.photos || []).find((photo) => matches(photo.imageUrl));
    if (existing?.active) {
      return { updatedContent: content, message: 'Esta foto já está na vitrine de ensaios.' };
    }
    if (existing) {
      const updatedGallery = content.gallery.photos.map((photo) =>
        photo.id === existing.id ? { ...photo, active: true } : photo
      );
      return {
        updatedContent: { ...content, gallery: { ...content.gallery, photos: updatedGallery } },
        message: 'Foto reativada na vitrine de ensaios.',
      };
    }
    const updatedGallery = [
      ...(content.gallery.photos || []),
      {
        id: 'gal-' + Date.now(),
        title: item.customName || item.name || 'Novo Ensaio',
        caption: 'Ensaio fotográfico autoral',
        imageUrl: item.url,
        linkUrl: content.hero.ctaUrl || 'https://onlyfans.com/nuaborges',
        active: true,
      },
    ];
    return {
      updatedContent: { ...content, gallery: { ...content.gallery, photos: updatedGallery } },
      message: 'Foto adicionada à vitrine de ensaios.',
    };
  }

  return { updatedContent: content, message: 'Não foi possível identificar essa área do site.' };
}

/** Remove somente a referência da mídia em uma área pública; o arquivo fica no acervo. */
export function removeMediaFromSection(
  item: LibraryImageItem,
  target: 'hero' | 'about' | 'gallery',
  content: SiteContent
): { updatedContent: SiteContent; message: string } {
  const aliases = new Set([item.url, ...(item.aliasUrls || [])].filter(Boolean));
  const matches = (url?: string | null) => Boolean(url && aliases.has(url));

  if (target === 'hero') {
    const photos = content.hero.photos || [];
    const remaining = photos.filter((photo) => !matches(photo.imageUrl));
    if (remaining.length === photos.length) {
      return { updatedContent: content, message: 'Esta foto não está sendo usada na capa.' };
    }
    if (photos.length > 0 && remaining.length === 0) {
      return {
        updatedContent: content,
        message: 'Inclua outra foto na capa antes de remover esta, para não deixar a capa vazia.',
      };
    }
    return {
      updatedContent: { ...content, hero: { ...content.hero, photos: remaining } },
      message: 'Foto removida da capa. O arquivo continua no acervo.',
    };
  }

  if (target === 'about') {
    if (!matches(content.about?.photoUrl)) {
      return { updatedContent: content, message: 'Esta foto não está sendo usada em Sobre Mim.' };
    }
    return {
      updatedContent: { ...content, about: { ...content.about, photoUrl: '' } },
      message: 'Foto removida de Sobre Mim. O arquivo continua no acervo.',
    };
  }

  const photos = content.gallery.photos || [];
  const remaining = photos.filter((photo) => !matches(photo.imageUrl));
  if (remaining.length === photos.length) {
    return { updatedContent: content, message: 'Esta foto não está na vitrine de ensaios.' };
  }
  return {
    updatedContent: { ...content, gallery: { ...content.gallery, photos: remaining } },
    message: 'Foto removida da vitrine. O arquivo continua no acervo.',
  };
}
