/**
 * Audit & Monitoring Helper — Cloudflare Pages Functions
 *
 * Registra e recupera eventos de auditoria:
 * - Uploads e exclusões de mídia
 * - Edições e publicações de conteúdo
 * - Logins bem-sucedidos e com falha
 * - Disparos de Honeypot (formulários, scrapers, sondadores de portas/WordPress)
 *
 * Armazena com buffer em memória.
 */

export type AuditEventType =
  | 'MEDIA_UPLOAD'
  | 'MEDIA_DELETE'
  | 'CONTENT_DRAFT_SAVE'
  | 'CONTENT_PUBLISH'
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAIL'
  | 'ADMIN_LOGOUT'
  | 'HONEYPOT_BOT_TRAP'
  | 'HONEYPOT_FORM_SPAM'
  | 'HONEYPOT_TIME_TRAP'
  | 'HONEYPOT_SCRAPER_TRAP'
  | 'CONTACT_MESSAGE_RECEIVED';

export interface AuditEvent {
  id: string;
  timestamp: string; // ISO 8601
  type: AuditEventType;
  severity: 'info' | 'warning' | 'critical' | 'alert';
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

// In-memory buffer fallback for Edge isolates / local dev
const inMemoryAuditBuffer: AuditEvent[] = [];
const MAX_STORED_EVENTS = 500;

/**
 * Registra um evento de auditoria no sistema
 */
export async function recordAuditEvent(
  env: AuditEnv,
  request: Request | null,
  eventData: {
    type: AuditEventType;
    severity?: 'info' | 'warning' | 'critical' | 'alert';
    summary: string;
    details?: Record<string, any>;
    actor?: {
      ip?: string;
      country?: string;
      city?: string;
      userAgent?: string;
    };
  }
): Promise<AuditEvent> {
  const now = new Date();

  // Extrai informações do cliente a partir dos headers da Cloudflare
  let ip = eventData.actor?.ip;
  let country = eventData.actor?.country;
  let city = eventData.actor?.city;
  let userAgent = eventData.actor?.userAgent;

  if (request) {
    if (!ip) {
      ip =
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For') ||
        '127.0.0.1';
    }
    if (!country) {
      country = request.headers.get('CF-IPCountry') || 'BR';
    }
    if (!city) {
      city = request.headers.get('CF-IPCity') || '';
    }
    if (!userAgent) {
      userAgent = request.headers.get('User-Agent') || 'Desconhecido';
    }
  }

  // Gera ID único
  const randomHex = Math.random().toString(36).substring(2, 8);
  const id = `aud_${now.getTime()}_${randomHex}`;

  // Severidade padrão baseada no tipo
  let defaultSeverity: AuditEvent['severity'] = 'info';
  if (
    eventData.type.startsWith('HONEYPOT_') ||
    eventData.type === 'ADMIN_LOGIN_FAIL'
  ) {
    defaultSeverity = 'warning';
  } else if (eventData.type === 'MEDIA_DELETE') {
    defaultSeverity = 'warning';
  }

  const newEvent: AuditEvent = {
    id,
    timestamp: now.toISOString(),
    type: eventData.type,
    severity: eventData.severity || defaultSeverity,
    actor: {
      ip: ip || '127.0.0.1',
      country: country || undefined,
      city: city || undefined,
      userAgent: userAgent || undefined,
    },
    summary: eventData.summary,
    details: eventData.details || {},
  };

  // 1. Atualiza buffer em memória
  inMemoryAuditBuffer.unshift(newEvent);
  if (inMemoryAuditBuffer.length > MAX_STORED_EVENTS) {
    inMemoryAuditBuffer.pop();
  }

  return newEvent;
}

/**
 * Recupera o feed de auditoria e métricas agregadas
 */
export async function getAuditFeed(
  env: AuditEnv,
  options?: { limit?: number; type?: string }
): Promise<{ events: AuditEvent[]; stats: AuditStats }> {
  const limit = options?.limit || 200;
  let allEvents: AuditEvent[] = [];

  // 2. Mescla com os eventos em memória (removendo duplicados por id)
  const map = new Map<string, AuditEvent>();
  allEvents.forEach((ev) => map.set(ev.id, ev));
  inMemoryAuditBuffer.forEach((ev) => {
    if (!map.has(ev.id)) {
      map.set(ev.id, ev);
    }
  });

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Calcula estatísticas
  const stats: AuditStats = {
    totalEvents: merged.length,
    totalUploads: merged.filter((e) => e.type === 'MEDIA_UPLOAD').length,
    totalEdits: merged.filter(
      (e) => e.type === 'CONTENT_PUBLISH' || e.type === 'CONTENT_DRAFT_SAVE'
    ).length,
    totalHoneypotTraps: merged.filter((e) => e.type.startsWith('HONEYPOT_')).length,
    totalLogins: merged.filter((e) => e.type === 'ADMIN_LOGIN_SUCCESS').length,
    lastActivity: merged[0]?.timestamp || null,
  };

  // Filtra por tipo se solicitado
  let filtered = merged;
  if (options?.type && options.type !== 'ALL') {
    filtered = merged.filter((e) => e.type === options.type);
  }

  return {
    events: filtered.slice(0, limit),
    stats,
  };
}
