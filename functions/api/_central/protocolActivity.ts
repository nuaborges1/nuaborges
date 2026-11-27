/**
 * Barramento Unificado de Atividade & Auditoria por Protocolo (PHDEV — NUA Protocol v1.0).
 *
 * - Sanitiza estritamente segredos/PII sensível antes de gravar ou devolver detalhes.
 * - Classifica automaticamente qualquer evento em `audit_logs` no protocolo dono (P01–P09 + HAGOROMO).
 * - Produz título amigável, categoria, ator legível e contadores agregados para o console PHDEV.
 */

import type { AuditEnv, AuditEvent, AuditEventType } from '../_auditHelper';
import { persistAuditEvent } from './auditLogger';

export type ActivityProtocolId =
  | 'kakashi'
  | 'minato'
  | 'kakuzu'
  | 'neji'
  | 'tobirama'
  | 'itachi'
  | 'madara'
  | 'naruto'
  | 'kaguya'
  | 'hagoromo';

export type ActivityActorKind = 'nua' | 'phdev' | 'cliente' | 'webhook' | 'sistema';

export type ActivityCategory =
  | 'compra'
  | 'midia'
  | 'pack'
  | 'personalizado'
  | 'chamada_vip'
  | 'sessao'
  | 'seguranca'
  | 'publicacao'
  | 'contencao'
  | 'recuperacao'
  | 'auditoria';

export interface ProtocolActivityItem {
  id: string;
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'alert';
  protocol: ActivityProtocolId;
  actor: ActivityActorKind;
  actorLabel: string;
  category: ActivityCategory;
  categoryLabel: string;
  friendlyTitle: string;
  friendlySubtitle?: string;
  entity?: {
    type: string;
    id?: string;
    label?: string;
  };
  details: Record<string, unknown>;
}

export interface ProtocolActivitySummary {
  total: number;
  nuaActions: number;
  commerceEvents: number;
  mediaUploads: number;
  securityAlerts: number;
  lastEventAt: string | null;
}

const SENSITIVE_KEY_PATTERN =
  /pass|secret|token|cookie|auth|signature|cpf|card|cvv|private|key|hmac|otp|code_hash/i;

export function sanitizeEventDetails(input: unknown, depth = 0): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || depth > 3) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    if (value === undefined) continue;
    if (value === null || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (typeof value === 'string') {
      out[key] = value.length > 260 ? `${value.slice(0, 260)}…` : value;
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 12).map((item) =>
        typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
          ? item
          : String(item).slice(0, 80),
      );
    } else if (typeof value === 'object') {
      out[key] = sanitizeEventDetails(value, depth + 1);
    }
  }
  return out;
}

const ACTOR_LABELS: Record<ActivityActorKind, string> = {
  nua: 'NUA',
  phdev: 'PHDEV',
  cliente: 'Cliente',
  webhook: 'Mercado Pago',
  sistema: 'Sistema',
};

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  compra: 'Compra',
  midia: 'Mídia',
  pack: 'Pack / Conteúdo',
  personalizado: 'Personalizado',
  chamada_vip: 'Chamada VIP',
  sessao: 'Sessão & Acesso',
  seguranca: 'Segurança',
  publicacao: 'Publicação',
  contencao: 'Contenção',
  recuperacao: 'Entrega & Cofre',
  auditoria: 'Auditoria',
};

function formatBrl(amount?: unknown): string | null {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) return null;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  } catch {
    return `R$ ${num.toFixed(2)}`;
  }
}

