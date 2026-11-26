/**
 * Serviço oficial de integração com Google Meet REST API & Workspace Events API.
 * - Renovação automática de access_token com controle de concorrência
 * - Criação de espaços exclusivos (spaces.create)
 * - Consulta de conferenceRecords, participants e participantSessions
 * - Cálculo de duração efetiva simultânea (>= 2 participantes)
 * - Gerenciamento de assinaturas Workspace Events
 */

import { getSupabaseClient, SupabaseEnv } from '../_supabaseClient';
import { decryptToken, encryptToken } from './_googleCrypto';

export interface GoogleEnv extends SupabaseEnv {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  GOOGLE_CLOUD_PROJECT_ID?: string;
  GOOGLE_PUBSUB_TOPIC?: string;
  GOOGLE_PUBSUB_SUBSCRIPTION?: string;
  GOOGLE_PUBSUB_AUDIENCE?: string;
  GOOGLE_PUBSUB_SERVICE_ACCOUNT?: string;
  GOOGLE_TOKEN_ENCRYPTION_KEY?: string;
  GOOGLE_ALLOWED_EMAIL?: string;
  GOOGLE_MEET_AUTO_ENABLED?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
  CRON_SECRET?: string;
}

export interface GoogleTokenRecord {
  id: string;
  email: string;
  encrypted_refresh_token: string;
  encrypted_access_token: string | null;
  access_token_expires_at: string | null;
  scope: string | null;
  status: 'connected' | 'revoked' | 'expired' | 'error';
  last_error: string | null;
  connected_at: string;
  updated_at: string;
}

const refreshInFlight = new Map<string, Promise<string | null>>();

export function isGoogleMeetAutoEnabled(env: GoogleEnv): boolean {
  const flag = String(env.GOOGLE_MEET_AUTO_ENABLED ?? 'true').trim().toLowerCase();
  return flag !== 'false' && flag !== '0' && flag !== 'off';
}

export async function getGoogleTokenRecord(env: GoogleEnv): Promise<GoogleTokenRecord | null> {
  const supabase = getSupabaseClient(env);
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('google_oauth_tokens')
    .select('*')
    .eq('id', 'primary')
    .maybeSingle();
  if (error || !data) return null;
  return data as GoogleTokenRecord;
}

export async function getValidGoogleAccessToken(env: GoogleEnv): Promise<string | null> {
  const encKey = env.GOOGLE_TOKEN_ENCRYPTION_KEY || '';
  const clientId = env.GOOGLE_CLIENT_ID || '';
  const clientSecret = env.GOOGLE_CLIENT_SECRET || '';
  if (!encKey || !clientId || !clientSecret) return null;

  const record = await getGoogleTokenRecord(env);
  if (!record || record.status !== 'connected' || !record.encrypted_refresh_token) {
    return null;
  }

  // Verifica se access_token em cache ainda é válido (margem de 2 minutos)
  if (record.encrypted_access_token && record.access_token_expires_at) {
    const expiresMs = new Date(record.access_token_expires_at).getTime();
    if (Number.isFinite(expiresMs) && expiresMs - Date.now() > 120_000) {
      try {
        return await decryptToken(record.encrypted_access_token, encKey);
      } catch {
        // Segue para refresh
      }
    }
  }

  // Controle de concorrência para evitar múltiplos refreshes simultâneos
  const existing = refreshInFlight.get('primary');
  if (existing) return existing;

  const promise = (async () => {
    try {
      const refreshToken = await decryptToken(record.encrypted_refresh_token, encKey);
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data: any = await res.json().catch(() => ({}));
      const supabase = getSupabaseClient(env);

      if (!res.ok || !data.access_token) {
        const errCode = String(data.error || 'token_refresh_failed');
        const nextStatus = errCode === 'invalid_grant' ? 'expired' : 'error';
        if (supabase) {
          await supabase
            .from('google_oauth_tokens')
            .update({
              status: nextStatus,
              last_error: errCode,
              updated_at: new Date().toISOString(),
            })
            .eq('id', 'primary');
        }
        return null;
      }

      const expiresIn = Number(data.expires_in || 3600);
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const encAccess = await encryptToken(data.access_token, encKey);

      const updatePayload: Record<string, any> = {
        encrypted_access_token: encAccess,
        access_token_expires_at: expiresAt,
        status: 'connected',
        last_error: null,
        updated_at: new Date().toISOString(),
      };

      // Preserva refresh_token existente se o Google não retornar um novo
      if (data.refresh_token) {
        updatePayload.encrypted_refresh_token = await encryptToken(data.refresh_token, encKey);
      }

      if (supabase) {
        await supabase.from('google_oauth_tokens').update(updatePayload).eq('id', 'primary');
      }

      return data.access_token as string;
    } finally {
      refreshInFlight.delete('primary');
    }
  })();

  refreshInFlight.set('primary', promise);
  return promise;
}

