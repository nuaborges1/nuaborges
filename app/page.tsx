import { JsonLd } from '@/components/nua/site/JsonLd';
import { authorId, homeUrl, pageMetadata, publicPages } from '@/lib/pageSeo';
import { readPublishedSeoContent, readPublicPageContent } from '@/lib/publishedSeoData';
import { HomeClientView } from './HomeClientView';

export function generateMetadata() {
  const content = readPublishedSeoContent();
  const { title, description } = publicPages['/'];
  return pageMetadata('/', content.seo?.title?.trim() || title, content.seo?.description?.trim() || description, content.seo?.ogImage);
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': homeUrl + '#website',
            name: 'Nua Borges',
            url: homeUrl,
            inLanguage: 'pt-BR',
            publisher: { '@id': authorId },
          },
          {
            '@type': 'Person',
            '@id': authorId,
            name: 'Nua Borges',
            url: new URL('/sobre', homeUrl).href,
            sameAs: ['https://www.instagram.com/nuaborges'],
          },
        ],
      }} />
      <HomeClientView initialContent={readPublicPageContent('hero', 'about', 'gallery', 'avulsos', 'faqs', 'contact', 'vipClub')} />
    </>
  );
}
