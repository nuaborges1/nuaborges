import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';
import {
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  mergeScheduleSettings,
  normalizeScheduleSettings,
  addMinutesToTime,
  convertSlotBetweenTimezones,
} from '../../../lib/appointmentsCanonical';

export async function getAppointmentsSettingsFromSupabase(
  env: SupabaseEnv
): Promise<{ settings: AppointmentScheduleSettings; modalities: AppointmentModality[] }> {
  const sb = getSupabaseClient(env);
  if (!sb) {
    return { settings: DEFAULT_SCHEDULE_SETTINGS, modalities: DEFAULT_MODALITIES };
  }

  try {
    const { data, error } = await sb
      .from('appointments_settings')
      .select('settings, modalities')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return { settings: DEFAULT_SCHEDULE_SETTINGS, modalities: DEFAULT_MODALITIES };
    }

    return {
      settings: normalizeScheduleSettings(data.settings || {}),
      modalities: Array.isArray(data.modalities) && data.modalities.length > 0
        ? data.modalities
        : DEFAULT_MODALITIES,
    };
  } catch {
    return { settings: DEFAULT_SCHEDULE_SETTINGS, modalities: DEFAULT_MODALITIES };
  }
}

export async function saveAppointmentsSettingsToSupabase(
  env: SupabaseEnv,
  patch: { settings?: Parameters<typeof mergeScheduleSettings>[1]; modalities?: AppointmentModality[] }
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  try {
    const current = await getAppointmentsSettingsFromSupabase(env);
    // Mescla sobre o que já está gravado (nunca sobre os defaults): um patch
    // parcial de weeklyHours não pode reabrir dias que estavam fechados.
    const newSettings = patch.settings
      ? mergeScheduleSettings(current.settings, patch.settings)
      : current.settings;
    const newModalities = patch.modalities ? patch.modalities : current.modalities;
    const nowIso = new Date().toISOString();

    const { error } = await sb.from('appointments_settings').upsert({
      id: 1,
      settings: newSettings,
      modalities: newModalities,
      updated_at: nowIso,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao persistir appointments_settings.' };
  }
}

export function bookingToSupabaseRow(b: AppointmentBooking) {
  // Salva data/hora em formato ISO com offset ou UTC para manter precisão cronológica
  const tz = b.timezone || 'Europe/Dublin';
  const utcSlot = convertSlotBetweenTimezones(b.date, b.startTime, tz, 'UTC');
  const isoUtc = `${utcSlot.date}T${utcSlot.time}:00.000Z`;

  return {
    id: b.id,
    public_token: b.publicToken,
    client_name: b.clientName || '',
    client_contact: b.clientPhone || b.clientEmail || '',
    client_instagram: b.clientEmail || '',
    modality_id: b.modalityId,
    date_time: isoUtc,
    duration_minutes: Number(b.durationMinutes) || 30,
    total_price: Number(b.price) || 0,
    status: b.status,
    payment: b.payment,
    call_link: b.meeting?.url || '',
    notes: JSON.stringify({
      clientNotes: b.clientNotes || '',
      meeting: b.meeting,
      history: b.history,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      modalityName: b.modalityName,
      timezone: tz,
      clientTimezone: b.clientTimezone || 'America/Sao_Paulo',
      contactType: b.contactType || 'whatsapp',
      clientName: b.clientName,
      clientEmail: b.clientEmail,
      clientPhone: b.clientPhone,
      refundStatus: b.refundStatus || 'not_applicable',
      refundId: b.refundId || b.payment?.refundId,
      refundAmount: b.refundAmount ?? b.payment?.refundAmount,
      cancellationReason: b.cancellationReason,
      cancelledBy: b.cancelledBy,
      rescheduledFrom: b.rescheduledFrom,
      rescheduleRequest: (b as any).rescheduleRequest || null,
      proposal: b.proposal || null,
      cancellation: b.cancellation || undefined,
      expiresAt: b.expiresAt,
    }),
    created_at: b.createdAt || new Date().toISOString(),
    updated_at: b.updatedAt || new Date().toISOString(),
    expires_at: b.expiresAt,
  };
}

export function supabaseRowToBooking(row: any): AppointmentBooking {
  let meta: any = {};
  try {
    meta = typeof row.notes === 'string' && row.notes.startsWith('{')
      ? JSON.parse(row.notes)
      : { clientNotes: row.notes || '' };
  } catch {
    meta = { clientNotes: row.notes || '' };
  }

  // A data no fuso da agenda é a fonte de verdade (evita erro de ISO converter para o dia seguinte)
  const savedRefundAmount = meta.refundAmount ?? row.payment?.refundAmount;
  const refundAmount = savedRefundAmount == null ? NaN : Number(savedRefundAmount);
  const dt = new Date(row.date_time);
  const dateStr = meta.date || (!isNaN(dt.getTime()) ? dt.toISOString().split('T')[0] : '');
  const timeStr = meta.startTime || (!isNaN(dt.getTime())
    ? dt.toISOString().split('T')[1]?.substring(0, 5) || '14:00'
    : '14:00');

  const duration = Number(row.duration_minutes) || meta.durationMinutes || 30;
  const price = Number(row.total_price) || Number(meta.price) || 0;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const resolvedEmail = emailRegex.test(String(row.client_instagram || '').trim())
    ? String(row.client_instagram).trim()
    : emailRegex.test(String(meta.clientEmail || '').trim())
    ? String(meta.clientEmail).trim()
    : '';
  const rawContact = String(row.client_contact || '').trim();
  const resolvedPhone =
    meta.clientPhone ||
    (rawContact && rawContact.toLowerCase() !== resolvedEmail.toLowerCase() ? rawContact : '');

  return {
    id: row.id,
    publicToken: row.public_token,
    modalityId: row.modality_id,
    modalityName:
      meta.modalityName ||
      (row.modality_id === 'chamada-60'
        ? 'Experiência VIP Completa (60 min)'
        : 'Encontro Privativo (30 min)'),
    durationMinutes: duration,
    price,
    date: dateStr,
    startTime: timeStr,
    endTime: meta.endTime || addMinutesToTime(timeStr, duration),
    timezone: meta.timezone || 'Europe/Dublin',
    clientTimezone: meta.clientTimezone || 'America/Sao_Paulo',
    clientName: row.client_name || meta.clientName || 'Cliente VIP',
    clientEmail: resolvedEmail,
    clientPhone: resolvedPhone,
    contactType: meta.contactType || 'whatsapp',
    clientNotes: meta.clientNotes || '',
    status: row.status,
    payment: row.payment || { status: 'pending', method: 'pix', amount: price },
    refundStatus: meta.refundStatus || 'not_applicable',
    refundId: meta.refundId || row.payment?.refundId,
    refundAmount: Number.isFinite(refundAmount) ? refundAmount : undefined,
    meeting: meta.meeting || {
      url: row.call_link || '',
      platform: 'google_meet',
      visibleToClient: Boolean(row.call_link),
    },
    history: Array.isArray(meta.history) ? meta.history : [],
    cancellationReason: meta.cancellationReason,
    cancelledBy: meta.cancelledBy,
    rescheduledFrom: meta.rescheduledFrom,
    ...(meta.rescheduleRequest ? { rescheduleRequest: meta.rescheduleRequest } : {}),
    proposal: meta.proposal || null,
    cancellation: meta.cancellation || undefined,
    expiresAt:
      row.expires_at ||
      meta.expiresAt ||
      row.created_at ||
      new Date(0).toISOString(),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function listAppointmentsFromSupabase(
  env: SupabaseEnv,
  options?: { limit?: number; status?: string }
): Promise<AppointmentBooking[]> {
  const sb = getSupabaseClient(env);
  if (!sb) throw new Error('Supabase não configurado.');

  try {
    const pageSize = 1000;
    const result: AppointmentBooking[] = [];
    const maxRows = options?.limit ? Math.max(1, options.limit) : Number.POSITIVE_INFINITY;
    for (let offset = 0; offset < maxRows; offset += pageSize) {
      const take = Math.min(pageSize, maxRows - offset);
      let query = sb.from('appointments').select('*').order('date_time', { ascending: false }).range(offset, offset + take - 1);
      if (options?.status) query = query.eq('status', options.status);
      const { data, error } = await query;
      if (error) throw new Error(`Erro ao listar appointments: ${error.message}`);
      const page = data || [];
      result.push(...page.map(supabaseRowToBooking));
      if (page.length < take) break;
    }
    return result;
  } catch (err) {
    console.error('[SupabaseStore] Falha ao listar appointments:', err);
    throw err;
  }
}

/** Busca apenas as reservas ativas de uma data civil no fuso configurado da agenda. */
export async function listAppointmentsForScheduleDateFromSupabase(
  env: SupabaseEnv,
  date: string,
  timezone: string
): Promise<AppointmentBooking[]> {
  const sb = getSupabaseClient(env);
  if (!sb) throw new Error('Supabase não configurado.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Data inválida para consulta de agenda.');

  const day = new Date(`${date}T12:00:00.000Z`);
  const previousDay = new Date(day);
  previousDay.setUTCDate(previousDay.getUTCDate() - 1);
  const nextDay = new Date(day);
  nextDay.setUTCDate(nextDay.getUTCDate() + 2);
  const previousDate = previousDay.toISOString().slice(0, 10);
  const afterNextDate = nextDay.toISOString().slice(0, 10);
  // A margem de um dia também captura registros antigos cuja coluna UTC foi
  // gravada como horário local com sufixo Z. A data civil de `notes` decide depois.
  const utcStart = convertSlotBetweenTimezones(previousDate, '00:00', timezone, 'UTC');
  const utcEnd = convertSlotBetweenTimezones(afterNextDate, '00:00', timezone, 'UTC');
  const startIso = `${utcStart.date}T${utcStart.time}:00.000Z`;
  const endIso = `${utcEnd.date}T${utcEnd.time}:00.000Z`;
  const { data, error } = await sb
    .from('appointments')
    .select('*')
    .in('status', ['confirmada', 'aguardando_pagamento', 'reagendamento_pendente'])
    .gte('date_time', startIso)
    .lt('date_time', endIso)
    .order('date_time', { ascending: true });
  if (error) throw new Error(`Erro ao consultar reservas da data: ${error.message}`);
  return (data || []).map(supabaseRowToBooking).filter((booking) => booking.date === date);
}

/** Busca todas as reservas ativas de um mês inteiro (YYYY, 1..12) em uma única consulta. */
export async function listAppointmentsForScheduleMonthFromSupabase(
  env: SupabaseEnv,
  year: number,
  month1Based: number,
  timezone: string
): Promise<AppointmentBooking[]> {
  const sb = getSupabaseClient(env);
  if (!sb) throw new Error('Supabase não configurado.');
  if (!Number.isInteger(year) || !Number.isInteger(month1Based) || month1Based < 1 || month1Based > 12) {
    throw new Error('Mês inválido para consulta de agenda.');
  }

  const firstDay = new Date(Date.UTC(year, month1Based - 1, 1, 12, 0, 0));
  const prevDay = new Date(firstDay);
  prevDay.setUTCDate(prevDay.getUTCDate() - 1);

  const lastDay = new Date(Date.UTC(year, month1Based, 0, 12, 0, 0));
  const afterLastDay = new Date(lastDay);
  afterLastDay.setUTCDate(afterLastDay.getUTCDate() + 2);

  const utcStart = convertSlotBetweenTimezones(prevDay.toISOString().slice(0, 10), '00:00', timezone, 'UTC');
  const utcEnd = convertSlotBetweenTimezones(afterLastDay.toISOString().slice(0, 10), '00:00', timezone, 'UTC');
  const startIso = `${utcStart.date}T${utcStart.time}:00.000Z`;
  const endIso = `${utcEnd.date}T${utcEnd.time}:00.000Z`;
  const monthPrefix = `${year}-${String(month1Based).padStart(2, '0')}-`;

  const { data, error } = await sb
    .from('appointments')
    .select('*')
    .in('status', ['confirmada', 'aguardando_pagamento', 'reagendamento_pendente'])
    .gte('date_time', startIso)
    .lt('date_time', endIso)
    .order('date_time', { ascending: true });
  if (error) throw new Error(`Erro ao consultar reservas do mês: ${error.message}`);
  return (data || []).map(supabaseRowToBooking).filter((booking) => booking.date.startsWith(monthPrefix));
}

function isMissingRpcOrColumnError(msg?: string | null): boolean {
  const s = String(msg || '').toLowerCase();
  return (
    s.includes('could not find the function') ||
    s.includes('schema cache') ||
    s.includes('expires_at') ||
    (s.includes('function') && s.includes('does not exist'))
  );
}

export async function expirePendingAppointmentsFromSupabase(env: SupabaseEnv): Promise<number> {
  const sb = getSupabaseClient(env);
  if (!sb) throw new Error('Supabase não configurado.');
  const { data, error } = await sb.rpc('expire_vip_appointments');
  if (!error) {
    return Number(data) || 0;
  }

  // Fallback Dual-Mode caso a migration 202611170001 ainda não tenha sido aplicada no SQL Editor
  if (!isMissingRpcOrColumnError(error.message)) {
    throw new Error(`Não foi possível liberar reservas expiradas: ${error.message}`);
  }

  const nowIso = new Date().toISOString();
  const { data: pendingRows, error: listErr } = await sb
    .from('appointments')
    .select('*')
    .eq('status', 'aguardando_pagamento');
  if (listErr || !Array.isArray(pendingRows)) return 0;

  let expiredCount = 0;
  for (const rawRow of pendingRows) {
    const b = supabaseRowToBooking(rawRow);
    const effectiveExpiry =
      b.expiresAt ||
      (b.createdAt
        ? new Date(new Date(b.createdAt).getTime() + 15 * 60 * 1000).toISOString()
        : null);
    if (effectiveExpiry && effectiveExpiry <= nowIso) {
      b.status = 'cancelada';
      b.cancellationReason = 'Prazo de pagamento expirou';
      b.updatedAt = nowIso;
      b.history = [
        ...(Array.isArray(b.history) ? b.history : []),
        {
          at: nowIso,
          action: 'reserva_expirada',
          note: 'O prazo para concluir o pagamento terminou; a vaga foi liberada.',
          author: 'system',
        },
      ];
      const saved = await saveAppointmentToSupabase(env, b);
      if (saved.success) expiredCount += 1;
    }
  }
  return expiredCount;
}

export async function getAppointmentByIdFromSupabase(
  env: SupabaseEnv,
  idOrToken: string
): Promise<AppointmentBooking | null> {
  const sb = getSupabaseClient(env);
  if (!sb) return null;

  try {
    const cleanId = (idOrToken || '').trim();
    if (!cleanId) return null;

    // 1. Se explicitamente começar com tok_, busca direto por public_token
    if (cleanId.startsWith('tok_')) {
      const { data, error } = await sb.from('appointments').select('*').eq('public_token', cleanId).maybeSingle();
      if (!error && data) return supabaseRowToBooking(data);
      return null;
    }

    // 2. Tenta por ID canônico (app_...)
    const { data: byId, error: errId } = await sb.from('appointments').select('*').eq('id', cleanId).maybeSingle();
    if (!errId && byId) return supabaseRowToBooking(byId);

    // 3. Fallback de resiliência: tenta por public_token para tokens antigos sem prefixo tok_
    const { data: byToken, error: errToken } = await sb.from('appointments').select('*').eq('public_token', cleanId).maybeSingle();
    if (!errToken && byToken) return supabaseRowToBooking(byToken);

    return null;
  } catch {
    return null;
  }
}

export async function saveAppointmentToSupabase(
  env: SupabaseEnv,
  booking: AppointmentBooking
): Promise<{ success: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  try {
    const row = bookingToSupabaseRow(booking);
    const { error } = await sb.from('appointments').upsert(row);
    if (error) {
      // Fallback transparente caso a coluna expires_at ainda não exista na tabela appointments
      if (String(error.message || '').toLowerCase().includes('expires_at')) {
        const { expires_at: _omit, ...rowWithoutExpiresAt } = row as any;
        const { error: retryErr } = await sb.from('appointments').upsert(rowWithoutExpiresAt);
        if (!retryErr) return { success: true };
        console.error('[SupabaseStore] Erro ao salvar appointment (fallback):', retryErr);
        return { success: false, error: retryErr.message };
      }
      console.error('[SupabaseStore] Erro ao salvar appointment:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao persistir appointment.' };
  }
}

/**
 * Registra a reserva sob um lock transacional no PostgreSQL (com fallback Dual-Mode
 * caso o RPC `reserve_vip_appointment` ainda não tenha sido aplicado no banco).
 */
export async function reserveAppointmentAtomically(
  env: SupabaseEnv,
  booking: AppointmentBooking,
  bufferMinutes: number
): Promise<{ success: boolean; reserved?: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  const safeBuffer = Math.max(0, Math.min(180, Math.floor(Number(bufferMinutes) || 0)));
  try {
    const { data, error } = await sb.rpc('reserve_vip_appointment', {
      p_booking: bookingToSupabaseRow(booking),
      p_buffer_minutes: safeBuffer,
    });
    if (!error) {
      return { success: true, reserved: data === true };
    }
    if (!isMissingRpcOrColumnError(error.message)) {
      return { success: false, error: error.message };
    }

    // NUA-AUD-004: em produção, nunca faz fallback silencioso não-atômico (evita double-booking)
    const isProdEnv = String((env as any)?.ENVIRONMENT || '').toLowerCase() === 'production';
    if (isProdEnv) {
      console.error('[Appointments] RPC atômica reserve_vip_appointment ausente em produção!');
      return {
        success: false,
        error: 'Reserva atômica indisponível: aplique a migration de endurecimento no Supabase.',
      };
    }

    // Fallback Dual-Mode somente fora de produção (dev/test) quando o RPC ainda não existe no banco
    const { settings } = await getAppointmentsSettingsFromSupabase(env);
    const tz = booking.timezone || settings.timezone || 'Europe/Dublin';
    const dayBookings = await listAppointmentsForScheduleDateFromSupabase(env, booking.date, tz);
    const nowIso = new Date().toISOString();
    const activeOnDay = dayBookings.filter((b) => {
      if (b.id === booking.id) return false;
      if (
        b.status !== 'confirmada' &&
        b.status !== 'aguardando_pagamento' &&
        b.status !== 'reagendamento_pendente'
      ) {
        return false;
      }
      if (b.status === 'aguardando_pagamento' && b.expiresAt && b.expiresAt <= nowIso) {
        return false;
      }
      return true;
    });

    if (settings.dailyBookingLimit && settings.dailyBookingLimit > 0) {
      if (activeOnDay.length >= settings.dailyBookingLimit) {
        return { success: true, reserved: false };
      }
    }

    const toMin = (t: string) => {
      const [h, m] = String(t || '00:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const startMin = toMin(booking.startTime);
    const endMin = toMin(booking.endTime);

    const hasOverlap = activeOnDay.some((b) => {
      const bStart = toMin(b.startTime);
      const bEnd = toMin(b.endTime) + safeBuffer;
      return startMin < bEnd && endMin + safeBuffer > bStart;
    });
    if (hasOverlap) {
      return { success: true, reserved: false };
    }

    const saved = await saveAppointmentToSupabase(env, booking);
    if (!saved.success) {
      return { success: false, error: saved.error };
    }
    return { success: true, reserved: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao reservar horário no banco.' };
  }
}

export async function rescheduleAppointmentAtomically(
  env: SupabaseEnv,
  booking: AppointmentBooking,
  bufferMinutes: number
): Promise<{ success: boolean; rescheduled?: boolean; error?: string }> {
  const sb = getSupabaseClient(env);
  if (!sb) return { success: false, error: 'Supabase não configurado.' };

  const safeBuffer = Math.max(0, Math.min(180, Math.floor(Number(bufferMinutes) || 0)));
  try {
    const { data, error } = await sb.rpc('reschedule_vip_appointment', {
      p_booking: bookingToSupabaseRow(booking),
      p_buffer_minutes: safeBuffer,
    });
    if (!error) {
      return { success: true, rescheduled: data === true };
    }
    if (!isMissingRpcOrColumnError(error.message)) {
      return { success: false, error: error.message };
    }

    // NUA-AUD-004: em produção, nunca faz fallback silencioso não-atômico (evita double-booking)
    const isProdEnv = String((env as any)?.ENVIRONMENT || '').toLowerCase() === 'production';
    if (isProdEnv) {
      console.error('[Appointments] RPC atômica reserve_vip_appointment ausente em produção!');
      return {
        success: false,
        error: 'Reserva atômica indisponível: aplique a migration de endurecimento no Supabase.',
      };
    }

    // Fallback Dual-Mode somente fora de produção (dev/test) quando o RPC ainda não existe no banco
    const { settings } = await getAppointmentsSettingsFromSupabase(env);
    const tz = booking.timezone || settings.timezone || 'Europe/Dublin';
    const dayBookings = await listAppointmentsForScheduleDateFromSupabase(env, booking.date, tz);
    const nowIso = new Date().toISOString();
    const activeOnDay = dayBookings.filter((b) => {
      if (b.id === booking.id) return false;
      if (
        b.status !== 'confirmada' &&
        b.status !== 'aguardando_pagamento' &&
        b.status !== 'reagendamento_pendente'
      ) {
        return false;
      }
      if (b.status === 'aguardando_pagamento' && b.expiresAt && b.expiresAt <= nowIso) {
        return false;
      }
      return true;
    });

    if (settings.dailyBookingLimit && settings.dailyBookingLimit > 0) {
      if (activeOnDay.length >= settings.dailyBookingLimit) {
        return { success: true, rescheduled: false };
      }
    }

    const toMin = (t: string) => {
      const [h, m] = String(t || '00:00').split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const startMin = toMin(booking.startTime);
    const endMin = toMin(booking.endTime);

    const hasOverlap = activeOnDay.some((b) => {
      const bStart = toMin(b.startTime);
      const bEnd = toMin(b.endTime) + safeBuffer;
      return startMin < bEnd && endMin + safeBuffer > bStart;
    });
    if (hasOverlap) {
      return { success: true, rescheduled: false };
    }

    const saved = await saveAppointmentToSupabase(env, booking);
    if (!saved.success) {
      return { success: false, error: saved.error };
    }
    return { success: true, rescheduled: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao reagendar no banco.' };
  }
}
