'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { getPublicApiUrl } from '@/lib/contentStore';

interface CustomerSummaryRow {
  id: string;
  displayName: string;
  email: string;
  status: 'active' | 'suspended' | 'anonymized';
  createdAt: string;
  counts: {
    orders: number;
    paidOrders: number;
    libraryActive: number;
    appointments: number;
    personalizados: number;
  };
  totalSpent: number;
  hasPendingRefund: boolean;
  needsAttention: boolean;
  lastOrderAt: string | null;
}

interface CustomerDetailPayload {
  customer: {
    id: string;
    displayName: string;
    email: string;
    status: 'active' | 'suspended' | 'anonymized';
    marketingOptIn: boolean;
    termsAcceptedAt: string | null;
    createdAt: string;
    updatedAt: string;
    anonymizedAt: string | null;
  };
  orders: Array<{
    id: string;
    kindLabel: string;
    title: string;
    amount: number;
    financialStatus: string;
    financialLabel: string;
    operationalLabel: string;
    createdAt: string;
  }>;
  library: Array<{
    entitlementId: string;
    orderRef: string;
    title: string;
    status: string;
    purchasedAt: string;
  }>;
  appointments: Array<{
    id: string;
    modalityName: string;
    displayDateBr: string;
    displayTimeBr: string;
    operationalStatus: string;
    financialStatus: string;
  }>;
  personalizados: Array<{
    id: string;
    photoCount: number;
    totalPrice: number;
    operationalStatus: string;
    financialStatus: string;
  }>;
  auditEvents: Array<{
    id: string;
    action: string;
    createdAt: string;
  }>;
}

interface ClientesModuleProps {
  searchQuery?: string;
}

