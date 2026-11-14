/**
 * Serviço Client-Side de Agendamentos | Nua Borges
 * 
 * Comunicação com a API de Agendamentos (/api/appointments/*),
 * com autenticação segura e fallback isomorfo resiliente em ambiente local.
 */

import {
  AppointmentBooking,
  AppointmentModality,
  AppointmentScheduleSettings,
  computeAvailableSlotsForDate,
  normalizeScheduleSettings,
} from '@/lib/appointmentsCanonical';
import {
  getAppointmentsState,
  saveAppointmentsState,
  getScheduleSettings,
  getModalities,
  listBookings,
  getBookingByToken,
  createBooking,
  confirmBookingPayment,
  updateMeetingLink,
  cancelBooking,
  markBookingComplete,
  markBookingAbsent,
  rescheduleBooking,
  saveScheduleSettings,
  saveModalities,
  CreateBookingInput,
} from '@/lib/appointmentsStore';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { isLocalhost } from '@/lib/env';

// ==========================================
// PÚBLICO (VISITANTES & CLIENTES)
// ==========================================

export interface AvailabilityResponse {
  success: boolean;
  date: string;
  slots: string[];
  modality?: AppointmentModality;
  error?: string;
}

/**
 * Consulta horários livres para uma data e modalidade
 */
export async function fetchAvailableSlots(
  date: string,
  modalityId: string
): Promise<AvailabilityResponse> {
  const apiUrl = getPublicApiUrl();
  const endpoint = `${apiUrl}/api/appointments/availability?date=${encodeURIComponent(
    date
  )}&modalityId=${encodeURIComponent(modalityId)}`;

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return data;
      }
    }
  } catch {}

  // Fallback gracioso local
  const state = getAppointmentsState();
  const modality = state.modalities.find((m) => m.id === modalityId && m.active);
  if (!modality) {
    return { success: false, date, slots: [], error: 'Modalidade não encontrada.' };
  }

  const slots = computeAvailableSlotsForDate(
    date,
    modality,
    state.settings,
    state.bookings,
    new Date()
  );

  return {
    success: true,
    date,
    slots,
    modality,
  };
}

/**
 * Cria uma nova reserva
 */
export async function submitBooking(input: CreateBookingInput): Promise<{
  success: boolean;
  booking?: AppointmentBooking;
  error?: string;
}> {
  const apiUrl = getPublicApiUrl();
  const endpoint = `${apiUrl}/api/appointments/book`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(input),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data && data.success && data.booking) {
      return data;
    }
    return { success: false, error: data?.error || 'Não foi possível gerar o Pix da reserva. Tente novamente.' };
  } catch {
    return { success: false, error: 'Servidor de pagamento inacessível. Tente novamente em instantes.' };
  }
}

/**
 * Consulta uma reserva pelo token privado
 */
