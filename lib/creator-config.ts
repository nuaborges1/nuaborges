/**
 * ==============================================================================
 * CENTRAL CREATOR CONFIGURATION — NUA (@nuaborges)
 * ==============================================================================
 * Este arquivo é a fonte única de verdade para todos os dados, textos,
 * links sociais e fotografias do site oficial da criadora Nua.
 * 
 * ESTRUTURA PARA FOTOS REAIS DA CLIENTE:
 * Para substituir as fotos do protótipo pelas imagens oficiais da criadora:
 * 1. Coloque os arquivos WebP ou JPEG em:
 *    - /public/assets/images/hero/    -> hero-01.webp, hero-02.webp, etc.
 *    - /public/assets/images/gallery/ -> gallery-01.webp, gallery-02.webp, etc.
 *    - /public/assets/images/profile/ -> about.webp, avatar.webp
 * 2. Atualize os caminhos nas propriedades `heroSlides` e `galleryItems` abaixo.
 * ==============================================================================
 */

export interface HeroSlide {
  id: string;
  imageUrl: string;
  title: string;
  session: string;
  alt: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  tag?: string;
  alt: string;
}

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  iconName: 'onlyfans' | 'instagram' | 'x' | 'tiktok' | 'contact';
  microDescription: string;
  description?: string;
  badge?: string;
}

