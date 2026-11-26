'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Printer,
  QrCode,
  Receipt,
  X,
} from 'lucide-react';
import { fetchOrders, NuaIdUnifiedOrder } from '@/lib/nuaIdClient';
import { useScrollLock } from '@/hooks/useScrollLock';
import { ClaimOrderBox } from './ClaimOrderBox';
import { OrderPaymentPanel } from './OrderPaymentPanel';
import type { AccountTab } from './MinhaNuaShell';

interface OrdersSectionProps {
  initialItems?: NuaIdUnifiedOrder[];
  hasInitialData?: boolean;
  refreshSignal: number;
  onClaimed: () => void;
  onNavigateTab?: (tab: AccountTab, orderId?: string) => void;
}

const FIN_STYLE: Record<NuaIdUnifiedOrder['financialStatus'], string> = {
  paid: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
  pending: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  failed: 'bg-rose-500/15 text-rose-300 border border-rose-500/25',
  cancelled: 'bg-zinc-600/25 text-zinc-300 border border-white/10',
  refunded: 'bg-amber-500/15 text-amber-200 border border-amber-500/25',
  charged_back: 'bg-rose-500/20 text-rose-200 border border-rose-500/30',
};

function formatRefundStatusBr(status: string): string {
  const normalized = String(status || '').trim().toLowerCase();
  if (['approved', 'completed', 'refunded'].includes(normalized)) return 'Concluído';
  if (['pending', 'pending_manual', 'manual_required', 'processing'].includes(normalized)) {
    return 'Em processamento';
  }
  if (['failed', 'rejected', 'cancelled'].includes(normalized)) return 'Falhou';
  return 'Registrado';
}

function formatPaymentMethodBr(method: string): string {
  const normalized = String(method || '').trim().toLowerCase();
  if (!normalized || normalized.includes('pix')) return 'Pix';
  if (normalized === 'manual') return 'Manual';
  if (normalized.includes('card') || normalized.includes('cartao')) return 'Cartão';
  if (normalized.includes('boleto')) return 'Boleto';
  return method;
}

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

