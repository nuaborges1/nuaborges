import type { Metadata } from 'next';
import { AvulsosClientView } from './AvulsosClientView';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Conteúdos Avulsos | Nua Borges',
  description:
    'Adquira ensaios e produções fotográficas exclusivas de Nua Borges sob demanda. Pagamento único via PIX, sem assinatura mensal.',
  alternates: {
    canonical: `${SITE_URL}/avulsos`,
  },
  openGraph: {
    title: 'Conteúdos Avulsos | Nua Borges',
    description:
      'Catálogo de ensaios e vídeos exclusivos de Nua Borges sob demanda. Pagamento único e acesso vitalício.',
    url: `${SITE_URL}/avulsos`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AvulsosPage() {
  return <AvulsosClientView />;
}