function resolveActorKind(event: AuditEvent, details: Record<string, unknown>): ActivityActorKind {
  const explicit = String(details._actor || details.actor || '').toLowerCase();
  if (explicit === 'nua' || explicit === 'phdev' || explicit === 'cliente' || explicit === 'webhook' || explicit === 'sistema') {
    return explicit;
  }
  const role = String(event.actorRole || details.subject || details.actorRole || '').toLowerCase();
  if (role === 'phdev' || role === 'dev' || role === 'superadmin') return 'phdev';
  if (role === 'nua' || role === 'client' || role === 'admin') return 'nua';
  if (role === 'webhook' || /webhook/i.test(String(details.source || ''))) return 'webhook';
  if (/ORDER_CREATED|PERSONALIZADO_CREATED|VIP_BOOKING_CREATED|CONTACT_MESSAGE_RECEIVED|REQUEST_CREATED/.test(event.type)) {
    return 'cliente';
  }
  if (/ORDER_PAID|VIP_BOOKING_PAID|VAULT_ACCESS_GRANTED/.test(event.type)) {
    return 'webhook';
  }
  if (/MEDIA_|CONTENT_|MUSIC_|ADMIN_LOGIN_SUCCESS|ADMIN_LOGOUT/.test(event.type)) {
    return 'nua';
  }
  return 'sistema';
}

function resolveProtocolAndCategory(
  event: AuditEvent,
  details: Record<string, unknown>,
): { protocol: ActivityProtocolId; category: ActivityCategory } {
  const explicitProto = String(details._protocol || details.protocol || '').toLowerCase();
  const explicitCat = String(details._category || '').toLowerCase() as ActivityCategory;

  const validProtos = new Set<ActivityProtocolId>([
    'kakashi',
    'minato',
    'kakuzu',
    'neji',
    'tobirama',
    'itachi',
    'madara',
    'naruto',
    'kaguya',
    'hagoromo',
  ]);
  const validCats = new Set<ActivityCategory>(Object.keys(CATEGORY_LABELS) as ActivityCategory[]);

  if (validProtos.has(explicitProto as ActivityProtocolId) && validCats.has(explicitCat)) {
    return { protocol: explicitProto as ActivityProtocolId, category: explicitCat };
  }

  const type = String(event.type || '').toUpperCase();
  const summary = String(event.summary || '');

  if (type === 'SECURITY_ACTION') {
    if (explicitProto === 'itachi' || /ITACHI/i.test(summary)) return { protocol: 'itachi', category: 'contencao' };
    if (explicitProto === 'madara' || /MADARA/i.test(summary)) return { protocol: 'madara', category: 'contencao' };
    if (explicitProto === 'kaguya' || /KAGUYA/i.test(summary)) return { protocol: 'kaguya', category: 'contencao' };
    if (/sess[oõ]es|revoga/i.test(summary)) return { protocol: 'minato', category: 'sessao' };
    if (/manuten|flags/i.test(summary)) return { protocol: 'tobirama', category: 'publicacao' };
    return { protocol: 'hagoromo', category: 'contencao' };
  }

  if (type.startsWith('HONEYPOT_') || type === 'GATEWAY_SECURITY_BLOCK') {
    return { protocol: 'kakashi', category: 'seguranca' };
  }

  if (
    type === 'ADMIN_LOGIN_SUCCESS' ||
    type === 'ADMIN_LOGIN_FAIL' ||
    type === 'ADMIN_LOGOUT' ||
    type === 'VERBAL_IDENTITY_FORBIDDEN_ACCESS'
  ) {
    return { protocol: 'minato', category: 'sessao' };
  }

  if (type === 'ORDER_CREATED' || type === 'ORDER_PAID' || type === 'ORDER_REFUNDED') {
    return { protocol: 'kakuzu', category: 'compra' };
  }

  if (type === 'VAULT_ACCESS_GRANTED') {
    return { protocol: 'naruto', category: 'recuperacao' };
  }

  if (type === 'PERSONALIZADO_CREATED') {
    return { protocol: 'kakuzu', category: 'personalizado' };
  }
  if (type === 'PERSONALIZADO_UPDATED' || type === 'PERSONALIZADO_DELIVERED') {
    return { protocol: 'naruto', category: 'personalizado' };
  }

  if (type === 'VIP_BOOKING_CREATED' || type === 'VIP_BOOKING_PAID') {
    return { protocol: 'kakuzu', category: 'chamada_vip' };
  }
  if (type === 'VIP_BOOKING_UPDATED') {
    return { protocol: 'naruto', category: 'chamada_vip' };
  }

  if (type === 'MEDIA_UPLOAD' || type === 'MEDIA_DELETE' || type.startsWith('MUSIC_')) {
    return { protocol: 'tobirama', category: 'midia' };
  }

  if (
    type === 'CONTENT_PUBLISH' ||
    type === 'CONTENT_DRAFT_SAVE' ||
    type === 'CONTENT_OPS' ||
    type === 'CONTENT_ADMIN_OPERATION' ||
    type === 'VERBAL_IDENTITY_TOGGLED'
  ) {
    const isPack = /pack|avulso|cat[aá]logo|produto/i.test(summary);
    return { protocol: 'tobirama', category: isPack ? 'pack' : 'publicacao' };
  }

  if (/estorno|refund|pix|pagamento|mensalidade|fatura|mercado/i.test(summary)) {
    return { protocol: 'kakuzu', category: 'compra' };
  }
  if (/chamada|agendamento|vip|reserva/i.test(summary)) {
    return { protocol: 'naruto', category: 'chamada_vip' };
  }
  if (/personalizado|encomenda/i.test(summary)) {
    return { protocol: 'naruto', category: 'personalizado' };
  }
  if (/upload|m[ií]dia|foto|v[ií]deo|pack|publica|rascunho/i.test(summary)) {
    return { protocol: 'tobirama', category: 'pack' };
  }

  return {
    protocol: validProtos.has(explicitProto as ActivityProtocolId)
      ? (explicitProto as ActivityProtocolId)
      : 'neji',
    category: validCats.has(explicitCat) ? explicitCat : 'auditoria',
  };
}

