import type { Metadata } from 'next';
import { TermosClientView } from './TermosClientView';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description:
    'Termos de uso, condições gerais e diretrizes de preservação de propriedade intelectual da plataforma oficial de Nua Borges (Lei nº 9.610/98).',
  alternates: {
    canonical: `${SITE_URL}/termos`,
  },
  openGraph: {
    title: 'Termos de Uso | Nua Borges',
    description:
      'Regras de convivência, diretrizes de navegação e proteção legal da obra autoral e da imagem de Nua Borges.',
    url: `${SITE_URL}/termos`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermosPage() {
  return <TermosClientView />;
}
