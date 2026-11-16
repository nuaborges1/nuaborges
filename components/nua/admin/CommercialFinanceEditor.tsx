'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  fetchCommercialFinanceDashboard,
  getCachedCommercialFinanceDashboard,
  CommercialFinanceData,
} from '@/lib/services/nua/commercialFinanceService';
import { CommercialFinanceMetrics } from './finance/commercial/CommercialFinanceMetrics';
import { CommercialFinanceModalities } from './finance/commercial/CommercialFinanceModalities';
import { CommercialFinanceTimeline } from './finance/commercial/CommercialFinanceTimeline';
import { CommercialFinanceTransactions } from './finance/commercial/CommercialFinanceTransactions';
import { PageHeader } from './ui/AdminPrimitives';
import { FinanceiroSkeleton } from './ui/AdminSkeleton';
import { subscribeAdminUpdates } from '@/lib/adminSync';

interface CommercialFinanceEditorProps {
  searchQuery?: string;
}

export function CommercialFinanceEditor({ searchQuery = '' }: CommercialFinanceEditorProps = {}) {
  const [period, setPeriod] = useState<'current_month' | '30d' | '90d' | 'all'>('current_month');
  const [modality, setModality] = useState<'all' | 'packs' | 'personalizados' | 'chamadas'>('all');
  const [status, setStatus] = useState<'all' | 'succeeded' | 'pending' | 'failed' | 'refunded'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [data, setData] = useState<CommercialFinanceData | null>(() =>
    getCachedCommercialFinanceDashboard('current_month', 'all', 'all')
  );
  const [loading, setLoading] = useState<boolean>(
    () => !getCachedCommercialFinanceDashboard('current_month', 'all', 'all')
  );
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    const cached = !forceRefresh ? getCachedCommercialFinanceDashboard(period, 'all', 'all') : null;
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      if (!forceRefresh) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const res = await fetchCommercialFinanceDashboard(period, 'all', 'all', { force: forceRefresh });
      setData(res);
    } catch (err: any) {
      console.error('[CommercialFinanceEditor] Erro ao carregar dados:', err);
      setError(err?.message || 'Falha na comunicação com o servidor financeiro.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  // Baixa/reversão feita pela IA ou em outra aba atualiza os números na hora.
  useEffect(() => {
    let timer: any = null;
    return subscribeAdminUpdates('finance', () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadDashboard(true), 400);
    });
  }, [loadDashboard]);

  const formatMoney = (val?: number) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  // Filtragem local instantânea (sem novas chamadas de API ao trocar modalidade ou status)
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    const q = (searchTerm || searchQuery).toLowerCase().trim();
    return data.transactions.filter((t) => {
      if (modality !== 'all' && t.modality !== modality) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (!q) return true;
      return (
        (t.customerName || '').toLowerCase().includes(q) ||
        (t.customerEmail || '').toLowerCase().includes(q) ||
        (t.orderId || '').toLowerCase().includes(q) ||
        (t.chargeId || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    });
  }, [data?.transactions, modality, status, searchTerm, searchQuery]);

  const maxTimelineAmount = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return 100;
    const max = Math.max(...data.timeline.map((d) => d.amount));
    return max > 0 ? max : 100;
  }, [data?.timeline]);

  if (loading && !data) {
    return <FinanceiroSkeleton />;
  }

  return (
    <div className="space-y-5 select-none text-white">
      <PageHeader
        title="Financeiro"
        subtitle="Receitas comerciais das vendas de packs avulsos, encomendas personalizadas e chamadas VIP."
        helpId="financeiro_geral"
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center p-1 rounded-xl bg-[#14161d] border border-white/[0.06]">
              {(
                [
                  { id: 'current_month', label: 'Mês Atual' },
                  { id: '30d', label: '30 Dias' },
                  { id: '90d', label: '90 Dias' },
                  { id: 'all', label: 'Tudo' },
                ] as const
              ).map((p) => {
                const isActive = period === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriod(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={isRefreshing || loading}
              className="h-9 w-9 rounded-xl bg-[#14161d] hover:bg-[#1c1f29] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Recarregar dados financeiros"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#f4a7b9]' : ''}`} />
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Grid de Métricas Principais (6 Indicadores) */}
      <CommercialFinanceMetrics data={data} formatMoney={formatMoney} />

      {/* Consolidação por Modalidade Comercial */}
      <CommercialFinanceModalities data={data} formatMoney={formatMoney} />

      {/* Gráfico de Evolução Temporal */}
      <CommercialFinanceTimeline
        data={data}
        maxTimelineAmount={maxTimelineAmount}
        formatMoney={formatMoney}
      />

      {/* Histórico Completo de Transações para Auditoria */}
      <CommercialFinanceTransactions
        modality={modality}
        setModality={setModality}
        status={status}
        setStatus={setStatus}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loading={loading}
        filteredTransactions={filteredTransactions}
        formatMoney={formatMoney}
      />
    </div>
  );
}
