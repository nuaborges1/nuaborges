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
  failed: 'border border-rose-500/25 bg-rose-500/10 text-rose-200',
  cancelled: 'border border-white/10 bg-white/[0.04] text-zinc-300',
  refunded: 'border border-amber-500/25 bg-amber-500/10 text-amber-200',
  charged_back: 'border border-rose-500/30 bg-rose-500/15 text-rose-200',
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
  defaultOpenClaim = false,
  onClaimed,
  onNavigateTab,
  onOpenContact,
}: OrdersSectionProps) {
  const [type, setType] = useState<'all' | 'pack' | 'vip' | 'custom'>('all');
  const [statusView, setStatusView] = useState<'active' | 'pending' | 'cancelled' | 'all'>('active');
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
    kind === 'vip' ? 'Ver chamada' : kind === 'custom' ? 'Ver personalizado' : 'Abrir na biblioteca';

  const sourceItems = useMemo(
    () => (hasInitialData && initialItems ? initialItems : remoteItems),
    [hasInitialData, initialItems, remoteItems]
  );

  const availableKindsCount = useMemo(() => {
    const kinds = new Set(sourceItems.map((i) => i.kind));
    return kinds.size;
  }, [sourceItems]);

  const allTypedItems = useMemo(() => {
    if (hasInitialData && initialItems) {
      return type === 'all' ? initialItems : initialItems.filter((item) => item.kind === type);
    }
    return remoteItems;
  }, [hasInitialData, initialItems, remoteItems, type]);

  const countsByStatus = useMemo(() => {
    let active = 0;
    let pending = 0;
    let cancelled = 0;
    for (const item of allTypedItems) {
      if (item.financialStatus === 'pending') {
        pending += 1;
        active += 1;
      } else if (item.financialStatus === 'cancelled' || item.financialStatus === 'failed') {
        cancelled += 1;
      } else {
        active += 1;
      }
    }
    return { active, pending, cancelled, all: allTypedItems.length };
  }, [allTypedItems]);

  const effectiveStatusView =
    statusView === 'active' && countsByStatus.active === 0 && countsByStatus.cancelled > 0
      ? 'all'
      : statusView === 'pending' && countsByStatus.pending === 0
        ? 'active'
        : statusView;

  const filteredItems = useMemo(() => {
    if (effectiveStatusView === 'all') return allTypedItems;
    if (effectiveStatusView === 'pending') {
      return allTypedItems.filter((item) => item.financialStatus === 'pending');
    }
    if (effectiveStatusView === 'cancelled') {
      return allTypedItems.filter((item) => item.financialStatus === 'cancelled' || item.financialStatus === 'failed');
    }
    return allTypedItems.filter((item) => item.financialStatus !== 'cancelled' && item.financialStatus !== 'failed');
  }, [allTypedItems, effectiveStatusView]);

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

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-serif text-2xl font-normal leading-tight tracking-tight text-[#F5EEE9] sm:text-3xl">
            Pedidos e pagamentos
          </h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            Histórico de compras, comprovantes discretos e pagamentos pendentes.
          </p>
        </div>

        {/* Filtro por serviço apenas quando há mais de um tipo ou filtro ativo */}
        {(availableKindsCount > 1 || type !== 'all') && (
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
                aria-pressed={type === f.id}
                className={`min-h-[38px] rounded-full px-3.5 text-xs transition-colors cursor-pointer touch-manipulation ${
                  type === f.id
                    ? 'border border-[#90364B]/55 bg-[#661C30]/40 font-medium text-[#F5EEE9]'
                    : 'border border-white/[0.08] bg-[#08080c] text-zinc-400 hover:border-white/20 hover:text-[#F5EEE9]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {allTypedItems.length > 0 && (countsByStatus.cancelled > 0 || countsByStatus.pending > 0) && (
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
                setPage(1);
                setOpenPaymentId(null);
              }}
              aria-pressed={effectiveStatusView === s.id}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-xs transition-colors cursor-pointer touch-manipulation ${
                effectiveStatusView === s.id
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

      {loading && allTypedItems.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 rounded-[24px] border border-white/[0.08] bg-[#08080c]" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#C97A8D]">
            <Receipt className="size-5" />
          </div>
          <p className="font-serif text-xl font-normal text-[#F5EEE9]">Nenhum pedido registrado neste filtro</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-400">
            Novas compras feitas com sua conta aparecerão automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((ord) => (
            <article key={ord.id} className="rounded-[24px] border border-white/[0.08] bg-[#08080c] p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-[#C97A8D]">{ord.kindLabel}</span>
                    <span aria-hidden className="text-zinc-600">·</span>
                    <span className="text-zinc-500">{formatDate(ord.createdAt)}</span>
                  </div>
                  <h3 className="truncate font-serif text-xl font-normal text-[#F5EEE9]">{ord.title}</h3>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-serif text-lg text-[#F5EEE9] tabular-nums">{formatBrl(ord.amount)}</p>
                  <p className="text-xs text-zinc-500">{formatPaymentMethodBr(ord.paymentMethod)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4 text-xs">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${FIN_STYLE[ord.financialStatus]}`}>
                  {ord.financialLabel}
                </span>
                <span className="text-zinc-300">{ord.operationalLabel}</span>

                <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                  {ord.financialStatus === 'paid' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setReceiptOrder(ord)}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.02] px-3.5 text-xs text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/[0.05] hover:text-[#F5EEE9] cursor-pointer"
                      >
                        <FileText className="size-3.5 text-[#C97A8D]" />
                        <span>Comprovante</span>
                      </button>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab(targetTabForKind(ord.kind), ord.id)}
                          className="btn-ghost !min-h-[38px] !px-4 !text-[11px]"
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
                      className="btn-primary !min-h-[42px] w-full !px-5 sm:w-auto"
                    >
                      <QrCode className="size-3.5" />
                      <span>{openPaymentId === ord.id ? 'Fechar pagamento' : 'Continuar pagamento'}</span>
                    </button>
                  )}

                  {['cancelled', 'failed'].includes(ord.financialStatus) &&
                    formatPaymentMethodBr(ord.paymentMethod) === 'Pix' &&
                    openPaymentId !== ord.id && (
                      <button
                        type="button"
                        aria-expanded={false}
                        onClick={() => setOpenPaymentId(ord.id)}
                        className="btn-ghost !min-h-[38px] w-full !px-4 !text-[11px] sm:w-auto"
                      >
                        <QrCode className="size-3.5 text-[#C97A8D]" />
                        <span>Tentar nova compra</span>
                      </button>
                    )}
                </div>
              </div>

              {openPaymentId === ord.id && (
                <div id={`payment-${ord.id}`}>
                  <OrderPaymentPanel id={ord.id} onOrderUpdated={onClaimed} onOpenContact={onOpenContact} />
                </div>
              )}

              {ord.refunds && ord.refunds.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {ord.refunds.map((ref) => (
                    <div
                      key={ref.id}
                      className="rounded-xl border border-amber-500/20 bg-amber-950/20 px-3.5 py-2 text-xs text-amber-200"
                    >
                      Reembolso registrado: <strong>{formatBrl(ref.amountCents / 100)}</strong> (
                      {formatRefundStatusBr(ref.status)}){ref.createdAt ? ` · ${formatDate(ref.createdAt)}` : ''}
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
                  className="btn-ghost !min-h-[38px] !px-3.5 !text-[11px]"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="btn-ghost !min-h-[38px] !px-3.5 !text-[11px]"
                >
                  <span>Próxima</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vínculo discreto de compra anterior no encerramento da seção */}
      <ClaimOrderBox
        defaultOpen={defaultOpenClaim}
        onOpenContact={onOpenContact}
        onClaimed={() => {
          onClaimed();
          if (!hasInitialData) {
            void load();
          }
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
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#C97A8D]">
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
                <dd className="text-zinc-200">{receiptOrder.kindLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Valor</dt>
                <dd className="font-medium text-[#F5EEE9] tabular-nums">{formatBrl(receiptOrder.amount)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Forma de pagamento</dt>
                <dd className="text-zinc-200">{formatPaymentMethodBr(receiptOrder.paymentMethod)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Situação</dt>
                <dd className="font-medium text-emerald-300">{receiptOrder.financialLabel}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/[0.05] pb-2">
                <dt className="text-zinc-500">Pedido criado em</dt>
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
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-ghost !min-h-[40px] !px-4 !text-[11px]"
              >
                <Printer className="size-3.5" />
                <span>Imprimir / PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="btn-primary !min-h-[40px] !px-5 !text-[11px]"
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
