'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
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
  aguardando_pagamento: { label: 'Aguardando pagamento', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/25', step: 1 },
  em_producao: { label: 'Em produção', cls: 'bg-[#661C30]/35 text-[#F5EEE9] border border-[#90364B]/40', step: 2 },
  pronto: { label: 'Pronto para acesso', cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25', step: 3 },
  entregue: { label: 'Entregue', cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25', step: 4 },
  cancelado: { label: 'Cancelado', cls: 'bg-rose-500/15 text-rose-300 border border-rose-500/25', step: 0 },
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
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div key={n} className="h-36 animate-pulse rounded-[28px] border border-white/[0.06] bg-[#08080c]" />
        ))}
      </div>
    );
  }

  // Visualização inline dos arquivos entregues dentro da própria aba Personalizados
  const canOpenInlineVault =
    Boolean(selectedOrder) &&
    (!selectedItem ||
      (selectedItem.deliveryChannel === 'vault' &&
        selectedItem.financialStatus === 'paid' &&
        ['pronto', 'entregue'].includes(selectedItem.operationalStatus)));

  if (selectedOrder && canOpenInlineVault) {
    const st = selectedItem
      ? PERSONALIZADO_STATUS[selectedItem.operationalStatus] || {
          label: selectedItem.operationalStatus,
          cls: 'bg-zinc-700/30 text-zinc-300',
          step: 4,
        }
      : null;

    return (
      <VaultContentViewer
        order={selectedOrder}
        initialTitle={selectedItem ? `Personalizado (${formatOrderSummary(selectedItem)})` : 'Entrega Personalizada'}
        initialConfirmToken={confirmToken}
        backLabel="Voltar aos Personalizados"
        contextBadge="Entrega Personalizada"
        metadataSlot={
          selectedItem ? (
            <div className="rounded-2xl border border-white/[0.06] bg-black/45 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {st && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.cls}`}>
                      {st.label}
                    </span>
                  )}
                  {selectedItem.express24h && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                      <Zap className="h-2.5 w-2.5" />
                      Expressa 24h
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-zinc-500">{selectedItem.id}</span>
                </div>
                <span className="font-semibold text-[#F5EEE9]">{formatBrl(selectedItem.totalPrice)}</span>
              </div>
              <p className="text-xs text-zinc-300">{formatOrderSummary(selectedItem)}</p>
              {selectedItem.briefingFull && (
                <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-400 border-t border-white/[0.05] pt-2.5">
                  {selectedItem.briefingFull}
                </p>
              )}
            </div>
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
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-[#F5EEE9]">
            Pedidos personalizados
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-light text-zinc-400">
            Acompanhe o andamento da produção e acesse suas entregas autorizadas aqui mesmo.
          </p>
        </div>
        <Link
          href="/personalizados"
          className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#7A293D]/55 bg-[#431322]/40 px-5 py-2 text-xs font-medium text-[#F5EEE9] transition-colors duration-200 hover:bg-[#661C30] hover:border-white/20"
        >
          Nova solicitação
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0d0c0f] px-6 py-12 text-center">
          <Camera className="mx-auto mb-3 h-7 w-7 text-[#C97A8D]/85" />
          <p className="font-serif text-base text-[#F5EEE9]">Nenhuma solicitação personalizada ainda</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-zinc-400">
            Quando você encomendar uma produção sob medida, o acompanhamento e a entrega aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const st = PERSONALIZADO_STATUS[item.operationalStatus] || {
              label: item.operationalStatus,
              cls: 'bg-zinc-700/30 text-zinc-300',
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
                className={`rounded-2xl border bg-[#0d0c0f] p-5 sm:p-6 transition-colors ${
                  isHighlighted ? 'border-[#90364B]/70' : 'border-white/[0.08]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.cls}`}>
                      {st.label}
                    </span>
                    {item.express24h && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/35 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                        <Zap className="h-2.5 w-2.5" />
                        Expressa 24h
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-zinc-500">{item.id}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#F5EEE9]">{formatBrl(item.totalPrice)}</span>
                </div>

                <p className="mt-3 text-sm font-medium text-zinc-100">{formatOrderSummary(item)}</p>

                {fullText && (
                  <div className="mt-2">
                    <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-400">
                      {showFull ? fullText : item.briefingSummary}
                      {!showFull && hasLongBriefing ? '…' : ''}
                    </p>
                    {hasLongBriefing && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBriefing((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#C97A8D] hover:text-[#F5EEE9] cursor-pointer"
                      >
                        {showFull ? (
                          <>
                            <ChevronUp className="h-3 w-3" /> Recolher briefing
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" /> Ver briefing completo
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Linha de progresso dos estados reais */}
                {item.operationalStatus !== 'cancelado' && (
                  <div className="mt-4 grid grid-cols-4 gap-1.5">
                    {STEPS.map((s) => {
                      const done = st.step >= s.step;
                      return (
                        <div key={s.step} className="space-y-1">
                          <div
                            className={`h-1 rounded-full ${
                              done ? 'bg-gradient-to-r from-[#661C30] to-[#90364B]' : 'bg-white/10'
                            }`}
                          />
                          <p className={`text-[10px] ${done ? 'text-zinc-200 font-medium' : 'text-zinc-500'}`}>
                            {s.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-500">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span>Canal: {isVaultDelivery ? 'Entrega na conta privada' : 'Telegram'}</span>
                    <span>·</span>
                    <span>
                      Pagamento:{' '}
                      <strong className="text-zinc-300">
                        {formatFinancialStatusBr(item.financialStatus)}
                      </strong>
                    </span>
                  </div>
                  {onOpenContact && (
                    <button
                      type="button"
                      onClick={onOpenContact}
                      className="inline-flex items-center gap-1 text-zinc-400 hover:text-[#F5EEE9] transition-colors cursor-pointer"
                    >
                      <HelpCircle className="h-3 w-3" />
                      Precisa de ajuda?
                    </button>
                  )}
                </div>

                {/* Pagamento Pix inline quando pendente */}
                {isPendingPayment && item.operationalStatus !== 'cancelado' && (
                  <div className="mt-4 border-t border-white/[0.07] pt-4">
                    <button
                      type="button"
                      onClick={() => setOpenPaymentId((cur) => (cur === item.id ? null : item.id))}
                      className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-[#90364B]/60 bg-[#431322]/45 px-5 py-2 text-xs font-semibold text-[#F5EEE9] transition-colors hover:bg-[#661C30] cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      {openPaymentId === item.id ? 'Fechar pagamento Pix' : 'Continuar pagamento Pix'}
                    </button>
                    {openPaymentId === item.id && (
                      <OrderPaymentPanel id={item.id} onOrderUpdated={() => onUpdated?.()} onOpenContact={onOpenContact} />
                    )}
                  </div>
                )}

                {/* Entrega liberada: visualização inline vs Telegram */}
                {isDelivered && item.financialStatus === 'paid' && (
                  isVaultDelivery ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Sua entrega já está liberada para visualização e download</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectOrder(item.id)}
                        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-[#661C30] hover:bg-[#7A293D] border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#F5EEE9] transition-all shadow-[0_4px_18px_rgba(67,19,34,0.4)] cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Ver entrega</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200">
                      <Send className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>
                        Entrega configurada via <strong>Telegram</strong>. Confira as mensagens enviadas pela equipe Nua Borges no contato informado no pedido.
                      </span>
                    </div>
                  )
                )}

                {item.operationalStatus === 'em_producao' && (
                  <p className="mt-4 border-t border-white/[0.07] pt-3 text-xs text-zinc-400">
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
