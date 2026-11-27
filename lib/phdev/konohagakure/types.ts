import type { ContainmentProtocol, ContainmentRecord } from '@/functions/api/_central/containment';

export type OfficialProtocolId =
  | 'kakashi'
  | 'minato'
  | 'kakuzu'
  | 'neji'
  | 'tobirama'
  | 'itachi'
  | 'madara'
  | 'naruto'
  | 'kaguya';

export type ProtocolPageId = OfficialProtocolId | 'hagoromo';

export type ProtocolAtmosphereVariant =
  | 'lightning'
  | 'hiraishin'
  | 'emerald'
  | 'byakugan'
  | 'suiton'
  | 'tsukuyomi'
  | 'rinnegan'
  | 'baryon'
  | 'dimensional'
  | 'sixpaths';

export type PhdevNavSectionId =
  | 'overview'
  | 'protocol'
  | 'containment'
  | 'monitoring'
  | 'library'
  | 'avaliacoes'
  | 'configuracoes';

export type SemanticStatusTone =
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'critical'
  | 'unknown'
  | 'containment'
  | 'recovery';

export interface ProtocolVisualIdentity {
  id: OfficialProtocolId;
  code: string;
  name: string;
  japaneseMark: string;
  responsibility: string;
  missionStatement: string;
  officialCapabilities: readonly string[];
  specialMode?: {
    name: string;
    label: string;
  };
  artwork: string;
  artPosition: string;
  heroArtPosition: string;
  atmosphere: ProtocolAtmosphereVariant;
  icon: string;
  accentHex: string;
  accentSoftRgba: string;
  accentBorderRgba: string;
  usesEmbers?: boolean;
  isDojutsu?: boolean;
  targetSection: PhdevNavSectionId;
  containmentProtocol?: ContainmentProtocol;
}

export interface SystemRecoveryQueueSummary {
  at?: string;
  vault?: { needsIntervention?: number; processed?: number } | null;
  paidEmail?: { needsIntervention?: number; processed?: number } | null;
  refunds?: { needsIntervention?: number; processed?: number } | null;
  refundsPaused?: boolean;
}

export interface SystemAuditEventItem {
  id?: string;
  type?: string;
  severity?: string;
  summary?: string;
  actorRole?: string;
  createdAt?: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}

export interface SystemControlSnapshot {
  success?: boolean;
  flags?: {
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    disabledModules?: string[];
  };
  containment: ContainmentRecord[] | null;
  recovery?: SystemRecoveryQueueSummary | null;
  emergencyAccessVerified: boolean;
  controllableModules?: string[];
  registeredPolicies?: number;
  integrations?: {
    supabase?: { configured?: boolean; connected?: boolean };
    backblazeB2?: { configured?: boolean };
    mercadoPagoCommercial?: {
      configured?: boolean;
      connected?: boolean;
      accountId?: string | number | null;
      nickname?: string | null;
      siteId?: string | null;
      status?: number;
    };
    mensalidadeStaticPix?: { configured?: boolean };
    turnstile?: { configured?: boolean };
    smtp?: { configured?: boolean };
  };
  recentAudit?: SystemAuditEventItem[];
  auditStats?: {
    total?: number;
    critical?: number;
    warning?: number;
    blocked?: number;
    [key: string]: unknown;
  };
}

export interface ProtocolRuntimeState {
  tone: SemanticStatusTone;
  statusLabel: string;
  detail: string;
  verbalCue?: string;
  specialModeActive: boolean;
  specialModeHint?: string;
  lastActivity?: string | null;
}

export interface OperationalBannerViewModel {
  kind: 'pain' | 'peace' | 'containment' | 'recovery' | 'waiting';
  tone: SemanticStatusTone;
  headline: string;
  technicalSummary: string;
  details: Array<{ label: string; value: string }>;
  recommendedAction?: {
    label: string;
    section: PhdevNavSectionId;
    protocol?: ContainmentProtocol;
    protocolPageId?: ProtocolPageId;
  };
}

export type ProtocolActivityActor = 'nua' | 'phdev' | 'cliente' | 'webhook' | 'sistema';

export type ProtocolActivityCategory =
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
  protocol: ProtocolPageId;
  actor: ProtocolActivityActor;
  actorLabel: string;
  category: ProtocolActivityCategory;
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

export interface ProtocolActivityFeed {
  success?: boolean;
  generatedAt?: string;
  summary: ProtocolActivitySummary;
  countsByProtocol: Record<ProtocolPageId, number>;
  events: ProtocolActivityItem[];
}
