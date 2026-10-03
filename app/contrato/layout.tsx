import type { Metadata } from 'next';

/**
 * Layout da página restrita de contrato.
 * Define noindex/nofollow para garantir que o contrato NUNCA apareça
 * em mecanismos de busca (Google, Bing, etc.), preservando o sigilo contratual.
 */
export const metadata: Metadata = {
  title: 'Documento Contratual & Escopo Oficial | Nua Borges',
  description: 'Acesso restrito e confidencial para visualização e aprovação da minuta contratual e memorial descritivo.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function ContratoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
