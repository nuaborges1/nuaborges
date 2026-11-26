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
import { useModalFocus } from '@/hooks/useModalFocus';
import { ClaimOrderBox } from './ClaimOrderBox';
import { OrderPaymentPanel } from './OrderPaymentPanel';
import type { AccountTab } from './MinhaNuaShell';

interface OrdersSectionProps {
  initialItems?: NuaIdUnifiedOrder[];
  hasInitialData?: boolean;
  refreshSignal: number;
  defaultOpenClaim?: boolean;
  onClaimed: () => void;
  onNavigateTab?: (tab: AccountTab, orderId?: string) => void;
  onOpenContact?: () => void;
}

const FIN_STYLE: Record<NuaIdUnifiedOrder['financialStatus'], string> = {
  paid: 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
  pending: 'border border-amber-500/25 bg-amber-500/10 text-amber-200',
  failed: 'border border-red-500/25 bg-red-500/10 text-red-200',
  cancelled: 'border border-white/10 bg-white/[0.04] text-zinc-400',
  refunded: 'border border-amber-500/25 bg-amber-500/10 text-amber-200',
  charged_back: 'border border-red-500/30 bg-red-500/15 text-red-200',
};

function formatRefundStatusBr(status: string): string {
  const normalized = String(status || '').trim().toLowerCase();
  if (['approved', 'completed', 'refunded'].includes(normalized)) return 'concluído';
  if (['pending', 'pending_manual', 'manual_required', 'processing'].includes(normalized)) {
    return 'em processamento';
  }
  if (['failed', 'rejected', 'cancelled'].includes(normalized)) return 'falhou';
  return 'registrado';
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
  defaultOpenClaim = false,
  onClaimed,
  onNavigateTab,
  onOpenContact,
}: OrdersSectionProps) {
  const [type, setType] = useState<'all' | 'pack' | 'vip' | 'custom'>('all');
  const [statusView, setStatusView] = useState<'all' | 'pending' | 'cancelled'>('all');
  const [page, setPage] = useState(1);
  const [remoteItems, setRemoteItems] = useState<NuaIdUnifiedOrder[]>([]);
  const [remotePagination, setRemotePagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(() => !hasInitialData && !initialItems?.length);
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<NuaIdUnifiedOrder | null>(null);
  const receiptDialogRef = useRef<HTMLDivElement>(null);

  useScrollLock(Boolean(receiptOrder));
  useModalFocus(Boolean(receiptOrder), receiptDialogRef);

  useEffect(() => {
    if (!receiptOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReceiptOrder(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [receiptOrder]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOrders(page, 10, type);
      if (res.ok && res.data?.success) {
        setRemoteItems(res.data.items || []);
        setRemotePagination(res.data.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 });
      }
    } finally {
      setLoading(false);
    }
  }, [page, type]);

  useEffect(() => {
    if (hasInitialData) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, refreshSignal, hasInitialData]);

  const targetTabForKind = (kind: NuaIdUnifiedOrder['kind']): AccountTab =>
    kind === 'vip' ? 'chamadas' : kind === 'custom' ? 'personalizados' : 'biblioteca';

  const targetLabelForKind = (kind: NuaIdUnifiedOrder['kind']): string =>
    kind === 'vip' ? 'Chamada' : kind === 'custom' ? 'Personalizado' : 'Abrir';

  const sourceItems = useMemo(
    () => (hasInitialData && initialItems ? initialItems : remoteItems),
    [hasInitialData, initialItems, remoteItems]
  );

  const availableKindsCount = useMemo(() => new Set(sourceItems.map((i) => i.kind)).size, [sourceItems]);

  const allTypedItems = useMemo(() => {
    if (hasInitialData && initialItems) {
      return type === 'all' ? initialItems : initialItems.filter((item) => item.kind === type);
    }
    return remoteItems;
  }, [hasInitialData, initialItems, remoteItems, type]);

  const countsByStatus = useMemo(() => {
    let pending = 0;
    let cancelled = 0;
    for (const item of allTypedItems) {
      if (item.financialStatus === 'pending') pending += 1;
      else if (['cancelled', 'failed', 'refunded'].includes(item.financialStatus)) cancelled += 1;
    }
    return { pending, cancelled, all: allTypedItems.length };
  }, [allTypedItems]);

  const filteredItems = useMemo(() => {
    if (statusView === 'pending') {
      return allTypedItems.filter((item) => item.financialStatus === 'pending');
    }
    if (statusView === 'cancelled') {
      return allTypedItems.filter((item) => ['cancelled', 'failed', 'refunded'].includes(item.financialStatus));
    }
    return allTypedItems;
  }, [allTypedItems, statusView]);

  const pagination = useMemo(() => {
    if (!hasInitialData) return remotePagination;
    const total = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(total / 10));
    const safePage = Math.min(page, totalPages);
    return { page: safePage, pageSize: 10, total, totalPages };
  }, [hasInitialData, remotePagination, filteredItems.length, page]);

  const visibleItems = useMemo(() => {
    if (!hasInitialData) return filteredItems;
    const start = (pagination.page - 1) * 10;
    return filteredItems.slice(start, start + 10);
  }, [hasInitialData, filteredItems, pagination.page]);

  const showTypeFilters = availableKindsCount > 1 || type !== 'all';
  const showStatusFilters = countsByStatus.pending > 0 || countsByStatus.cancelled > 0;

  return (
    <div className="space-y-5">
      {/* Barra compacta de sub-filtros — somente quando há variedade real */}
      {(showTypeFilters || showStatusFilters) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showTypeFilters && (
            <div
              className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/[0.08] bg-[#08080c] p-1"
              role="group"
              aria-label="Filtrar por serviço"
            >
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
                  aria-pressed={type === f.id}
                  className={`min-h-[34px] rounded-full px-3.5 text-xs transition-colors cursor-pointer touch-manipulation ${
                    type === f.id
                      ? 'border border-[#90364B]/50 bg-[#661C30]/40 font-medium text-[#F5EEE9]'
                      : 'border border-transparent text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {showStatusFilters && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por situação">
              {[
                { id: 'all' as const, label: 'Todos', count: countsByStatus.all },
                ...(countsByStatus.pending > 0
                  ? [{ id: 'pending' as const, label: 'Pendentes', count: countsByStatus.pending }]
                  : []),
                ...(countsByStatus.cancelled > 0
                  ? [{ id: 'cancelled' as const, label: 'Encerrados', count: countsByStatus.cancelled }]
                  : []),
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStatusView(s.id);
                    setPage(1);
                    setOpenPaymentId(null);
                  }}
                  aria-pressed={statusView === s.id}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 text-xs transition-colors cursor-pointer touch-manipulation ${
                    statusView === s.id
                      ? 'border border-white/20 bg-white/[0.08] font-medium text-[#F5EEE9]'
                      : 'border border-white/[0.06] bg-[#08080c] text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="text-[11px] tabular-nums text-zinc-400">{s.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extrato Editorial em linhas limpas — distinto dos cards das demais abas */}
      {loading && allTypedItems.length === 0 ? (
        <div className="h-56 rounded-[24px] border border-white/[0.08] bg-[#08080c]" />
      ) : visibleItems.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#F5EEE9]">
            <Receipt className="size-5" />
          </div>
          <p className="font-serif text-2xl font-normal text-[#F5EEE9]">Nenhum pedido neste filtro</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-400">
            Suas compras, comprovantes e pagamentos aparecerão organizados aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#08080c] divide-y divide-white/[0.06]">
          {visibleItems.map((ord) => {
            const latestRefund = ord.refunds && ord.refunds.length > 0 ? ord.refunds[0] : null;
            const kindDisplay = ord.kind === 'pack' ? 'Conteúdo' : ord.kindLabel;
            const showOpDetail =
              ord.financialStatus === 'paid' &&
              ord.operationalLabel.toLowerCase() !== ord.financialLabel.toLowerCase();

            return (
              <div key={ord.id} className="p-5 transition-colors hover:bg-white/[0.015] sm:px-6 sm:py-5">
                <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
                  {/* Esquerda: Serviço, Título, Data e Status consolidado */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-[#F5EEE9]/80">{kindDisplay}</span>
                      <span aria-hidden className="text-zinc-600">·</span>
                      <span className="text-zinc-500">{formatDate(ord.createdAt)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${FIN_STYLE[ord.financialStatus]}`}>
                        {ord.financialLabel}
                      </span>
                      {showOpDetail && <span className="text-zinc-400">{ord.operationalLabel}</span>}
                    </div>

                    <h2 className="truncate font-serif text-lg font-normal text-[#F5EEE9] sm:text-xl">
                      {ord.title}
                    </h2>

                    {latestRefund && (
                      <p className="text-xs text-zinc-400">
                        Reembolso de {formatBrl(latestRefund.amountCents / 100)} {formatRefundStatusBr(latestRefund.status)}
                        {latestRefund.createdAt ? ` em ${formatDate(latestRefund.createdAt)}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Direita: Valor + Ações enxutas */}
                  <div className="flex flex-wrap items-center justify-between gap-4 md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="font-serif text-lg text-[#F5EEE9] tabular-nums">{formatBrl(ord.amount)}</p>
                      <p className="text-[11px] text-zinc-500">{formatPaymentMethodBr(ord.paymentMethod)}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ord.financialStatus === 'paid' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(ord)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-3.5 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-[#F5EEE9] cursor-pointer"
                          >
                            <FileText className="size-3.5 text-[#90364B]" />
                            <span>Comprovante</span>
                          </button>
                          {onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab(targetTabForKind(ord.kind), ord.id)}
                              className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-[#7A293D]/45 bg-[#431322]/30 px-3.5 text-xs font-medium text-[#F5EEE9] transition-colors hover:bg-[#661C30]/60 cursor-pointer"
                            >
                              <span>{targetLabelForKind(ord.kind)}</span>
                              <ArrowUpRight className="size-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      {((ord.financialStatus === 'pending' && formatPaymentMethodBr(ord.paymentMethod) === 'Pix') ||
                        openPaymentId === ord.id) && (
                        <button
                          type="button"
                          aria-expanded={openPaymentId === ord.id}
                          aria-controls={openPaymentId === ord.id ? `payment-${ord.id}` : undefined}
                          onClick={() => setOpenPaymentId((current) => (current === ord.id ? null : ord.id))}
                          className="btn-primary !min-h-[40px] !px-4 !text-[11px]"
                        >
                          <QrCode className="size-3.5" />
                          <span>{openPaymentId === ord.id ? 'Fechar Pix' : 'Pagar Pix'}</span>
                        </button>
                      )}

                      {['cancelled', 'failed'].includes(ord.financialStatus) &&
                        formatPaymentMethodBr(ord.paymentMethod) === 'Pix' &&
                        openPaymentId !== ord.id && (
                          <button
                            type="button"
                            onClick={() => setOpenPaymentId(ord.id)}
                            className="btn-ghost !min-h-[38px] !px-3.5 !text-[11px]"
                          >
                            <QrCode className="size-3.5 text-[#90364B]" />
                            <span>Nova compra</span>
                          </button>
                        )}
                    </div>
                  </div>
                </div>

                {openPaymentId === ord.id && (
                  <div id={`payment-${ord.id}`}>
                    <OrderPaymentPanel id={ord.id} onOrderUpdated={onClaimed} onOpenContact={onOpenContact} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
          <span>
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-ghost !min-h-[36px] !px-3.5 !text-[11px]"
            >
              <ChevronLeft className="size-3.5" />
              <span>Anterior</span>
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="btn-ghost !min-h-[36px] !px-3.5 !text-[11px]"
            >
              <span>Próxima</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Vínculo discreto de compra anterior */}
      <ClaimOrderBox
        defaultOpen={defaultOpenClaim}
        onOpenContact={onOpenContact}
        onClaimed={() => {
          onClaimed();
          if (!hasInitialData) void load();
        }}
      />

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
          <div
            ref={receiptDialogRef}
            className="nua-print-receipt w-full max-w-md space-y-5 rounded-[24px] border border-white/[0.1] bg-[#08080c] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#F5EEE9]/80">
                  NB Produções Digitais · Comprovante
                </p>
                <h3 className="mt-1.5 font-serif text-xl font-normal text-[#F5EEE9]">{receiptOrder.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                aria-label="Fechar comprovante"
                className="nua-print-hide flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Serviço</dt>
                <dd className="text-zinc-200">{receiptOrder.kind === 'pack' ? 'Conteúdo' : receiptOrder.kindLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Valor</dt>
                <dd className="font-medium text-[#F5EEE9] tabular-nums">{formatBrl(receiptOrder.amount)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Pagamento</dt>
                <dd className="text-zinc-200">{formatPaymentMethodBr(receiptOrder.paymentMethod)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Situação</dt>
                <dd className="font-medium text-emerald-300">{receiptOrder.financialLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Criado em</dt>
                <dd className="text-zinc-300">{formatDate(receiptOrder.createdAt)}</dd>
              </div>
              {receiptOrder.paidAt && (
                <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                  <dt className="text-zinc-500">Confirmado em</dt>
                  <dd className="text-zinc-300">{formatDate(receiptOrder.paidAt)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 pt-1 text-xs">
                <dt className="text-zinc-500">Referência</dt>
                <dd className="font-mono text-zinc-400">{receiptOrder.id}</dd>
              </div>
            </dl>

            <div className="nua-print-hide flex items-center justify-end gap-2.5 pt-2">
              <button type="button" onClick={() => window.print()} className="btn-ghost !min-h-[40px] !px-4 !text-[11px]">
                <Printer className="size-3.5" />
                <span>Imprimir / PDF</span>
              </button>
              <button type="button" onClick={() => setReceiptOrder(null)} className="btn-primary !min-h-[40px] !px-5 !text-[11px]">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
