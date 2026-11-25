import type { Metadata } from 'next';
import { ContaRedirect } from '@/components/nua/account/ContaRedirect';

export const metadata: Metadata = {
  title: 'Minha Conta',
  description: 'Redirecionando para sua Área Privativa Nua Borges.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MinhaNuaPage() {
  return <ContaRedirect />;
}
