'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Play,
  QrCode,
  Send,
  Zap,
} from 'lucide-react';
import { NuaIdPersonalizado } from '@/lib/nuaIdClient';
import { OrderPaymentPanel } from './OrderPaymentPanel';
import { VaultContentViewer } from './VaultContentViewer';

interface PersonalizadosSectionProps {
  items: NuaIdPersonalizado[];
  loading: boolean;
  selectedOrder: string | null;
  confirmToken?: string;
  onSelectOrder: (order: string | null) => void;
  onClearConfirmToken?: () => void;
  onUpdated?: () => void;
  onOpenContact?: () => void;
}

const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  paid: 'Pago',
  approved: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  charged_back: 'Contestado',
};

function formatFinancialStatusBr(status: string): string {
  return FINANCIAL_STATUS_LABELS[String(status || '').toLowerCase()] || 'Pendente';
}

const PERSONALIZADO_STATUS: Record<
  NuaIdPersonalizado['operationalStatus'],
  { label: string; cls: string; step: number }
> = {
  aguardando_pagamento: {
    label: 'Aguardando pagamento',
    cls: 'border border-amber-500/25 bg-amber-500/10 text-amber-200',
    step: 1,
  },
  em_producao: {
    label: 'Em produção',
    cls: 'border border-[#7A293D]/50 bg-[#431322]/40 text-[#F5EEE9]',
    step: 2,
  },
  pronto: {
    label: 'Pronto para acesso',
    cls: 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
    step: 3,
  },
  entregue: {
    label: 'Entregue',
    cls: 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
    step: 4,
  },
  cancelado: {
    label: 'Cancelado',
    cls: 'border border-rose-500/25 bg-rose-500/10 text-rose-200',
    step: 0,
  },
};

const STEPS = [
  { step: 1, label: 'Pedido' },
  { step: 2, label: 'Em produção' },
  { step: 3, label: 'Pronto' },
  { step: 4, label: 'Entregue' },
];

function formatBrl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatOrderSummary(item: NuaIdPersonalizado): string {
  const photos = item.photoCount || 0;
  const parts: string[] = [];
  if (photos > 0 || item.videoDurationMinutes <= 0) {
    parts.push(`${photos} ${photos === 1 ? 'foto' : 'fotos'}`);
  }
  if (item.videoDurationMinutes > 0) {
    parts.push(`Vídeo de ${item.videoDurationMinutes} min`);
  }
  if (item.mentionName) {
    parts.push('Com menção de nome');
  }
  return parts.join(' · ');
}

