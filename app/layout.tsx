/* Vinho maduro / Nua Borges */
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { MusicProvider } from '@/lib/music';
import { MusicPlayer } from '@/components/nua/site/MusicPlayer';
import { MotionPreferencesProvider } from '@/components/nua/site/MotionPreferencesProvider';
import { CopyProvider } from '@/lib/copy';
import { SITE_URL } from '@/lib/site';

const SITE_NAME = 'Nua Borges';

// ─── Fontes locais oficiais (Google Fonts / SIL OFL 1.1) — build determinístico offline ───
const playfair = localFont({
  src: [
    {
      path: './fonts/playfair-display-latin-normal.woff2',
      weight: '400 700',
      style: 'normal',
    },
    {
      path: './fonts/playfair-display-latin-italic.woff2',
      weight: '400 700',
      style: 'italic',
    },
  ],
  variable: '--font-serif',
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Times New Roman',
  fallback: ['Georgia', 'serif'],
});

const plusJakarta = localFont({
  src: './fonts/plus-jakarta-sans-latin-normal.woff2',
  weight: '300 700',
  style: 'normal',
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

const pinyonScript = localFont({
  src: './fonts/pinyon-script-latin-normal.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-script',
  display: 'swap',
  preload: false, // Fonte decorativa — não bloqueia renderização
  fallback: ['Playfair Display', 'cursive'],
});

// ─── Viewport ─────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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

  // Ícones oficiais da marca (PNG otimizados a partir do favicon oficial)
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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

  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${playfair.variable} ${plusJakarta.variable} ${pinyonScript.variable} scroll-smooth dark`}
    >
      <head>
        {/* Anti-flash: Se houver fotos/conteúdo customizado no localStorage, marca no HTML antes do primeiro paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem('nua_published_content_v1');if(r){document.documentElement.classList.add('has-custom-content');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-black text-zinc-100 antialiased selection:bg-[#661C30] selection:text-white">
        <CopyProvider>
          <MotionPreferencesProvider>
            <MusicProvider>
              {children}
              <MusicPlayer />
            </MusicProvider>
          </MotionPreferencesProvider>
        </CopyProvider>
      </body>
    </html>
  );
}
