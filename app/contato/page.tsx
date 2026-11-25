import { readPublicPageContent } from '@/lib/publishedSeoData';
import { publicPageMetadata } from '@/lib/pageSeo';
import { ContatoClientView } from './ContatoClientView';

export const metadata = publicPageMetadata('/contato');

export default function ContatoPage() {
  return <ContatoClientView initialContent={readPublicPageContent('contact')} />;
}
