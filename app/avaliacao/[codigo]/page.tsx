import type { Metadata } from 'next';
import { PrelaunchFeedbackForm } from '@/components/nua/feedback/PrelaunchFeedbackForm';

export const metadata: Metadata = {
  title: 'Sua opinião — Nua Borges',
  description: 'Conte como foi sua experiência navegando pelo site da Nua Borges.',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export function generateStaticParams() {
  return [{ codigo: '_' }];
}

export default function AvaliacaoCodigoPage() {
  return <PrelaunchFeedbackForm />;
}
