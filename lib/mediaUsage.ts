import { SiteContent, LibraryImageItem } from './types';

export interface MediaUsageRecord {
  sectionKey: 'hero' | 'about' | 'gallery' | 'seo' | 'album';
  label: string;
  detail: string;
}

/**
 * Calculates everywhere a specific media item is currently referenced and active on the site.
 */
export function getMediaUsage(
  item: LibraryImageItem,
  content: SiteContent
): MediaUsageRecord[] {
  const usages: MediaUsageRecord[] = [];
  const targetUrl = item.url;
  const targetId = item.id;

  // 1. Hero slides & logo
  if (content.hero?.photos && Array.isArray(content.hero.photos)) {
    content.hero.photos.forEach((slide, index) => {
      if (slide.imageUrl === targetUrl) {
        usages.push({
          sectionKey: 'hero',
          label: 'Capa principal do Site',
          detail: `Foto 0${index + 1} (${slide.title || 'Foto da Capa'})`,
        });
      }
    });
  }

  if (content.hero?.logoUrl === targetUrl) {
    usages.push({
      sectionKey: 'hero',
      label: 'Logo Oficial da Capa',
      detail: 'Imagem PNG da Logomarca na Hero',
    });
  }

  // 2. About photo
  if (content.about?.photoUrl === targetUrl) {
    usages.push({
      sectionKey: 'about',
      label: 'Sobre Mim',
      detail: 'Foto de Perfil Principal',
    });
  }

  // 3. Gallery photos
  if (content.gallery?.photos && Array.isArray(content.gallery.photos)) {
    content.gallery.photos.forEach((photo) => {
      if (photo.imageUrl === targetUrl) {
        usages.push({
          sectionKey: 'gallery',
          label: 'Galeria do Site',
          detail: photo.title || 'Ensaio Autoral',
        });
      }
    });
  }

  // 4. SEO OG image
  if (content.seo?.ogImage === targetUrl) {
    usages.push({
      sectionKey: 'seo',
      label: 'Compartilhamento Social (Open Graph)',
      detail: 'Foto de Destaque no WhatsApp / Redes',
    });
  }

  // 5. Album covers
  if (content.albums && Array.isArray(content.albums)) {
    content.albums.forEach((album) => {
      if (album.coverMediaId === targetId || album.coverUrl === targetUrl) {
        usages.push({
          sectionKey: 'album',
          label: `Capa do Álbum "${album.name}"`,
          detail: 'Foto de Capa do Álbum',
        });
      }
    });
  }

  return usages;
}

/**
 * Helper to assign this media to a site section directly from the Library modal
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
        title: item.name || 'Nua Borges',
        session: String((updated.hero.photos?.length || 0) + 1).padStart(2, '0'),
        imageUrl: item.url,
      },
    ];
    updated = {
      ...updated,
      hero: { ...updated.hero, photos: updatedPhotos },
    };
    message = 'Foto adicionada ao carrossel da Capa.';
  } else if (target === 'hero-first') {
    const updatedPhotos = [...(updated.hero.photos || [])];
    if (updatedPhotos.length > 0) {
      updatedPhotos[0] = { ...updatedPhotos[0], imageUrl: item.url };
    } else {
      updatedPhotos.push({
        id: 'hero-' + Date.now(),
        title: item.name || 'Nua Borges',
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
    message = 'Foto definida no seu perfil do Sobre Mim.';
  } else if (target === 'gallery-add') {
    const updatedGallery = [
      ...(updated.gallery.photos || []),
      {
        id: 'gal-' + Date.now(),
        title: item.name || 'Novo Ensaio',
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
    message = 'Foto adicionada à Galeria de Ensaios do site.';
  }

  return { updatedContent: updated, message };
}
