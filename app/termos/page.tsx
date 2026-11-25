import { publicPageMetadata } from '@/lib/pageSeo';
import { TermosClientView } from './TermosClientView';

export const metadata = publicPageMetadata('/termos');

export default function TermosPage() {
  return <TermosClientView />;
}
