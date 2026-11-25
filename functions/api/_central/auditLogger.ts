/**
 * Auditoria Durável Centralizada (`audit_logs` no Supabase).
 *
 * Corrige NUA-AUD-005: persiste eventos de segurança no PostgreSQL Supabase
 * (fora da RAM efêmera de isolates) e pseudonimiza endereços IP com HMAC-SHA256.
 */

import { getSupabaseClient } from '../_supabaseClient';
import { hashIpPseudonym } from './secrets';
import type { AuditEnv, AuditEvent, AuditEventType, AuditStats } from '../_auditHelper';

const inMemoryFallback: AuditEvent[] = [];
const MAX_MEMORY_EVENTS = 250;

export async function persistAuditEvent(
  env: AuditEnv,
  request: Request | null,
  eventData: {
    type: AuditEventType;
    severity?: 'info' | 'warning' | 'critical' | 'alert';
    summary: string;
    details?: Record<string, any>;
    actorRole?: string;
    actor?: {
      ip?: string;
      country?: string;
      city?: string;
      userAgent?: string;
    };
  }
): Promise<AuditEvent> {
  const now = new Date();
  let rawIp = eventData.actor?.ip || '';
  let country = eventData.actor?.country || '';
  let city = eventData.actor?.city || '';
  let userAgent = eventData.actor?.userAgent || '';

  if (request) {
    if (!rawIp) {
      rawIp =
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For') ||
        '';
    }
    if (!country) country = request.headers.get('CF-IPCountry') || '';
    if (!city) city = request.headers.get('CF-IPCity') || '';
    if (!userAgent) userAgent = request.headers.get('User-Agent') || '';
  }

  const ipHash = await hashIpPseudonym(rawIp, env as any);
  const randBytes = new Uint8Array(4);
  crypto.getRandomValues(randBytes);
  const randHex = Array.from(randBytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const id = `aud_${now.getTime()}_${randHex}`;

  let severity: AuditEvent['severity'] = eventData.severity || 'info';
  if (!eventData.severity) {
    if (
      eventData.type.startsWith('HONEYPOT_') ||
      eventData.type === 'ADMIN_LOGIN_FAIL' ||
      eventData.type === 'MEDIA_DELETE'
    ) {
      severity = 'warning';
    }
  }

  const event: AuditEvent = {
    id,
    timestamp: now.toISOString(),
    type: eventData.type,
    severity,
    actor: {
      ip: ipHash,
      country: country || undefined,
      city: city || undefined,
      userAgent: userAgent ? userAgent.slice(0, 200) : undefined,
    },
    summary: eventData.summary,
    details: eventData.details || {},
  };

  inMemoryFallback.unshift(event);
  if (inMemoryFallback.length > MAX_MEMORY_EVENTS) {
    inMemoryFallback.pop();
  }

  const sb = getSupabaseClient(env as any);
  if (sb) {
    try {
      await sb.from('audit_logs').insert({
        id: event.id,
        event_type: event.type,
        severity: event.severity,
        actor_role: eventData.actorRole || null,
        actor_ip_hash: ipHash,
        actor_country: event.actor.country || null,
        actor_city: event.actor.city || null,
        actor_ua: event.actor.userAgent || null,
        summary: event.summary,
        details: event.details || {},
        created_at: event.timestamp,
      });
    } catch (err) {
      console.warn('[auditLogger] Falha ao gravar em audit_logs:', err);
    }
  }

  return event;
}

export async function queryAuditFeed(
  env: AuditEnv,
  options?: { limit?: number; type?: string }
): Promise<{ events: AuditEvent[]; stats: AuditStats }> {
  const limit = Math.min(Math.max(Number(options?.limit || 200), 1), 500);
  const map = new Map<string, AuditEvent>();

  const sb = getSupabaseClient(env as any);
  if (sb) {
    try {
      let query = sb
        .from('audit_logs')
        .select('id, event_type, severity, actor_ip_hash, actor_country, actor_city, actor_ua, summary, details, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.type && options.type !== 'all') {
        query = query.eq('event_type', options.type);
      }

      const { data } = await query;
      if (Array.isArray(data)) {
        for (const row of data) {
          map.set(row.id, {
            id: row.id,
            timestamp: row.created_at,
            type: row.event_type as AuditEventType,
            severity: (row.severity || 'info') as AuditEvent['severity'],
            actor: {
              ip: row.actor_ip_hash || 'unknown',
              country: row.actor_country || undefined,
              city: row.actor_city || undefined,
              userAgent: row.actor_ua || undefined,
            },
            summary: row.summary || '',
            details: row.details || {},
          });
        }
      }
    } catch (err) {
      console.warn('[auditLogger] Falha ao ler audit_logs:', err);
    }
  }

  for (const ev of inMemoryFallback) {
    if (!map.has(ev.id)) map.set(ev.id, ev);
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const stats: AuditStats = {
    totalEvents: merged.length,
    totalUploads: merged.filter((e) => e.type === 'MEDIA_UPLOAD').length,
    totalEdits: merged.filter(
      (e) => e.type === 'CONTENT_PUBLISH' || e.type === 'CONTENT_DRAFT_SAVE'
    ).length,
    totalHoneypotTraps: merged.filter((e) => e.type.startsWith('HONEYPOT_')).length,
    totalLogins: merged.filter(
      (e) => e.type === 'ADMIN_LOGIN_SUCCESS' || e.type === 'ADMIN_LOGIN_FAIL'
    ).length,
    lastActivity: merged.length > 0 ? merged[0].timestamp : null,
  };

  let filtered = merged;
  if (options?.type && options.type !== 'all') {
    filtered = filtered.filter((e) => e.type === options.type);
  }

  return { events: filtered.slice(0, limit), stats };
}