export interface CreatedMeetSpace {
  spaceName: string; // ex: "spaces/abc123"
  meetingUri: string; // ex: "https://meet.google.com/xxx-yyyy-zzz"
  meetingCode: string; // ex: "xxx-yyyy-zzz"
}

export async function createGoogleMeetSpace(env: GoogleEnv): Promise<CreatedMeetSpace | null> {
  const accessToken = await getValidGoogleAccessToken(env);
  if (!accessToken) return null;

  const res = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: {
        accessType: 'OPEN',
        entryPointAccess: 'ALL',
      },
    }),
  });

  if (!res.ok) {
    console.error('[GoogleMeet] Falha ao criar espaço:', res.status);
    return null;
  }

  const data: any = await res.json().catch(() => null);
  if (!data?.name || !data?.meetingUri) return null;

  return {
    spaceName: String(data.name),
    meetingUri: String(data.meetingUri),
    meetingCode: String(data.meetingCode || ''),
  };
}

export async function createWorkspaceEventsSubscription(
  env: GoogleEnv,
  spaceName: string,
  bookingId: string
): Promise<{ subscriptionName: string; expireTime: string } | null> {
  const accessToken = await getValidGoogleAccessToken(env);
  const topic = env.GOOGLE_PUBSUB_TOPIC;
  if (!accessToken || !topic || !spaceName) return null;

  // Target resource no formato //meet.googleapis.com/spaces/{space}
  const targetResource = `//meet.googleapis.com/${spaceName.replace(/^\/+/, '')}`;
  const eventTypes = [
    'google.workspace.meet.conference.v2.started',
    'google.workspace.meet.conference.v2.ended',
    'google.workspace.meet.participant.v2.joined',
    'google.workspace.meet.participant.v2.left',
  ];

  // Sem resource data no payload => TTL máximo de 7 dias
  const expireTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch('https://workspaceevents.googleapis.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      targetResource,
      eventTypes,
      notificationEndpoint: { pubsubTopic: topic },
      payloadOptions: { includeResource: false },
      ttl: '604800s',
    }),
  });

  if (!res.ok) {
    console.warn('[WorkspaceEvents] Falha ao criar assinatura:', res.status);
    return null;
  }

  const op: any = await res.json().catch(() => null);
  const subName = op?.response?.name || op?.name;
  const subExpire = op?.response?.expireTime || expireTime;

  if (!subName) return null;

  const supabase = getSupabaseClient(env);
  if (supabase) {
    await supabase.from('google_meet_subscriptions').upsert({
      subscription_name: subName,
      booking_id: bookingId,
      space_name: spaceName,
      target_resource: targetResource,
      event_types: eventTypes,
      state: 'ACTIVE',
      expire_time: subExpire,
      updated_at: new Date().toISOString(),
    });
  }

  return { subscriptionName: subName, expireTime: subExpire };
}

