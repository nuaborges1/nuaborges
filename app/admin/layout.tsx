import type { Metadata } from 'next';
import { HelpModalProvider } from '@/components/nua/admin/help';

/**
 * Layout do painel administrativo.
 * Define noindex/nofollow para garantir que o admin NUNCA apareça
 * em resultados de busca, independente de qualquer configuração externa.
 */
export const metadata: Metadata = {
  title: 'Admin',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HelpModalProvider>{children}</HelpModalProvider>;
}