export const CREATOR_CONFIG = {
  // 1. Identidade e Domínio
  name: 'Nua Borges',
  username: '@nuaborges',
  displayName: 'Nua Borges ♡',
  domain: 'nuaborges.com.br',
  siteUrl: 'https://nuaborges.com.br',
  email: 'contato@nuaborges.com.br',

  // 2. SEO & Metatags
  seo: {
    title: 'Nua Borges — Conteúdo, redes e espaço exclusivo',
    description:
      'Espaço oficial da criadora Nua Borges (@nuaborges). Acesse conteúdos exclusivos no OnlyFans, ensaios fotográficos editoriais, redes sociais e contato profissional.',
    keywords: [
      'Nua',
      'Nua Borges',
      'nuaborges',
      'conteúdo exclusivo',
      'OnlyFans Nua',
      'editorial',
      'ensaio fotográfico',
    ],
  },

  // 3. Textos do Site
  tagline: 'Seu espaço. Seu conteúdo. Seu universo.',
  eyebrow: 'BEM-VINDA AO MEU MUNDO',
  heroDescription:
    'Aqui você encontra tudo sobre mim, meus conteúdos e todas as minhas plataformas, em um só lugar.',
  aboutTitle: 'Sobre mim',
  aboutParagraph:
    'Gosto de ser livre, de viver o que me faz bem e de conectar com pessoas que apreciam o meu mundo. Aqui você encontra muito mais do que fotos... É sobre experiência, intimidade e autenticidade.',
  aboutSignature: 'Obrigada por estar aqui ♡',
  linksNote: 'Tudo em um só lugar ♡',

  // 4. Links Oficiais Reais
  links: {
    onlyfans: 'https://onlyfans.com/nuaborges',
    instagram: 'https://www.instagram.com/nuaborges',
    x: 'https://x.com/nuaborges',
    tiktok: 'https://tiktok.com/@nuaborges',
    email: 'mailto:contato@nuaborges.com.br',
  },

  // 5. Configurações de Features
  features: {
    // Portão de idade 18+ (discreto, ativável caso a cliente solicite)
    AGE_GATE_ENABLED: false,
    // ID do Google Analytics (inserir quando a cliente fornecer o ID real, ex: 'G-XXXXXXXXXX')
    GA_MEASUREMENT_ID: '',
  },

  // 6. Slides da Hero (Organizados por sessões editoriais da criadora)
  heroSlides: [
    {
      id: 'hero-1',
      session: 'ENSAIO I',
      title: 'Editorial Noir',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
      alt: 'Nua — Retrato editorial de estúdio em preto e sombras dramáticas',
    },
    {
      id: 'hero-2',
      session: 'RETRATO',
      title: 'Luz & Intimidade',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85',
      alt: 'Nua — Retrato com iluminação cinematográfica e olhar marcante',
    },
    {
      id: 'hero-3',
      session: 'LIFESTYLE',
      title: 'Nocturne Glance',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85',
      alt: 'Nua — Sessão lifestyle intimista com iluminação suave',
    },
    {
      id: 'hero-4',
      session: 'BASTIDORES',
      title: 'Sensual Chiaroscuro',
      imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=85',
      alt: 'Nua — Bastidores de ensaio boudoir com contrastes refinados',
    },
    {
      id: 'hero-5',
      session: 'SENSUAL',
      title: 'Penumbra & Poesia',
      imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=85',
      alt: 'Nua — Silhueta artística com luz de fundo magenta suave',
    },
    {
      id: 'hero-6',
      session: 'ARTÍSTICA',
      title: 'Olhar & Alma',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=85',
      alt: 'Nua — Fotografia artística em close-up com iluminação de cinema',
    },
  ] as HeroSlide[],

  // 7. Fotografia da seção "Sobre Mim"
  aboutPhoto: {
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1400&q=85',
    alt: 'Nua — Fotografia em preto e branco para a seção Sobre Mim',
  },

  // 8. Itens da Galeria Editorial
  galleryItems: [
    {
      id: 'gal-1',
      title: 'Ensaio Intimista I',
      caption: 'Luz natural suave e atmosfera noturna.',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=85',
      tag: 'Editorial',
      alt: 'Fotografia editorial intimista por Nua com iluminação quente',
    },
    {
      id: 'gal-2',
      title: 'Luzes & Sombras',
      caption: 'Silhueta e contrastes dramáticos em luz magenta.',
      imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=85',
      tag: 'Silhueta',
      alt: 'Silhueta elegante com iluminação artística em tons de magenta',
    },
    {
      id: 'gal-3',
      title: 'Olhar & Expressão',
      caption: 'Retrato em close com iluminação de cinema.',
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=85',
      tag: 'Retrato',
      alt: 'Retrato facial em close com iluminação profissional de cinema',
    },
    {
      id: 'gal-4',
      title: 'Noite & Sensualidade',
      caption: 'Ambiente aconchegante e estética boudoir refinada.',
      imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=85',
      tag: 'Boudoir',
      alt: 'Ensaio boudoir noturno com iluminação acolhedora',
    },
    {
      id: 'gal-5',
      title: 'Penumbra & Traços',
      caption: 'Detalhes delicados capturados em preto e branco.',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85',
      tag: 'Noir',
      alt: 'Fotografia em preto e branco de alta costura e penumbra',
    },
    {
      id: 'gal-6',
      title: 'Reflexos Dourados',
      caption: 'Sessão intimista ao pôr do sol em luz âmbar.',
      imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=85',
      tag: 'Warmth',
      alt: 'Sessão com luz dourada ao entardecer e atmosfera acolhedora',
    },
    {
      id: 'gal-7',
      title: 'Sombra e Seda',
      caption: 'Composição minimalista focada em texturas e elegância.',
      imageUrl: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=85',
      tag: 'Editorial',
      alt: 'Composição editorial sofisticada com tecidos e contrastes',
    },
    {
      id: 'gal-8',
      title: 'Madrugada Serena',
      caption: 'Espontaneidade e pureza em iluminação intimista.',
      imageUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=85',
      tag: 'Intimidade',
      alt: 'Retrato espontâneo e intimista com iluminação cinematográfica',
    },
  ] as GalleryItem[],

  // 9. Benefícios e Diferenciais do Conteúdo Exclusivo
  exclusiveBenefits: [
    'Acesso a ensaios fotográficos completos em alta resolução (4K)',
    'Vídeos exclusivos de bastidores, ensaios e momentos íntimos',
    'Chat privado direto comigo para conversas exclusivas',
    'Atualizações semanais de conteúdo novo e inédito',
    'Sem anúncios e com privacidade total garantida',
  ],
};

// Mapeamento centralizado dos 5 Cards da seção "Meus Links"
export const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'onlyfans',
    name: 'OnlyFans',
    url: CREATOR_CONFIG.links.onlyfans,
    iconName: 'onlyfans',
    microDescription: 'Conteúdo exclusivo',
    description: 'Ensaios fotográficos exclusivos, vídeos semanais e chat direto.',
    badge: 'VIP',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: CREATOR_CONFIG.links.instagram,
    iconName: 'instagram',
    microDescription: 'Meu dia a dia',
    description: 'Stories do dia a dia, ensaios e novidades.',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    url: CREATOR_CONFIG.links.x,
    iconName: 'x',
    microDescription: 'Novidades & pensamentos',
    description: 'Pensamentos, teasers e interação em tempo real.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    url: CREATOR_CONFIG.links.tiktok,
    iconName: 'tiktok',
    microDescription: 'Vídeos curtos',
    description: 'Vídeos curtos, trends e bastidores descontraídos.',
  },
  {
    id: 'contact',
    name: 'Contato',
    url: '#contato',
    iconName: 'contact',
    microDescription: 'Parcerias & imprensa',
    description: 'Parcerias comerciais, imprensa e suporte.',
  },
];