function formatBrl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export function ClientesModule({ searchQuery = '' }: ClientesModuleProps) {
  const [query, setQuery] = useState(searchQuery);
  const [filter, setFilter] = useState<'all' | 'attention' | 'refunds' | 'active' | 'suspended'>('all');
  const [customers, setCustomers] = useState<CustomerSummaryRow[]>([]);
  const [totals, setTotals] = useState({ all: 0, active: 0, attention: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery !== undefined) setQuery(searchQuery);
  }, [searchQuery]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ filter });
      if (query.trim()) qs.set('q', query.trim());
      const res = await fetch(`${getPublicApiUrl()}/api/admin/customers?${qs.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'Não foi possível carregar os clientes.');
        return;
      }
      setCustomers(data.customers || []);
      setTotals(data.totals || { all: 0, active: 0, attention: 0 });
    } catch {
      setError('Erro de conexão ao consultar clientes.');
    } finally {
      setLoading(false);
    }
  }, [filter, query]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${getPublicApiUrl()}/api/admin/customers?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setDetail(data);
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const runAdminAction = async (
    action: 'revoke_sessions' | 'suspend' | 'reactivate' | 'revoke_entitlement',
    extra: Record<string, any> = {}
  ) => {
    if (!selectedId) return;
    setActionMsg(null);
    const res = await fetch(`${getPublicApiUrl()}/api/admin/customers`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: selectedId, action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      setActionMsg('Ação registrada com sucesso e gravada na auditoria.');
      loadDetail(selectedId);
      loadList();
    } else {
      setActionMsg(data.error || 'Não foi possível concluir a ação.');
    }
  };

  // Visão de detalhe do cliente selecionado
  if (selectedId) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setDetail(null);
            }}
            className="adm-btn adm-btn-ghost"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Clientes
          </button>
          <span className="text-[11px] text-adm-muted">
            Modo consulta segura · senhas, tokens e sessões nunca são exibidos
          </span>
        </div>

        {actionMsg && (
          <div className="adm-card border-adm-accent/40 px-4 py-3 text-xs text-adm-text">
            {actionMsg}
          </div>
        )}

        {detailLoading || !detail ? (
          <div className="adm-card h-48 animate-pulse" />
        ) : (
          <div className="space-y-5">
            {/* Cabeçalho do Cliente + Ações Auditadas */}
            <div className="adm-card p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-adm-text">{detail.customer.displayName}</h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                        detail.customer.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : detail.customer.status === 'suspended'
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-zinc-600/20 text-zinc-400'
                      }`}
                    >
                      {detail.customer.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-adm-muted">{detail.customer.email}</p>
                  <p className="mt-1 text-[11px] text-adm-subtle">
                    Cadastro em {new Date(detail.customer.createdAt).toLocaleDateString('pt-BR')} · Marketing:{' '}
                    {detail.customer.marketingOptIn ? 'Aceito' : 'Não aceito'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => runAdminAction('revoke_sessions', { reason: 'Segurança preventiva' })}
                    className="adm-btn adm-btn-ghost"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Encerrar sessões
                  </button>
                  {detail.customer.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => runAdminAction('suspend', { reason: 'Suspenso pelo painel admin' })}
                      className="adm-btn adm-btn-danger"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Suspender conta
                    </button>
                  ) : detail.customer.status === 'suspended' ? (
                    <button
                      type="button"
                      onClick={() => runAdminAction('reactivate', { reason: 'Reativado pelo painel admin' })}
                      className="adm-btn adm-btn-primary"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Reativar conta
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Compras Unificadas (lidas dos módulos reais) */}
            <div className="adm-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-adm-text">
                Histórico de Compras ({detail.orders.length})
              </h3>
              {detail.orders.length === 0 ? (
                <p className="text-xs text-adm-muted">Nenhum pedido vinculado a esta conta.</p>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {detail.orders.map((o) => (
                    <div key={o.id} className="flex flex-col justify-between gap-2 py-3 text-xs sm:flex-row sm:items-center">
                      <div>
                        <p className="font-medium text-adm-text">{o.title}</p>
                        <p className="text-[11px] text-adm-muted">
                          {o.kindLabel} · <span className="font-mono">{o.id}</span> · {o.operationalLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-adm-text">{formatBrl(o.amount)}</span>
                        <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] uppercase text-adm-muted">
                          {o.financialLabel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Biblioteca / Direitos + Chamadas + Personalizados */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="adm-card p-5">
                <h3 className="mb-3 text-sm font-semibold text-adm-text">
                  Acessos de Biblioteca ({detail.library.length})
                </h3>
                {detail.library.length === 0 ? (
                  <p className="text-xs text-adm-muted">Nenhum conteúdo atribuído.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.library.map((item) => (
                      <div key={item.entitlementId} className="flex items-center justify-between gap-2 rounded-lg bg-adm-surface px-3 py-2 text-xs">
                        <div>
                          <p className="text-adm-text">{item.title}</p>
                          <p className="text-[11px] text-adm-muted">Status: {item.status}</p>
                        </div>
                        {item.status === 'active' && (
                          <button
                            type="button"
                            onClick={() =>
                              runAdminAction('revoke_entitlement', {
                                orderRef: item.orderRef,
                                reason: 'Revogado manualmente pelo admin',
                              })
                            }
                            className="text-[11px] text-rose-300 hover:text-rose-200"
                          >
                            Revogar acesso
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="adm-card p-5">
                <h3 className="mb-3 text-sm font-semibold text-adm-text">
                  Trilha de Auditoria ({detail.auditEvents.length})
                </h3>
                {detail.auditEvents.length === 0 ? (
                  <p className="text-xs text-adm-muted">Sem eventos recentes.</p>
                ) : (
                  <div className="max-h-52 space-y-1.5 overflow-y-auto text-[11px]">
                    {detail.auditEvents.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between rounded bg-adm-surface px-2.5 py-1.5">
                        <span className="font-mono text-adm-text">{ev.action}</span>
                        <span className="text-adm-subtle">
                          {new Date(ev.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Visão de listagem geral
  return (
    <div className="space-y-5">
      {/* KPIs discretos */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="adm-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-adm-muted">Contas cadastradas</p>
          <p className="mt-1 text-2xl font-semibold text-adm-text">{totals.all}</p>
        </div>
        <div className="adm-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-adm-muted">Contas ativas</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400">{totals.active}</p>
        </div>
        <div className="adm-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-adm-muted">Exigem atendimento</p>
          <p className="mt-1 text-2xl font-semibold text-amber-400">{totals.attention}</p>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="adm-card flex flex-col gap-3 p-3.5 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-adm-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail ou ID..."
            className="adm-input min-h-[42px] pl-9 text-base sm:text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'attention', label: 'Atendimento' },
            { id: 'refunds', label: 'Reembolsos' },
            { id: 'active', label: 'Ativos' },
            { id: 'suspended', label: 'Suspensos' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id as any)}
              className={`adm-btn ${filter === f.id ? 'adm-btn-primary' : 'adm-btn-ghost'}`}
            >
              {f.label}
            </button>
          ))}
          <button type="button" onClick={loadList} className="adm-btn adm-btn-ghost" aria-label="Atualizar">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="adm-card flex items-center gap-2 border-rose-500/30 p-4 text-xs text-rose-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="adm-card h-16 animate-pulse" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="adm-card py-12 text-center">
          <Users className="mx-auto mb-2.5 h-7 w-7 text-adm-subtle" />
          <p className="text-sm font-medium text-adm-text">Nenhum cliente encontrado</p>
          <p className="mt-1 text-xs text-adm-muted">
            Os clientes com conta NUA ID aparecerão aqui automaticamente conforme se cadastrarem.
          </p>
        </div>
      ) : (
        <div className="adm-card divide-y divide-white/[0.06] overflow-hidden">
          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className="flex w-full flex-col justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-adm-hover sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-adm-text">{c.displayName}</span>
                  {c.needsAttention && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      Atenção
                    </span>
                  )}
                  {c.status !== 'active' && (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] uppercase text-rose-300">
                      {c.status}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-adm-muted">{c.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-adm-muted">
                <span>{c.counts.orders} pedido(s)</span>
                <span>{c.counts.appointments} chamada(s)</span>
                <span>{c.counts.personalizados} personalizado(s)</span>
                <span className="font-semibold text-adm-text">{formatBrl(c.totalSpent)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
