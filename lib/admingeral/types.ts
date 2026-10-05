/**
 * Tipos e Modelos da Central phdev (Admin Geral)
 * Ecossistema phdev.store
 */

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: string;
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

export interface MediaItem {
  key: string;
  sizeBytes: number;
  uploadedAt: string;
  contentType: string;
  url: string;
  isVideo: boolean;
}

export type AdminGeralTabType =
  | 'stream'
  | 'telemetry'
  | 'media'
  | 'content'
  | 'honeypots'
  | 'requests'
  | 'nua-ai'
  | 'finance'
  | 'settings';
