'use client';

import React from 'react';
import {
  Activity,
  Cloud,
  CreditCard,
  Database,
  GitBranch,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { HAGOROMO_AUTHORITY, SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import {
  KONOHA_VERBAL_MESSAGES,
  formatBrTimestamp,
  getActiveContainments,
} from '@/lib/phdev/konohagakure/verbalIdentity';
import type {
  ProtocolActivityItem,
  ProtocolPageId,
  SystemControlSnapshot,
} from '@/lib/phdev/konohagakure/types';
import { ProtocolQuickSwitcher } from './ProtocolQuickSwitcher';
import { ProtocolHeroBanner } from './ProtocolHeroBanner';
import { ProtocolActivityTimeline } from './ProtocolActivityTimeline';

interface HagoromoDetailPageProps {
  snapshot: SystemControlSnapshot | null;
  activityEvents?: ProtocolActivityItem[];
  loading: boolean;
  lastCheckedAt: string | null;
  onRefresh: () => void;
  onBackToOverview: () => void;
  onSelectProtocolPage: (pageId: ProtocolPageId) => void;
  onOpenMonitoring?: () => void;
}

const EXTERNAL_RECOVERY_CHANNELS = [
  {
    name: 'Cloudflare Dashboard / Wrangler',
    scope: 'Pages, Functions, secrets de ambiente, DNS, WAF e reversão de deploy',
    icon: Cloud,
  },
  {
    name: 'Supabase Console',
    scope: 'Tabela de contenção, admin_sessions, auditoria e rotação de chaves',
    icon: Database,
  },
  {
    name: 'Backblaze B2',
    scope: 'Bucket privado de mídia, credenciais de leitura/gravação e isolamento',
    icon: KeyRound,
  },
  {
    name: 'Mercado Pago (Conta Comercial)',
    scope: 'Webhooks, revogação de tokens, estornos e conciliação direta',
    icon: CreditCard,
  },
  {
    name: 'Repositório Git Remoto',
    scope: 'Backup íntegro de commits, verificação de SHA e rollback auditável',
    icon: GitBranch,
  },
  {
    name: 'Console /monitoramento/ & Auditoria',
    scope: 'Leitura independente de saúde, logs de contenção e eventos críticos',
    icon: Activity,
  },
] as const;

/**
 * Página dedicada da Autoridade Técnica PHDEV — HAGOROMO (ROOT AUTHORITY).
 * Separada dos 9 protocolos oficiais, focada em recuperação independente do painel.
 */
export function HagoromoDetailPage({
  snapshot,
  activityEvents = [],
  loading,
  lastCheckedAt,
  onRefresh,
  onBackToOverview,
  onSelectProtocolPage,
  onOpenMonitoring,
}: HagoromoDetailPageProps) {
  const emergencyVerified = snapshot?.emergencyAccessVerified === true;
  const activeContainments = getActiveContainments(snapshot);
  const statusTone = snapshot == null ? 'unknown' : emergencyVerified ? 'success' : 'warning';
  const statusLabel =
    snapshot == null
      ? 'Não verificado'
      : emergencyVerified
        ? 'Acesso emergencial validado'
        : 'Pendente de validação externa';

  return (
    <div data-testid="phdev-protocol-page-hagoromo" className="phdev-page-enter space-y-4">
      <ProtocolQuickSwitcher
        activePageId="hagoromo"
        snapshot={snapshot}
        loading={loading}
        onBackToOverview={onBackToOverview}
        onSelectProtocolPage={onSelectProtocolPage}
      />

      <ProtocolHeroBanner
        code={HAGOROMO_AUTHORITY.code}
        title={`${HAGOROMO_AUTHORITY.name} — ROOT AUTHORITY`}
        subtitle={HAGOROMO_AUTHORITY.subtitle}
        missionStatement={HAGOROMO_AUTHORITY.missionStatement}
        japaneseMark={HAGOROMO_AUTHORITY.japaneseMark}
        artwork={HAGOROMO_AUTHORITY.artwork}
        heroArtPosition={HAGOROMO_AUTHORITY.heroArtPosition}
        icon={HAGOROMO_AUTHORITY.icon}
        accentHex={HAGOROMO_AUTHORITY.accentHex}
        accentSoftRgba={HAGOROMO_AUTHORITY.accentSoftRgba}
        accentBorderRgba={HAGOROMO_AUTHORITY.accentBorderRgba}
        atmosphere="sixpaths"
        statusTone={statusTone}
        statusLabel={statusLabel}
        verbalCue={KONOHA_VERBAL_MESSAGES.emergencyAuthorityAuthenticated}
        lastCheckedAt={lastCheckedAt}
        loading={loading}
        onRefresh={onRefresh}
      />

      {/* Estado simultâneo das 3 contenções independentes */}
      <section className="rounded-2xl border border-[#e3d8be]/22 bg-[#0c0f18]/90 p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#e3d8be]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">
              Estado Simultâneo das Contenções Independentes ({activeContainments.length} ativa(s))
            </h3>
          </div>
          {onOpenMonitoring && (
            <button
              type="button"
              onClick={onOpenMonitoring}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/14 bg-black/50 hover:bg-white/[0.09] px-3 py-1.5 text-[11px] font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Abrir Monitoramento</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['itachi', 'madara', 'kaguya'] as const).map((proto) => {
            const record = snapshot?.containment?.find((item) => item.protocol === proto);
            const active = record?.active === true;
            const unavailable = snapshot?.containment == null;
            const badge = SEMANTIC_STATUS_STYLES[
              unavailable ? 'unknown' : active ? (proto === 'itachi' ? 'containment' : 'critical') : 'success'
            ];

            return (
              <button
                key={proto}
                type="button"
                onClick={() => onSelectProtocolPage(proto)}
                className="rounded-xl border border-white/[0.08] bg-black/40 hover:bg-white/[0.06] p-4 text-left space-y-2 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold uppercase text-white">{proto}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${badge.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                    {unavailable ? 'Indisponível' : active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {active && record
                    ? `Incidente ${record.incidentId} · ${formatBrTimestamp(record.changedAt) || record.changedAt}`
                    : proto === 'itachi'
                      ? 'Contenção seletiva por módulo (independente).'
                      : proto === 'madara'
                        ? 'Lockdown da aplicação (exige trava HAGOROMO).'
                        : 'Quarentena por componente (exige trava HAGOROMO).'}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Canais externos independentes do painel */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">
            Recuperação Independente do Painel (Consoles Externos &amp; MFA)
          </h3>
          <span className="text-[10.5px] font-mono text-zinc-500">
            Referência: docs/NUA-PROTOCOL.md &amp; docs/OPERATIONAL-RUNBOOKS.md
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXTERNAL_RECOVERY_CHANNELS.map((ch) => {
            const Icon = ch.icon;
            return (
              <div
                key={ch.name}
                className="rounded-xl border border-[#e3d8be]/16 bg-black/38 p-4 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#e3d8be] shrink-0" aria-hidden="true" />
                  <h4 className="text-xs font-semibold text-white">{ch.name}</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{ch.scope}</p>
              </div>
            );
          })}
        </div>
      </section>
      {/* Timeline de eventos críticos e ações PHDEV */}
      <ProtocolActivityTimeline
        title="Trilha Crítica & Autoridade PHDEV"
        subtitle="Eventos de contenção, revogação global e operações críticas registradas no servidor."
        events={activityEvents.filter(
          (ev) => ev.protocol === 'hagoromo' || ev.category === 'contencao' || ev.severity === 'critical',
        )}
        protocolFilter="all"
        showProtocolBadge
        accentHex={HAGOROMO_AUTHORITY.accentHex}
        emptyMessage="Nenhum evento crítico ou ação de contenção registrada na janela atual."
      />
    </div>
  );
}
