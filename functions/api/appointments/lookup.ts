/**
 * Cloudflare Pages Function: GET /api/appointments/lookup
 * 
 * Consulta segura da reserva pelo token privativo do cliente via Supabase PostgreSQL.
 * Não expõe agendamentos de outros clientes e oculta o link da reunião
 * caso o status ainda não esteja confirmado.
 */

import { AppointmentBooking } from '../../../lib/appointmentsCanonical';
import { getAppointmentByIdFromSupabase } from '../_supabaseStore';

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

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const token = (url.searchParams.get('token') || '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token da reserva obrigatório.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const booking: AppointmentBooking | null = await getAppointmentByIdFromSupabase(env, token);

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Agendamento não encontrado.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Se a reserva ainda não foi confirmada, oculta o link da sala privativa por segurança
    const sanitizedBooking = {
      ...booking,
      meeting: {
        ...booking.meeting,
        url: booking.status === 'confirmada' ? booking.meeting?.url : undefined,
      },
    };

    return new Response(
      JSON.stringify({ success: true, booking: sanitizedBooking }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: 'Erro ao consultar reserva.', details: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