function buildFriendlySubtitle(details: Record<string, unknown>): string | undefined {
  const parts: string[] = [];
  const price = formatBrl(details.amount ?? details.price ?? details.total);
  if (price) parts.push(price);
  if (typeof details.orderId === 'string' && details.orderId) parts.push(`Pedido ${details.orderId}`);
  if (typeof details.bookingId === 'string' && details.bookingId) parts.push(`Reserva ${details.bookingId}`);
  if (typeof details.requestId === 'string' && details.requestId) parts.push(`ID ${details.requestId}`);
  if (typeof details.incidentId === 'string' && details.incidentId) parts.push(`Incidente ${details.incidentId}`);
  if (typeof details.fileName === 'string' && details.fileName) parts.push(details.fileName);
  if (typeof details.key === 'string' && details.key && !details.fileName) parts.push(details.key);
  if (typeof details.packTitle === 'string' && details.packTitle) parts.push(details.packTitle);
  if (typeof details.modality === 'string' && details.modality) parts.push(details.modality);
  if (typeof details.route === 'string' && details.route) parts.push(details.route);
  if (typeof details.status === 'string' && details.status) parts.push(`Status: ${details.status}`);
  if (Array.isArray(details.scopes) && details.scopes.length > 0) {
    parts.push(`Escopos: ${details.scopes.join(', ')}`);
  }
  return parts.length > 0 ? parts.slice(0, 4).join(' · ') : undefined;
}

export function classifyAuditEvent(event: AuditEvent): ProtocolActivityItem {
  const details = sanitizeEventDetails(event.details || {});
  const { protocol, category } = resolveProtocolAndCategory(event, details);
  const actor = resolveActorKind(event, details);

  const entityRaw =
    details._entity && typeof details._entity === 'object'
      ? (details._entity as { type?: string; id?: string; label?: string })
      : undefined;

  const cleanDetails: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (!k.startsWith('_')) cleanDetails[k] = v;
  }

  return {
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    severity: event.severity || 'info',
    protocol,
    actor,
    actorLabel: ACTOR_LABELS[actor],
    category,
    categoryLabel: CATEGORY_LABELS[category],
    friendlyTitle: event.summary || event.type,
    friendlySubtitle: buildFriendlySubtitle(cleanDetails),
    entity: entityRaw?.type
      ? { type: entityRaw.type, id: entityRaw.id, label: entityRaw.label }
      : undefined,
    details: cleanDetails,
  };
}

