import type { Metadata } from 'next';
import { PrelaunchFeedbackForm } from '@/components/nua/feedback/PrelaunchFeedbackForm';

export const metadata: Metadata = {
  title: 'Sua opinião — Nua Borges',
  description: 'Convite individual para compartilhar sua opinião sobre o site da Nua Borges.',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function AvaliacaoIndexPage() {
  return <PrelaunchFeedbackForm />;
}
