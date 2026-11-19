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
  blurred?: boolean; // Se true, exibe desfocada com cadeado VIP
  isPendingPublish?: boolean; // Se true, aguarda publicação para ir ao site público
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
  aliasUrls?: string[];
  objectKey?: string;
  uploadedAt: string;
  usedIn?: string[];
  sizeBytes?: number;
  width?: number;
  height?: number;
  isVideo?: boolean;
  duration?: string;
  durationSeconds?: number;
  posterUrl?: string;
  provider?: string;
  favorite?: boolean;
  albumIds?: string[];
  customName?: string;
  fileHash?: string;
  fingerprint?: string;
  originalSizeBytes?: number;
  savingsPercentage?: number;
  bitrateKbps?: number;
  wasFastStartApplied?: boolean;
  variants?: {
    thumb?: MediaVariant;
    mobile?: MediaVariant;
    full?: MediaVariant;
    original?: MediaVariant;
  };
}

export interface ChannelPlatformItem {
  title: string;
  badge: string;
  description: string;
  tags: string[];
  buttonText: string;
  url: string;
  active?: boolean;
}

export interface AvulsoVideoItem {
  id: string;
  title: string;
  url: string;
  duration?: string;
  posterUrl?: string;
}

export interface AvulsoProductItem {
  id: string;
  slug?: string;
  title: string;
  modality?: 'avulso' | 'pack';
  price: string;
  numericPrice?: number;
  duration?: string;
  badge?: string;
  description: string;
  longDescription?: string;
  technicalDetails?: {
    format?: string;
    mediaCount?: string;
    audio?: string;
    ambient?: string;
  };
  previewImages?: string[];
  exclusivePhotos?: string[];
  videos?: AvulsoVideoItem[];
  imageUrl: string;
  checkoutUrl: string;
  buttonText?: string;
  active: boolean;
  isDraft?: boolean;
}

export interface AvulsosSectionData {
  eyebrow?: string;
  title: string;
  subtitle: string;
  active?: boolean;
  upsellText?: string;
  upsellUrl?: string;
  items: AvulsoProductItem[];
}

export interface VipClubData {
  eyebrow?: string;
  title: string;
  subtitle: string;
  buttonText: string;
  active?: boolean;
}

export interface SiteContent {
  /** Configuração persistida da interface administrativa. Mantém copy e navegação fora do código. */
  adminUi?: AdminUiConfig;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    ogImage: string;
    keywords?: string;
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
    /** Texto de convite do rodapé da capa (scroll para a galeria) */
    exploreText?: string;
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
    active?: boolean;
  };
  avulsos?: AvulsosSectionData;
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
  vipClub?: VipClubData;
  personalizados?: import('./personalizadosCanonical').PersonalizadosSettings;
  channels: {
    eyebrow: string;
    title: string;
    subtitle: string;
    onlyfans: ChannelPlatformItem;
    privacy?: ChannelPlatformItem;
    closefans?: ChannelPlatformItem;
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
    ageNoticeTitle?: string;
    ageNoticeDescription?: string;
    termsSummary?: string;
    privacySummary?: string;
  };
  library: LibraryImageItem[];
  albums?: MediaAlbum[];
  _updatedAt?: string;
  _version?: number;
}

export interface AdminUiActionConfig {
  label?: string;
  description?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  enabled?: boolean;
}

export interface AdminUiTabConfig {
  id: string;
  label: string;
  description?: string;
  enabled?: boolean;
  actions?: Record<string, AdminUiActionConfig>;
}

export interface AdminUiModuleConfig {
  id: string;
  group: string;
  label: string;
  description: string;
  enabled?: boolean;
  tabs?: AdminUiTabConfig[];
  texts?: Record<string, string>;
}

export interface AdminUiConfig {
  version: number;
  aiEnabled?: boolean;
  modules: AdminUiModuleConfig[];
  texts: Record<string, string>;
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
