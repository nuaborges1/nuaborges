import type { Metadata } from 'next';
import { PrivacidadeClientView } from './PrivacidadeClientView';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Diretrizes de privacidade, discrição e proteção de dados da plataforma oficial de Nua Borges, em conformidade com a LGPD (Lei nº 13.709/2018).',
  alternates: {
    canonical: 'https://nuaborges.phstatic.com.br/privacidade',
  },
  openGraph: {
    title: 'Política de Privacidade | Nua Borges',
    description:
      'Transparência, discrição e respeito absoluto à proteção dos seus dados pessoais.',
    url: 'https://nuaborges.phstatic.com.br/privacidade',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacidadePage() {
  return <PrivacidadeClientView />;
}
