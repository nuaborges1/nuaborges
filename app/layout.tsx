import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans, Pinyon_Script } from 'next/font/google';
import './globals.css';
import { MusicProvider } from '@/lib/music';
import { MusicPlayer } from '@/components/MusicPlayer';

const SITE_NAME = 'Nua Borges';
const SITE_URL = 'https://nuaborges.phstatic.com.br';
const DEFAULT_OG_IMAGE = '/images/nua/hero/hero-1.jpg';

// ─── Fontes — apenas pesos realmente usados ────────────────────────────────
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  preload: true,
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600'],
  preload: true,
});

const pinyonScript = Pinyon_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-script',
  display: 'swap',
  preload: false, // Fonte decorativa — não bloqueia renderização
});

// ─── Viewport ─────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

// ─── Metadata Base ─────────────────────────────────────────────────────────
// Títulos e descriptions específicos por página são gerados via lib/seo.ts
// e aplicados nas generateMetadata() de cada route.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // Título padrão (sobrescrito por cada página via template)
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },

  description:
    'Educadora sexual e sexóloga em formação. Corpo, relações e liberdade. Deixa de vergonha.',

  // Canonical e alternates
  alternates: {
    canonical: SITE_URL,
  },

  // Open Graph base
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'pt_BR',
    url: SITE_URL,
    title: SITE_NAME,
    description:
      'Educadora sexual e sexóloga em formação. Corpo, relações e liberdade. Deixa de vergonha.',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Fotografia autoral`,
      },
    ],
  },

  // Twitter/X Card
  twitter: {
    card: 'summary_large_image',
    site: '@nuaborges',
    creator: '@nuaborges',
    title: SITE_NAME,
    description:
      'Educadora sexual e sexóloga em formação. Corpo, relações e liberdade. Deixa de vergonha.',
    images: [DEFAULT_OG_IMAGE],
  },

  // Ícones
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },

  // Robots padrão (o /admin sobrescreve com noindex)
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Verificação Google Search Console (adicionar ID quando disponível)
  // verification: { google: 'SEU_CODIGO_AQUI' },

  // App manifest info
  applicationName: SITE_NAME,
  generator: 'Next.js',
  referrer: 'strict-origin-when-cross-origin',
  category: 'entertainment',
  keywords: [
    'Nua Borges',
    'nuaborges',
    'educadora sexual',
    'sexologia',
    'ensaio fotográfico',
    'OnlyFans',
    'conteúdo exclusivo',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
};

// ─── JSON-LD Schemas (inline para evitar problemas de bundling SSG) ──────────
const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  name: `Perfil de ${SITE_NAME}`,
  url: SITE_URL,
  mainEntity: {
    '@type': 'Person',
    name: SITE_NAME,
    alternateName: '@nuaborges',
    url: SITE_URL,
    description:
      'Educadora sexual e sexóloga em formação. Corpo, relações e liberdade. Deixa de vergonha.',
    image: {
      '@type': 'ImageObject',
      url: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
      name: `Foto de ${SITE_NAME}`,
    },
    sameAs: [
      'https://www.instagram.com/nuaborges',
      'https://onlyfans.com/nuaborges',
    ],
  },
};

const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'pt-BR',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${plusJakarta.variable} ${pinyonScript.variable} scroll-smooth dark`}
    >
      <head>
        {/* Preconnect para CDN de mídia */}
        <link rel="preconnect" href="https://cdn.nuaborges.phstatic.com.br" />
        <link rel="dns-prefetch" href="https://cdn.nuaborges.phstatic.com.br" />

        {/* JSON-LD: ProfilePage + Person */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />

        {/* Anti-flash: Se houver fotos/conteúdo customizado no localStorage, marca no HTML antes do primeiro paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem('nua_published_content_v1');if(r){document.documentElement.classList.add('has-custom-content');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-black text-zinc-100 antialiased selection:bg-[#f4a7b9] selection:text-black">
        <MusicProvider>
          {children}
          <MusicPlayer />
        </MusicProvider>
      </body>
    </html>
  );
}
