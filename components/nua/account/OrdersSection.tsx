'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { fetchOrders, NuaIdUnifiedOrder } from '@/lib/nuaIdClient';
import { ClaimOrderBox } from './ClaimOrderBox';

interface OrdersSectionProps {
  refreshSignal: number;
  onClaimed: () => void;
}

const FIN_STYLE: Record<NuaIdUnifiedOrder['financialStatus'], string> = {
  paid: 'bg-emerald-500/15 text-emerald-300',
  pending: 'bg-amber-500/15 text-amber-300',
  failed: 'bg-rose-500/15 text-rose-300',
  cancelled: 'bg-zinc-600/25 text-zinc-300',
  refunded: 'bg-amber-500/15 text-amber-200',
  charged_back: 'bg-rose-500/20 text-rose-200',
};

function formatBrl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function OrdersSection({ refreshSignal, onClaimed }: OrdersSectionProps) {
  const [type, setType] = useState<'all' | 'pack' | 'vip' | 'custom'>('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NuaIdUnifiedOrder[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOrders(page, 10, type);
      if (res.ok && res.data?.success) {
        setItems(res.data.items || []);
        setPagination(res.data.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 });
      }
    } finally {
      setLoading(false);
    }
  }, [page, type]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-xl text-[#F5EEE9]">Minhas Compras</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Histórico unificado com separação clara entre confirmação financeira e entrega do serviço.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por serviço">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pack', label: 'Packs' },
            { id: 'vip', label: 'Chamadas VIP' },
            { id: 'custom', label: 'Personalizados' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setType(f.id as any);
                setPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                type === f.id
                  ? 'bg-[#661C30] font-medium text-[#F5EEE9]'
                  : 'border border-white/10 text-zinc-400 hover:text-[#F5EEE9]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ClaimOrderBox
        onClaimed={() => {
          onClaimed();
          load();
        }}
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-[#171115]/70" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-12 text-center shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
          <Receipt className="mx-auto mb-3 h-7 w-7 text-[#90364B]/80" />
          <p className="font-serif text-base text-[#F5EEE9]">Nenhuma compra registrada neste filtro</p>
          <p className="mt-1 text-xs text-zinc-400">
            Novas compras feitas com sua conta aparecerão automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((ord) => (
            <article
              key={ord.id}
              className="rounded-[24px] border border-white/[0.08] bg-[#08080c] p-4 sm:p-5 shadow-[0_16px_50px_rgba(0,0,0,0.85)]"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="uppercase tracking-wider text-[#A65B6C]">{ord.kindLabel}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="font-mono text-zinc-400">{ord.id}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-500">{formatDate(ord.createdAt)}</span>
                  </div>
                  <h3 className="mt-1.5 truncate font-serif text-base text-[#F5EEE9]">{ord.title}</h3>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-base font-semibold text-[#F5EEE9]">{formatBrl(ord.amount)}</p>
                  <p className="text-[11px] uppercase text-zinc-500">{ord.paymentMethod}</p>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-3 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-zinc-500">Financeiro:</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${FIN_STYLE[ord.financialStatus]}`}>
                    {ord.financialLabel}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-zinc-500">Serviço:</span>
                  <span className="text-zinc-200">{ord.operationalLabel}</span>
                </span>
              </div>

              {ord.refunds && ord.refunds.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200">
                  Reembolso registrado: {formatBrl(ord.refunds[0].amountCents / 100)} ({ord.refunds[0].status})
                </div>
              )}
            </article>
          ))}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-zinc-400">
              <span>
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} registro(s))
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 hover:text-white disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 hover:text-white disabled:opacity-40"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
