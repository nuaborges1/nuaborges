import { readPublicPageContent } from '@/lib/publishedSeoData';
import { publicPageMetadata } from '@/lib/pageSeo';
import { PersonalizadosClientView } from './PersonalizadosClientView';

export const metadata = publicPageMetadata('/personalizados');

export default function PersonalizadosPage() {
  return <PersonalizadosClientView initialContent={readPublicPageContent('personalizados', 'contact')} />;
}
