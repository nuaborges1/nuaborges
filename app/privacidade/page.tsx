import { publicPageMetadata } from '@/lib/pageSeo';
import { PrivacidadeClientView } from './PrivacidadeClientView';

export const metadata = publicPageMetadata('/privacidade');

export default function PrivacidadePage() {
  return <PrivacidadeClientView />;
}
