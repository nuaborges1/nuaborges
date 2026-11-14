import type { Metadata } from 'next';
import { AcervoClientView } from './AcervoClientView';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Acervo Exclusivo | Nua Borges',
  description:
    'Acesso oficial ao acervo autoral exclusivo de Nua Borges. Assinaturas via Privacy (PIX e cartões nacionais) e OnlyFans.',
  alternates: {
    canonical: `${SITE_URL}/acervo`,
  },
  openGraph: {
    title: 'Acervo Exclusivo | Nua Borges',
    description:
      'Acesso oficial ao acervo autoral exclusivo de Nua Borges. Produções fotográficas e vídeos sem censura com discrição absoluta.',
    url: `${SITE_URL}/acervo`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AcervoPage() {
  return <AcervoClientView />;
}
