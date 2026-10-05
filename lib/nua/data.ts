export interface SocialLink {
  id: string;
  name: string;
  url: string;
  iconName: 'onlyfans' | 'instagram' | 'contact';
  microDescription: string;
  description?: string;
  badge?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption?: string;
  imageUrl: string;
  linkUrl?: string;
  aspect?: string;
}

export interface HeroPhotoItem {
  id: string;
  imageUrl: string;
  title: string;
  session: string;
}

export const SITE_DATA = {
  creator: {
    name: 'Nua Borges',
    username: '@nuaborges',
    domain: 'nuaborges-er7.pages.dev',
    eyebrow: 'PLATAFORMA OFICIAL',
    role: 'Educadora Sexual & Sexóloga em Formação',
    tagline: 'Onde o corpo é arte e o prazer é livre de culpas.',
    concept: 'Corpo, relações e a coragem de ser livre.',
    heroDescription:
      'Um olhar íntimo, sofisticado e sem rodeios sobre o desejo, a autoimagem e a liberdade feminina.',
    aboutTitle: 'Sobre mim',
    aboutPullQuote: 'A vergonha é a primeira fronteira que nos impõem. Meu trabalho é ajudar a derrubá-la.',
    aboutParagraph1:
      'Meu trabalho nasce do encontro entre a ciência da sexologia e a expressão fotográfica autoral. Acredito na desmistificação do prazer como ferramenta de autoconhecimento e dignidade.',
    aboutParagraph2:
      'Aqui compartilho reflexões profundas sobre corpo, relações e intimidade com acolhimento, verdade e sem nenhum tabu.',
    aboutSignature: 'Deixa de vergonha ♡',
    linksNote: 'Canais Oficiais',
  },
  photos: {
    hero: '/images/nua/hero/hero-1.jpg',
    // 2 official hero photos
    heroPhotos: [
      {
        id: 'hero-1',
        title: 'Nua Borges',
        session: '01',
        imageUrl: '/images/nua/hero/hero-1.jpg',
      },
      {
        id: 'hero-2',
        title: 'Nua Borges',
        session: '02',
        imageUrl: '/images/nua/hero/hero-2.jpg',
      },
    ] as HeroPhotoItem[],
    about: '/images/nua/about/about.jpg',
    // 4 official gallery photos with curated artistic titles
    gallery: [
      {
        id: 'gal-1',
        title: 'Luz & Silhueta',
        caption: 'Estudo autoral sobre contorno e naturalidade',
        imageUrl: '/images/nua/gallery/gallery-1.png',
      },
      {
        id: 'gal-2',
        title: 'Sombras Íntimas',
        caption: 'Linhas do corpo sob a penumbra suave',
        imageUrl: '/images/nua/gallery/gallery-2.png',
      },
      {
        id: 'gal-3',
        title: 'Pele & Textura',
        caption: 'Composição minimalista e toque',
        imageUrl: '/images/nua/gallery/gallery-3.png',
      },
      {
        id: 'gal-4',
        title: 'Presença & Olhar',
        caption: 'Sensualidade desarmada e presença autêntica',
        imageUrl: '/images/nua/gallery/gallery-4.png',
      },
    ] as GalleryItem[],
  },
  socialLinks: [
    {
      id: 'onlyfans',
      name: 'OnlyFans',
      url: 'https://onlyfans.com/nuaborges',
      iconName: 'onlyfans',
      microDescription: 'Acervo Exclusivo',
      description: 'Acesso aos meus ensaios fotográficos completos e produções autorais sem censura.',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      url: 'https://www.instagram.com/nuaborges',
      iconName: 'instagram',
      microDescription: '@nuaborges',
      description: 'Diálogos diários sobre educação sexual, comportamento e rotina.',
    },
    {
      id: 'contact',
      name: 'Contato',
      url: '#contato',
      iconName: 'contact',
      microDescription: 'Parcerias & Imprensa',
      description: 'Canal direto para projetos comerciais, assessoria e colaborações.',
    },
  ] as SocialLink[],
};
