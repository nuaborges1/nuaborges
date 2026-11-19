import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { NotFoundClient } from '@/components/nua/site/NotFoundClient';

export const metadata: Metadata = {
  title: 'Página não encontrada — Nua Borges',
  description: 'A página que você procura não existe ou foi movida.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <Suspense fallback={null}>
      <NotFoundClient />
    </Suspense>
  );
}
