import fs from 'fs';
import path from 'path';
import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';

import { AvulsoProductItem } from '@/lib/types';

function getPublishedAvulsos(): AvulsoProductItem[] {
  try {
    const file = path.join(process.cwd(), 'data', 'published_content.json');
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(parsed?.avulsos?.items)) {
        return parsed.avulsos.items;
      }
    }
  } catch {}
  return [];
}

export function generateStaticParams() {
  const items = getPublishedAvulsos();
  const slugs = new Set<string>();

  items.forEach((item) => {
    if (item.slug) slugs.add(item.slug);
    if (item.id) {
      slugs.add(item.id);
      const cleanId = item.id.replace(/^avulso-/, '');
      if (cleanId) slugs.add(cleanId);
    }
  });

  // Garante que o template estático 'sessao-tantrica' exista como casca/fallback para o _middleware Cloudflare
  slugs.add('sessao-tantrica');

  return Array.from(slugs).map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

function findProduct(items: AvulsoProductItem[], slug: string): AvulsoProductItem | undefined {
  const clean = decodeURIComponent(slug).trim().toLowerCase();
  return items.find((item) => {
    const itemSlug = (item.slug || '').trim().toLowerCase();
    const itemId = (item.id || '').trim().toLowerCase();
    const cleanId = itemId.replace(/^avulso-/, '');
    return clean === itemSlug || clean === itemId || clean === cleanId;
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const items = getPublishedAvulsos();
  const product = findProduct(items, slug);

  return {
    title: product ? `Assistir: ${product.title}` : 'Sala VIP',
    robots: 'noindex, nofollow',
  };
}

export default function AssistirPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-20">
      <h1 className="font-serif text-3xl">Acesso ao Cofre</h1>
      <p className="mt-4 text-zinc-300">Use o botão no e-mail da compra ou entre em Minha Conta com o e-mail utilizado no pedido.</p>
      <Link href="/conta?tab=biblioteca" className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-[#661C30] px-5 text-sm font-semibold text-white hover:bg-[#7A293D]">
        Recuperar minhas compras
      </Link>
    </main>
  );
}