export async function emitProtocolEvent(
  env: AuditEnv,
  request: Request | null,
  input: {
    protocol: ActivityProtocolId;
    category: ActivityCategory;
    actor: ActivityActorKind;
    type: AuditEventType;
    severity?: 'info' | 'warning' | 'critical' | 'alert';
    requireDurable?: boolean;
    summary: string;
    entity?: { type: string; id?: string; label?: string };
    details?: Record<string, unknown>;
  },
): Promise<AuditEvent> {
  const safeDetails = sanitizeEventDetails(input.details || {});
  return persistAuditEvent(env, request, {
    type: input.type,
    severity: input.severity || 'info',
    summary: input.summary,
    actorRole: input.actor,
    requireDurable: input.requireDurable,
    details: {
      ...safeDetails,
      _protocol: input.protocol,
      _category: input.category,
      _actor: input.actor,
      ...(input.entity ? { _entity: input.entity } : {}),
    },
  });
}

export function buildProtocolActivityFeed(
  rawEvents: AuditEvent[],
  filters?: {
    protocol?: string | null;
    actor?: string | null;
    category?: string | null;
    severity?: string | null;
    q?: string | null;
    limit?: number;
  },
): {
  summary: ProtocolActivitySummary;
  countsByProtocol: Record<ActivityProtocolId, number>;
  events: ProtocolActivityItem[];
} {
  const classified = rawEvents.map(classifyAuditEvent);

  const countsByProtocol: Record<ActivityProtocolId, number> = {
    kakashi: 0,
    minato: 0,
    kakuzu: 0,
    neji: classified.length,
    tobirama: 0,
    itachi: 0,
    madara: 0,
    naruto: 0,
    kaguya: 0,
    hagoromo: 0,
  };

  for (const item of classified) {
    if (item.protocol !== 'neji') {
      countsByProtocol[item.protocol] += 1;
    }
  }

  const summary: ProtocolActivitySummary = {
    total: classified.length,
    nuaActions: classified.filter((item) => item.actor === 'nua').length,
    commerceEvents: classified.filter(
      (item) =>
        item.category === 'compra' ||
        item.category === 'personalizado' ||
        item.category === 'chamada_vip',
    ).length,
    mediaUploads: classified.filter((item) => item.category === 'midia' || item.category === 'pack').length,
    securityAlerts: classified.filter(
      (item) =>
        item.severity === 'critical' ||
        item.severity === 'warning' ||
        item.category === 'seguranca' ||
        item.category === 'contencao',
    ).length,
    lastEventAt: classified[0]?.timestamp ?? null,
  };

  const protoFilter = (filters?.protocol || '').trim().toLowerCase();
  const actorFilter = (filters?.actor || '').trim().toLowerCase();
  const catFilter = (filters?.category || '').trim().toLowerCase();
  const sevFilter = (filters?.severity || '').trim().toLowerCase();
  const qFilter = (filters?.q || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(filters?.limit || 100), 1), 250);

  const filtered = classified.filter((item) => {
    // NEJI vê a plataforma 360° (todos os protocolos)
    if (protoFilter && protoFilter !== 'all' && protoFilter !== 'neji' && item.protocol !== protoFilter) {
      return false;
    }
    if (actorFilter && actorFilter !== 'all' && item.actor !== actorFilter) return false;
    if (catFilter && catFilter !== 'all' && item.category !== catFilter) return false;
    if (sevFilter && sevFilter !== 'all' && item.severity !== sevFilter) return false;
    if (qFilter) {
      const hay = `${item.friendlyTitle} ${item.friendlySubtitle || ''} ${item.type} ${item.actorLabel} ${item.categoryLabel} ${item.protocol}`.toLowerCase();
      if (!hay.includes(qFilter)) return false;
    }
    return true;
  });

  return {
    summary,
    countsByProtocol,
    events: filtered.slice(0, limit),
  };
}
