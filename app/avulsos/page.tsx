import { readPublicPageContent } from '@/lib/publishedSeoData';
import { publicPageMetadata } from '@/lib/pageSeo';
import { AvulsosClientView } from './AvulsosClientView';

export const metadata = publicPageMetadata('/avulsos');

export default function AvulsosPage() {
  return <AvulsosClientView initialContent={readPublicPageContent('avulsos', 'contact', 'vipClub')} />;
}
