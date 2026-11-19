/**
 * Cloudflare Pages Function: GET/POST /api/me/appointments
 *
 * - GET: lista Chamadas VIP da conta autenticada (horários exibidos em America/Sao_Paulo)
 * - POST: solicita cancelamento ou reagendamento de uma chamada pertencente ao próprio cliente
 *   (proteção IDOR estrita + auditoria + respeito às políticas do módulo)
 */

import { getAppointmentByIdFromSupabase, saveAppointmentToSupabase } from '../_supabaseStore';
import { hashClientIp } from '../id/_crypto';
import { getClientIp, getIdSecret, requireCustomer } from '../id/_customerGuard';
import { getOrderClaim, NuaIdEnv, recordCustomerAuditEvent } from '../id/_nuaIdStore';
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
  return new Response(
    JSON.stringify({ success: true, appointments: bundle.appointments }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};

export const onRequestPost = async (context: PagesContext<NuaIdEnv>) => {
  const { request, env } = context;
  const auth = await requireCustomer(request, env);
  if (!auth.ok) return auth.response;

  const body: any = await request.json().catch(() => ({}));
  const appointmentId = String(body?.appointmentId || '').trim();
  const action = String(body?.action || '').trim();
  const reason = String(body?.reason || '').replace(/[<>]/g, '').trim().slice(0, 300);

  if (!appointmentId || !['request_cancel', 'request_reschedule'].includes(action)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Informe appointmentId e uma ação válida.' }),
      { status: 400, headers: PRIVATE_HEADERS }
    );
  }

  // Proteção IDOR: verifica titularidade explícita pelo claim do perfil autenticado
  const claim = await getOrderClaim(env, appointmentId);
  if (!claim || claim.profileId !== auth.profile.id) {
    return new Response(
      JSON.stringify({ success: false, error: 'Agendamento não encontrado para esta conta.' }),
      { status: 404, headers: PRIVATE_HEADERS }
    );
  }

  const booking =
    env.__CUSTOMER_DATA_FIXTURES__?.appointments?.[appointmentId] ||
    (await getAppointmentByIdFromSupabase(env, appointmentId));

  if (!booking) {
    return new Response(
      JSON.stringify({ success: false, error: 'Agendamento não encontrado.' }),
      { status: 404, headers: PRIVATE_HEADERS }
    );
  }

  const nowIso = new Date().toISOString();
  if (action === 'request_reschedule') {
    if (booking.status !== 'confirmada') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Apenas chamadas confirmadas podem solicitar reagendamento.',
        }),
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }
    booking.status = 'reagendamento_pendente';
    booking.updatedAt = nowIso;
    booking.history = [
      ...(booking.history || []),
      {
        at: nowIso,
        action: 'solicitacao_reagendamento',
        note: reason || 'Cliente solicitou reagendamento via Minha NUA.',
        author: 'client',
      },
    ];
  } else {
    if (!['confirmada', 'aguardando_pagamento'].includes(booking.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Este agendamento não pode mais ser cancelado por aqui.',
        }),
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }
    const wasPaid = booking.payment?.status === 'approved' || booking.status === 'confirmada';
    booking.status = wasPaid ? 'reembolso_pendente' : 'cancelada';
    booking.cancellationReason = reason || 'Cancelado pelo cliente via Minha NUA';
    booking.updatedAt = nowIso;
    if (booking.meeting) booking.meeting.visibleToClient = false;
    booking.history = [
      ...(booking.history || []),
      {
        at: nowIso,
        action: wasPaid ? 'cancelamento_com_reembolso_solicitado' : 'cancelamento_cliente',
        note: booking.cancellationReason,
        author: 'client',
      },
    ];
  }

  if (!env.__CUSTOMER_DATA_FIXTURES__) {
    await saveAppointmentToSupabase(env, booking);
  }

  const secret = getIdSecret(env) || 'nua-id';
  await recordCustomerAuditEvent(env, {
    profileId: auth.profile.id,
    action: `appointment_${action}`,
    actorIpHash: await hashClientIp(getClientIp(request), secret),
    details: { appointmentId, newStatus: booking.status },
  });

  return new Response(
    JSON.stringify({
      success: true,
      appointmentId,
      status: booking.status,
      message:
        action === 'request_reschedule'
          ? 'Solicitação de reagendamento registrada.'
          : booking.status === 'reembolso_pendente'
            ? 'Cancelamento registrado. O reembolso será processado conforme a política da chamada.'
            : 'Reserva cancelada com sucesso.',
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};
