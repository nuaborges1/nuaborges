/**
 * Cloudflare Pages Function: POST /api/cron/meet-sync
 * Sincronização periódica de contingência + renovação de assinaturas Workspace Events.
 * Autenticado por CRON_SECRET.
 */

import { timingSafeEqual } from '../id/_crypto';
import { getSupabaseClient } from '../_supabaseClient';
import { listAppointmentsFromSupabase, saveAppointmentToSupabase } from '../_supabaseStore';
import { ensureBookingMeetSpace } from '../google/_bookingMeetProvisioner';
import {
  createWorkspaceEventsSubscription,
  fetchLatestConferenceSummary,
  GoogleEnv,
  isGoogleMeetAutoEnabled,
  renewWorkspaceEventsSubscription,
} from '../google/_googleMeetService';

export const onRequestPost = async (context: { request: Request; env: GoogleEnv }) => {
  const { request, env } = context;
  const configuredSecret = String(env.CRON_SECRET || '').trim();
  if (!configuredSecret) {
    return new Response(JSON.stringify({ success: false, error: 'CRON_SECRET não configurado.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const explicitHeader = (request.headers.get('x-cron-secret') || '').trim();
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = explicitHeader || bearerToken;

  if (!token || !timingSafeEqual(token, configuredSecret)) {
    return new Response(JSON.stringify({ success: false, error: 'Não autorizado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isGoogleMeetAutoEnabled(env)) {
    return new Response(JSON.stringify({ success: true, skipped: 'auto_disabled' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stats = {
    provisionedSpaces: 0,
    renewedSubscriptions: 0,
    createdSubscriptions: 0,
    reconciledBookings: 0,
  };

  // 1. Renova assinaturas Workspace Events expirando nas próximas 24h
  const supabase = getSupabaseClient(env);
  if (supabase) {
    const thresholdIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: expiringSubs } = await supabase
      .from('google_meet_subscriptions')
      .select('subscription_name')
      .eq('state', 'ACTIVE')
      .lt('expire_time', thresholdIso)
      .limit(20);

    for (const sub of expiringSubs || []) {
      const ok = await renewWorkspaceEventsSubscription(env, sub.subscription_name);
      if (ok) stats.renewedSubscriptions++;
    }
  }

  // 2. Processa apenas reservas ativas (confirmada / em_andamento)
  const bookings = await listAppointmentsFromSupabase(env);
  const nowMs = Date.now();

  for (const booking of bookings) {
    if (booking.status !== 'confirmada' && booking.status !== 'em_andamento') continue;

    // 2a. Provisiona sala se ainda não tiver
    if (booking.status === 'confirmada' && !booking.meeting?.spaceName && !booking.meeting?.url) {
      const updated = await ensureBookingMeetSpace(env, booking);
      if (updated.meeting?.spaceName) stats.provisionedSpaces++;
      continue;
    }

    const spaceName = booking.meeting?.spaceName;
    if (!spaceName) continue;

    const scheduledMs = new Date(`${booking.date}T${booking.startTime || '00:00'}:00Z`).getTime();
    if (!Number.isFinite(scheduledMs)) continue;

    // 2b. Garante assinatura ativa se faltar <= 6 dias para a chamada
    if (supabase && scheduledMs - nowMs <= 6 * 24 * 60 * 60 * 1000 && scheduledMs > nowMs - 24 * 60 * 60 * 1000) {
      const { data: activeSub } = await supabase
        .from('google_meet_subscriptions')
        .select('subscription_name')
        .eq('booking_id', booking.id)
        .eq('state', 'ACTIVE')
        .maybeSingle();

      if (!activeSub) {
        const created = await createWorkspaceEventsSubscription(env, spaceName, booking.id);
        if (created) stats.createdSubscriptions++;
      }
    }

    // 2c. Reconcilia conferências que já deveriam ter começado ou estão em_andamento
    if (booking.status === 'em_andamento' || nowMs >= scheduledMs - 15 * 60 * 1000) {
      const summary = await fetchLatestConferenceSummary(env, spaceName);
      if (!summary) continue;

      const nowIso = new Date().toISOString();
      if (!Array.isArray(booking.history)) booking.history = [];
      let changed = false;

      if (summary.endTime) {
        booking.meeting.conferenceRecordName = summary.conferenceRecordName;
        booking.meeting.actualStartedAt = summary.startTime || booking.meeting.actualStartedAt;
        booking.meeting.actualEndedAt = summary.endTime;
        booking.meeting.actualDurationSeconds = summary.totalDurationSeconds ?? undefined;
        booking.meeting.effectiveDurationSeconds = summary.effectiveDurationSeconds ?? undefined;
        booking.meeting.meetSyncStatus = 'synced';

        if (summary.hasSimultaneousAttendance) {
          booking.status = 'concluida';
          booking.meeting.attendanceStatus = 'confirmed';
          booking.history.push({
            at: nowIso,
            action: 'concluida',
            note: 'Atendimento concluído via sincronização de contingência Google Meet.',
            author: 'system',
          });
        } else {
          booking.meeting.attendanceStatus = 'insufficient_evidence';
        }
        changed = true;
      } else if (summary.startTime && !summary.endTime && booking.status === 'confirmada') {
        booking.status = 'em_andamento';
        booking.meeting.conferenceRecordName = summary.conferenceRecordName;
        booking.meeting.actualStartedAt = summary.startTime;
        booking.meeting.meetSyncStatus = 'synced';
        booking.history.push({
          at: nowIso,
          action: 'chamada_iniciada',
          note: 'Início identificado via sincronização de contingência Google Meet.',
          author: 'system',
        });
        changed = true;
      }

      if (changed) {
        booking.updatedAt = nowIso;
        await saveAppointmentToSupabase(env, booking);
        stats.reconciledBookings++;
      }
    }
  }

  return new Response(JSON.stringify({ success: true, stats }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
