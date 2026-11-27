/**
 * Audit & Monitoring Helper — Facade compatível sobre `_central/auditLogger.ts`.
 *
 * Mantém a assinatura pública usada pelos handlers, agora com persistência durável
 * em `audit_logs` (Supabase) e pseudonimização automática de IPs (NUA-AUD-005).
 */

import { persistAuditEvent, queryAuditFeed } from './_central/auditLogger';

export type AuditEventType =
  | 'MEDIA_UPLOAD'
  | 'MEDIA_DELETE'
  | 'CONTENT_DRAFT_SAVE'
  | 'CONTENT_PUBLISH'
  | 'CONTENT_OPS'
  | 'CONTENT_ADMIN_OPERATION'
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAIL'
  | 'ADMIN_LOGOUT'
  | 'HONEYPOT_BOT_TRAP'
  | 'HONEYPOT_FORM_SPAM'
  | 'HONEYPOT_TIME_TRAP'
  | 'HONEYPOT_SCRAPER_TRAP'
  | 'CONTACT_MESSAGE_RECEIVED'
  | 'MUSIC_CONFIG'
  | 'MUSIC_UPDATE'
  | 'MUSIC_DELETE'
  | 'MUSIC_UPLOAD'
  | 'REQUEST_CREATED'
  | 'SECURITY_ACTION'
  | 'VERBAL_IDENTITY_TOGGLED'
  | 'VERBAL_IDENTITY_FORBIDDEN_ACCESS'
  | 'ORDER_CREATED'
  | 'ORDER_PAID'
  | 'ORDER_REFUNDED'
  | 'PERSONALIZADO_CREATED'
  | 'PERSONALIZADO_UPDATED'
  | 'PERSONALIZADO_DELIVERED'
  | 'VIP_BOOKING_CREATED'
  | 'VIP_BOOKING_PAID'
  | 'VIP_BOOKING_UPDATED'
  | 'VAULT_ACCESS_GRANTED'
  | 'GATEWAY_SECURITY_BLOCK'
  | 'ADMIN_MUTATION';

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditEventType;
  severity: 'info' | 'warning' | 'critical' | 'alert';
  actorRole?: string;
  actor: {
    ip: string;
    country?: string;
    city?: string;
    userAgent?: string;
  };
  summary: string;
  details?: Record<string, any>;
}

export interface AuditStats {
  totalEvents: number;
  totalUploads: number;
  totalEdits: number;
  totalHoneypotTraps: number;
  totalLogins: number;
  lastActivity: string | null;
}

export interface AuditEnv {
  [key: string]: any;
}

export async function recordAuditEvent(
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
  return persistAuditEvent(env, request, eventData);
}

export async function getAuditFeed(
  env: AuditEnv,
  options?: { limit?: number; type?: string }
): Promise<{ events: AuditEvent[]; stats: AuditStats }> {
  return queryAuditFeed(env, options);
}
