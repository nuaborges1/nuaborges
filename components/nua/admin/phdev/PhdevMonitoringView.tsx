'use client';

import React, { useMemo, useState } from 'react';
import {
  RefreshCw,
  Database,
  Cloud,
  CreditCard,
  Shield,
  Mail,
  QrCode,
  Search,
  Activity,
} from 'lucide-react';
import { KONOHA_ASSETS, SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import { formatBrTimestamp, getRecoveryPendingCount } from '@/lib/phdev/konohagakure/verbalIdentity';
import type {
  ProtocolActivityFeed,
  ProtocolPageId,
  SystemControlSnapshot,
} from '@/lib/phdev/konohagakure/types';
import { ProtocolActivityTimeline } from './ProtocolActivityTimeline';

interface PhdevMonitoringViewProps {
  snapshot: SystemControlSnapshot | null;
  activityFeed?: ProtocolActivityFeed | null;
  loading: boolean;
  error: string | null;
  lastCheckedAt: string | null;
  onRefresh: () => void;
  onOpenProtocolPage?: (pageId: ProtocolPageId) => void;
}

export function PhdevMonitoringView({
  snapshot,
  activityFeed = null,
  loading,
  error,
  lastCheckedAt,
  onRefresh,
  onOpenProtocolPage,
}: PhdevMonitoringViewProps) {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'error' | 'warning' | 'info'>('all');
  const [query, setQuery] = useState('');

  const integrations = snapshot?.integrations;
  const integrationItems = [
    {
      id: 'supabase',
      label: 'Supabase PostgreSQL',
      icon: Database,
      state: !integrations?.supabase
        ? { tone: 'unknown' as const, text: 'Não verificado' }
        : integrations.supabase.connected
          ? { tone: 'success' as const, text: 'Conectado' }
          : integrations.supabase.configured
            ? { tone: 'danger' as const, text: 'Falha de conexão' }
            : { tone: 'warning' as const, text: 'Não configurado' },
    },
    {
      id: 'mercadopago',
      label: 'Mercado Pago Comercial',
      icon: CreditCard,
      state: !integrations?.mercadoPagoCommercial
        ? { tone: 'unknown' as const, text: 'Não verificado' }
        : integrations.mercadoPagoCommercial.connected
          ? {
              tone: 'success' as const,
              text: integrations.mercadoPagoCommercial.nickname
                ? `Conectado (${integrations.mercadoPagoCommercial.nickname})`
                : 'Conectado',
            }
          : integrations.mercadoPagoCommercial.configured
            ? { tone: 'warning' as const, text: 'Configurado (offline)' }
            : { tone: 'warning' as const, text: 'Não configurado' },
    },
    {
      id: 'b2',
      label: 'Backblaze B2 (Mídia)',
      icon: Cloud,
      state: !integrations?.backblazeB2
        ? { tone: 'unknown' as const, text: 'Não verificado' }
        : integrations.backblazeB2.configured
          ? { tone: 'info' as const, text: 'Configurado' }
          : { tone: 'warning' as const, text: 'Não configurado' },
    },
    {
      id: 'turnstile',
      label: 'Cloudflare Turnstile',
      icon: Shield,
      state: !integrations?.turnstile
        ? { tone: 'unknown' as const, text: 'Não verificado' }
        : integrations.turnstile.configured
          ? { tone: 'info' as const, text: 'Configurado' }
          : { tone: 'warning' as const, text: 'Não configurado' },
    },
    {
      id: 'smtp',
      label: 'E-mail Transacional (SMTP)',
      icon: Mail,
      state: !integrations?.smtp
        ? { tone: 'unknown' as const, text: 'Não verificado' }
        : integrations.smtp.configured
          ? { tone: 'info' as const, text: 'Configurado' }
          : { tone: 'warning' as const, text: 'Não configurado' },
    },
    {
      id: 'mensalidade',
      label: 'Pix Estático (Mensalidade)',
      icon: QrCode,
      state: !integrations?.mensalidadeStaticPix
        ? { tone: 'unknown' as const, text: 'Não verificado' }
        : integrations.mensalidadeStaticPix.configured
          ? { tone: 'info' as const, text: 'Configurado' }
          : { tone: 'warning' as const, text: 'Não configurado' },
    },
  ];

  const recentAudit = useMemo(() => snapshot?.recentAudit ?? [], [snapshot?.recentAudit]);
  const filteredAudit = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recentAudit.filter((ev) => {
      const sev = String(ev.severity || 'info').toLowerCase();
      if (severityFilter !== 'all' && sev !== severityFilter) return false;
      if (!q) return true;
      return `${ev.type || ''} ${ev.summary || ''} ${sev}`.toLowerCase().includes(q);
    });
  }, [query, recentAudit, severityFilter]);

  const recovery = snapshot?.recovery;
  const totalPending = getRecoveryPendingCount(snapshot);
  const configuredCount = integrationItems.filter(
    (item) => item.state.tone === 'success' || item.state.tone === 'info',
  ).length;

  return (
    <div data-testid="phdev-monitoring-view" className="phdev-page-enter space-y-5">
      {/* Cabeçalho Byakugan */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ddd6fe]/22 bg-[#0c0f18]/92 backdrop-blur-md p-5">
        <div className="flex items-center gap-3.5">
          <div className="relative w-11 h-11 rounded-xl border border-[#ddd6fe]/35 bg-black/60 flex items-center justify-center shrink-0">
            <img
              src={KONOHA_ASSETS.icons.byakugan}
              alt=""
              aria-hidden="true"
              className={`w-6 h-6 ${loading ? 'phdev-dojutsu-spin' : ''}`}
            />
          </div>
          <div>
            <h2 className="font-sans text-base sm:text-lg font-semibold text-white tracking-tight">
              Central de Monitoramento — NEJI &amp; NARUTO
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Telemetria real de <code className="font-mono text-zinc-300">/api/control/system</code>
              {lastCheckedAt ? ` · Verificado em ${formatBrTimestamp(lastCheckedAt)}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-8 rounded-xl border border-white/14 bg-white/[0.07] hover:bg-white/[0.14] px-3.5 text-xs font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{loading ? 'Diagnosticando…' : 'Atualizar diagnóstico'}</span>
          </button>
          {onOpenProtocolPage && (
            <button
              type="button"
              onClick={() => onOpenProtocolPage('neji')}
              className="inline-flex items-center gap-1.5 h-8 rounded-xl border border-[#ddd6fe]/28 bg-[#ddd6fe]/10 hover:bg-[#ddd6fe]/18 px-3 text-xs font-medium text-[#ede9fe] transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Página NEJI</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/35 bg-rose-950/35 px-4 py-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Resumo em KPIs alinhados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Integrações ativas
          </span>
          <span className="font-mono text-xl font-bold text-white mt-1 block">
            {snapshot ? `${configuredCount}/${integrationItems.length}` : '—'}
          </span>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Políticas no gateway
          </span>
          <span className="font-mono text-xl font-bold text-white mt-1 block">
            {snapshot?.registeredPolicies ?? '—'}
          </span>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Pendências NARUTO
          </span>
          <span className="font-mono text-xl font-bold text-white mt-1 block">
            {recovery ? totalPending : '—'}
          </span>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Eventos de auditoria
          </span>
          <span className="font-mono text-xl font-bold text-white mt-1 block">
            {recentAudit.length}
          </span>
        </div>
      </div>

      {/* Integrações monitoradas */}
      <section aria-labelledby="phdev-integrations-heading" className="space-y-3">
        <h3 id="phdev-integrations-heading" className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-400">
          Integrações e Dependências Verificadas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {integrationItems.map((item) => {
            const Icon = item.icon;
            const badge = SEMANTIC_STATUS_STYLES[item.state.tone];
            return (
              <div
                key={item.id}
                className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#ddd6fe]/10 border border-[#ddd6fe]/20 flex items-center justify-center text-[#ddd6fe] shrink-0">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-medium text-zinc-100 truncate">{item.label}</span>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono shrink-0 ${badge.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                  {item.state.text}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Filas NARUTO */}
      <section aria-labelledby="phdev-naruto-queues-heading" className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="phdev-naruto-queues-heading" className="text-sm font-semibold text-white">
            P08 — NARUTO · Filas de Recuperação Automática
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">
            Baryon Mode: inativo (requer homologação própria)
          </span>
        </div>
        {recovery ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-black/38 border border-white/[0.06] p-3">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Última rodada</span>
              <span className="text-zinc-100 font-medium mt-1 block">
                {formatBrTimestamp(recovery.at) || 'Sem horário'}
              </span>
            </div>
            <div className="rounded-xl bg-black/38 border border-white/[0.06] p-3">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Cofre (intervenção)</span>
              <span className="text-zinc-100 font-mono text-base font-semibold mt-1 block">
                {recovery.vault?.needsIntervention ?? 'Indisponível'}
              </span>
            </div>
            <div className="rounded-xl bg-black/38 border border-white/[0.06] p-3">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Confirmações</span>
              <span className="text-zinc-100 font-mono text-base font-semibold mt-1 block">
                {recovery.paidEmail?.needsIntervention ?? 'Indisponível'}
              </span>
            </div>
            <div className="rounded-xl bg-black/38 border border-white/[0.06] p-3">
              <span className="text-[10px] font-mono uppercase text-zinc-400 block">Estornos</span>
              <span className="text-zinc-100 font-mono text-base font-semibold mt-1 block">
                {recovery.refundsPaused ? 'Em quarentena' : recovery.refunds?.needsIntervention ?? 'Indisponível'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">
            Nenhuma execução registrada de <code className="font-mono text-zinc-300">system:recovery:latest</code> neste ambiente.
          </p>
        )}
      </section>

      {/* Timeline Amigável Unificada de Toda a Plataforma (NUA + Comércio + Segurança) */}
      <ProtocolActivityTimeline
        title="Central de Atividades em Tempo Real (NUA × Clientes × PHDEV)"
        subtitle="Acompanhe cada compra, foto enviada, pack publicado, personalizado, chamada VIP, login e bloqueio de segurança."
        events={activityFeed?.events ?? []}
        protocolFilter="all"
        showProtocolBadge
        accentHex="#ddd6fe"
      />

      {/* Eventos recentes de auditoria com busca e filtro */}
      <section aria-labelledby="phdev-audit-feed-heading" className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 id="phdev-audit-feed-heading" className="text-sm font-semibold text-white">
            Eventos Recentes de Auditoria ({filteredAudit.length}/{recentAudit.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar eventos..."
                aria-label="Filtrar eventos de auditoria"
                className="h-8 rounded-lg border border-white/12 bg-black/50 pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#ddd6fe]/45"
              />
            </div>

            <div className="inline-flex items-center rounded-lg border border-white/10 bg-black/45 p-0.5 text-[10.5px] font-mono">
              {(['all', 'critical', 'error', 'warning', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    severityFilter === sev
                      ? 'bg-[#ddd6fe]/20 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {sev === 'all' ? 'Todos' : sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredAudit.length === 0 ? (
          <p className="text-xs text-zinc-400 py-2">
            {recentAudit.length === 0
              ? 'Nenhum evento de auditoria retornado na última consulta.'
              : 'Nenhum evento corresponde aos filtros aplicados.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] font-mono uppercase text-zinc-400">
                  <th className="py-2 pr-3">Horário</th>
                  <th className="py-2 pr-3">Severidade</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2">Resumo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredAudit.map((event, idx) => {
                  const sev = String(event.severity || 'info').toLowerCase();
                  const tone =
                    sev === 'critical'
                      ? 'critical'
                      : sev === 'error'
                        ? 'danger'
                        : sev === 'warning'
                          ? 'warning'
                          : 'info';
                  const badge = SEMANTIC_STATUS_STYLES[tone];
                  return (
                    <tr key={event.id || `${event.type}-${idx}`} className="text-zinc-200">
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                        {formatBrTimestamp(event.createdAt || event.timestamp) || '—'}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono ${badge.badge}`}>
                          {sev}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                        {event.type || 'EVENT'}
                      </td>
                      <td className="py-2.5 text-zinc-200">{event.summary || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
