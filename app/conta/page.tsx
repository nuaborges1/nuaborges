import type { Metadata } from 'next';
import { MinhaNuaShell } from '@/components/nua/account/MinhaNuaShell';

export const metadata: Metadata = {
  title: 'Seu Acervo · Acesso Privado',
  description: 'Espaço privado de clientes Nua Borges — seu acervo, personalizados, chamadas VIP e pedidos.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ContaPage() {
  return <MinhaNuaShell />;
}
