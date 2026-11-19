import { AppointmentBooking, AppointmentModality, validateBookingAttempt } from '../../../lib/appointmentsCanonical';
import {
  getAppointmentByIdFromSupabase,
  saveAppointmentToSupabase,
  rescheduleAppointmentAtomically,
  getAppointmentsSettingsFromSupabase,
  listAppointmentsForScheduleDateFromSupabase,
  expirePendingAppointmentsFromSupabase,
} from '../_supabaseStore';
import { sendAppointmentRescheduledEmail } from './_emailAppointmentHelper';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

function isValidPublicToken(token: string): boolean {
  return typeof token === 'string' && token.startsWith('tok_') && token.length >= 20;
}

function sanitizeVoucherBooking(booking: AppointmentBooking): Partial<AppointmentBooking> {
  const isConfirmed = booking.status === 'confirmada';
  return {
    id: booking.id,
    publicToken: booking.publicToken,
    modalityId: booking.modalityId,
    modalityName: booking.modalityName,
    durationMinutes: booking.durationMinutes,
    price: booking.price,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    timezone: booking.timezone,
    clientTimezone: booking.clientTimezone,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    contactType: booking.contactType,
    status: booking.status,
    payment: {
      status: booking.payment?.status,
      method: booking.payment?.method || 'pix',
      amount: booking.payment?.amount ?? booking.price,
      paidAt: booking.payment?.paidAt,
      pixPayload: booking.status === 'aguardando_pagamento' ? booking.payment?.pixPayload : undefined,
      pixQrCode: booking.status === 'aguardando_pagamento' ? booking.payment?.pixQrCode : undefined,
    },
    meeting: {
      platform: booking.meeting?.platform || 'google_meet',
      url: isConfirmed ? booking.meeting?.url : undefined,
      instructions: isConfirmed ? booking.meeting?.instructions : undefined,
      visibleToClient: isConfirmed && Boolean(booking.meeting?.url),
    },
    proposal: booking.proposal || null,
    cancellation: booking.cancellation
      ? {
          state: booking.cancellation.state,
          by: booking.cancellation.by,
          reason: booking.cancellation.reason,
          requestedAt: booking.cancellation.requestedAt,
          decidedAt: booking.cancellation.decidedAt,
          decisionNote: booking.cancellation.decisionNote,
          refundPercent: booking.cancellation.refundPercent,
        }
      : undefined,
    cancellationReason: booking.cancellationReason,
    refundStatus: booking.refundStatus,
    expiresAt: booking.expiresAt,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const token = (url.searchParams.get('token') || '').trim();

    if (!isValidPublicToken(token)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token privado do voucher inválido ou ausente.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const booking: AppointmentBooking | null = await getAppointmentByIdFromSupabase(env, token);

    if (!booking || booking.publicToken !== token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Agendamento não encontrado.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, booking: sanitizeVoucherBooking(booking) }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao consultar reserva.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const action = String(body.action || '').trim(); // 'requestCancellation' | 'acceptProposal' | 'declineProposal'

    if (!isValidPublicToken(token)) {
      return new Response(JSON.stringify({ success: false, error: 'Token privado do voucher inválido ou ausente.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const booking: AppointmentBooking | null = await getAppointmentByIdFromSupabase(env, token);
    if (!booking || booking.publicToken !== token) {
      return new Response(JSON.stringify({ success: false, error: 'Agendamento não encontrado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const nowIso = new Date().toISOString();
    if (!Array.isArray(booking.history)) booking.history = [];

    // 1. Cliente solicita cancelamento (somente reservas pagas/confirmadas)
    if (action === 'requestCancellation') {
      const reason = String(body.reason || '').trim();
      const details = String(body.details || '').trim();

      if (!reason) {
        return new Response(JSON.stringify({ success: false, error: 'Informe o motivo do cancelamento.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (['cancelada', 'concluida', 'nao_compareceu'].includes(booking.status)) {
        return new Response(JSON.stringify({ success: false, error: 'Esta chamada já foi encerrada.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const isPaidBooking =
        booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed';
      if (!isPaidBooking || booking.status === 'aguardando_pagamento') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Reservas com pagamento pendente expiram automaticamente e não requerem solicitação de cancelamento.',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      booking.cancellation = {
        state: 'requested',
        by: 'client',
        reason,
        details,
        requestedAt: nowIso,
        previousStatus: 'confirmada',
        refundStatus: 'undecided',
      };
      if (booking.proposal) {
        booking.proposal = null;
        booking.history.push({
          at: nowIso,
          action: 'proposta_retirada',
          note: 'Proposta de reagendamento retirada devido à solicitação de cancelamento pelo cliente.',
          author: 'system',
        });
      }
      booking.status = 'reagendamento_pendente';
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'solicitacao_cancelamento_cliente',
        note: `Cliente solicitou cancelamento. Motivo: ${reason}.`,
        author: 'client',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(JSON.stringify({ success: false, error: saveRes.error }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          booking: sanitizeVoucherBooking(booking),
          message: 'Solicitação registrada. A Nua analisará em breve.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Cliente aceita proposta de reagendamento
    if (action === 'acceptProposal') {
      const p = booking.proposal;
      if (!p) {
        return new Response(JSON.stringify({ success: false, error: 'Nenhuma proposta de novo horário encontrada.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (booking.cancellation?.state === 'requested') {
        return new Response(
          JSON.stringify({ success: false, error: 'Não é possível aceitar proposta enquanto há cancelamento em análise.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
      await expirePendingAppointmentsFromSupabase(env);
      const allBookings = await listAppointmentsForScheduleDateFromSupabase(env, p.date, settings.timezone);
      const otherBookings = allBookings.filter((b) => b.id !== booking.id);

      const fallbackModality: AppointmentModality = {
        id: booking.modalityId,
        name: booking.modalityName || 'Chamada Privativa',
        description: '',
        durationMinutes: booking.durationMinutes || 30,
        price: booking.price || 250,
        priceFormatted: `R$ ${(booking.price || 250).toFixed(2).replace('.', ',')}`,
        active: true,
        minNoticeHours: 0,
        rules: [],
        clientInstructions: '',
        order: 1,
      };

      const val = validateBookingAttempt(
        {
          modalityId: booking.modalityId,
          date: p.date,
          startTime: p.time,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          termsAccepted: true,
        },
        modalities,
        settings,
        otherBookings,
        new Date(),
        { allowInactiveModality: true, fallbackModality }
      );

      if (!val.success || !val.endTime) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'O horário proposto não está mais disponível na agenda. Por favor, solicite outra proposta.',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const previousDate = booking.date;
      const previousTime = booking.startTime;
      booking.rescheduledFrom = { date: previousDate, startTime: previousTime };
      booking.date = p.date;
      booking.startTime = p.time;
      booking.endTime = val.endTime;
      booking.proposal = null;
      booking.status =
        booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed'
          ? 'confirmada'
          : 'aguardando_pagamento';
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'proposta_aceita',
        note: `Cliente aceitou proposta de horário. Agendamento transferido de ${previousDate} ${previousTime} para ${p.date} ${p.time}.`,
        author: 'client',
      });

      const saveRes = await rescheduleAppointmentAtomically(env, booking, settings.bufferMinutes);

      if (!saveRes.success || !saveRes.rescheduled) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              saveRes.rescheduled === false
                ? 'O horário proposto acabou de ser ocupado. Por favor, entre em contato para nova sugestão.'
                : saveRes.error || 'Não foi possível confirmar o novo horário.',
          }),
          { status: saveRes.rescheduled === false ? 409 : 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        await sendAppointmentRescheduledEmail(env, booking, { date: previousDate, startTime: previousTime });
      } catch {}

      return new Response(
        JSON.stringify({
          success: true,
          booking: sanitizeVoucherBooking(booking),
          message: 'Novo horário confirmado com sucesso!',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Cliente recusa proposta de reagendamento
    if (action === 'declineProposal') {
      if (!booking.proposal) {
        return new Response(JSON.stringify({ success: false, error: 'Não há proposta de novo horário pendente.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      booking.proposal = null;
      booking.status =
        booking.payment?.status === 'approved' || booking.payment?.status === 'manual_confirmed'
          ? 'confirmada'
          : 'aguardando_pagamento';
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'proposta_recusada',
        note: 'Cliente recusou a proposta de reagendamento; data e horário originais mantidos.',
        author: 'client',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(JSON.stringify({ success: false, error: saveRes.error }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          booking: sanitizeVoucherBooking(booking),
          message: 'Proposta recusada. Seu horário original foi mantido.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: false, error: 'Ação não suportada.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Erro ao processar solicitação.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
