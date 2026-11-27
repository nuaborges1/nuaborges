'use client';

import React, { useMemo, useState } from 'react';
import {
  Database,
  Cloud,
  CreditCard,
  Shield,
  Mail,
  QrCode,
  Search,
} from 'lucide-react';
import { SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import { formatBrTimestamp } from '@/lib/phdev/konohagakure/verbalIdentity';
import type { SystemControlSnapshot } from '@/lib/phdev/konohagakure/types';

interface NejiSectionProps {
  snapshot: SystemControlSnapshot | null;
  error: string | null;
}

export function NejiSection({ snapshot, error }: NejiSectionProps) {
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
            ? { tone: 'danger' as const, text: 'Sem resposta válida' }
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

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/35 bg-rose-950/35 px-4 py-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Matriz completa das 6 integrações */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-400">
            Visão 360° das Integrações Monitoradas
          </h3>
          <span className="text-[11px] font-mono text-zinc-500">
            {snapshot?.registeredPolicies != null ? `${snapshot.registeredPolicies} políticas ativas` : 'Telemetria ao vivo'}
          </span>
        </div>

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

      {/* Feed de auditoria com filtros client-side */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Trilha de Auditoria em Tempo Real ({filteredAudit.length}/{recentAudit.length})
            </h3>
            <p className="text-[11px] text-zinc-400">
              Filtro instantâneo sobre os eventos reais retornados por /api/control/system.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar tipo ou resumo..."
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
