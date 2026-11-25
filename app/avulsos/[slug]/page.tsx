import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/nua/site/JsonLd';
import { homeUrl, pageMetadata, privateRobots } from '@/lib/pageSeo';
import { catalogFallbackSlug } from '@/lib/publicCatalog';
import { readPublishedPacks } from '@/lib/publishedSeoData';
import { AvulsoProductView } from './AvulsoProductView';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [...readPublishedPacks().map(pack => pack.slug), catalogFallbackSlug].map(slug => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pack = readPublishedPacks().find(item => item.slug === slug);
  if (!pack) return { title: 'Conteúdo sob demanda', robots: privateRobots };
  const description = pack.description?.trim() || `Conheça ${pack.title}, uma produção autoral de Nua Borges.`;
  return pageMetadata(`/avulsos/${pack.slug}`, pack.title, description, pack.imageUrl);
}

export default async function AvulsoPage({ params }: PageProps) {
  const { slug } = await params;
  const pack = readPublishedPacks().find(item => item.slug === slug);
  if (!pack && slug !== catalogFallbackSlug) notFound();

  return (
    <>
      {pack && <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Início', item: homeUrl },
              { '@type': 'ListItem', position: 2, name: 'Ensaios e conteúdos avulsos', item: new URL('/avulsos', homeUrl).href },
              { '@type': 'ListItem', position: 3, name: pack.title, item: new URL(`/avulsos/${pack.slug}`, homeUrl).href },
            ],
          },
          {
            '@type': 'Product',
            name: pack.title,
            description: pack.description?.trim() || `Conheça ${pack.title}, uma produção autoral de Nua Borges.`,
            url: new URL(`/avulsos/${pack.slug}`, homeUrl).href,
            ...(pack.imageUrl ? { image: pack.imageUrl } : {}),
            brand: { '@type': 'Brand', name: 'Nua Borges' },
          },
        ],
      }} />}
      <AvulsoProductView initialProduct={pack || null} slug={slug} />
    </>
  );
}
