import type { Metadata } from 'next';
import { TermosClientView } from './TermosClientView';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description:
    'Termos de uso, condições gerais e diretrizes de preservação de propriedade intelectual da plataforma oficial de Nua Borges (Lei nº 9.610/98).',
  alternates: {
    canonical: 'https://nuaborges.phstatic.com.br/termos',
  },
  openGraph: {
    title: 'Termos de Uso | Nua Borges',
    description:
      'Regras de convivência, diretrizes de navegação e proteção legal da obra autoral e da imagem de Nua Borges.',
    url: 'https://nuaborges.phstatic.com.br/termos',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermosPage() {
  return <TermosClientView />;
}
