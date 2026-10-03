import type { Metadata } from 'next';
import { PrivacidadeClientView } from './PrivacidadeClientView';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Diretrizes de privacidade, discrição e proteção de dados da plataforma oficial de Nua Borges, em conformidade com a LGPD (Lei nº 13.709/2018).',
  alternates: {
    canonical: `${SITE_URL}/privacidade`,
  },
  openGraph: {
    title: 'Política de Privacidade | Nua Borges',
    description:
      'Transparência, discrição e respeito absoluto à proteção dos seus dados pessoais.',
    url: `${SITE_URL}/privacidade`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacidadePage() {
  return <PrivacidadeClientView />;
}
