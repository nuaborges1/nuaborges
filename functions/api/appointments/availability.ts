/**
 * Cloudflare Pages Function: GET /api/appointments/availability
 * 
 * Consulta pública de horários livres para uma data e modalidade.
 * Conectado diretamente ao PostgreSQL Supabase.
 */

import {
  computeAvailableSlotsForDate,
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
} from '../../../lib/appointmentsCanonical';
import {
  getAppointmentsSettingsFromSupabase,
  listAppointmentsForScheduleDateFromSupabase,
  expirePendingAppointmentsFromSupabase,
} from '../_supabaseStore';

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
    const date = url.searchParams.get('date');
    const modalityId = url.searchParams.get('modalityId');

    // 1. Carrega configurações e modalidades diretamente do Supabase PostgreSQL
    const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
    await expirePendingAppointmentsFromSupabase(env);

    // Se solicitado apenas modalidades ou sem parâmetros específicos, retorna metadados públicos
    if (!date || !modalityId || url.searchParams.get('mode') === 'modalities') {
      return new Response(
        JSON.stringify({
          success: true,
          modalities: modalities.filter((m) => m.active),
          settings: {
            startHour: settings.weeklyHours ? undefined : 14,
            timezone: settings.timezone,
            minNoticeHours: settings.minNoticeHours,
            maxFutureDays: settings.maxFutureDays,
            maxAdvanceMonths: settings.maxAdvanceMonths ?? 3,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
          },
        }
      );
    }

    const modality = modalities.find((m) => m.id === modalityId && m.active);
    if (!modality) {
      return new Response(
        JSON.stringify({ success: false, error: 'Modalidade de chamada não encontrada ou inativa.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Carrega reservas ativas do Supabase para bloquear horários conflitantes
    const allBookings = await listAppointmentsForScheduleDateFromSupabase(
      env,
      date,
      settings.timezone
    );
    const relevantBookings = allBookings.filter(
      (b) =>
        b.status === 'confirmada' ||
        b.status === 'aguardando_pagamento' ||
        b.status === 'reagendamento_pendente'
    );

    // 3. Motor canônico calcula slots disponíveis
    const slots = computeAvailableSlotsForDate(
      date,
      modality,
      settings,
      relevantBookings,
      new Date()
    );

    return new Response(
      JSON.stringify({
        success: true,
        date,
        slots,
        modality,
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
    console.error('[Availability API Error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Falha ao consultar disponibilidade.', details: err?.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
