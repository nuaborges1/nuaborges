import { readPublicPageContent } from '@/lib/publishedSeoData';
import { publicPageMetadata } from '@/lib/pageSeo';
import { ChamadasClientView } from './ChamadasClientView';

export const metadata = publicPageMetadata('/chamadas');

export default function ChamadasPage() {
  return <ChamadasClientView initialContent={readPublicPageContent('contact')} />;
}
