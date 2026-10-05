/**
 * Serviço de Auditoria — Central phdev (Admin Geral)
 * Responsável pelo consumo do feed de auditoria e registro de eventos de segurança
 */

import type { AuditEvent, AuditStats } from '@/lib/admingeral/types';

export interface AuditFeedResponse {
  events: AuditEvent[];
  stats: AuditStats;
}

export async function fetchAuditFeed(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>
): Promise<AuditFeedResponse | null> {
  try {
    const res = await fetchFromApi('/api/audit/feed');
    if (res.ok) {
      const data = await res.json();
      return {
        events: Array.isArray(data.events) ? data.events : [],
        stats: data.stats || {
          totalEvents: 0,
          totalUploads: 0,
          totalEdits: 0,
          totalHoneypotTraps: 0,
          totalLogins: 0,
          lastActivity: null,
        },
      };
    }
  } catch (err) {
    console.warn('[auditService] Erro ao buscar feed de auditoria:', err);
  }
  return null;
}

export async function recordAuditEvent(
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>,
  event: Partial<AuditEvent>
): Promise<boolean> {
  try {
    const res = await fetchFromApi('/api/audit/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    return res.ok;
  } catch {
    return false;
  }
}
