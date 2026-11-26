/**
 * Cloudflare Pages Function: POST /api/google/events
 * Receptor Push do Google Cloud Pub/Sub para eventos do Google Meet (Workspace Events API).
 * - Valida assinatura RS256 do JWT OIDC via JWKS oficial do Google
 * - Valida iss, aud, exp, email_verified e service account autorizada
 * - Garante idempotência persistente em google_meet_events_log
 */

import { getSupabaseClient } from '../_supabaseClient';
import { listAppointmentsFromSupabase, saveAppointmentToSupabase } from '../_supabaseStore';
import { fetchLatestConferenceSummary, GoogleEnv } from './_googleMeetService';

let cachedJwks: { keys: JsonWebKey[]; fetchedAt: number } | null = null;

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getGoogleJwks(): Promise<JsonWebKey[]> {
  if (cachedJwks && Date.now() - cachedJwks.fetchedAt < 3600_000) {
    return cachedJwks.keys;
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) throw new Error('Falha ao buscar JWKS do Google.');
  const data: any = await res.json();
  const keys = Array.isArray(data?.keys) ? data.keys : [];
  cachedJwks = { keys, fetchedAt: Date.now() };
  return keys;
}

async function verifyPubSubOidcJwt(
  token: string,
  expectedAudience: string,
  expectedServiceAccount?: string
): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, sigB64] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(headerB64)));
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
  } catch {
    return false;
  }

  if (header.alg !== 'RS256' || !header.kid) return false;
  const iss = String(payload.iss || '');
  if (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') return false;
  if (payload.aud !== expectedAudience) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || Number(payload.exp) <= nowSec) return false;
  if (expectedServiceAccount) {
    if (!payload.email_verified || String(payload.email || '').toLowerCase() !== expectedServiceAccount.toLowerCase()) {
      return false;
    }
  }

  const keys = await getGoogleJwks();
  const jwk = keys.find((k: any) => k.kid === header.kid);
  if (!jwk) return false;

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sigBytes = base64UrlToBytes(sigB64);
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    sigBytes as BufferSource,
    signedData
  );
}

export const onRequestPost = async (context: { request: Request; env: GoogleEnv }) => {
  const { request, env } = context;

  const audience = env.GOOGLE_PUBSUB_AUDIENCE;
  if (!audience) {
    return new Response(JSON.stringify({ error: 'GOOGLE_PUBSUB_AUDIENCE não configurado.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!bearer) {
    return new Response(JSON.stringify({ error: 'Token OIDC ausente.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validJwt = await verifyPubSubOidcJwt(
    bearer,
    audience,
    env.GOOGLE_PUBSUB_SERVICE_ACCOUNT
  ).catch(() => false);

  if (!validJwt) {
    return new Response(JSON.stringify({ error: 'Token OIDC inválido.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body: any = await request.json().catch(() => null);
  const msg = body?.message;
  if (!msg) {
    return new Response(JSON.stringify({ error: 'Payload Pub/Sub inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const attrs = msg.attributes || {};
  const eventId = String(attrs['ce-id'] || msg.messageId || '');
  const eventType = String(attrs['ce-type'] || '');
  const ceSubject = String(attrs['ce-subject'] || '');
  const eventTime = attrs['ce-time'] ? String(attrs['ce-time']) : new Date().toISOString();

  if (!eventId || !eventType) {
    return new Response(JSON.stringify({ ok: true, ignored: 'missing_metadata' }), { status: 200 });
  }

  const supabase = getSupabaseClient(env);
  if (supabase) {
    const { data: existing } = await supabase
      .from('google_meet_events_log')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, deduplicated: true }), { status: 200 });
    }
  }

  // Extrai spaces/{id} de //meet.googleapis.com/spaces/{id}
  const spaceMatch = ceSubject.match(/spaces\/[A-Za-z0-9_-]+/);
  const spaceName = spaceMatch ? spaceMatch[0] : '';

  let bookingId: string | null = null;
  if (spaceName) {
    const bookings = await listAppointmentsFromSupabase(env);
    const booking = bookings.find(
      (b) => b.meeting?.spaceName === spaceName && b.status !== 'cancelada'
    );

    if (booking) {
      bookingId = booking.id;
      const nowIso = new Date().toISOString();
      if (!Array.isArray(booking.history)) booking.history = [];

      if (eventType === 'google.workspace.meet.conference.v2.started') {
        if (booking.status === 'confirmada') {
          booking.status = 'em_andamento';
          booking.meeting.actualStartedAt = booking.meeting.actualStartedAt || eventTime;
          booking.meeting.meetSyncStatus = 'synced';
          booking.updatedAt = nowIso;
          booking.history.push({
            at: nowIso,
            action: 'chamada_iniciada',
            note: 'Início da reunião identificado automaticamente pelo Google Meet.',
            author: 'system',
          });
          await saveAppointmentToSupabase(env, booking);
        }
      } else if (eventType === 'google.workspace.meet.conference.v2.ended') {
        const summary = await fetchLatestConferenceSummary(env, spaceName);
        if (summary) {
          booking.meeting.conferenceRecordName = summary.conferenceRecordName;
          booking.meeting.actualStartedAt = summary.startTime || booking.meeting.actualStartedAt;
          booking.meeting.actualEndedAt = summary.endTime || eventTime;
          booking.meeting.actualDurationSeconds = summary.totalDurationSeconds ?? undefined;
          booking.meeting.effectiveDurationSeconds = summary.effectiveDurationSeconds ?? undefined;
          booking.meeting.meetSyncStatus = 'synced';

          if (summary.hasSimultaneousAttendance) {
            booking.status = 'concluida';
            booking.meeting.attendanceStatus = 'confirmed';
            booking.history.push({
              at: nowIso,
              action: 'concluida',
              note: 'Atendimento encerrado e validado automaticamente via Google Meet.',
              author: 'system',
            });
          } else {
            booking.meeting.attendanceStatus = 'insufficient_evidence';
            booking.history.push({
              at: nowIso,
              action: 'atencao_necessaria',
              note: 'Reunião encerrada sem evidência de participação simultânea. Requer revisão.',
              author: 'system',
            });
          }
          booking.updatedAt = nowIso;
          await saveAppointmentToSupabase(env, booking);
        }
      }
    }
  }

  if (supabase) {
    try {
      await supabase.from('google_meet_events_log').insert({
        event_id: eventId,
        event_type: eventType,
        space_name: spaceName || null,
        booking_id: bookingId,
        event_time: eventTime,
      });
    } catch {
      // Silencioso
    }
  }

  return new Response(JSON.stringify({ ok: true, bookingId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
