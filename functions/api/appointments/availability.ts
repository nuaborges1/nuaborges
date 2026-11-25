/**
 * Cloudflare Pages Function: GET /api/appointments/availability
 * 
 * Consulta pública de horários livres para uma data e modalidade.
 * Conectado diretamente ao PostgreSQL Supabase.
 */

import {
  computeAvailableSlotsForDate,
  getDayClosureReason,
  getScheduleNow,
  getThreeMonthsFutureLimit,
} from '../../../lib/appointmentsCanonical';
import {
  getAppointmentsSettingsFromSupabase,
  listAppointmentsForScheduleDateFromSupabase,
  listAppointmentsForScheduleMonthFromSupabase,
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
    const monthParam = url.searchParams.get('month'); // "YYYY-MM"
    const modalityId = url.searchParams.get('modalityId');

    // 1. Carrega configurações e modalidades diretamente do Supabase PostgreSQL
    const { settings, modalities } = await getAppointmentsSettingsFromSupabase(env);
    await expirePendingAppointmentsFromSupabase(env);

    // 2. Consulta mensal completa: retorna quais dias do mês possuem ao menos 1 horário livre
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam) && modalityId) {
      const modality = modalities.find((m) => m.id === modalityId && m.active);
      if (!modality) {
        return new Response(
          JSON.stringify({ success: false, error: 'Modalidade de chamada não encontrada ou inativa.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const [yearNum, monthNum] = monthParam.split('-').map(Number);
      if (!Number.isInteger(yearNum) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        return new Response(
          JSON.stringify({ success: false, error: 'Parâmetro month inválido. Use YYYY-MM.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const monthBookings = await listAppointmentsForScheduleMonthFromSupabase(
        env,
        yearNum,
        monthNum,
        settings.timezone
      );
      const now = new Date();
      const scheduleNow = getScheduleNow(settings.timezone, now);
      const maxCalendarLimit = getThreeMonthsFutureLimit(
        settings.timezone,
        now,
        settings.maxAdvanceMonths ?? 3
      );
      const daysInMonth = new Date(Date.UTC(yearNum, monthNum, 0, 12, 0, 0)).getUTCDate();
      const days: Record<string, { available: boolean; count: number; reason?: string }> = {};
      let firstAvailableDate: string | null = null;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (dateStr < scheduleNow.dateString) {
          days[dateStr] = { available: false, count: 0, reason: 'past' };
          continue;
        }
        if (dateStr > maxCalendarLimit) {
          days[dateStr] = { available: false, count: 0, reason: 'beyond_limit' };
          continue;
        }
        const closureReason = getDayClosureReason(settings, dateStr, scheduleNow.dateString);
        if (closureReason !== null) {
          days[dateStr] = { available: false, count: 0, reason: closureReason };
          continue;
        }
        const slots = computeAvailableSlotsForDate(dateStr, modality, settings, monthBookings, now);
        const available = slots.length > 0;
        days[dateStr] = {
          available,
          count: slots.length,
          ...(available ? {} : { reason: 'no_slots' }),
        };
        if (available && !firstAvailableDate) {
          firstAvailableDate = dateStr;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          month: monthParam,
          modalityId: modality.id,
          timezone: settings.timezone,
          maxAdvanceMonths: settings.maxAdvanceMonths ?? 3,
          days,
          firstAvailableDate,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

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
      JSON.stringify({ success: false, error: 'Falha ao consultar disponibilidade.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
