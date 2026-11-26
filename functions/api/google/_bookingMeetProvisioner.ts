import { AppointmentBooking } from '../../../lib/appointmentsCanonical';
import { saveAppointmentToSupabase } from '../_supabaseStore';
import {
  createGoogleMeetSpace,
  createWorkspaceEventsSubscription,
  GoogleEnv,
  isGoogleMeetAutoEnabled,
} from './_googleMeetService';

/**
 * Provisiona uma sala exclusiva no Google Meet para uma reserva confirmada.
 * Idempotente: se já houver URL ou spaceName válido, não cria outro espaço.
 * Nunca lança exceção fatal para não comprometer o fluxo financeiro.
 */
export async function ensureBookingMeetSpace(
  env: GoogleEnv,
  booking: AppointmentBooking
): Promise<AppointmentBooking> {
  if (!isGoogleMeetAutoEnabled(env)) return booking;
  if (booking.status !== 'confirmada') return booking;
  if (booking.meeting?.spaceName && booking.meeting?.url) return booking;
  if (booking.meeting?.url && booking.meeting.url.includes('meet.google.com/')) return booking;

  try {
    const created = await createGoogleMeetSpace(env);
    if (!created) {
      booking.meeting = {
        ...booking.meeting,
        platform: booking.meeting?.platform || 'google_meet',
        meetSyncStatus: 'pending',
      };
      await saveAppointmentToSupabase(env, booking).catch(() => {});
      return booking;
    }

    const nowIso = new Date().toISOString();
    booking.meeting = {
      ...booking.meeting,
      platform: 'google_meet',
      url: created.meetingUri,
      spaceName: created.spaceName,
      meetingCode: created.meetingCode,
      visibleToClient: true,
      meetSyncStatus: 'synced',
    };
    booking.updatedAt = nowIso;
    if (!Array.isArray(booking.history)) booking.history = [];
    booking.history.push({
      at: nowIso,
      action: 'meet_criado',
      note: 'Sala privativa do Google Meet gerada automaticamente.',
      author: 'system',
    });

    await saveAppointmentToSupabase(env, booking);

    // Se a chamada for nos próximos 6 dias, já cria a assinatura de eventos
    const bookingDateMs = new Date(`${booking.date}T${booking.startTime || '00:00'}:00Z`).getTime();
    if (Number.isFinite(bookingDateMs) && bookingDateMs - Date.now() <= 6 * 24 * 60 * 60 * 1000) {
      await createWorkspaceEventsSubscription(env, created.spaceName, booking.id).catch(() => {});
    }
  } catch (err) {
    console.warn('[BookingMeetProvisioner] Falha não-fatal ao criar sala Meet:', err);
  }

  return booking;
}
