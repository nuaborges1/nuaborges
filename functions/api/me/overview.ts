/**
 * Cloudflare Pages Function: GET /api/me/overview
 *
 * Resumo discreto para o Início da área privada Minha NUA (/minha-nua),
 * incluindo alertas sincronizados em tempo real para Chamadas VIP no dia
 * e 1 hora antes do início.
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

function getSaoPauloDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export interface AccountNotice {
  id: string;
  tone: 'info' | 'warning' | 'highlight';
  text: string;
  actionLabel?: string;
  actionHref?: string;
  actionTab?: 'biblioteca' | 'chamadas' | 'personalizados' | 'conta';
  appointmentId?: string;
}

export const onRequestGet = async (context: PagesContext<NuaIdEnv>) => {
  const auth = await requireCustomer(context.request, context.env);
  if (!auth.ok) return auth.response;

  let bundle: Awaited<ReturnType<typeof loadCustomerBundle>>;
  try {
    bundle = await loadCustomerBundle(context.env, auth.profile.id, undefined, undefined, { strict: true });
  } catch {
    return Response.json(
      { success: false, error: 'Sua conta está temporariamente indisponível. Tente novamente em instantes.' },
      { status: 503, headers: PRIVATE_HEADERS }
    );
  }
  const now = new Date();
  const nowMs = now.getTime();
  const todayBrKey = getSaoPauloDateKey(now);

  const activeLibrary = bundle.library.filter((i) => i.status === 'active');
  const upcomingCalls = bundle.appointments.filter((a) => {
    if (['aguardando_pagamento', 'reagendamento_pendente'].includes(a.operationalStatus)) return true;
    if (a.operationalStatus !== 'confirmada') return false;
    if (!a.dateUtc) return true;
    const startMs = new Date(a.dateUtc).getTime();
    return !Number.isFinite(startMs) || startMs >= nowMs - 30 * 60 * 1000;
  });
  const activeCustom = bundle.personalizados.filter((p) =>
    ['aguardando_pagamento', 'em_producao'].includes(p.operationalStatus)
  );

  const url = new URL(context.request.url);
  const includeFull = url.searchParams.get('full') === '1' || url.searchParams.get('full') === 'true';

  const notices: AccountNotice[] = [];

  // 1. Lembretes em tempo real de Chamadas VIP confirmadas e pagas (nunca dispara para canceladas/não pagas)
  const confirmedPaidCalls = bundle.appointments
    .filter(
      (a) =>
        a.operationalStatus === 'confirmada' &&
        a.financialStatus === 'paid' &&
        Boolean(a.dateUtc)
    )
    .sort((a, b) => (a.dateUtc || '').localeCompare(b.dateUtc || ''));

  for (const call of confirmedPaidCalls) {
    const startMs = call.dateUtc ? new Date(call.dateUtc).getTime() : Number.NaN;
    if (!Number.isFinite(startMs)) continue;

    const diffMin = Math.round((startMs - nowMs) / 60000);
    const callBrKey = getSaoPauloDateKey(new Date(startMs));

    if (diffMin >= -15 && diffMin <= 60) {
      const timingText =
        diffMin <= 0
          ? 'sua Chamada VIP está acontecendo agora'
          : diffMin === 1
          ? 'sua Chamada VIP começa em 1 minuto'
          : `sua Chamada VIP começa em ${diffMin} minutos (${call.displayTimeBr} Brasília)`;
      notices.push({
        id: `call-starting-soon:${call.id}`,
        tone: 'highlight',
        text: `Lembrete: ${timingText} — ${call.modalityName}.`,
        actionLabel: call.callLink ? 'Entrar na sala privativa' : 'Ver detalhes da chamada',
        actionHref: call.callLink || undefined,
        actionTab: 'chamadas',
        appointmentId: call.id,
      });
    } else if (callBrKey === todayBrKey && diffMin > 60) {
      notices.push({
        id: `call-today:${call.id}`,
        tone: 'highlight',
        text: `Você tem uma Chamada VIP agendada para hoje às ${call.displayTimeBr} (Brasília) — ${call.modalityName}.`,
        actionLabel: 'Abrir Chamadas VIP',
        actionTab: 'chamadas',
        appointmentId: call.id,
      });
    }
  }

  // 2. Propostas de novo horário aguardando resposta do cliente
  const proposalCalls = bundle.appointments.filter((a) => Boolean(a.proposal));
  if (proposalCalls.length > 0) {
    notices.push({
      id: 'reschedule-proposal',
      tone: 'warning',
      text: `Você recebeu ${proposalCalls.length} proposta(s) de novo horário para sua Chamada VIP. Confira na aba Chamadas VIP.`,
      actionLabel: 'Ver proposta',
      actionTab: 'chamadas',
    });
  }

  // 3. Pedidos aguardando pagamento
  const pendingOrders = bundle.orders.filter((o) => o.financialStatus === 'pending');
  if (pendingOrders.length > 0) {
    notices.push({
      id: 'pending-payment',
      tone: 'warning',
      text:
        pendingOrders.length === 1
          ? 'Você possui 1 pedido aguardando pagamento.'
          : `Você possui ${pendingOrders.length} pedidos aguardando pagamento.`,
      actionLabel: 'Continuar pagamento',
      actionTab: 'conta',
    });
  }

  // 4. Itens revogados por cancelamento/estorno
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
      ...(includeFull
        ? {
            library: bundle.library,
            appointments: bundle.appointments,
            personalizados: bundle.personalizados,
            orders: bundle.orders,
          }
        : {}),
      summary: {
        availableContents: activeLibrary.slice(0, 4),
        upcomingAppointments: upcomingCalls.slice(0, 3),
        activePersonalizados: activeCustom.slice(0, 3),
        recentOrders: bundle.orders.slice(0, 5),
        notices,
        counts: {
          libraryActive: activeLibrary.length,
          appointmentsUpcoming: upcomingCalls.length,
          appointmentsTotal: bundle.appointments.length,
          personalizadosActive: activeCustom.length,
          personalizadosDelivered: bundle.personalizados.filter((p) =>
            ['pronto', 'entregue'].includes(p.operationalStatus)
          ).length,
          personalizadosTotal: bundle.personalizados.length,
          totalOrders: bundle.orders.length,
        },
      },
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};
