import { JsonLd } from '@/components/nua/site/JsonLd';
import { authorId, publicImage, publicPageMetadata, publicPages } from '@/lib/pageSeo';
import { readPublishedSeoContent, readPublicPageContent } from '@/lib/publishedSeoData';
import { SITE_URL } from '@/lib/site';
import { SobreClientView } from './SobreClientView';

export function generateMetadata() {
  return publicPageMetadata('/sobre', readPublishedSeoContent().about?.photoUrl);
}

export default function SobrePage() {
  const image = publicImage(readPublishedSeoContent().about?.photoUrl);
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url: new URL('/sobre', SITE_URL).href,
        mainEntity: {
          '@type': 'Person',
          '@id': authorId,
          name: 'Nua Borges',
          url: new URL('/sobre', SITE_URL).href,
          description: publicPages['/sobre'].description,
          image,
          sameAs: ['https://www.instagram.com/nuaborges'],
        },
      }} />
      <SobreClientView initialContent={readPublicPageContent('about', 'contact')} />
    </>
  );
}
