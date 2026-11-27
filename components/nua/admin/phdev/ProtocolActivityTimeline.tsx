'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  CreditCard,
  FileImage,
  KeyRound,
  Package,
  Search,
  Shield,
  ShieldAlert,
  Video,
  Wrench,
  Inbox,
  User,
} from 'lucide-react';
import { SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import { formatBrTimestamp } from '@/lib/phdev/konohagakure/verbalIdentity';
import type {
  ProtocolActivityActor,
  ProtocolActivityCategory,
  ProtocolActivityItem,
  ProtocolPageId,
} from '@/lib/phdev/konohagakure/types';

interface ProtocolActivityTimelineProps {
  title: string;
  subtitle?: string;
  events: ProtocolActivityItem[];
  protocolFilter?: ProtocolPageId | 'all';
  showProtocolBadge?: boolean;
  accentHex?: string;
  emptyMessage?: string;
}

const CATEGORY_ICON: Record<ProtocolActivityCategory, React.ComponentType<{ className?: string }>> = {
  compra: CreditCard,
  midia: FileImage,
  pack: Package,
  personalizado: Inbox,
  chamada_vip: Video,
  sessao: KeyRound,
  seguranca: Shield,
  publicacao: Wrench,
  contencao: ShieldAlert,
  recuperacao: Inbox,
  auditoria: Activity,
};

const ACTOR_BADGE: Record<ProtocolActivityActor, string> = {
  nua: 'border-pink-400/35 bg-pink-500/14 text-pink-200',
  phdev: 'border-[#e3d8be]/38 bg-[#e3d8be]/14 text-[#f5efe0]',
  cliente: 'border-sky-400/30 bg-sky-500/12 text-sky-200',
  webhook: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-200',
  sistema: 'border-white/14 bg-white/[0.06] text-zinc-300',
};

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Timeline amigável e detalhada de operações (compras, uploads, packs,
 * personalizados, chamadas VIP, logins, segurança e ações da NUA/PHDEV).
 */
export function ProtocolActivityTimeline({
  title,
  subtitle,
  events,
  protocolFilter = 'all',
  showProtocolBadge = false,
  accentHex = '#e3d8be',
  emptyMessage,
}: ProtocolActivityTimelineProps) {
  const [actorFilter, setActorFilter] = useState<'all' | ProtocolActivityActor>('all');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const scopedEvents = useMemo(() => {
    if (protocolFilter === 'all' || protocolFilter === 'neji') return events;
    return events.filter((item) => item.protocol === protocolFilter);
  }, [events, protocolFilter]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedEvents.filter((item) => {
      if (actorFilter !== 'all' && item.actor !== actorFilter) return false;
      if (!q) return true;
      return `${item.friendlyTitle} ${item.friendlySubtitle || ''} ${item.actorLabel} ${item.categoryLabel} ${item.protocol} ${item.type}`
        .toLowerCase()
        .includes(q);
    });
  }, [actorFilter, query, scopedEvents]);

  return (
    <section
      data-testid="phdev-activity-timeline"
      className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/92 backdrop-blur-md p-5 space-y-4"
    >
      {/* Cabeçalho + filtros amigáveis */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accentHex }}
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-white">
              {title} ({filteredEvents.length})
            </h3>
          </div>
          {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pedido, foto, pack, ação..."
              aria-label="Buscar na timeline de operações"
              className="h-8 w-52 sm:w-60 rounded-lg border border-white/12 bg-black/50 pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="inline-flex flex-wrap items-center rounded-lg border border-white/10 bg-black/45 p-0.5 text-[10.5px] font-mono">
            {(
              [
                ['all', 'Todos'],
                ['nua', 'Ações NUA'],
                ['cliente', 'Clientes'],
                ['webhook', 'Pagamentos'],
                ['phdev', 'PHDEV'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActorFilter(id)}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  actorFilter === id
                    ? 'bg-white/[0.14] text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de eventos amigáveis */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.09] bg-black/28 px-4 py-6 text-center space-y-1">
          <p className="text-xs font-medium text-zinc-300">
            {scopedEvents.length === 0
              ? emptyMessage || 'Nenhuma operação registrada para este protocolo até o momento.'
              : 'Nenhum registro encontrado com os filtros selecionados.'}
          </p>
          <p className="text-[11px] text-zinc-500">
            Compras, uploads de mídia, packs, personalizados, chamadas VIP, logins e ações administrativas aparecem aqui automaticamente.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredEvents.map((item) => {
            const Icon = CATEGORY_ICON[item.category] || Activity;
            const sevTone =
              item.severity === 'critical'
                ? 'critical'
                : item.severity === 'alert'
                  ? 'danger'
                  : item.severity === 'warning'
                    ? 'warning'
                    : 'info';
            const sevBadge = SEMANTIC_STATUS_STYLES[sevTone];
            const isExpanded = expandedId === item.id;
            const detailEntries = Object.entries(item.details || {});

            return (
              <li
                key={item.id}
                className="rounded-xl border border-white/[0.07] bg-black/38 hover:border-white/[0.15] transition-colors overflow-hidden"
              >
                <div className="px-3.5 py-3 flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5"
                    style={{ color: accentHex }}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-mono font-semibold ${ACTOR_BADGE[item.actor]}`}
                      >
                        <User className="w-2.5 h-2.5" aria-hidden="true" />
                        {item.actorLabel}
                      </span>

                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9.5px] font-mono text-zinc-300">
                        {item.categoryLabel}
                      </span>

                      {showProtocolBadge && (
                        <span className="inline-flex items-center rounded-full border border-white/12 bg-black/50 px-2 py-0.5 text-[9.5px] font-mono uppercase text-zinc-300">
                          {item.protocol}
                        </span>
                      )}

                      {item.severity !== 'info' && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-mono uppercase ${sevBadge.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sevBadge.dot}`} aria-hidden="true" />
                          {item.severity}
                        </span>
                      )}

                      <span className="ml-auto font-mono text-[10.5px] text-zinc-500 whitespace-nowrap">
                        {formatBrTimestamp(item.timestamp) || item.timestamp}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-zinc-100 leading-snug">
                      {item.friendlyTitle}
                    </p>

                    {item.friendlySubtitle && (
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {item.friendlySubtitle}
                      </p>
                    )}
                  </div>

                  {detailEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      aria-expanded={isExpanded}
                      className="inline-flex items-center gap-1 h-7 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.10] px-2.5 text-[10.5px] text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <span>Detalhes</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>

                {isExpanded && detailEntries.length > 0 && (
                  <div className="px-3.5 pb-3 pt-2 border-t border-white/[0.06] bg-black/45">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
                        <dt className="text-[9.5px] font-mono uppercase text-zinc-500">Evento técnico</dt>
                        <dd className="text-[11px] font-mono text-zinc-200 mt-0.5 break-all">{item.type}</dd>
                      </div>
                      {detailEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5"
                        >
                          <dt className="text-[9.5px] font-mono uppercase text-zinc-500">{key}</dt>
                          <dd className="text-[11px] text-zinc-200 mt-0.5 break-words">
                            {formatDetailValue(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