export function OrdersSection({
  initialItems,
  hasInitialData = false,
  refreshSignal,
  onClaimed,
  onNavigateTab,
}: OrdersSectionProps) {
  const [type, setType] = useState<'all' | 'pack' | 'vip' | 'custom'>('all');
  const [statusView, setStatusView] = useState<'active' | 'pending' | 'cancelled' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NuaIdUnifiedOrder[]>(() => (initialItems || []).slice(0, 10));
  const [pagination, setPagination] = useState(() => ({
    page: 1,
    pageSize: 10,
    total: initialItems?.length || 0,
    totalPages: Math.max(1, Math.ceil((initialItems?.length || 0) / 10)),
  }));
  const [loading, setLoading] = useState(() => !hasInitialData && !initialItems?.length);
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<NuaIdUnifiedOrder | null>(null);
  const lastRefreshSignalRef = useRef(refreshSignal);

  useScrollLock(Boolean(receiptOrder));

  useEffect(() => {
    if (!receiptOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReceiptOrder(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [receiptOrder]);

  // Sincroniza diretamente dos dados agregados quando estamos na página 1 / Todos (evita double-fetch!)
  useEffect(() => {
    if (!hasInitialData || !initialItems) return;
    if (page === 1 && type === 'all') {
      setItems(initialItems.slice(0, 10));
      setPagination({
        page: 1,
        pageSize: 10,
        total: initialItems.length,
        totalPages: Math.max(1, Math.ceil(initialItems.length / 10)),
      });
      setLoading(false);
    }
  }, [initialItems, hasInitialData, page, type]);

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
    const refreshChanged = refreshSignal !== lastRefreshSignalRef.current;
    lastRefreshSignalRef.current = refreshSignal;
    // Só busca na API se trocou filtro/página, se não há dados iniciais ou se houve refresh explícito fora da página 1/all
    if (page === 1 && type === 'all' && hasInitialData && !refreshChanged) {
      return;
    }
    if (page === 1 && type === 'all' && hasInitialData && refreshChanged) {
      // O pai já recarregou overview?full=1 e vai atualizar initialItems
      return;
    }
    void load();
  }, [load, refreshSignal, page, type, hasInitialData]);

  const targetTabForKind = (kind: NuaIdUnifiedOrder['kind']): AccountTab =>
    kind === 'vip' ? 'chamadas' : kind === 'custom' ? 'personalizados' : 'biblioteca';

  const targetLabelForKind = (kind: NuaIdUnifiedOrder['kind']): string =>
    kind === 'vip' ? 'Ver chamada' : kind === 'custom' ? 'Ver personalizado' : 'Ver no acervo';

  const countsByStatus = useMemo(() => {
    let active = 0;
    let pending = 0;
    let cancelled = 0;
    for (const item of items) {
      if (item.financialStatus === 'pending') {
        pending += 1;
        active += 1;
      } else if (item.financialStatus === 'cancelled' || item.financialStatus === 'failed') {
        cancelled += 1;
      } else {
        active += 1;
      }
    }
    return { active, pending, cancelled, all: items.length };
  }, [items]);

  const effectiveStatusView =
    statusView === 'active' && countsByStatus.active === 0 && countsByStatus.cancelled > 0
      ? 'all'
      : statusView;

  const visibleItems = useMemo(() => {
    if (effectiveStatusView === 'all') return items;
    if (effectiveStatusView === 'pending') {
      return items.filter((item) => item.financialStatus === 'pending');
    }
    if (effectiveStatusView === 'cancelled') {
      return items.filter((item) => item.financialStatus === 'cancelled' || item.financialStatus === 'failed');
    }
    return items.filter((item) => item.financialStatus !== 'cancelled' && item.financialStatus !== 'failed');
  }, [items, effectiveStatusView]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-xl text-[#F5EEE9]">Pedidos e pagamentos</h2>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por serviço">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pack', label: 'Conteúdos' },
            { id: 'vip', label: 'Chamadas VIP' },
            { id: 'custom', label: 'Personalizados' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setType(f.id as 'all' | 'pack' | 'vip' | 'custom');
                setPage(1);
                setOpenPaymentId(null);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-all duration-200 cursor-pointer ${
                type === f.id
                  ? 'border border-[#90364B]/60 bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#54182b] hover:via-[#7A293D] hover:to-[#90364B] font-medium text-[#F5EEE9] shadow-[0_4px_16px_rgba(67,19,34,0.35)]'
                  : 'border border-white/[0.08] bg-[#08080c] text-zinc-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-[#F5EEE9]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {items.length > 0 && (countsByStatus.cancelled > 0 || countsByStatus.pending > 0) && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por situação">
          {[
            { id: 'active' as const, label: 'Principais', count: countsByStatus.active },
            ...(countsByStatus.pending > 0
              ? [{ id: 'pending' as const, label: 'Aguardando pagamento', count: countsByStatus.pending }]
              : []),
            ...(countsByStatus.cancelled > 0
              ? [{ id: 'cancelled' as const, label: 'Cancelados', count: countsByStatus.cancelled }]
              : []),
            { id: 'all' as const, label: 'Histórico completo', count: countsByStatus.all },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setStatusView(s.id);
                setOpenPaymentId(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-colors cursor-pointer ${
                effectiveStatusView === s.id
                  ? 'border border-white/20 bg-white/[0.1] font-medium text-[#F5EEE9]'
                  : 'border border-white/[0.06] bg-black/40 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
              }`}
            >
              <span>{s.label}</span>
              <span className="font-mono text-[10px] text-zinc-400">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      <ClaimOrderBox
        onClaimed={() => {
          onClaimed();
          if (page !== 1 || type !== 'all') {
            void load();
          }
        }}
      />

      {loading && items.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-[28px] border border-white/[0.06] bg-[#08080c]" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-[28px] border border-white/[0.08] bg-[#08080c] px-6 py-12 text-center shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
          <Receipt className="mx-auto mb-3 h-7 w-7 text-[#90364B]/80" />
          <p className="font-serif text-base text-[#F5EEE9]">Nenhum pedido registrado neste filtro</p>
          <p className="mt-1 text-xs text-zinc-400">
            Novas compras feitas com sua conta aparecerão automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((ord) => (
            <article
              key={ord.id}
              className="rounded-[28px] border border-white/[0.08] bg-[#08080c] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.85)]"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-mono uppercase tracking-wider text-[#C97A8D]">{ord.kindLabel}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-500">{formatDate(ord.createdAt)}</span>
                  </div>
                  <h3 className="mt-1.5 truncate font-serif text-base text-[#F5EEE9]">{ord.title}</h3>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-base font-semibold text-[#F5EEE9]">{formatBrl(ord.amount)}</p>
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                    {formatPaymentMethodBr(ord.paymentMethod)}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-3 text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-zinc-500">Pagamento:</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${FIN_STYLE[ord.financialStatus]}`}>
                    {ord.financialLabel}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-zinc-500">Situação:</span>
                  <span className="text-zinc-200">{ord.operationalLabel}</span>
                </span>

                <div className="flex flex-wrap items-center gap-2 sm:ml-auto w-full sm:w-auto">
                  {ord.financialStatus === 'paid' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setReceiptOrder(ord)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-zinc-300 transition-colors hover:border-white/25 hover:text-[#F5EEE9] cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#C97A8D]" />
                        Comprovante
                      </button>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab(targetTabForKind(ord.kind), ord.id)}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-[#7A293D]/45 bg-[#431322]/25 px-3.5 py-1.5 text-[11px] font-medium text-[#F5EEE9] transition-colors hover:bg-[#661C30]/55 cursor-pointer"
                        >
                          {targetLabelForKind(ord.kind)}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}

                  {((ord.financialStatus === 'pending' && formatPaymentMethodBr(ord.paymentMethod) === 'Pix') || openPaymentId === ord.id) && (
                    <button
                      type="button"
                      aria-expanded={openPaymentId === ord.id}
                      aria-controls={openPaymentId === ord.id ? `payment-${ord.id}` : undefined}
                      onClick={() => setOpenPaymentId(current => current === ord.id ? null : ord.id)}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#90364B]/60 bg-[#541a2c] px-5 font-semibold text-[#F5EEE9] transition-colors hover:bg-[#79283e] sm:w-auto cursor-pointer"
                    >
                      <QrCode className="h-4 w-4" />
                      {openPaymentId === ord.id ? 'Fechar pagamento' : 'Continuar pagamento'}
                    </button>
                  )}

                  {(['cancelled', 'failed'].includes(ord.financialStatus) && formatPaymentMethodBr(ord.paymentMethod) === 'Pix' && openPaymentId !== ord.id) && (
                    <button
                      type="button"
                      aria-expanded={false}
                      onClick={() => setOpenPaymentId(ord.id)}
                      className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-4 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-[#F5EEE9] sm:w-auto cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5 text-zinc-400" />
                      Tentar nova compra
                    </button>
                  )}
                </div>
              </div>

              {openPaymentId === ord.id && (
                <div id={`payment-${ord.id}`}>
                  <OrderPaymentPanel id={ord.id} onOrderUpdated={onClaimed} />
                </div>
              )}

              {ord.refunds && ord.refunds.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {ord.refunds.map((ref) => (
                    <div
                      key={ref.id}
                      className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-3.5 py-2 text-[11px] text-amber-200"
                    >
                      Reembolso registrado: <strong>{formatBrl(ref.amountCents / 100)}</strong> ({formatRefundStatusBr(ref.status)})
                      {ref.createdAt ? ` · ${formatDate(ref.createdAt)}` : ''}
                    </div>
                  ))}
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
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3.5 py-1.5 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3.5 py-1.5 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comprovante discreto imprimível */}
      {receiptOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Comprovante do pedido"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReceiptOrder(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#08080c] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95)] space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#C97A8D]">
                  NB Produções Digitais · Comprovante Discreto
                </p>
                <h3 className="mt-1 font-serif text-lg text-[#F5EEE9]">{receiptOrder.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                aria-label="Fechar comprovante"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Referência</dt>
                <dd className="font-mono text-zinc-200">{receiptOrder.id}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Serviço</dt>
                <dd className="text-zinc-200">{receiptOrder.kindLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Valor</dt>
                <dd className="font-semibold text-[#F5EEE9]">{formatBrl(receiptOrder.amount)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Forma de pagamento</dt>
                <dd className="text-zinc-200">{formatPaymentMethodBr(receiptOrder.paymentMethod)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Situação</dt>
                <dd className="text-emerald-300 font-medium">{receiptOrder.financialLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Pedido criado em</dt>
                <dd className="text-zinc-300">{formatDate(receiptOrder.createdAt)}</dd>
              </div>
              {receiptOrder.paidAt && (
                <div className="flex justify-between gap-4 pb-1">
                  <dt className="text-zinc-500">Confirmado em</dt>
                  <dd className="text-zinc-300">{formatDate(receiptOrder.paidAt)}</dd>
                </div>
              )}
            </dl>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs text-zinc-200 hover:bg-white/[0.09] cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir / PDF
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="min-h-[40px] rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] px-5 py-2 text-xs font-semibold text-[#F5EEE9] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