export function PersonalizadosSection({
  items,
  loading,
  selectedOrder,
  confirmToken = '',
  onSelectOrder,
  onClearConfirmToken,
  onUpdated,
  onOpenContact,
}: PersonalizadosSectionProps) {
  const [expandedBriefing, setExpandedBriefing] = useState<Record<string, boolean>>({});
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => (selectedOrder ? items.find((i) => i.id === selectedOrder) || null : null),
    [items, selectedOrder]
  );

  // Se o link direto apontar para um pedido ainda não entregue, rola até o card e abre o Pix se pendente
  useEffect(() => {
    if (!selectedItem) return;
    const isVaultReady =
      selectedItem.deliveryChannel === 'vault' &&
      selectedItem.financialStatus === 'paid' &&
      ['pronto', 'entregue'].includes(selectedItem.operationalStatus);
    if (isVaultReady) return;

    if (selectedItem.operationalStatus === 'aguardando_pagamento' || selectedItem.financialStatus === 'pending') {
      setOpenPaymentId(selectedItem.id);
    }
    const timer = window.setTimeout(() => {
      const el = document.querySelector(`[data-pers-order="${CSS.escape(selectedItem.id)}"]`);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [selectedItem]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 rounded-lg bg-white/[0.04]" />
        {[1, 2].map((n) => (
          <div key={n} className="h-40 rounded-[24px] border border-white/[0.08] bg-[#08080c]" />
        ))}
      </div>
    );
  }

  // Visualização integrada em Modo Foco usando o mesmo visualizador da Biblioteca
  const canOpenInlineVault =
    Boolean(selectedOrder) &&
    (!selectedItem ||
      (selectedItem.deliveryChannel === 'vault' &&
        selectedItem.financialStatus === 'paid' &&
        ['pronto', 'entregue'].includes(selectedItem.operationalStatus)));

  if (selectedOrder && canOpenInlineVault) {
    return (
      <VaultContentViewer
        order={selectedOrder}
        initialTitle={selectedItem ? `Personalizado (${formatOrderSummary(selectedItem)})` : 'Entrega personalizada'}
        initialConfirmToken={confirmToken}
        backLabel="Voltar aos personalizados"
        contextBadge="Produção sob medida"
        metadataSlot={
          selectedItem ? (
            <>
              <span aria-hidden className="text-zinc-600">·</span>
              <span>{formatOrderSummary(selectedItem)}</span>
              {selectedItem.express24h && (
                <>
                  <span aria-hidden className="text-zinc-600">·</span>
                  <span className="text-amber-200">Prioridade 24h</span>
                </>
              )}
            </>
          ) : undefined
        }
        onBack={() => {
          onClearConfirmToken?.();
          onSelectOrder(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-normal leading-tight tracking-tight text-[#F5EEE9] sm:text-3xl">
            Pedidos personalizados
          </h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            Acompanhe cada etapa da produção e acesse suas entregas liberadas por aqui.
          </p>
        </div>
        <Link href="/personalizados" className="btn-ghost !min-h-[40px] !px-4">
          <span>Nova solicitação</span>
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-white/[0.08] bg-[#08080c] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-[#7A293D]/40 bg-[#431322]/30 text-[#C97A8D]">
            <Camera className="size-5" />
          </div>
          <p className="font-serif text-xl font-normal text-[#F5EEE9]">Nenhuma solicitação personalizada</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            Quando você encomendar uma produção sob medida, o acompanhamento e a entrega aparecerão aqui.
          </p>
          <div className="mt-7">
            <Link href="/personalizados" className="btn-primary !min-h-[46px] !px-6">
              <span>Encomendar personalizado</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const st = PERSONALIZADO_STATUS[item.operationalStatus] || {
              label: item.operationalStatus,
              cls: 'border border-white/10 bg-white/[0.04] text-zinc-300',
              step: 1,
            };
            const isDelivered = item.operationalStatus === 'pronto' || item.operationalStatus === 'entregue';
            const isVaultDelivery = item.deliveryChannel === 'vault';
            const isPendingPayment =
              item.operationalStatus === 'aguardando_pagamento' || item.financialStatus === 'pending';
            const fullText = item.briefingFull || item.briefingSummary || '';
            const hasLongBriefing = fullText.length > item.briefingSummary.length;
            const showFull = Boolean(expandedBriefing[item.id]);
            const isHighlighted = selectedOrder === item.id;

            return (
              <article
                key={item.id}
                data-pers-order={item.id}
                className={`rounded-[24px] border bg-[#08080c] p-5 transition-colors sm:p-6 ${
                  isHighlighted ? 'border-[#7A293D]/70' : 'border-white/[0.08]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                      {item.express24h && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
                          <Zap className="size-3" />
                          Expressa 24h
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif text-xl font-normal text-[#F5EEE9]">{formatOrderSummary(item)}</h3>
                  </div>

                  <p className="font-serif text-lg text-[#F5EEE9] tabular-nums">{formatBrl(item.totalPrice)}</p>
                </div>

                {fullText && (
                  <div className="mt-3">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                      {showFull ? fullText : item.briefingSummary}
                      {!showFull && hasLongBriefing ? '…' : ''}
                    </p>
                    {hasLongBriefing && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBriefing((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-[#C97A8D] transition-colors hover:text-[#F5EEE9] cursor-pointer"
                      >
                        {showFull ? (
                          <>
                            <ChevronUp className="size-3.5" /> Recolher briefing
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3.5" /> Ver briefing completo
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Linha de progresso editorial */}
                {item.operationalStatus !== 'cancelado' && (
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {STEPS.map((s) => {
                      const done = st.step >= s.step;
                      return (
                        <div key={s.step} className="space-y-1.5">
                          <div
                            className={`h-1 rounded-full transition-colors ${
                              done ? 'bg-gradient-to-r from-[#661C30] to-[#90364B]' : 'bg-white/[0.08]'
                            }`}
                          />
                          <p className={`text-[11px] ${done ? 'font-medium text-zinc-200' : 'text-zinc-500'}`}>
                            {s.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span>Entrega: {isVaultDelivery ? 'Área privada da conta' : 'Telegram'}</span>
                    <span aria-hidden className="text-zinc-600">·</span>
                    <span>
                      Pagamento:{' '}
                      <strong className="font-medium text-zinc-200">
                        {formatFinancialStatusBr(item.financialStatus)}
                      </strong>
                    </span>
                  </div>
                  {onOpenContact && (
                    <button
                      type="button"
                      onClick={onOpenContact}
                      className="inline-flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-[#F5EEE9] cursor-pointer"
                    >
                      <HelpCircle className="size-3.5" />
                      <span>Precisa de ajuda?</span>
                    </button>
                  )}
                </div>

                {/* Pagamento Pix inline quando pendente */}
                {isPendingPayment && item.operationalStatus !== 'cancelado' && (
                  <div className="mt-5 border-t border-white/[0.07] pt-5">
                    <button
                      type="button"
                      onClick={() => setOpenPaymentId((cur) => (cur === item.id ? null : item.id))}
                      className="btn-primary !min-h-[42px] !px-5"
                    >
                      <QrCode className="size-3.5" />
                      <span>{openPaymentId === item.id ? 'Fechar pagamento Pix' : 'Continuar pagamento Pix'}</span>
                    </button>
                    {openPaymentId === item.id && (
                      <OrderPaymentPanel
                        id={item.id}
                        onOrderUpdated={() => onUpdated?.()}
                        onOpenContact={onOpenContact}
                      />
                    )}
                  </div>
                )}

                {/* Entrega liberada */}
                {isDelivered && item.financialStatus === 'paid' && (
                  isVaultDelivery ? (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
                      <div className="flex items-center gap-2 text-sm text-emerald-200">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        <span>Sua entrega está pronta para visualização</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectOrder(item.id)}
                        className="btn-primary !min-h-[44px] !px-5"
                      >
                        <Play className="size-3.5" />
                        <span>Abrir entrega</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200">
                      <Send className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      <span>
                        Entrega configurada via <strong>Telegram</strong>. Confira as mensagens enviadas pela equipe Nua Borges no contato informado no pedido.
                      </span>
                    </div>
                  )
                )}

                {item.operationalStatus === 'em_producao' && (
                  <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs leading-relaxed text-zinc-400">
                    Pagamento confirmado. Sua produção está em andamento
                    {item.express24h ? ' com prioridade expressa (até 24h)' : ''} e você será avisado assim que ficar pronta.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