export async function renewWorkspaceEventsSubscription(
  env: GoogleEnv,
  subscriptionName: string
): Promise<boolean> {
  const accessToken = await getValidGoogleAccessToken(env);
  if (!accessToken || !subscriptionName) return false;

  const res = await fetch(
    `https://workspaceevents.googleapis.com/v1/${subscriptionName}?updateMask=ttl`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: '604800s' }),
    }
  );

  const supabase = getSupabaseClient(env);
  if (!res.ok) {
    if (res.status === 404 && supabase) {
      await supabase
        .from('google_meet_subscriptions')
        .update({ state: 'EXPIRED', updated_at: new Date().toISOString() })
        .eq('subscription_name', subscriptionName);
    }
    return false;
  }

  const data: any = await res.json().catch(() => null);
  const newExpire =
    data?.response?.expireTime ||
    data?.expireTime ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (supabase) {
    await supabase
      .from('google_meet_subscriptions')
      .update({
        state: 'ACTIVE',
        expire_time: newExpire,
        last_renewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_name', subscriptionName);
  }
  return true;
}

export interface ConferenceSummary {
  conferenceRecordName: string;
  startTime: string | null;
  endTime: string | null;
  totalDurationSeconds: number | null;
  effectiveDurationSeconds: number | null;
  participantCount: number;
  hasSimultaneousAttendance: boolean;
}

/**
 * Calcula a duração em segundos em que >= 2 participantes estiveram simultaneamente presentes.
 */
export function computeSimultaneousAttendanceSeconds(
  intervals: Array<{ startMs: number; endMs: number }>
): number {
  if (intervals.length < 2) return 0;
  const events: Array<{ t: number; delta: number }> = [];
  for (const iv of intervals) {
    if (iv.endMs > iv.startMs) {
      events.push({ t: iv.startMs, delta: 1 });
      events.push({ t: iv.endMs, delta: -1 });
    }
  }
  events.sort((a, b) => a.t - b.t || a.delta - b.delta);

  let active = 0;
  let simultaneousMs = 0;
  let prevT: number | null = null;

  for (const ev of events) {
    if (prevT !== null && active >= 2 && ev.t > prevT) {
      simultaneousMs += ev.t - prevT;
    }
    active += ev.delta;
    prevT = ev.t;
  }

  return Math.round(simultaneousMs / 1000);
}

export async function fetchLatestConferenceSummary(
  env: GoogleEnv,
  spaceName: string
): Promise<ConferenceSummary | null> {
  const accessToken = await getValidGoogleAccessToken(env);
  if (!accessToken || !spaceName) return null;

  const filter = encodeURIComponent(`space.name="${spaceName}"`);
  const listRes = await fetch(
    `https://meet.googleapis.com/v2/conferenceRecords?filter=${filter}&pageSize=5`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) return null;

  const listData: any = await listRes.json().catch(() => null);
  const records: any[] = Array.isArray(listData?.conferenceRecords) ? listData.conferenceRecords : [];
  if (records.length === 0) return null;

  // Pega o registro mais recente
  records.sort((a, b) => String(b.startTime || '').localeCompare(String(a.startTime || '')));
  const rec = records[0];
  const recName = String(rec.name);
  const startTime = rec.startTime ? String(rec.startTime) : null;
  const endTime = rec.endTime ? String(rec.endTime) : null;

  let totalDurationSeconds: number | null = null;
  if (startTime && endTime) {
    totalDurationSeconds = Math.max(
      0,
      Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)
    );
  }

  // Busca participantes para calcular duração efetiva simultânea
  const partRes = await fetch(`https://meet.googleapis.com/v2/${recName}/participants?pageSize=20`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const partData: any = partRes.ok ? await partRes.json().catch(() => null) : null;
  const participants: any[] = Array.isArray(partData?.participants) ? partData.participants : [];

  const intervals: Array<{ startMs: number; endMs: number }> = [];
  for (const p of participants) {
    if (p.earliestStartTime) {
      const sMs = new Date(p.earliestStartTime).getTime();
      const eMs = p.latestEndTime
        ? new Date(p.latestEndTime).getTime()
        : endTime
        ? new Date(endTime).getTime()
        : Date.now();
      if (Number.isFinite(sMs) && Number.isFinite(eMs) && eMs > sMs) {
        intervals.push({ startMs: sMs, endMs: eMs });
      }
    }
  }

  const effectiveDurationSeconds =
    participants.length >= 2 ? computeSimultaneousAttendanceSeconds(intervals) : 0;

  return {
    conferenceRecordName: recName,
    startTime,
    endTime,
    totalDurationSeconds,
    effectiveDurationSeconds,
    participantCount: participants.length,
    hasSimultaneousAttendance: participants.length >= 2 && effectiveDurationSeconds > 0,
  };
}
