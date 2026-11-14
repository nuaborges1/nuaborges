'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import {
  fetchStripeDashboard,
  StripeDashboardData,
} from '@/lib/services/nua/stripeDashboardService';
import { CommercialFinanceMetrics } from './finance/commercial/CommercialFinanceMetrics';
import { CommercialFinanceModalities } from './finance/commercial/CommercialFinanceModalities';
import { CommercialFinanceTimeline } from './finance/commercial/CommercialFinanceTimeline';
import { CommercialFinanceTransactions } from './finance/commercial/CommercialFinanceTransactions';
import { subscribeAdminUpdates } from '@/lib/adminSync';

interface CommercialFinanceEditorProps {
  searchQuery?: string;
}

export function CommercialFinanceEditor({ searchQuery = '' }: CommercialFinanceEditorProps = {}) {
  const [period, setPeriod] = useState<'current_month' | '30d' | '90d' | 'all'>('current_month');
  const [modality, setModality] = useState<'all' | 'packs' | 'personalizados' | 'chamadas'>('all');
  const [status, setStatus] = useState<'all' | 'succeeded' | 'pending' | 'failed' | 'refunded'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [data, setData] = useState<StripeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const res = await fetchStripeDashboard(period, modality, status);
      setData(res);
    } catch (err: any) {
      console.error('[CommercialFinanceEditor] Erro ao carregar dados:', err);
      setError(err?.message || 'Falha na comunicação com o Stripe.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [period, modality, status]);

  useEffect(() => {
    loadDashboard();
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

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    const q = (searchTerm || searchQuery).toLowerCase().trim();
    if (!q) return data.transactions;
    return data.transactions.filter(
      (t) =>
        (t.customerName || '').toLowerCase().includes(q) ||
        (t.customerEmail || '').toLowerCase().includes(q) ||
        (t.orderId || '').toLowerCase().includes(q) ||
        (t.chargeId || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    );
  }, [data?.transactions, searchTerm, searchQuery]);

  const maxTimelineAmount = useMemo(() => {
    if (!data?.timeline || data.timeline.length === 0) return 100;
    const max = Math.max(...data.timeline.map((d) => d.amount));
    return max > 0 ? max : 100;
  }, [data?.timeline]);

  return (
    <div className="space-y-5 select-none text-white">
      {/* Barra de Controle do Dashboard Financeiro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp className="w-4 h-4 text-[#f4a7b9]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Financeiro</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 border border-white/10">
                Integração Stripe
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Receitas comerciais das vendas dos Packs, Personalizados e Chamadas VIP
            </p>
          </div>
        </div>

        {/* Controles de Período e Atualização */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#171821] border border-white/[0.06]">
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
                      ? 'bg-white/[0.12] text-white shadow-sm'
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
            className="p-1.5 rounded-lg bg-[#171821] hover:bg-[#20222d] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Recarregar dados do Stripe"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#f4a7b9]' : ''}`} />
          </button>
        </div>
      </div>

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
