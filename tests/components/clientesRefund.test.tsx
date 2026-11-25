import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClientesModule } from '@/components/nua/admin/ClientesModule';
import { HelpModalProvider } from '@/components/nua/admin/help/HelpModalContext';

afterEach(() => vi.unstubAllGlobals());

it('abre a confirmação de estorno pela ficha do cliente sem executar o estorno', async () => {
  const customer = {
    id: 'guest:test',
    accountType: 'guest',
    displayName: 'Cliente teste',
    email: 'teste@example.com',
    status: 'guest',
    counts: { orders: 1, paidOrders: 1, libraryActive: 0, appointments: 0, personalizados: 0 },
    totalSpent: 1,
  };
  const requests = vi.fn(async (input: string, options?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    if (url.pathname === '/api/admin/refund') {
      expect(options?.method).toBe('GET');
      return Response.json({ success: false, error: 'Consulta de teste' }, { status: 503 });
    }
    if (!url.searchParams.has('id')) return Response.json({ success: true, customers: [customer] });
    return Response.json({
      success: true,
      customer,
      orders: [{ id: 'ord_test', kind: 'pack', title: 'Conteúdo teste', amount: 1, financialStatus: 'paid' }],
      appointments: [],
      personalizados: [],
      library: [],
      auditEvents: [],
    });
  });
  vi.stubGlobal('fetch', requests);

  render(<HelpModalProvider><ClientesModule /></HelpModalProvider>);
  fireEvent.click(await screen.findByRole('button', { name: /Cliente teste/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Estornar pagamento' }));

  expect(await screen.findByRole('dialog', { name: 'Estornar pagamento' })).toBeInTheDocument();
  expect(await screen.findByText('Consulta de teste')).toBeInTheDocument();
  const refundRequests = requests.mock.calls.filter(([url]) => url.includes('/api/admin/refund'));
  expect(refundRequests).toHaveLength(1);
  expect(refundRequests[0][1]?.method).toBe('GET');
});
