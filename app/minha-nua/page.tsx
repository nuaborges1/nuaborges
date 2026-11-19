import type { Metadata } from 'next';
import { MinhaNuaShell } from '@/components/nua/account/MinhaNuaShell';

export const metadata: Metadata = {
  title: 'Minha Conta',
  description: 'Área privativa de clientes Nua Borges — conteúdos, chamadas VIP, personalizados e compras.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MinhaNuaPage() {
  return <MinhaNuaShell />;
}
