import type { MediaVariant } from './media/types';

export interface HeroSlideItem {
  id: string;
  title: string;
  session: string;
  imageUrl: string;
}

export interface GalleryPhotoItem {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  linkUrl?: string;
  active?: boolean;
}

export interface SocialChannelItem {
  id: string;
  name: string;
  url: string;
  iconName: 'onlyfans' | 'instagram' | 'contact' | 'custom';
  badge: string;
  description: string;
  tags: string[];
  buttonText: string;
}

export interface MediaAlbum {
  id: string;
  name: string;
  description?: string;
  coverMediaId?: string;
  coverUrl?: string;
  mediaIds: string[];
  createdAt: string;
}

export interface LibraryImageItem {
  id: string;
  name: string;
  url: string;
  objectKey?: string;
  uploadedAt: string;
  usedIn?: string[];
  sizeBytes?: number;
  width?: number;
  height?: number;
  isVideo?: boolean;
  posterUrl?: string;
  provider?: string;
  favorite?: boolean;
  albumIds?: string[];
  customName?: string;
  fileHash?: string;
  variants?: {
    thumb?: MediaVariant;
    mobile?: MediaVariant;
    full?: MediaVariant;
    original?: MediaVariant;
  };
}

export interface SiteContent {
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage: string;
  };
  header: {
    brandName: string;
    brandMonogram?: string;
    navLogoStyle?: 'monogram' | 'editorial' | 'signature';
    showInstagram: boolean;
    showOnlyFans: boolean;
    onlyFansText: string;
    onlyFansUrl: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    tagline: string;
    description: string;
    ctaText: string;
    ctaUrl: string;
    photos: HeroSlideItem[];
    fullVerticalPhoto?: boolean;
    cinematicCoverLayout?: boolean;
    /** URL da imagem de logo PNG para exibir no lugar do título de texto */
    logoUrl?: string;
    /** Se true, exibe a logo PNG em vez do texto tipográfico */
    useLogo?: boolean;
  };
  gallery: {
    eyebrow: string;
    title: string;
    subtitle: string;
    photos: GalleryPhotoItem[];
  };
  about: {
    eyebrow: string;
    headline: string;
    role: string;
    pullQuote: string;
    paragraph1: string;
    paragraph2: string;
    signature: string;
    photoUrl: string;
  };
  channels: {
    eyebrow: string;
    title: string;
    subtitle: string;
    onlyfans: {
      title: string;
      badge: string;
      description: string;
      tags: string[];
      buttonText: string;
      url: string;
    };
    instagram: {
      title: string;
      handle: string;
      description: string;
      tags: string[];
      buttonText: string;
      url: string;
    };
    contactBanner: {
      title: string;
      description: string;
      buttonText: string;
    };
  };
  contact: {
    modalTitle: string;
    modalSubtitle: string;
    officialEmail: string;
    subjects: string[];
  };
  footer: {
    brandName: string;
    role: string;
    concept: string;
    copyrightText: string;
    signOff: string;
  };
  institutional: {
    sectionTitle: string;
    description?: string;
    links: InstitutionalLinkItem[];
  };
  library: LibraryImageItem[];
  albums?: MediaAlbum[];
}

export interface InstitutionalLinkItem {
  id: string;
  name: string;
  label: string;
  description?: string;
  url: string;
  iconName?: 'scale' | 'shield' | 'fileText' | 'external' | 'heart' | 'info';
  active: boolean;
  order: number;
  openInNewTab?: boolean;
}

