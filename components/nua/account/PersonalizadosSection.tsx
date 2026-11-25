'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  QrCode,
  Send,
  Zap,
} from 'lucide-react';
import { NuaIdPersonalizado } from '@/lib/nuaIdClient';
import { OrderPaymentPanel } from './OrderPaymentPanel';

interface PersonalizadosSectionProps {
  items: NuaIdPersonalizado[];
  loading: boolean;
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

export function PersonalizadosSection({
  items,
  loading,
  onUpdated,
  onOpenContact,
}: PersonalizadosSectionProps) {
  const [expandedBriefing, setExpandedBriefing] = useState<Record<string, boolean>>({});
  const [openPaymentId, setOpenPaymentId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div key={n} className="h-36 animate-pulse rounded-[28px] border border-white/[0.06] bg-[#08080c]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-serif text-xl text-[#F5EEE9]">Meus Personalizados</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Acompanhe o andamento da produção e acesse suas entregas autorizadas.
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
        <div className="rounded-[28px] border border-white/[0.08] bg-[#08080c] px-6 py-12 text-center shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
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

            return (
              <article
                key={item.id}
                className="rounded-[28px] border border-white/[0.08] bg-[#08080c] p-5 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.85)]"
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

                <p className="mt-3 text-sm font-medium text-zinc-100">
                  {item.photoCount} foto(s)
                  {item.videoDurationMinutes > 0 ? ` · Vídeo de ${item.videoDurationMinutes} min` : ''}
                  {item.mentionName ? ' · Com menção de nome' : ''}
                </p>

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
                    <span>Canal: {isVaultDelivery ? 'Cofre digital em Minha Conta' : 'Telegram'}</span>
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
                      <OrderPaymentPanel id={item.id} onOrderUpdated={() => onUpdated?.()} />
                    )}
                  </div>
                )}

                {/* Entrega liberada: Cofre vs Telegram */}
                {isDelivered && item.financialStatus === 'paid' && (
                  isVaultDelivery ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Sua entrega já está liberada no Cofre Privativo</span>
                      </div>
                      <Link
                        href={`/cofre?order=${encodeURIComponent(item.id)}`}
                        className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[#F5EEE9] transition-all shadow-[0_4px_18px_rgba(67,19,34,0.4)]"
                      >
                        Abrir meu Cofre
                      </Link>
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