export async function lookupBooking(token: string): Promise<{
  success: boolean;
  booking?: AppointmentBooking;
  error?: string;
}> {
  if (!token) return { success: false, error: 'Token não informado.' };

  const apiUrl = getPublicApiUrl();
  const endpoint = `${apiUrl}/api/appointments/lookup?token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && data.booking) {
        return data;
      }
    }
  } catch {}

  // Fallback gracioso local
  const booking = getBookingByToken(token);
  if (!booking) {
    // Também checa se está em localStorage nua_last_active_booking
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('nua_last_active_booking');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.publicToken === token || parsed.id === token || parsed.token === token)) {
            return { success: true, booking: parsed };
          }
        }
      } catch {}
    }
    return { success: false, error: 'Reserva não encontrada.' };
  }
  syncBookingToServer(booking).catch(() => {});
  return { success: true, booking };
}

// Controle anti-loop de sincronização: armazena última tentativa e falhas por bookingId
const syncAttemptsMap = new Map<string, { lastAttempt: number; failures: number }>();

/**
 * Sincroniza uma reserva ativamente com o servidor da API com backoff e limite de retry
 */
export async function syncBookingToServer(booking: AppointmentBooking): Promise<boolean> {
  if (!booking || (!booking.id && !booking.publicToken)) return false;
  const key = booking.id || booking.publicToken;
  const now = Date.now();
  const attempt = syncAttemptsMap.get(key) || { lastAttempt: 0, failures: 0 };

  // Se já falhou 3 vezes consecutivas, bloqueia retentativas automáticas por 5 minutos
  if (attempt.failures >= 3 && now - attempt.lastAttempt < 300000) {
    return false;
  }

  // Cooldown mínimo de 30 segundos entre tentativas para a mesma reserva
  if (now - attempt.lastAttempt < 30000) {
    return false;
  }

  attempt.lastAttempt = now;
  syncAttemptsMap.set(key, attempt);

  const apiUrl = getPublicApiUrl();
  const endpoint = `${apiUrl}/api/appointments/sync`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking }),
    });
    if (res.ok) {
      attempt.failures = 0;
      return true;
    } else {
      attempt.failures++;
      return false;
    }
  } catch {
    attempt.failures++;
    return false;
  }
}

/**
 * Consulta o status real do Pix no servidor (Stripe)
 */
export async function verifyPixPayment(
  bookingId: string
): Promise<{ success: boolean; paid?: boolean; booking?: AppointmentBooking }> {
  const apiUrl = getPublicApiUrl();
  const endpoint = `${apiUrl}/api/appointments/pix`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.booking) {
        // Atualiza no estado local também
        confirmBookingPayment(bookingId, data.booking.payment?.transactionId || `PIX_${Date.now()}`, 'client');
        return data;
      }
    }
  } catch {}

  return { success: false, paid: false };
}

// ==========================================
// PAINEL ADMINISTRATIVO (LUA BORGES)
// ==========================================

export interface AdminAppointmentsData {
  success: boolean;
  settings: AppointmentScheduleSettings;
  modalities: AppointmentModality[];
  bookings: AppointmentBooking[];
  error?: string;
}

const APPOINTMENTS_ADMIN_CACHE_KEY = 'nua_appointments_admin_cache_v1';
const APPOINTMENTS_ADMIN_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutos

interface CachedAppointmentsAdmin {
  data: AdminAppointmentsData;
  timestamp: number;
}

let memoryAppointmentsCache: CachedAppointmentsAdmin | null = null;
let inFlightAppointmentsPromise: Promise<AdminAppointmentsData> | null = null;

export function getCachedAdminAppointments(): AdminAppointmentsData | null {
  const now = Date.now();
  if (
    memoryAppointmentsCache &&
    now - memoryAppointmentsCache.timestamp < APPOINTMENTS_ADMIN_CACHE_TTL_MS
  ) {
    return memoryAppointmentsCache.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(APPOINTMENTS_ADMIN_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedAppointmentsAdmin;
        if (parsed?.data && now - parsed.timestamp < APPOINTMENTS_ADMIN_CACHE_TTL_MS) {
          memoryAppointmentsCache = parsed;
          return parsed.data;
        }
      }
    } catch {}
  }
  return null;
}

function writeAdminAppointmentsCache(data: AdminAppointmentsData): void {
  const entry: CachedAppointmentsAdmin = { data, timestamp: Date.now() };
  memoryAppointmentsCache = entry;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(APPOINTMENTS_ADMIN_CACHE_KEY, JSON.stringify(entry));
    } catch {}
  }
}

export function invalidateAdminAppointmentsCache(): void {
  memoryAppointmentsCache = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(APPOINTMENTS_ADMIN_CACHE_KEY);
    } catch {}
  }
}

/**
 * Carrega a visão completa para a administradora com mesclagem e sincronização bidirecional
 */
export async function fetchAdminAppointments(options?: {
  force?: boolean;
}): Promise<AdminAppointmentsData> {
  if (!options?.force) {
    const cached = getCachedAdminAppointments();
    if (cached) {
      return cached;
    }
  }

  if (inFlightAppointmentsPromise) {
    return inFlightAppointmentsPromise;
  }

  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  const endpoint = `${apiUrl}/api/appointments/admin`;

  inFlightAppointmentsPromise = (async () => {
    let serverData: AdminAppointmentsData | null = null;

    try {
      const res = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          serverData = data;
        }
      }
    } catch {}

    // Estado em cache local
    const localState = getAppointmentsState();

    // Se o servidor respondeu com sucesso, o banco de dados é a fonte única e autoritativa da verdade.
    if (serverData && serverData.success) {
      const authoritativeBookings = (serverData.bookings || []).sort((a: AppointmentBooking, b: AppointmentBooking) =>
        `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`)
      );
      localState.bookings = authoritativeBookings;
      if (serverData.settings) localState.settings = normalizeScheduleSettings(serverData.settings);
      if (serverData.modalities) localState.modalities = serverData.modalities;
      saveAppointmentsState(localState, { silent: true });

      const result: AdminAppointmentsData = {
        success: true,
        settings: normalizeScheduleSettings(serverData.settings || localState.settings),
        modalities: serverData.modalities || localState.modalities,
        bookings: authoritativeBookings,
      };
      writeAdminAppointmentsCache(result);
      return result;
    }

    // Fallback offline / sem conectividade apenas
    const localBookings = (localState.bookings || []).sort((a, b) =>
      `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`)
    );

    const fallback: AdminAppointmentsData = {
      success: true,
      settings: normalizeScheduleSettings(localState.settings),
      modalities: localState.modalities,
      bookings: localBookings,
    };
    writeAdminAppointmentsCache(fallback);
    return fallback;
  })();

  try {
    return await inFlightAppointmentsPromise;
  } finally {
    inFlightAppointmentsPromise = null;
  }
}

/**
 * Executa uma ação administrativa
 */
export async function executeAdminAction(
  action:
    | 'updateSettings'
    | 'updateModalities'
    | 'confirm'
    | 'updateMeeting'
    | 'cancel'
    | 'complete'
    | 'absent'
    | 'reschedule',
  payload: any
): Promise<{ success: boolean; error?: string; booking?: AppointmentBooking }> {
  const apiUrl = getPublicApiUrl();
  const token = getStoredSessionToken();
  const endpoint = `${apiUrl}/api/appointments/admin`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ action, ...payload }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        invalidateAdminAppointmentsCache();
        return data;
      }
      return { success: false, error: data?.error || 'Ação rejeitada pelo servidor.' };
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `Erro ${res.status}: Falha ao processar ação no servidor.` };
    }
  } catch (err: any) {
    if (!isLocalhost()) {
      return { success: false, error: 'Servidor inacessível. Verifique sua conexão e tente novamente.' };
    }
  }

  // Fallback em ambiente local de desenvolvimento (apenas offline/localhost)
  if (isLocalhost()) {
    invalidateAdminAppointmentsCache();
    switch (action) {
      case 'updateSettings':
        saveScheduleSettings(payload.settings);
        return { success: true };
      case 'updateModalities':
        saveModalities(payload.modalities);
        return { success: true };
      case 'confirm':
        return confirmBookingPayment(payload.bookingId, payload.transactionId, 'admin');
      case 'updateMeeting':
        return updateMeetingLink(payload.bookingId, payload.meetingUrl, payload.instructions);
      case 'cancel':
        return cancelBooking(payload.bookingId, payload.reason, 'admin');
      case 'complete':
        return markBookingComplete(payload.bookingId);
      case 'absent':
        return markBookingAbsent(payload.bookingId);
      case 'reschedule':
        return rescheduleBooking(payload.bookingId, payload.newDate, payload.newStartTime);
      default:
        return { success: false, error: 'Ação desconhecida.' };
    }
  }

  return { success: false, error: 'Falha ao salvar no banco de dados.' };
}
