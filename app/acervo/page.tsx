import { readPublicPageContent } from '@/lib/publishedSeoData';
import { publicPageMetadata } from '@/lib/pageSeo';
import { AcervoClientView } from './AcervoClientView';

export const metadata = publicPageMetadata('/acervo');

export default function AcervoPage() {
  return <AcervoClientView initialContent={readPublicPageContent('contact', 'vipClub')} />;
}
