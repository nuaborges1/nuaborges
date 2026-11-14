import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';
import {
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  mergeScheduleSettings,
  normalizeScheduleSettings,
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
  patch: { settings?: AppointmentScheduleSettings; modalities?: AppointmentModality[] }
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
  return {
    id: b.id,
    public_token: b.publicToken,
    client_name: b.clientName || '',
    client_contact: b.clientPhone || b.clientEmail || '',
    client_instagram: b.clientEmail || '',
    modality_id: b.modalityId,
    date_time: `${b.date}T${b.startTime}:00-03:00`,
    duration_minutes: b.durationMinutes,
    total_price: b.price,
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
      cancellationReason: b.cancellationReason,
      cancelledBy: b.cancelledBy,
      rescheduledFrom: b.rescheduledFrom,
      expiresAt: b.expiresAt,
    }),
    created_at: b.createdAt || new Date().toISOString(),
    updated_at: b.updatedAt || new Date().toISOString(),
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

  const dt = new Date(row.date_time);
  const dateStr = meta.date || (!isNaN(dt.getTime()) ? dt.toISOString().split('T')[0] : '');
  const timeStr = meta.startTime || (!isNaN(dt.getTime())
    ? dt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    : '14:00');

  return {
    id: row.id,
    publicToken: row.public_token,
    modalityId: row.modality_id,
    modalityName:
      meta.modalityName ||
      (row.modality_id === 'chamada-60'
        ? 'Experiência VIP Completa (60 min)'
        : 'Encontro Privativo (30 min)'),
    durationMinutes: row.duration_minutes || 30,
    price: Number(row.total_price) || 0,
    date: dateStr,
    startTime: timeStr,
    endTime: meta.endTime || '',
    clientName: row.client_name || '',
    clientEmail: row.client_instagram?.includes('@') ? row.client_instagram : '',
    clientPhone: row.client_contact || '',
    clientNotes: meta.clientNotes || '',
    status: row.status,
    payment: row.payment || { status: 'pending', method: 'pix', amount: Number(row.total_price) || 0 },
    meeting: meta.meeting || {
      url: row.call_link || '',
      platform: 'google_meet',
      visibleToClient: Boolean(row.call_link),
    },
    history: Array.isArray(meta.history) ? meta.history : [],
    cancellationReason: meta.cancellationReason,
    cancelledBy: meta.cancelledBy,
    rescheduledFrom: meta.rescheduledFrom,
    expiresAt: meta.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function listAppointmentsFromSupabase(
  env: SupabaseEnv,
  options?: { limit?: number; status?: string }
): Promise<AppointmentBooking[]> {
  const sb = getSupabaseClient(env);
  if (!sb) return [];

  try {
    let query = sb.from('appointments').select('*').order('date_time', { ascending: false });
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.error('[SupabaseStore] Erro ao listar appointments:', error);
      return [];
    }

    return data.map(supabaseRowToBooking);
  } catch (err) {
    console.error('[SupabaseStore] Falha ao listar appointments:', err);
    return [];
  }
}

export async function getAppointmentByIdFromSupabase(
  env: SupabaseEnv,
  idOrToken: string
): Promise<AppointmentBooking | null> {
  const sb = getSupabaseClient(env);
  if (!sb) return null;

  try {
    let query = sb.from('appointments').select('*');
    if (idOrToken.startsWith('tok_')) {
      query = query.eq('public_token', idOrToken);
    } else {
      query = query.eq('id', idOrToken);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return supabaseRowToBooking(data);
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
      console.error('[SupabaseStore] Erro ao salvar appointment:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao persistir appointment.' };
  }
}
