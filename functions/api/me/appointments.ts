/**
 * Cloudflare Pages Function: GET/POST /api/me/appointments
 *
 * - GET: lista Chamadas VIP da conta autenticada (horários exibidos em America/Sao_Paulo)
 * - POST: solicita cancelamento ou reagendamento de uma chamada pertencente ao próprio cliente
 *   (proteção IDOR estrita + auditoria + respeito às políticas do módulo)
 */

import {
  addMinutesToTime,
  AppointmentModality,
  computeAvailableSlotsForDate,
  formatDateForDisplay,
} from '../../../lib/appointmentsCanonical';
import {
  expirePendingAppointmentsFromSupabase,
  getAppointmentByIdFromSupabase,
  getAppointmentsSettingsFromSupabase,
  listAppointmentsForScheduleDateFromSupabase,
  rescheduleAppointmentAtomically,
  saveAppointmentToSupabase,
} from '../_supabaseStore';
import { hashClientIp } from '../id/_crypto';
import { getClientIp, getIdSecret, requireCustomer } from '../id/_customerGuard';
import { dispatchTransactionalEmail } from '../id/_emailDispatch';
import { renderTransactionalNotificationHtml } from '../id/_emailTemplates';
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

  if (
    !appointmentId ||
    !['request_cancel', 'request_reschedule', 'accept_proposal', 'decline_proposal'].includes(action)
  ) {
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
  let responseMsg = 'Solicitação registrada.';
  let shouldUseAtomicReschedule = false;
  let rescheduleBufferMinutes = 15;
  let adminNotice: { heading: string; message: string; statusLabel: string } | null = null;

  if (action === 'accept_proposal') {
    if (!booking.proposal) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não há proposta de novo horário pendente nesta chamada.' }),
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }
    if (booking.cancellation?.state === 'requested' || booking.status === 'cancelada') {
      return new Response(
        JSON.stringify({ success: false, error: 'Não é possível aceitar proposta enquanto há cancelamento em análise ou chamada cancelada.' }),
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }
    const prop = booking.proposal;
    const duration = Number(booking.durationMinutes) || 30;

    // Valida disponibilidade real da data/horário proposto antes de aceitar (anti-double-booking)
    if (!env.__CUSTOMER_DATA_FIXTURES__) {
      const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
      await expirePendingAppointmentsFromSupabase(env).catch(() => {});
      rescheduleBufferMinutes = Number(settings.bufferMinutes ?? 15);
      const dayBookings = await listAppointmentsForScheduleDateFromSupabase(env, prop.date, settings.timezone);
      const otherBookings = dayBookings.filter((b) => b.id !== booking.id);
      const matchedModality: AppointmentModality = modalities.find((m) => m.id === booking.modalityId) || {
        id: booking.modalityId,
        name: booking.modalityName || 'Chamada VIP',
        description: '',
        durationMinutes: duration,
        price: Number(booking.price) || 0,
        priceFormatted: '',
        active: true,
        minNoticeHours: 0,
        rules: [],
        clientInstructions: '',
        order: 99,
      };
      const slots = computeAvailableSlotsForDate(
        prop.date,
        matchedModality,
        { ...settings, minNoticeHours: 0 },
        otherBookings,
        new Date(),
        { allowInactiveModality: true }
      );
      if (!slots.includes(prop.time)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'O horário sugerido não está mais disponível na agenda. Solicite uma nova proposta à Nua Borges.',
          }),
          { status: 409, headers: PRIVATE_HEADERS }
        );
      }
      shouldUseAtomicReschedule = true;
    }

    booking.rescheduledFrom = { date: booking.date, startTime: booking.startTime };
    booking.date = prop.date;
    booking.startTime = prop.time;
    booking.endTime = addMinutesToTime(prop.time, duration);
    booking.proposal = null;
    (booking as any).rescheduleRequest = null;
    booking.status =
      booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed'
        ? 'confirmada'
        : 'aguardando_pagamento';
    booking.updatedAt = nowIso;
    booking.history = [
      ...(booking.history || []),
      {
        at: nowIso,
        action: 'proposta_aceita',
        note: `Cliente aceitou proposta de novo horário via Área Privativa: ${prop.date} às ${prop.time}.`,
        author: 'client',
      },
    ];
    responseMsg = `Novo horário confirmado: ${formatDateForDisplay(prop.date)} às ${prop.time}.`;
    adminNotice = {
      heading: 'Cliente aceitou proposta de horário',
      message: `${booking.clientName} aceitou o novo horário (${formatDateForDisplay(prop.date)} às ${prop.time}) para ${booking.modalityName}.`,
      statusLabel: 'Confirmada',
    };
  } else if (action === 'decline_proposal') {
    if (!booking.proposal) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não há proposta pendente para recusar.' }),
        { status: 409, headers: PRIVATE_HEADERS }
      );
    }
    const prop = booking.proposal;
    booking.proposal = null;
    (booking as any).rescheduleRequest = null;
    booking.status =
      booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed'
        ? 'confirmada'
        : 'aguardando_pagamento';
    booking.updatedAt = nowIso;
    booking.history = [
      ...(booking.history || []),
      {
        at: nowIso,
        action: 'proposta_recusada',
        note: `Cliente recusou proposta (${prop.date} às ${prop.time}) via Área Privativa. Horário original mantido.`,
        author: 'client',
      },
    ];
    responseMsg = 'Proposta recusada. Seu horário original permanece mantido.';
    adminNotice = {
      heading: 'Cliente recusou proposta de horário',
      message: `${booking.clientName} recusou a sugestão (${formatDateForDisplay(prop.date)} às ${prop.time}) e manteve o horário original (${formatDateForDisplay(booking.date)} às ${booking.startTime}).`,
      statusLabel: 'Horário original mantido',
    };
  } else if (action === 'request_reschedule') {
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
    (booking as any).rescheduleRequest = {
      note: reason || 'Cliente solicitou reagendamento via Área Privativa.',
      requestedAt: nowIso,
      by: 'client',
    };
    booking.updatedAt = nowIso;
    booking.history = [
      ...(booking.history || []),
      {
        at: nowIso,
        action: 'solicitacao_reagendamento',
        note: reason || 'Cliente solicitou reagendamento via Área Privativa.',
        author: 'client',
      },
    ];
    responseMsg = 'Solicitação de reagendamento enviada. A Nua enviará uma proposta de novo horário por aqui.';
    adminNotice = {
      heading: 'Pedido de reagendamento de Chamada VIP',
      message: `${booking.clientName} solicitou reagendamento da chamada de ${formatDateForDisplay(booking.date)} às ${booking.startTime}.${reason ? ` Observação: "${reason}"` : ''}`,
      statusLabel: 'Reagendamento solicitado',
    };
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
    const wasPaid =
      booking.payment?.status === 'approved' ||
      booking.payment?.status === 'manual_confirmed' ||
      booking.status === 'confirmada';
    if (wasPaid) {
      // Alinhado ao fluxo canônico V9 do Admin: limpa proposta anterior e coloca em análise com cancellation.state = 'requested'
      booking.proposal = null;
      booking.status = 'reagendamento_pendente';
      booking.cancellation = {
        state: 'requested',
        by: 'client',
        reason: reason || 'Imprevisto informado pelo cliente',
        details: reason || '',
        requestedAt: nowIso,
        previousStatus: 'confirmada',
        refundStatus: 'undecided',
      };
      booking.cancellationReason = reason || 'Cancelamento solicitado pelo cliente via Área Privativa';
      responseMsg =
        'Solicitação de cancelamento enviada para análise da Nua Borges. Você acompanhará a decisão e o reembolso aqui em tempo real.';
      adminNotice = {
        heading: 'Solicitação de cancelamento de Chamada VIP',
        message: `${booking.clientName} solicitou cancelamento da chamada de ${formatDateForDisplay(booking.date)} às ${booking.startTime}.${reason ? ` Motivo: "${reason}"` : ''}`,
        statusLabel: 'Cancelamento em análise',
      };
    } else {
      booking.status = 'cancelada';
      booking.cancelledBy = 'client';
      booking.cancellationReason = reason || 'Cancelado pelo cliente via Área Privativa';
      if (booking.meeting) booking.meeting.visibleToClient = false;
      responseMsg = 'Reserva cancelada com sucesso.';
    }
    booking.updatedAt = nowIso;
    booking.history = [
      ...(booking.history || []),
      {
        at: nowIso,
        action: wasPaid ? 'cancelamento_solicitado' : 'cancelamento_cliente',
        note: booking.cancellationReason || 'Cancelado pelo cliente',
        author: 'client',
      },
    ];
  }

  if (!env.__CUSTOMER_DATA_FIXTURES__) {
    if (shouldUseAtomicReschedule) {
      const atomic = await rescheduleAppointmentAtomically(env, booking, rescheduleBufferMinutes);
      if (!atomic.success || atomic.rescheduled === false) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              atomic.rescheduled === false
                ? 'Este horário acabou de ser ocupado por outra reserva. Solicite uma nova sugestão à Nua Borges.'
                : 'Não foi possível confirmar o novo horário no banco de dados. Tente novamente.',
          }),
          { status: atomic.rescheduled === false ? 409 : 503, headers: PRIVATE_HEADERS }
        );
      }
    } else {
      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Não foi possível registrar sua solicitação no momento. Tente novamente.',
          }),
          { status: 503, headers: PRIVATE_HEADERS }
        );
      }
    }

    if (adminNotice) {
      const siteUrl = (env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges.com.br').replace(/\/$/, '');
      const mail = renderTransactionalNotificationHtml({
        subject: `${adminNotice.heading} — Nua Borges`,
        heading: adminNotice.heading,
        message: adminNotice.message,
        orderRef: booking.id,
        statusLabel: adminNotice.statusLabel,
        ctaUrl: `${siteUrl}/admin/chamadas`,
        ctaLabel: 'Abrir Central de Chamadas',
      });
      const emailPromise = dispatchTransactionalEmail(env, {
        to: 'contato@nuaborges.com.br',
        subject: mail.subject,
        html: mail.html,
      }).catch((err) => {
        console.warn('[me/appointments] Falha ao notificar admin por e-mail:', err);
      });
      if (typeof (context as any)?.waitUntil === 'function') {
        (context as any).waitUntil(emailPromise);
      } else {
        await emailPromise;
      }
    }
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
      message: responseMsg,
    }),
    { status: 200, headers: PRIVATE_HEADERS }
  );
};
