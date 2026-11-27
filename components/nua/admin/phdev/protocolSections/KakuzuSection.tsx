'use client';

import React from 'react';
import { CreditCard, QrCode, RotateCcw, Scale } from 'lucide-react';
import { SEMANTIC_STATUS_STYLES } from '@/lib/phdev/konohagakure/protocols';
import { formatBrTimestamp } from '@/lib/phdev/konohagakure/verbalIdentity';
import type { SystemControlSnapshot } from '@/lib/phdev/konohagakure/types';

interface KakuzuSectionProps {
  snapshot: SystemControlSnapshot | null;
}

export function KakuzuSection({ snapshot }: KakuzuSectionProps) {
  const mp = snapshot?.integrations?.mercadoPagoCommercial;
  const pix = snapshot?.integrations?.mensalidadeStaticPix;
  const recovery = snapshot?.recovery;
  const financeEvents = (snapshot?.recentAudit || []).filter((ev) =>
    /PAY|PAYMENT|REFUND|ESTORNO|MERCADO|PIX|ORDER|FINANC/i.test(
      `${ev.type || ''} ${ev.summary || ''}`,
    ),
  );

  const mpTone = !mp ? 'unknown' : mp.connected ? 'success' : mp.configured ? 'danger' : 'warning';
  const pixTone = !pix ? 'unknown' : pix.configured ? 'info' : 'warning';
  const refundsTone = !recovery
    ? 'unknown'
    : recovery.refundsPaused
      ? 'containment'
      : Number(recovery.refunds?.needsIntervention || 0) > 0
        ? 'warning'
        : 'success';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Financeiro Comercial NUA */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <CreditCard className="w-4 h-4 text-[#34d399]" aria-hidden="true" />
              Mercado Pago Comercial
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${SEMANTIC_STATUS_STYLES[mpTone].badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${SEMANTIC_STATUS_STYLES[mpTone].dot}`} aria-hidden="true" />
              {!mp ? 'Não verificado' : mp.connected ? 'Conectado' : mp.configured ? 'Falha' : 'Ausente'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {mp?.nickname
              ? `Conta comercial conectada: ${mp.nickname}${mp.siteId ? ` (${mp.siteId})` : ''}.`
              : 'Canal exclusivo das vendas da NUA (Packs, Personalizados e Chamadas VIP).'}
          </p>
        </div>

        {/* Mensalidade PHDEV separada */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <QrCode className="w-4 h-4 text-[#34d399]" aria-hidden="true" />
              Mensalidade PHDEV (Pix)
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${SEMANTIC_STATUS_STYLES[pixTone].badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${SEMANTIC_STATUS_STYLES[pixTone].dot}`} aria-hidden="true" />
              {!pix ? 'Não verificado' : pix.configured ? 'Configurado' : 'Não configurado'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Canal 100% isolado do caixa comercial da NUA, administrado exclusivamente pelo PHDEV.
          </p>
        </div>

        {/* Estornos e reconciliação */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <RotateCcw className="w-4 h-4 text-[#34d399]" aria-hidden="true" />
              Fila de Estornos
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono ${SEMANTIC_STATUS_STYLES[refundsTone].badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${SEMANTIC_STATUS_STYLES[refundsTone].dot}`} aria-hidden="true" />
              {!recovery
                ? 'Sem registro'
                : recovery.refundsPaused
                  ? 'Em quarentena'
                  : `${recovery.refunds?.needsIntervention ?? 0} pendência(s)`}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Estornos exigem reautenticação por senha e reconciliação auditável antes da baixa definitiva.
          </p>
        </div>
      </div>

      {/* Transparência de saldo real */}
      <section className="rounded-2xl border border-[#34d399]/22 bg-[#0b1313]/85 p-4 flex items-start gap-3">
        <Scale className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1 text-xs">
          <h3 className="font-semibold text-white">Regra de Transparência Financeira (Sem Saldo Sintético)</h3>
          <p className="text-zinc-300/90 leading-relaxed">
            A API financeira comercial preserva <code className="font-mono text-[#34d399]">balance.available = null</code> e{' '}
            <code className="font-mono text-[#34d399]">balance.pending = null</code> enquanto não houver endpoint oficial de saldo
            verificado na conta Mercado Pago — evitando qualquer divergência contábil.
          </p>
        </div>
      </section>

      {/* Eventos financeiros recentes */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">
          Eventos Financeiros e de Conciliação ({financeEvents.length})
        </h3>
        {financeEvents.length === 0 ? (
          <p className="text-xs text-zinc-400">
            {snapshot
              ? 'Nenhum evento financeiro recente retornado na janela de auditoria.'
              : 'Aguardando leitura autenticada de /api/control/system.'}
          </p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {financeEvents.map((ev, idx) => (
              <div key={ev.id || idx} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-mono text-[11px] text-[#34d399] mr-2">{ev.type || 'FINANCE'}</span>
                  <span className="text-zinc-200">{ev.summary || 'Movimentação auditada'}</span>
                </div>
                <span className="font-mono text-[10.5px] text-zinc-500">
                  {formatBrTimestamp(ev.createdAt || ev.timestamp) || '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
