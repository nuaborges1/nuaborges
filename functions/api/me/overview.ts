/**
 * Cloudflare Pages Function: GET /api/me/overview
 *
 * Resumo discreto para o Início da área privada Minha NUA (/minha-nua).
 */

import { requireCustomer } from '../id/_customerGuard';
import { NuaIdEnv } from '../id/_nuaIdStore';
import { loadCustomerBundle } from './_customerData';

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const PRIVATE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const auth = await requireCustomer(context.request, context.env);
  if (!auth.ok) return auth.response;

  const bundle = await loadCustomerBundle(context.env, auth.profile.id);

  const activeLibrary = bundle.library.filter((i) => i.status === 'active');
  const upcomingCalls = bundle.appointments.filter((a) =>
    ['confirmada', 'aguardando_pagamento', 'reagendamento_pendente'].includes(a.operationalStatus)
  );
  const activeCustom = bundle.personalizados.filter((p) =>
    ['aguardando_pagamento', 'em_producao', 'pronto'].includes(p.operationalStatus)
  );

  const notices: Array<{ id: string; tone: 'info' | 'warning'; text: string }> = [];
  const pendingOrders = bundle.orders.filter((o) => o.financialStatus === 'pending');
  if (pendingOrders.length > 0) {
    notices.push({
      id: 'pending-payment',
      tone: 'warning',
      text: `Você possui ${pendingOrders.length} pedido(s) aguardando confirmação financeira.`,
    });
  }
  const revokedItems = bundle.library.filter((i) => i.status === 'revoked');
  if (revokedItems.length > 0) {
    notices.push({
      id: 'revoked-content',
      tone: 'info',
      text: `${revokedItems.length} item(ns) tiveram o acesso encerrado após cancelamento ou estorno.`,
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      profile: {
        id: auth.profile.id,
        displayName: auth.profile.displayName,
        email: auth.profile.email,
      },
      summary: {
        availableContents: activeLibrary.slice(0, 4),
        upcomingAppointments: upcomingCalls.slice(0, 3),
        activePersonalizados: activeCustom.slice(0, 3),
        recentOrders: bundle.orders.slice(0, 5),
        notices,
        counts: {
          libraryActive: activeLibrary.length,
          appointmentsUpcoming: upcomingCalls.length,
          personalizadosActive: activeCustom.length,
          totalOrders: bundle.orders.length,
        },
      },
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};
