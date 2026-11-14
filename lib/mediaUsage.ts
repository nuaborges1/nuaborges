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
export function deduplicateLibraryItems(items: LibraryImageItem[]): LibraryImageItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const result: LibraryImageItem[] = [];
  const byHash = new Map<string, number>();
  const byUrl = new Map<string, number>();

  for (const rawItem of items) {
    if (!rawItem || !rawItem.url) continue;

    const cleanUrl = rawItem.url.trim();
    const staticMeta = STATIC_ASSET_HASHES[cleanUrl];
    const effectiveHash = (rawItem.fileHash || staticMeta?.fileHash || '').trim();
    const effectiveSize = rawItem.sizeBytes || staticMeta?.sizeBytes;

    let existingIdx: number | undefined;
    if (effectiveHash && byHash.has(effectiveHash)) {
      existingIdx = byHash.get(effectiveHash);
    } else if (byUrl.has(cleanUrl)) {
      existingIdx = byUrl.get(cleanUrl);
    }

    if (existingIdx !== undefined) {
      const existing = result[existingIdx];
      const mergedAliases = Array.from(
        new Set([
          existing.url,
          ...(existing.aliasUrls || []),
          cleanUrl,
          ...(rawItem.aliasUrls || []),
        ].filter(Boolean))
      );
      const mergedAlbums = Array.from(
        new Set([...(existing.albumIds || []), ...(rawItem.albumIds || [])])
      );
      const mergedUsedIn = Array.from(
        new Set([...(existing.usedIn || []), ...(rawItem.usedIn || [])])
      );

      const canonicalName =
        existing.customName ||
        rawItem.customName ||
        staticMeta?.canonicalName ||
        STATIC_ASSET_HASHES[existing.url]?.canonicalName ||
        existing.name;

      result[existingIdx] = {
        ...existing,
        name: canonicalName,
        customName: existing.customName || rawItem.customName,
        aliasUrls: mergedAliases,
        fileHash: existing.fileHash || effectiveHash || undefined,
        sizeBytes: existing.sizeBytes || effectiveSize,
        favorite: Boolean(existing.favorite || rawItem.favorite),
        albumIds: mergedAlbums,
        usedIn: mergedUsedIn,
      };

      for (const alias of mergedAliases) {
        byUrl.set(alias, existingIdx);
      }
      if (effectiveHash) {
        byHash.set(effectiveHash, existingIdx);
      }
    } else {
      const normalizedAliases = Array.from(
        new Set([cleanUrl, ...(rawItem.aliasUrls || [])].filter(Boolean))
      );
      const enriched: LibraryImageItem = {
        ...rawItem,
        url: cleanUrl,
        aliasUrls: normalizedAliases.length > 1 ? normalizedAliases : undefined,
        fileHash: effectiveHash || rawItem.fileHash,
        sizeBytes: effectiveSize ?? rawItem.sizeBytes,
      };
      const newIdx = result.length;
      result.push(enriched);
      for (const alias of normalizedAliases) {
        byUrl.set(alias, newIdx);
      }
      if (effectiveHash) {
        byHash.set(effectiveHash, newIdx);
      }
    }
  }

  return result;
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
  let updated = { ...content };
  let message = '';

  if (target === 'hero-add') {
    const updatedPhotos = [
      ...(updated.hero.photos || []),
      {
        id: 'hero-' + Date.now(),
        title: item.customName || item.name || 'Nua Borges',
        session: String((updated.hero.photos?.length || 0) + 1).padStart(2, '0'),
        imageUrl: item.url,
      },
    ];
    updated = {
      ...updated,
      hero: { ...updated.hero, photos: updatedPhotos },
    };
    message = 'Foto adicionada ao carrossel da Capa Principal.';
  } else if (target === 'hero-first') {
    const updatedPhotos = [...(updated.hero.photos || [])];
    if (updatedPhotos.length > 0) {
      updatedPhotos[0] = { ...updatedPhotos[0], imageUrl: item.url };
    } else {
      updatedPhotos.push({
        id: 'hero-' + Date.now(),
        title: item.customName || item.name || 'Nua Borges',
        session: '01',
        imageUrl: item.url,
      });
    }
    updated = {
      ...updated,
      hero: { ...updated.hero, photos: updatedPhotos },
    };
    message = 'Foto definida como capa principal do site.';
  } else if (target === 'about') {
    updated = {
      ...updated,
      about: { ...updated.about, photoUrl: item.url },
    };
    message = 'Foto definida no retrato da seção Sobre Mim.';
  } else if (target === 'gallery-add') {
    const updatedGallery = [
      ...(updated.gallery.photos || []),
      {
        id: 'gal-' + Date.now(),
        title: item.customName || item.name || 'Novo Ensaio',
        caption: 'Ensaio fotográfico autoral',
        imageUrl: item.url,
        linkUrl: updated.hero.ctaUrl || 'https://onlyfans.com/nuaborges',
        active: true,
      },
    ];
    updated = {
      ...updated,
      gallery: { ...updated.gallery, photos: updatedGallery },
    };
    message = 'Foto adicionada à Galeria de Fotos do site.';
  }

  return { updatedContent: updated, message };
}
