import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { PersonalizadosClientView } from './PersonalizadosClientView';

export const metadata: Metadata = {
  title: 'Ateliê Sob Medida | Nua Borges',
  description:
    'Encomende produções exclusivas e personalizadas de fotos e vídeos sob medida com Nua Borges. Discrição absoluta, entrega privativa e pagamento via Pix.',
  alternates: {
    canonical: `${SITE_URL}/personalizados`,
  },
  openGraph: {
    title: 'Ateliê Sob Medida | Nua Borges',
    description:
      'Produções fotográficas e vídeos personalizados sob encomenda direta com Nua Borges.',
    url: `${SITE_URL}/personalizados`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PersonalizadosPage() {
  return <PersonalizadosClientView />;
}
