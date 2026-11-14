/**
 * Cloudflare Pages Function: /api/appointments/admin
 * 
 * Endpoints Administrativos para Nua Borges:
 * GET : Retorna configurações, modalidades e lista de agendamentos diretamente do PostgreSQL Supabase.
 * POST: Ações administrativas (confirmar, cancelar, reagendar, link de chamada, salvar horários) persistidas no Supabase.
 */

import {
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
  validateBookingAttempt,
} from '../../../lib/appointmentsCanonical';
import {
  getAppointmentsSettingsFromSupabase,
  saveAppointmentsSettingsToSupabase,
  listAppointmentsFromSupabase,
  getAppointmentByIdFromSupabase,
  saveAppointmentToSupabase,
} from '../_supabaseStore';
import { recordAuditEvent } from '../_auditHelper';

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
  [key: string]: any;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { env } = context;

  try {
    // 1. Carrega configurações e modalidades diretamente do Supabase PostgreSQL
    const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);

    // 2. Carrega lista real de reservas diretamente do Supabase PostgreSQL
    const bookings = await listAppointmentsFromSupabase(env, { limit: 100 });

    return new Response(
      JSON.stringify({
        success: true,
        settings,
        modalities,
        bookings,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('[Appointments Admin GET Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao carregar dados de agendamento.', details: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;
    const nowIso = new Date().toISOString();

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ação não especificada.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Salvar Configurações de Horários
    if (action === 'updateSettings') {
      const res = await saveAppointmentsSettingsToSupabase(env, { settings: body.settings });
      if (!res.success) {
        return new Response(
          JSON.stringify({ success: false, error: res.error || 'Falha ao salvar configurações.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Salvar Modalidades de Chamadas
    if (action === 'updateModalities') {
      const res = await saveAppointmentsSettingsToSupabase(env, { modalities: body.modalities });
      if (!res.success) {
        return new Response(
          JSON.stringify({ success: false, error: res.error || 'Falha ao salvar modalidades.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Para ações que operam sobre uma reserva específica:
    const bookingId = body.bookingId;
    if (!bookingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'bookingId obrigatório para esta ação.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let booking = await getAppointmentByIdFromSupabase(env, bookingId);

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Reserva não encontrada.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Confirmar Pagamento Manualmente
    if (action === 'confirm') {
      booking.status = 'confirmada';
      booking.payment.status = 'manual_confirmed';
      booking.payment.paidAt = nowIso;
      booking.payment.transactionId = body.transactionId || `ADMIN_${Date.now()}`;
      booking.meeting.visibleToClient = true;
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'pagamento_confirmado',
        note: 'Pagamento confirmado manualmente pela administração.',
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({ success: false, error: saveRes.error || 'Falha ao atualizar reserva no banco.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Inserir/Atualizar Link da Chamada de Vídeo
    if (action === 'updateMeeting') {
      booking.meeting.url = (body.meetingUrl || '').trim();
      if (body.instructions !== undefined) {
        booking.meeting.instructions = (body.instructions || '').trim();
      }
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'link_atualizado',
        note: `Link da sala privativa atualizado: ${booking.meeting.url}`,
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({ success: false, error: saveRes.error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Cancelar Reserva
    if (action === 'cancel') {
      booking.status = 'cancelada';
      booking.cancellationReason = (body.reason || 'Cancelado pela administração').trim();
      booking.cancelledBy = 'admin';
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'cancelada',
        note: `Cancelado pela administração. Motivo: ${booking.cancellationReason}`,
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({ success: false, error: saveRes.error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Concluir Chamada
    if (action === 'complete') {
      booking.status = 'concluida';
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'concluida',
        note: 'Chamada de vídeo finalizada com sucesso.',
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({ success: false, error: saveRes.error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7. Marcar Ausência (Não Compareceu)
    if (action === 'absent') {
      booking.status = 'nao_compareceu';
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'ausente',
        note: 'Cliente não compareceu à chamada no horário agendado.',
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({ success: false, error: saveRes.error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 8. Reagendar Reserva
    if (action === 'reschedule') {
      const { newDate, newStartTime } = body;
      if (!newDate || !newStartTime) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nova data e horário são obrigatórios.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Validação de disponibilidade do novo horário via Supabase
      const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
      const allBookings = await listAppointmentsFromSupabase(env, { limit: 100 });
      const otherBookings = allBookings.filter((b) => b.id !== bookingId);

      const val = validateBookingAttempt(
        {
          modalityId: booking.modalityId,
          date: newDate,
          startTime: newStartTime,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          termsAccepted: true,
        },
        modalities,
        settings,
        otherBookings,
        new Date()
      );

      if (!val.success || !val.endTime) {
        return new Response(
          JSON.stringify({ success: false, error: val.error || 'Novo horário indisponível.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }

      booking.rescheduledFrom = { date: booking.date, startTime: booking.startTime };
      booking.date = newDate;
      booking.startTime = newStartTime;
      booking.endTime = val.endTime;
      booking.status = 'confirmada';
      booking.updatedAt = nowIso;
      booking.history.push({
        at: nowIso,
        action: 'reagendada',
        note: `Horário reagendado de ${booking.rescheduledFrom.date} ${booking.rescheduledFrom.startTime} para ${newDate} ${newStartTime}.`,
        author: 'admin',
      });

      const saveRes = await saveAppointmentToSupabase(env, booking);
      if (!saveRes.success) {
        return new Response(
          JSON.stringify({ success: false, error: saveRes.error }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: true, booking }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação desconhecida.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao processar ação administrativa.', details: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
